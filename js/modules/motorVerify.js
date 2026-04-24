/**
 * Comprobación heurística: ¿puede un motorreductor de catálogo cubrir el punto de trabajo?
 * Criterios: potencia de motor, par de salida, proximidad de rpm de salida al tambor.
 */

import { augmentVerifyWithMounting, modelMatchesMounting } from './mountingPreferences.js';
import { getCurrentLang } from '../config/locales.js';

/**
 * @typedef {object} DriveRequirement
 * @property {number} power_kW — potencia mecánica requerida en el eje de motor (aprox. la calculada η cadena)
 * @property {number} torque_Nm — par en el tambor (con factor de servicio aplicado)
 * @property {number} drum_rpm — rpm del tambor
 * @property {'B3'|'B5'|'B14'|'hollowShaft'} [mountingType]
 * @property {number | null} [machineShaftDiameter_mm]
 * @property {'horizontal'|'vertical'} [orientation]
 * @property {string} [spaceConstraint]
 */

/**
 * @typedef {object} GearmotorModel
 * @property {string} id
 * @property {string} brandId
 * @property {string} code
 * @property {string} series
 * @property {number} motor_kW
 * @property {number} motor_rpm_nom
 * @property {number} ratio
 * @property {number} n2_rpm
 * @property {number} T2_nom_Nm
 * @property {number} T2_peak_Nm
 * @property {number} eta_g
 * @property {string} enclosure
 * @property {string} duty
 * @property {string} notes
 * @property {string} [datasheetUrl] — enlace directo a ficha PDF o página técnica
 * @property {Array<'B3'|'B5'|'B14'|'hollowShaft'>} [mountingTypes]
 * @property {string} [flangeLabel]
 * @property {string} [shaftConfigLabel]
 * @property {{ kind: 'solid'|'hollow'; nominalDiameter_mm: number }} [outputShaft]
 * @property {boolean} [userManual] — datos introducidos a mano (textos de verificación adaptados)
 * @property {boolean} [parametric] — fila generada desde registro paramétrico (familia/talla/relación)
 */

/**
 * Construye un modelo mínimo a partir de ficha/placa para `verifyGearmotorAgainstRequirement`.
 * No incluye `mountingTypes`: la comprobación IEC no aplica en este modo (solo P, T₂, n₂).
 * @param {object} p
 * @param {number} p.motor_kW
 * @param {number} p.n2_rpm
 * @param {number} p.T2_nom_Nm
 * @param {number} [p.T2_peak_Nm]
 * @param {number} [p.motor_rpm_nom]
 * @param {string} [p.code]
 * @param {number} [p.eta_g]
 */
export function buildManualGearmotorModel(p) {
  const motor_kW = Math.max(0, Number(p.motor_kW) || 0);
  const n2_rpm = Math.max(0.01, Number(p.n2_rpm) || 0);
  const T2_nom_Nm = Math.max(0, Number(p.T2_nom_Nm) || 0);
  let motor_rpm_nom = Number(p.motor_rpm_nom);
  if (!Number.isFinite(motor_rpm_nom) || motor_rpm_nom <= 0) motor_rpm_nom = 1400;
  let T2_peak_Nm = Number(p.T2_peak_Nm);
  if (!Number.isFinite(T2_peak_Nm) || T2_peak_Nm <= 0) T2_peak_Nm = T2_nom_Nm * 1.3;
  let eta_g = Number(p.eta_g);
  if (Number.isFinite(eta_g) && eta_g > 1 && eta_g <= 100) eta_g /= 100;
  if (!Number.isFinite(eta_g) || eta_g <= 0 || eta_g > 1) eta_g = 0.92;
  const ratio = motor_rpm_nom / n2_rpm;
  const en = getCurrentLang() === 'en';
  const code =
    String(
      p.code ||
        (en ? 'My gearmotor · manual data' : 'Mi motorreductor \u00b7 datos manuales'),
    )
      .trim()
      .slice(0, 200) ||
    (en ? 'My gearmotor · manual data' : 'Mi motorreductor \u00b7 datos manuales');

  return {
    id: 'user-manual-entry',
    brandId: 'custom',
    code,
    series: en ? 'Manual entry' : 'Entrada manual',
    motor_kW,
    motor_rpm_nom,
    ratio,
    n2_rpm,
    T2_nom_Nm,
    T2_peak_Nm,
    eta_g,
    enclosure: '—',
    duty: 'S1',
    notes: en ? 'User-entered parameters' : 'Par\u00e1metros introducidos por el usuario',
    userManual: true,
  };
}

/**
 * @typedef {object} VerifyResult
 * @property {boolean} suitable
 * @property {string} verdict
 * @property {string[]} checks
 * @property {string[]} warnings
 * @property {string[]} blockers
 */

/** Margen mínimo sobre potencia de motor (catálogo vs requerida) */
const P_MARGIN = 1.05;
/** Margen mínimo sobre par nominal de salida */
const T_MARGIN = 1.05;
/** Desviación admisible de rpm salida vs tambor (advertencia si se supera) */
const RPM_WARN_FRAC = 0.18;
/** Desviación fuerte (riesgo de no poder ajustar sin cambiar relación) */
const RPM_BAD_FRAC = 0.35;

/**
 * @param {DriveRequirement} req
 * @param {GearmotorModel} model
 * @returns {VerifyResult}
 */
