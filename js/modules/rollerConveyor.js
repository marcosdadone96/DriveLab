/**
 * Transportador de rodillos motorizado (horizontal) - calculo orientativo.
 */

import {
  G,
  motorPowerWithEfficiency,
  parseNonNegative,
  parsePositive,
} from '../utils/calculations.js';
import { getPalletPresetById } from '../config/palletPresets.js';
import { resolveServiceFactor } from './serviceFactorByDuty.js';
import { steadyForceStandardMultiplier } from './conveyorStandards.js';
import { applyRollerConveyorEnglish } from './conveyorCalcEn.js';

/**
 * @param {string | number | undefined | null} raw
 * @returns {number | null} entero >=1 o null si vacio / invalido
 */
function parseOptionalPositiveInt(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

/**
 * Paso de rodillos, paleta o reparto uniforme: metricas orientativas (no cambian N=m*g en este modelo).
 * @param {object} raw
 * @param {number} length_m
 */
function buildLoadSupportContext(raw, length_m) {
  const pitch = Math.max(25, parsePositive(raw.rollerPitch_mm, 125));
  const mode = raw.loadSupportMode === 'pallet' ? 'pallet' : 'uniform';
  /** @type {string[]} */
  const warnings = [];
  /** @type {number | null} */
  let footprintAlong_mm = null;
  /** @type {number | null} */
  let footprintAcross_mm = null;
  let palletLabel = '';
  let rollersAlongFootprint = 1;
  const rollersInSpanL = Math.max(1, Math.round((length_m * 1000) / pitch));

  if (mode === 'pallet') {
    const preset = getPalletPresetById(raw.palletPreset || 'eur1');
    const shortAlong = raw.palletOrientation === 'short_along_transport';
    let long_mm;
    let short_mm;
    if (preset.id === 'custom') {
      const a = parsePositive(raw.palletCustomL_mm, 1200);
      const b = parsePositive(raw.palletCustomW_mm, 800);
      long_mm = Math.max(a, b);
      short_mm = Math.min(a, b);
      palletLabel = `Personalizado ${Math.round(a)}\u00d7${Math.round(b)} mm`;
    } else {
      const lm = preset.length_mm ?? 1200;
      const wm = preset.width_mm ?? 800;
      long_mm = Math.max(lm, wm);
      short_mm = Math.min(lm, wm);
      palletLabel = preset.label;
    }
    footprintAlong_mm = shortAlong ? short_mm : long_mm;
    footprintAcross_mm = shortAlong ? long_mm : short_mm;
    rollersAlongFootprint = Math.max(1, Math.ceil(footprintAlong_mm / pitch));
    if (footprintAlong_mm > length_m * 1000 + 1e-6) {
      warnings.push(
        'La huella en direcci\u00f3n de transporte supera la longitud \u00fatil L: revise datos o aumente L.',
      );
    }
    if (rollersAlongFootprint < 2) {
      warnings.push(
        'Menos de 2 rodillos bajo la huella con este paso: riesgo de apoyo inestable; revise paso u orientaci\u00f3n de la paleta.',
      );
    }
  } else {
    const manual = parseOptionalPositiveInt(raw.uniformRollersOverride);
    if (manual != null) {
      rollersAlongFootprint = manual;
      palletLabel = 'Reparto uniforme (n\u00ba de rodillos indicado manualmente)';
    } else {
      rollersAlongFootprint = rollersInSpanL;
      palletLabel = 'Reparto uniforme en el tramo L';
    }
  }

  return {
    rollerPitch_mm: pitch,
    mode,
    palletLabel,
    footprintAlong_mm,
    footprintAcross_mm,
    rollersAlongFootprint,
    rollersInSpanL,
    warnings,
  };
}

function parseEfficiencyRaw(v) {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  if (!Number.isFinite(n)) return 88;
  return n;
}

/**
 * @param {object} raw
 */
export function computeRollerConveyor(raw) {
  const length_m = parsePositive(raw.length_m, 4);
  const supportInfo = buildLoadSupportContext(raw, length_m);
  const loadMass_kg = parsePositive(raw.loadMass_kg, 300);
  const speed_m_s = parseNonNegative(raw.speed_m_s, 0.35);
  const rollerDiameter_mm = parsePositive(raw.rollerDiameter_mm, 89);
  const crr = Math.max(0.002, parsePositive(raw.rollingResistanceCoeff, 0.03));
  const additionalResistance_N = parseNonNegative(raw.additionalResistance_N ?? 0, 0);
  const accelTime_s = Math.max(0.05, parsePositive(raw.accelTime_s ?? 2.5, 2.5));
  const inertiaStartingFactor = Math.max(1, parsePositive(raw.inertiaStartingFactor ?? 1.1, 1.1));
  const designStandard = raw.designStandard === 'CEMA' ? 'CEMA' : 'ISO5048';
  const loadDuty =
    raw.loadDuty === 'uniform' ||
    raw.loadDuty === 'moderate' ||
    raw.loadDuty === 'heavy' ||
    raw.loadDuty === 'custom'
      ? raw.loadDuty
      : 'moderate';
  const serviceFactor = Math.max(1, resolveServiceFactor(loadDuty, raw.serviceFactor ?? 1.25));

  const efficiency_pct_raw = parseEfficiencyRaw(raw.efficiency_pct);
  const efficiency_pct_effective = Math.min(99, Math.max(1, parsePositive(efficiency_pct_raw, 88)));
  const eta = efficiency_pct_effective / 100;
  const stdMult = steadyForceStandardMultiplier(designStandard);

  const drumDiameter_m = rollerDiameter_mm / 1000;
  const R_m = drumDiameter_m / 2;
  const normalForce_N = loadMass_kg * G;
  const F_roll_base_N = normalForce_N * crr;
  const F_steady_N = (F_roll_base_N + additionalResistance_N) * stdMult;
  const accel_m_s2 = speed_m_s > 0 ? speed_m_s / accelTime_s : 0;
  const F_accel_N = inertiaStartingFactor * loadMass_kg * accel_m_s2;
  const F_total_start_N = F_steady_N + F_accel_N;

  const accelStepSubstitution = `k_in=${inertiaStartingFactor.toFixed(2)} * m=${loadMass_kg} kg * a=v/t_acc=${speed_m_s.toFixed(3)}/${accelTime_s.toFixed(2)}=${accel_m_s2.toFixed(4)} m/s^2`;

  const torqueRun_Nm = F_steady_N * R_m;
  const torqueStart_Nm = F_total_start_N * R_m;
  const torqueWithService_Nm = Math.max(torqueRun_Nm, torqueStart_Nm) * serviceFactor;

  const powerDrumRun_W = F_steady_N * speed_m_s;
  const powerDrumStart_W = F_total_start_N * speed_m_s;
  const powerMotorRun_W = motorPowerWithEfficiency(powerDrumRun_W, eta);
  const powerMotorStart_W = motorPowerWithEfficiency(powerDrumStart_W, eta);
  const requiredMotorPower_W = Math.max(powerMotorRun_W, powerMotorStart_W);
  const requiredMotorPower_kW = requiredMotorPower_W / 1000;
  const drumRpm = speed_m_s > 0 && drumDiameter_m > 0 ? (speed_m_s / (Math.PI * drumDiameter_m)) * 60 : 0;
  const massFlow_kg_s = (loadMass_kg / length_m) * speed_m_s;

  const steps = [
    {
      id: 'normal',
      title: 'Normal total sobre rodillos',
      formula: 'N = m * g',
      substitution: `${loadMass_kg} kg * ${G.toFixed(3)} m/s^2`,
      value: normalForce_N,
      unit: 'N',
      meaning: 'Carga vertical sobre el tren de rodillos.',
    },
    {
      id: 'roll',
      title: 'Resistencia a la rodadura',
      formula: 'F_roll = N * Crr',
      substitution: `Crr = ${crr.toFixed(4)}`,
      value: F_roll_base_N,
      unit: 'N',
      meaning: 'P\u00e9rdidas por rodillos, rodamientos y contacto de rodadura.',
    },
    {
      id: 'steady',
      title: 'Fuerza de r\u00e9gimen',
      formula: stdMult > 1 ? 'F_reg = (F_roll + F_add) * factor norma' : 'F_reg = F_roll + F_add',
      substitution:
        stdMult > 1
          ? `(${F_roll_base_N.toFixed(1)} + ${additionalResistance_N.toFixed(1)}) * ${stdMult.toFixed(2)}`
          : `${F_roll_base_N.toFixed(1)} + ${additionalResistance_N.toFixed(1)}`,
      value: F_steady_N,
      unit: 'N',
      meaning: 'Esfuerzo estable para mover la l\u00ednea a velocidad constante.',
    },
    {
      id: 'accel',
      title: 'Fuerza de aceleraci\u00f3n',
      formula: 'F_acc = k_in * m * (v / t_acc)',
      substitution: accelStepSubstitution,
      value: F_accel_N,
      unit: 'N',
      meaning: 'Pico de tracci\u00f3n en arranque (aceleraci\u00f3n lineal de la carga modelada).',
    },
    {
      id: 'torque',
      title: 'Par de dise\u00f1o',
      formula: 'T = max(F_reg*R, F_arr*R) * SF',
      substitution: `R = ${R_m.toFixed(4)} m; SF = ${serviceFactor.toFixed(2)}`,
      value: torqueWithService_Nm,
      unit: 'N\u00b7m',
      meaning: 'Par requerido para selecci\u00f3n de motorreductor.',
    },
    {
      id: 'power',
      title: 'Potencia de motor',
      formula: 'P_motor = max(F_reg*v, F_arr*v) / eta',
      substitution: `eta = ${efficiency_pct_effective.toFixed(1)} %`,
      value: requiredMotorPower_kW,
      unit: 'kW',
      meaning: 'Potencia mec\u00e1nica en eje motor para cat\u00e1logo.',
    },
  ];

  const pitchLine = `Paso entre rodillos (ejes): ${supportInfo.rollerPitch_mm.toFixed(0)} mm.`;
  const uniformManual = parseOptionalPositiveInt(raw.uniformRollersOverride);
  let geometryLine;
  if (supportInfo.mode === 'pallet' && supportInfo.footprintAlong_mm != null && supportInfo.footprintAcross_mm != null) {
    geometryLine = `Carga apoyada en paleta (${supportInfo.palletLabel}): huella ~${supportInfo.footprintAlong_mm} mm en direcci\u00f3n de transporte y ~${supportInfo.footprintAcross_mm} mm transversal; rodillos estimados bajo esa huella: ${supportInfo.rollersAlongFootprint} (orientativo; depende del canto real y del reparto).`;
  } else if (uniformManual != null) {
    geometryLine = `Reparto uniforme: se documentan ~${supportInfo.rollersAlongFootprint} rodillos bajo la carga (dato manual). Con el mismo paso, en todo el tramo L habr\u00eda ~${supportInfo.rollersInSpanL} rodillos (orientativo).`;
  } else {
    geometryLine = `Reparto uniforme: ~${supportInfo.rollersAlongFootprint} rodillos en el tramo L seg\u00fan paso y longitud (orientativo).`;
  }
  const modelScopeLine =
    'La fuerza de rodadura sigue model\u00e1ndose como F_roll = C_rr\u00b7N con N = m\u00b7g total sobre la l\u00ednea; la geometr\u00eda de apoyo documenta el caso y valida paso/orientaci\u00f3n, sin repartir carga rodillo a rodillo en este simulador.';

  const pitchLineEn = `Roller pitch (shaft centres): ${supportInfo.rollerPitch_mm.toFixed(0)} mm.`;
  let geometryLineEn;
  if (supportInfo.mode === 'pallet' && supportInfo.footprintAlong_mm != null && supportInfo.footprintAcross_mm != null) {
    geometryLineEn = `Load on pallet (${supportInfo.palletLabel}): footprint ~${supportInfo.footprintAlong_mm} mm along transport and ~${supportInfo.footprintAcross_mm} mm across; estimated rollers under footprint: ${supportInfo.rollersAlongFootprint} (indicative; depends on real edge and load spread).`;
  } else if (uniformManual != null) {
    geometryLineEn = `Uniform spread: documenting ~${supportInfo.rollersAlongFootprint} rollers under the load (manual count). At the same pitch, ~${supportInfo.rollersInSpanL} rollers along full L (indicative).`;
  } else {
    geometryLineEn = `Uniform spread: ~${supportInfo.rollersAlongFootprint} rollers along L from pitch and length (indicative).`;
  }
  const modelScopeLineEn =
    'Rolling force stays modeled as F_roll = C_rr�N with N = m�g on the line; support geometry documents the case and validates pitch/orientation, without per-roller load split in this simulator.';

  const assumptions = [
    'Modelo horizontal con rodadura equivalente (sin elevaci\u00f3n).',
    'Crr representa p\u00e9rdidas agregadas de rodillos, cojinetes y contacto de carga.',
    'Caudal m\u00e1sico \u2248 (m/L)\u00b7v supone la masa m repartida de forma uniforme en la longitud \u00fatil L (densidad lineal m/L). Si la carga est\u00e1 agrupada en palets o zonas, tr\u00e9telo solo como referencia orientativa.',
    pitchLine,
    geometryLine,
    modelScopeLine,
    `Factor de servicio aplicado: ${serviceFactor.toFixed(2)} (${loadDuty === 'custom' ? 'manual' : 'tipo de carga'}).`,
    stdMult > 1
      ? `Margen normativo sobre r\u00e9gimen: \u00d7${stdMult.toFixed(2)} (${designStandard}). Solo ajusta la tracci\u00f3n de r\u00e9gimen; no sustituye un c\u00e1lculo CEMA o ISO 5048 completo.`
      : 'Sin margen normativo adicional sobre el r\u00e9gimen (ISO 5048 en este simulador: sin factor emp\u00edrico extra sobre F_reg).',
  ];

  const explanations = [
    `La resistencia de rodadura domina en horizontal (F_roll \u2248 ${F_roll_base_N.toFixed(1)} N).`,
    'Si hay acumulaci\u00f3n de producto o transferencia con golpe, suba la resistencia adicional (N) y/o el factor de servicio (SF).',
  ];

  const result = {
    designStandard,
    loadDuty,
    efficiency_pct_raw,
    efficiency_pct_effective,
    steadyStandardMultiplier: stdMult,
    drumDiameter_m,
    drumRpm,
    massFlow_kg_s,
    frictionForce_N: F_roll_base_N,
    totalForce_N: F_steady_N,
    powerAtDrum_W: powerDrumRun_W,
    requiredMotorPower_W,
    requiredMotorPower_kW,
    torqueAtDrum_Nm: torqueRun_Nm,
    torqueStart_Nm,
    torqueWithService_Nm,
    serviceFactorUsed: serviceFactor,
    supportInfo,
    steps,
    assumptions,
    explanations,
    detail: {
      normalForce_N,
      F_roll_base_N,
      additionalResistance_N,
      F_steady_N,
      F_accel_N,
      F_total_start_N,
      powerMotorRun_W,
      powerMotorStart_W,
      powerDrumRun_W,
      powerDrumStart_W,
    },
  };

  if (raw.lang === 'en') {
    applyRollerConveyorEnglish(result, {
      stdMult,
      designStandard,
      serviceFactor,
      loadDuty,
      F_roll_base_N,
      pitchLineEn,
      geometryLineEn,
      modelScopeLineEn,
    });
  }

  return result;
}
