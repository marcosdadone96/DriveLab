/**
 * Transmisiones por correa — módulo unificado (V, síncrona, plana, Poly-V).
 * Cinemática en primitivos; tramo abierto. Referencias orientativas ISO 4184 / perfil.
 */

import { rpmToRadPerSec } from './siUnits.js';

/** @typedef {'v_trapezoidal'|'synchronous'|'flat'|'poly_v'} BeltDriveType */

export const V_BELT_PROFILES = [
  { id: 'SPZ', label: 'SPZ (estrecha)', norm: 'ISO 4184' },
  { id: 'SPA', label: 'SPA', norm: 'ISO 4184' },
  { id: 'SPB', label: 'SPB', norm: 'ISO 4184' },
  { id: 'SPC', label: 'SPC', norm: 'ISO 4184' },
  { id: 'XPZ', label: 'XPZ (estrecha alta)', norm: 'ISO 4184' },
  { id: 'XPA', label: 'XPA', norm: 'ISO 4184' },
  { id: 'XPB', label: 'XPB', norm: 'ISO 4184' },
];

/** Paso p (mm) en primitivo de correa dentada — valores orientativos para cinemática. */
export const SYNC_PITCH_PRESETS = [
  { id: '2.032', label: 'XL · 2,032 mm (≈1/5")', pitch_mm: 2.032 },
  { id: '3', label: 'HTD / perfil 3M · 3 mm', pitch_mm: 3 },
  { id: '5', label: 'HTD / T5 / 5M · 5 mm', pitch_mm: 5 },
  { id: '8', label: 'HTD / AT5 base · 8 mm', pitch_mm: 8 },
  { id: '8_at', label: 'AT10 (paso 10 mm)', pitch_mm: 10 },
  { id: '14', label: 'HTD 14M · 14 mm', pitch_mm: 14 },
];

export const POLY_V_PROFILES = [
  { id: 'PJ', label: 'PJ (4,7 mm)', norm: 'ISO 9982' },
  { id: 'PK', label: 'PK (9,7 mm)', norm: 'ISO 9982' },
  { id: 'PL', label: 'PL (14,8 mm)', norm: 'ISO 9982' },
  { id: 'PM', label: 'PM (22,4 mm)', norm: 'ISO 9982' },
];

/**
 * Diámetro primitivo a partir de número de dientes y paso (correa dentada).
 * @param {number} Z
 * @param {number} pitch_mm
 */
export function syncPrimitiveDiameter_mm(Z, pitch_mm) {
  const z = Math.max(6, Number(Z) || 0);
  const p = Math.max(0.5, Number(pitch_mm) || 5);
  return (z * p) / Math.PI;
}

/**
 * Longitud primitiva tramo abierto y ángulos de abrazamiento (misma geometría que correa flexible).
 */
function openBeltPrimitiveGeometry(d1_mm, d2_mm, center_mm) {
  const d1 = Math.max(10, Number(d1_mm) || 100);
  const d2 = Math.max(10, Number(d2_mm) || 200);
  const Craw = Number(center_mm);
  const C = Number.isFinite(Craw) && Craw > 0 ? Craw : 400;
  const k = Math.abs(d2 - d1) / (2 * C);
  const geometryValid = Number.isFinite(k) && k < 1;
  const L = 2 * C + (Math.PI / 2) * (d1 + d2) + ((d2 - d1) * (d2 - d1)) / (4 * C);
  const alpha = geometryValid ? Math.asin(k) : NaN;
  const wrap1 = Math.PI - 2 * alpha;
  const wrap2 = Math.PI + 2 * alpha;
  const dLarge = Math.max(d1, d2);
  const dSmall = Math.min(d1, d2);
  return {
    d1,
    d2,
    dSmall,
    dLarge,
    center_mm: C,
    beltLength_mm: L,
    ratio_d2_d1: d2 / d1,
    /** Relación cinemática i = ω₁/ω₂ ≈ d₂/d₁ (reductor si d₂>d₁). */
    ratio_i: d2 / d1,
    wrapAngle_deg_small: geometryValid ? (wrap1 * 180) / Math.PI : NaN,
    wrapAngle_deg_large: geometryValid ? (wrap2 * 180) / Math.PI : NaN,
    geometryValid,
    geometryNote: geometryValid ? '' : 'Geometria no fisica: C debe ser mayor que |d2-d1|/2.',
  };
}

/**
 * Veredicto de régimen por velocidad lineal en primitivo motriz (m/s).
 * @param {number | null | undefined} v_m_s
 */
export function beltLinearSpeedVerdict(v_m_s) {
  if (v_m_s == null || !Number.isFinite(v_m_s)) {
    return {
      level: 'unknown',
      key: 'unknown',
      title: 'Sin dato',
      detail: 'Indique n₁ &gt; 0 y diámetros para estimar v.',
    };
  }
  if (v_m_s < 5) {
    return {
      level: 'warn',
      key: 'low',
      title: 'Velocidad baja',
      detail:
        'v &lt; 5 m/s: posible falta de par útil en el ramal, enfriamiento limitado e inestabilidad del ramal — revise pretensado, abrazamiento y número de correas.',
    };
  }
  if (v_m_s > 30) {
    return {
      level: 'danger',
      key: 'critical',
      title: 'Velocidad crítica',
      detail:
        'v &gt; 30 m/s: riesgo elevado por fuerza centrífuga, calor y estabilidad — poleas balanceadas, perfiles especiales y validación de fabricante.',
    };
  }
  return {
    level: 'ok',
    key: 'optimal',
    title: 'Rango óptimo',
    detail: '5 m/s ≤ v ≤ 30 m/s: régimen habitual de diseño para muchas correas industriales (sujeto a catálogo).',
  };
}