export function verifyGearmotorAgainstRequirement(req, model) {
  const en = getCurrentLang() === 'en';
  const checks = [];
  const warnings = [];
  const blockers = [];

  const Preq = Math.max(0, req.power_kW || 0);
  const Treq = Math.max(0, req.torque_Nm || 0);
  const nDrum = Math.max(0.01, req.drum_rpm || 0.01);
  const n2 = model.n2_rpm;
  const src = model.userManual ? (en ? 'entered' : 'indicado') : en ? 'catalog' : 'cat\u00e1logo';
  const badP = en ? 'INSUFFICIENT' : 'INSUFICIENTE';

  const pOk = model.motor_kW + 1e-6 >= Preq * P_MARGIN;
  checks.push(
    en
      ? `Motor power: need \u2265 ${(Preq * P_MARGIN).toFixed(2)} kW \u00b7 ${src} ${model.motor_kW} kW \u2192 ${pOk ? 'OK' : badP}`
      : `Potencia motor: necesita \u2265 ${(Preq * P_MARGIN).toFixed(2)} kW \u00b7 ${src} ${model.motor_kW} kW \u2192 ${pOk ? 'OK' : badP}`,
  );
  if (!pOk)
    blockers.push(
      en
        ? 'Motor rated power is below required power (5% margin).'
        : 'La potencia nominal del motor es inferior a la requerida (con margen del 5%).',
    );

  const tOk = model.T2_nom_Nm + 1e-6 >= Treq * T_MARGIN;
  checks.push(
    en
      ? `Output torque T2 (nominal): need \u2265 ${(Treq * T_MARGIN).toFixed(1)} N\u00b7m \u00b7 ${src} ${model.T2_nom_Nm} N\u00b7m \u2192 ${tOk ? 'OK' : badP}`
      : `Par salida T\u2082 (nominal): necesita \u2265 ${(Treq * T_MARGIN).toFixed(1)} N\u00b7m \u00b7 ${src} ${model.T2_nom_Nm} N\u00b7m \u2192 ${tOk ? 'OK' : badP}`,
  );
  if (!tOk)
    blockers.push(
      en
        ? 'Rated output torque of the gearbox is below drum design torque (with margin).'
        : 'El par nominal de salida del reductor es inferior al par de dise\u00f1o en tambor (con margen).',
    );

  const rpmDev = Math.abs(n2 - nDrum) / nDrum;
  checks.push(
    en
      ? `Output speed: drum ${nDrum.toFixed(1)} min\u207b\u00b9 vs gearbox output ${n2.toFixed(1)} min\u207b\u00b9 (\u0394 ${(rpmDev * 100).toFixed(1)}%)`
      : `Velocidad salida: tambor ${nDrum.toFixed(1)} min\u207b\u00b9 vs salida reductor ${n2.toFixed(1)} min\u207b\u00b9 (\u0394 ${(rpmDev * 100).toFixed(1)}%)`,
  );
  if (rpmDev > RPM_BAD_FRAC) {
    warnings.push(
      en
        ? 'Large speed mismatch between gearbox output and drum: you likely need a different ratio, pulleys, or gearing.'
        : 'Gran diferencia de velocidad de giro entre salida del reductor y tambor: probablemente necesite otra relaci\u00f3n, poleas o engrane.',
    );
  } else if (rpmDev > RPM_WARN_FRAC) {
    warnings.push(
      en
        ? 'Moderate speed mismatch: confirm exact ratio in the catalog or belt slip.'
        : 'Diferencia moderada de velocidad de giro: valide con el cat\u00e1logo la relaci\u00f3n exacta o el deslizamiento de la banda.',
    );
  }

  if (model.T2_peak_Nm < Treq) {
    warnings.push(
      en
        ? `Peak torque ${model.userManual ? 'entered' : 'catalog'} (${model.T2_peak_Nm} N\u00b7m) is below required torque; review startups under load.`
        : `El par pico ${model.userManual ? 'indicado' : 'catalogado'} (${model.T2_peak_Nm} N\u00b7m) es inferior al par solicitado; revise arranques bajo carga.`,
    );
  }

  const suitable = pOk && tOk && blockers.length === 0;

  let verdict = suitable
    ? en
      ? 'In principle YES for this duty point (confirm terminals, brakes, and real duty cycle).'
      : 'En principio S\u00cd puede valer para este punto de trabajo (revisar termina, frenos y ciclo real).'
    : en
      ? 'NOT recommended as-is: this sample model does not meet stated requirements.'
      : 'NO se recomienda tal cual: hay requisitos no cubiertos por este modelo de ejemplo.';

  if (suitable && warnings.length) {
    verdict += en
      ? ' Review speed and peak-torque warnings.'
      : ' Revise las advertencias de velocidad / pico de par.';
  }

  const base = { suitable, verdict, checks, warnings, blockers };
  return augmentVerifyWithMounting(req, model, base);
}

/**
 * Puntuación simple para ordenar recomendaciones (mayor = mejor ajuste).
 * @param {DriveRequirement} req
 * @param {GearmotorModel} model
 */
export function scoreModelFit(req, model) {
  const Preq = Math.max(0.01, req.power_kW || 0);
  const Treq = Math.max(0.01, req.torque_Nm || 0);
  const nDrum = Math.max(0.01, req.drum_rpm || 0.01);

  const pRatio = model.motor_kW / Preq;
  const tRatio = model.T2_nom_Nm / Treq;
  const rpmDev = Math.abs(model.n2_rpm - nDrum) / nDrum;

  let score = 0;
  if (pRatio >= P_MARGIN) score += Math.min(2, pRatio - 1);
  if (tRatio >= T_MARGIN) score += Math.min(3, tRatio - 1) * 1.2;
  score -= rpmDev * 2;
  if (model.T2_peak_Nm >= Treq * 1.2) score += 0.3;
  if (req.mountingType && modelMatchesMounting(model, req.mountingType)) score += 0.45;
  return score;
}
