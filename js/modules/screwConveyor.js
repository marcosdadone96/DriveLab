/**
 * Transportador de tornillo helicoidal — modelo orientativo de régimen, potencia en el eje y par.
 *
 * Basado en continuidad volumétrica (λ, paso, Ø) y resistencia equivalente al avance (elevación + rozamiento en canal).
 * No sustituye CEMA 350 completo ni catálogo de fabricante; valide factores con su aplicación.
 */

import { G, clamp, parsePositive, parseNonNegative } from '../utils/calculations.js';
import { resolveServiceFactor, LOAD_DUTY_OPTIONS } from './serviceFactorByDuty.js';
import { applyScrewConveyorEnglish } from './conveyorCalcEn.js';

/**
 * @typedef {import('./serviceFactorByDuty.js').LoadDutyClass} LoadDutyClass
 */

/**
 * @typedef {Object} CalcStep
 * @property {string} id
 * @property {string} title
 * @property {string} formula
 * @property {string} substitution
 * @property {number} value
 * @property {string} unit
 * @property {string} meaning
 */

/**
 * @typedef {'low'|'medium'|'high'} WearClass
 */

/**
 * @typedef {Object} ScrewConveyorInputs
 * @property {number} capValue
 * @property {'m3h'|'th'} capUnit
 * @property {number} diamValue
 * @property {'mm'|'in'} diamUnit
 * @property {number} pitchValue
 * @property {'mm'|'in'} pitchUnit
 * @property {number} length_m
 * @property {number} angle_deg
 * @property {number} rho_kg_m3
 * @property {'15'|'30'|'45'} troughLoadPct
 * @property {WearClass} abrasive
 * @property {WearClass} corrosive
 * @property {number} frictionCoeff — μ material–acero (canal)
 * @property {number} bearingMechanicalEff_pct — rendimiento mecánico apoyos/transmisión (1–99)
 * @property {LoadDutyClass} loadDuty
 * @property {number} [serviceFactor]
 * @property {number} [volumetricEff_pct] — eficiencia volumétrica del tornillo (opcional; por defecto según λ)
 */

const INCH_MM = 25.4;

export function diameterToMeters(value, unit) {
  const v = parsePositive(value, 200);
  return unit === 'in' ? (v * INCH_MM) / 1000 : v / 1000;
}

export function pitchToMeters(value, unit) {
  const v = parsePositive(value, 200);
  return unit === 'in' ? (v * INCH_MM) / 1000 : v / 1000;
}

/**
 * Capacidad en m³/s
 * @param {number} capValue
 * @param {'m3h'|'th'} capUnit
 * @param {number} rho
 */
export function capacityToM3s(capValue, capUnit, rho) {
  const ρ = parsePositive(rho, 800);
  if (capUnit === 'th') {
    const tph = parsePositive(capValue, 10);
    const m3h = (tph * 1000) / ρ;
    return m3h / 3600;
  }
  const m3h = parsePositive(capValue, 50);
  return m3h / 3600;
}

export function troughLoadFraction(pct) {
  if (pct === '45') return 0.45;
  if (pct === '15') return 0.15;
  return 0.3;
}

function wearMultiplier(abrasive, corrosive) {
  let a = 1;
  if (abrasive === 'medium') a = 1.08;
  if (abrasive === 'high') a = 1.18;
  let c = 1;
  if (corrosive === 'medium') c = 1.05;
  if (corrosive === 'high') c = 1.1;
  return a * c;
}

/**
 * RPM máximo orientativo (desgaste / fluidización) según Ø y abrasividad.
 * @param {number} D_m
 * @param {WearClass} abrasive
 */
export function suggestedMaxScrewRpm(D_m, abrasive) {
  const D = Math.max(D_m, 0.05);
  /** Orden de magnitud tipo tablas CEMA / práctica: cae con Ø y con abrasividad */
  const n0 = 95 / Math.sqrt(D);
  if (abrasive === 'high') return clamp(n0 * 0.45, 10, 85);
  if (abrasive === 'medium') return clamp(n0 * 0.68, 15, 140);
  return clamp(n0, 20, 220);
}

/**
 * @param {'low'|'medium'|'high'} rpmVsMax
 */