/**
 * @param {object} p
 * @param {BeltDriveType} p.beltType
 * @param {number} p.d1_mm — primitivo polea 1 (motriz), salvo síncrona: se deriva de Z₁
 * @param {number} p.d2_mm — primitivo polea 2 (conducida)
 * @param {number} p.center_mm
 * @param {number} [p.n1_rpm]
 * @param {number} [p.slip_pct] — % ; ignorado en síncrona (0)
 * @param {number} [p.Z1] @param {number} [p.Z2] @param {number} [p.pitch_mm] — síncrona
 * @param {string} [p.vBeltProfileId]
 * @param {string} [p.polyVProfileId]
 */
export function computeBeltDriveTransmission(p) {
  const beltType = /** @type {BeltDriveType} */ (p.beltType || 'v_trapezoidal');
  const C = Number(p.center_mm);
  const n1 = Number(p.n1_rpm);
  const n1f = Number.isFinite(n1) && n1 > 0 ? n1 : null;

  let d1_mm = Number(p.d1_mm);
  let d2_mm = Number(p.d2_mm);
  let slip_frac = 0;
  let slipUserPct = Number(p.slip_pct);
  /** @type {number | null} */
  let resolvedPitch_mm = null;

  if (beltType === 'synchronous') {
    const preset = SYNC_PITCH_PRESETS.find((x) => x.id === p.syncPitchId);
    const pitch = preset
      ? preset.pitch_mm
      : Math.max(0.5, Number(p.pitch_mm) || 5);
    resolvedPitch_mm = pitch;
    const Z1 = Math.max(6, Math.round(Number(p.Z1) || 20));
    const Z2 = Math.max(6, Math.round(Number(p.Z2) || 40));
    d1_mm = syncPrimitiveDiameter_mm(Z1, pitch);
    d2_mm = syncPrimitiveDiameter_mm(Z2, pitch);
    slip_frac = 0;
    slipUserPct = 0;
  } else {
    if (!Number.isFinite(d1_mm)) d1_mm = 125;
    if (!Number.isFinite(d2_mm)) d2_mm = 280;
    if (beltType === 'v_trapezoidal') {
      const s = Number.isFinite(slipUserPct) ? slipUserPct : 2;
      slip_frac = Math.min(0.2, Math.max(0, s / 100));
    } else if (beltType === 'flat') {
      const s = Number.isFinite(slipUserPct) ? slipUserPct : 0.5;
      slip_frac = Math.min(0.15, Math.max(0, s / 100));
    } else {
      /* poly_v */
      const s = Number.isFinite(slipUserPct) ? slipUserPct : 1;
      slip_frac = Math.min(0.15, Math.max(0, s / 100));
    }
  }

  const geom = openBeltPrimitiveGeometry(d1_mm, d2_mm, C);

  const r1_m = geom.d1 / 2000;
  const r2_m = geom.d2 / 2000;
  const omega1_rad_s = n1f != null ? rpmToRadPerSec(n1f) : null;
  const v_m_s = omega1_rad_s != null ? omega1_rad_s * r1_m : null;

  const n2_theoretical_rpm = n1f != null && geom.d2 > 0 ? (n1f * geom.d1) / geom.d2 : null;
  const n2_rpm_real =
    n2_theoretical_rpm != null ? n2_theoretical_rpm * (1 - slip_frac) : null;
  const omega2_rad_s = n2_rpm_real != null ? rpmToRadPerSec(n2_rpm_real) : null;

  const speedVerdict = beltLinearSpeedVerdict(v_m_s);

  const profileNote = (() => {
    if (beltType === 'v_trapezoidal') {
      const pr = V_BELT_PROFILES.find((x) => x.id === p.vBeltProfileId) || V_BELT_PROFILES[1];
      return `${pr.label} · ${pr.norm}`;
    }
    if (beltType === 'synchronous') {
      const pr =
        SYNC_PITCH_PRESETS.find((x) => x.id === p.syncPitchId) ||
        SYNC_PITCH_PRESETS.find((x) => resolvedPitch_mm != null && Math.abs(x.pitch_mm - resolvedPitch_mm) < 1e-6) ||
        SYNC_PITCH_PRESETS[2];
      return `${pr.label} (p = ${(resolvedPitch_mm ?? pr.pitch_mm).toFixed(3)} mm)`;
    }
    if (beltType === 'poly_v') {
      const pr = POLY_V_PROFILES.find((x) => x.id === p.polyVProfileId) || POLY_V_PROFILES[1];
      return `${pr.label} · ${pr.norm}`;
    }
    return 'Correa plana — pretensado y coeficiente de fricción según revestimiento';
  })();

  return {
    beltType,
    ...geom,
    slip_pct: slip_frac * 100,
    slipApplied: beltType !== 'synchronous',
    n1_rpm: n1f,
    n2_rpm_theoretical: n2_theoretical_rpm,
    n2_rpm: n2_rpm_real,
    omega1_rad_s,
    omega2_rad_s,
    beltSpeed_m_s: v_m_s,
    speedVerdict,
    profileNote,
    Z1: beltType === 'synchronous' ? Math.round(Number(p.Z1) || 20) : null,
    Z2: beltType === 'synchronous' ? Math.round(Number(p.Z2) || 40) : null,
    pitch_mm: beltType === 'synchronous' ? resolvedPitch_mm : null,
  };
}