export function classifyRpmRisk(n, nMax, lang = 'es') {
  const en = lang === 'en';
  if (!Number.isFinite(n) || !Number.isFinite(nMax) || nMax <= 0) {
    return { level: /** @type {const} */ ('ok'), ratio: 0, label: '\u2014' };
  }
  const ratio = n / nMax;
  if (ratio > 1.02) {
    return {
      level: /** @type {const} */ ('high'),
      ratio,
      label: en
        ? 'RPM high for diameter and material: wear and fluidization risk.'
        : 'RPM elevadas para el \u00d8 y material: riesgo de desgaste y fluidizaci\u00f3n.',
    };
  }
  if (ratio > 0.85) {
    return {
      level: /** @type {const} */ ('caution'),
      ratio,
      label: en
        ? 'RPM on the high side: check vendor guidance and material class.'
        : 'RPM altas: revisar recomendaciones del fabricante y clase de material.',
    };
  }
  return {
    level: /** @type {const} */ ('ok'),
    ratio,
    label: en ? 'RPM in a typical indicative range.' : 'RPM dentro de un rango habitual orientativo.',
  };
}

/**
 * @param {ScrewConveyorInputs} raw
 */
export function computeScrewConveyor(raw) {
  const D_m = diameterToMeters(raw.diamValue, raw.diamUnit);
  const pitch_m = pitchToMeters(raw.pitchValue, raw.pitchUnit);
  const L_m = parsePositive(raw.length_m, 8);
  const θdeg = clamp(parseNonNegative(raw.angle_deg ?? 0, 0), 0, 90);
  const θ = (θdeg * Math.PI) / 180;
  const ρ = parsePositive(raw.rho_kg_m3, 800);
  const λ = troughLoadFraction(raw.troughLoadPct || '30');
  const μ = clamp(parseNonNegative(raw.frictionCoeff ?? 0.35, 0.35), 0.08, 0.95);
  const η_mech = clamp(parsePositive(raw.bearingMechanicalEff_pct ?? 92, 92), 50, 99) / 100;

  const Q_m3s = capacityToM3s(raw.capValue, raw.capUnit || 'm3h', ρ);
  const cap_m3h = Q_m3s * 3600;
  const cap_th = (Q_m3s * ρ * 3600) / 1000;

  const η_v_default = clamp(0.55 + λ * 0.45, 0.58, 0.88);
  const η_v =
    raw.volumetricEff_pct != null
      ? clamp(parsePositive(raw.volumetricEff_pct, 75), 40, 95) / 100
      : η_v_default;

  const A_fill = (Math.PI / 4) * D_m * D_m * λ;
  const volPerRev = Math.max(1e-9, A_fill * pitch_m * η_v);
  const n_rpm = clamp((Q_m3s * 60) / volPerRev, 1, 600);
  const ω = (2 * Math.PI * n_rpm) / 60;

  const abrasive = raw.abrasive === 'high' || raw.abrasive === 'medium' ? raw.abrasive : 'low';
  const corrosive = raw.corrosive === 'high' || raw.corrosive === 'medium' ? raw.corrosive : 'low';
  const wearM = wearMultiplier(abrasive, corrosive);

  const loadDuty =
    raw.loadDuty === 'uniform' ||
    raw.loadDuty === 'moderate' ||
    raw.loadDuty === 'heavy' ||
    raw.loadDuty === 'custom'
      ? raw.loadDuty
      : 'moderate';
  let serviceFactor = Math.max(1, resolveServiceFactor(loadDuty, raw.serviceFactor ?? 1.25)) * wearM;

  /** Potencia útil al fluido sólido: elevación + rozamiento equivalente en canal */
  const mdot = Q_m3s * ρ;
  const H_eq = L_m * (Math.sin(θ) + μ * Math.cos(θ));
  const P_process_W = mdot * G * H_eq * 1.15;
  const P_shaft_W = P_process_W / Math.max(0.5, η_mech);
  const P_shaft_kW = P_shaft_W / 1000;

  const torqueShaft_Nm = P_shaft_W / Math.max(1e-6, ω);
  const torqueWithService_Nm = torqueShaft_Nm * serviceFactor;
  const requiredMotorPower_kW = P_shaft_kW * serviceFactor;

  const nMax = suggestedMaxScrewRpm(D_m, abrasive);
  const rpmRisk = classifyRpmRisk(n_rpm, nMax, raw.lang === 'en' ? 'en' : 'es');

  const v_axial = pitch_m * (n_rpm / 60);

  const drumRpm = n_rpm;

  /** @type {CalcStep[]} */
  const steps = [
    {
      id: 'q',
      title: 'Caudal volumétrico',
      formula: 'Q [m³/s] desde m³/h o t/h y ρ',
      substitution: `Q ≈ ${(Q_m3s * 1000).toFixed(3)} L/s (${cap_m3h.toFixed(2)} m³/h; ≈ ${cap_th.toFixed(2)} t/h)`,
      value: Q_m3s,
      unit: 'm³/s',
      meaning: 'Base para régimen del tornillo y potencia.',
    },
    {
      id: 'geom',
      title: 'Geometría y llenado',
      formula: 'A_llena = (π/4) D² λ; V/rev = A_llena p η_v',
      substitution: `D = ${(D_m * 1000).toFixed(0)} mm, p = ${(pitch_m * 1000).toFixed(0)} mm, λ = ${(λ * 100).toFixed(0)} %, η_v ≈ ${(η_v * 100).toFixed(0)} %`,
      value: volPerRev,
      unit: 'm³/rev',
      meaning: 'Volumen teórico por vuelta con trough loading y eficiencia volumétrica orientativa.',
    },
    {
      id: 'n',
      title: 'Velocidad de giro del tornillo',
      formula: 'n = 60 Q / V_rev',
      substitution: `n = ${n_rpm.toFixed(1)} min⁻¹ (tope orientativo ${nMax.toFixed(0)} min⁻¹ para abrasividad declarada)`,
      value: n_rpm,
      unit: 'min⁻¹',
      meaning: 'Régimen necesario para la capacidad; comparar con límite de desgaste.',
    },
    {
      id: 'power',
      title: 'Potencia en el eje del tornillo',
      formula: 'P ≈ (ṁ g H_eq) / η_mec; H_eq = L (sin θ + μ cos θ)',
      substitution: `ṁ = ${mdot.toFixed(3)} kg/s, L = ${L_m} m, θ = ${θdeg}°, μ = ${μ.toFixed(2)}, η_mec = ${(η_mech * 100).toFixed(0)} %`,
      value: P_shaft_kW,
      unit: 'kW',
      meaning: 'Orden de magnitud para accionamiento; no incluye arranque bajo carga plena ni todos los términos CEMA.',
    },
    {
      id: 'torque',
      title: 'Par en el eje',
      formula: 'T = P_eje / ω',
      substitution: `ω = 2π n / 60`,
      value: torqueShaft_Nm,
      unit: 'N·m',
      meaning: 'Referencia para motorreductor y chaveteros.',
    },
    {
      id: 'sf',
      title: 'Par y potencia de diseño',
      formula: 'T_dis = T SF; P_dis = P_eje SF',
      substitution: `SF = ${serviceFactor.toFixed(3)} (${LOAD_DUTY_OPTIONS.find((o) => o.id === loadDuty)?.label || loadDuty} × factores desgaste)`,
      value: serviceFactor,
      unit: '—',
      meaning: 'Margen conjunto servicio + abrasividad/corrosividad declaradas.',
    },
  ];

  const explanations = [
    `Capacidad de trabajo ≈ ${cap_m3h.toFixed(2)} m³/h con ρ = ${ρ} kg/m³ y llenado ${(λ * 100).toFixed(0)} %.`,
    `Velocidad axial aproximada del bulk: v ≈ ${(v_axial * 1000).toFixed(1)} mm/s (paso × n/60).`,
    rpmRisk.level !== 'ok'
      ? rpmRisk.label
      : `Régimen n = ${n_rpm.toFixed(1)} min⁻¹ frente a tope orientativo ${nMax.toFixed(0)} min⁻¹ (${abrasive} abrasividad).`,
  ];

  const assumptions = [
    'Material aproximado como sólido a granel coherente con ρ y μ indicados; no modela pulsos ni bloqueos.',
    'El factor de llenado del canal (trough loading) es el declarado; en campo depende del relleno real y del paso.',
    'La potencia no desglosa pérdidas en cada colgador ni arranque; use margen adicional en instalaciones críticas.',
    'Límite de RPM es orientativo: priorice tablas del fabricante del tornillo y ensayos de material.',
  ];

  const result = {
    designStandard: 'ScrewConveyor',
    loadDuty,
    serviceFactorUsed: serviceFactor,
    screwRpm: n_rpm,
    screwRpmMaxSuggested: nMax,
    rpmRisk,
    volumetricEff_used: η_v * 100,
    massFlow_kg_s: mdot,
    cap_m3h,
    cap_th,
    torqueAtDrum_Nm: torqueShaft_Nm,
    torqueWithService_Nm,
    requiredMotorPower_kW,
    shaftPower_kW: P_shaft_kW,
    drumRpm,
    axialSpeed_m_s: v_axial,
    detail: {
      D_m,
      pitch_m,
      L_m,
      angle_deg: θdeg,
      H_eq_m: H_eq,
      Q_m3s,
      A_fill,
      volPerRev,
      wearMultiplier: wearM,
    },
    steps,
    explanations,
    assumptions,
  };

  if (raw.lang === 'en') {
    applyScrewConveyorEnglish(result, {
      cap_m3h,
      rho: ρ,
      lambdaPct: λ * 100,
      v_axial,
      n_rpm,
      nMax,
      abrasive,
    });
  }

  return result;
}
