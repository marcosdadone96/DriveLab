/**
 * Ascensor de tracción (montacargas / orientativo personas) — tracción por cable, contrapeso, Euler-Eytelwein.
 * Modelo educativo; no sustituye EN 81-20/50, códigos locales ni memoria de cálculo de fabricante.
 */

/** @typedef {'1_1'|'2_1'} ReevingType */
/** @typedef {'freight'|'persons'} ElevatorDuty */

const g = 9.81;

/**
 * Catálogo demo: cable acero 6×19 clase orientativa — carga mínima de rotura por cable (kN).
 * @type {Array<{ d_mm: number, minBreak_kN: number }>}
 */
export const WIRE_ROPE_CATALOG = [
  { d_mm: 8, minBreak_kN: 44 },
  { d_mm: 9, minBreak_kN: 55 },
  { d_mm: 10, minBreak_kN: 68 },
  { d_mm: 11, minBreak_kN: 82 },
  { d_mm: 12, minBreak_kN: 97 },
  { d_mm: 13, minBreak_kN: 113 },
  { d_mm: 14, minBreak_kN: 130 },
];

/**
 * Masa de contrapeso habitual: cabina + k · carga útil (k ≈ 0,4–0,5).
 */
export function optimalCounterweight_kg(emptyCar_kg, usefulLoad_kg, k = 0.45) {
  const Mc = Math.max(0, Number(emptyCar_kg) || 0);
  const Q = Math.max(0, Number(usefulLoad_kg) || 0);
  const kk = Math.max(0.35, Math.min(0.55, Number(k) || 0.45));
  return Mc + kk * Q;
}

/**
 * Límite Euler-Eytelwein: T₁/T₂ ≤ e^(μ α) (α en rad).
 */
export function eulerLimit(mu, wrapAngle_rad) {
  const m = Math.max(0.02, Number(mu) || 0.1);
  const a = Math.max(0.1, Number(wrapAngle_rad) || Math.PI);
  return Math.exp(m * a);
}

/**
 * Peor relación de tensiones estáticas en la polea (rama cargada / rama contrapeso) — casos típicos ascenso pleno y descenso vacío.
 */
export function worstStaticTensionRatio(Mc, Q, Mcp) {
  const mc = Math.max(1e-6, Mc);
  const q = Math.max(0, Q);
  const mcp = Math.max(1e-6, Mcp);
  const fullCar = mc + q;
  const r1 = fullCar / mcp;
  const r2 = mcp / mc;
  return Math.max(r1, r2);
}

/**
 * Selección de diámetro y número de cables: n · F_rot ≥ (Mc+Q)·g · SF.
 * @returns {{ d_mm: number, n: number, minBreak_kN: number, utilFactor: number }}
 */
export function selectWireRope(Mc, Q, safetyFactor, maxStrands = 8) {
  const W = Math.max(0, Mc + Q) * g;
  const SF = Math.max(4, Number(safetyFactor) || 10);
  const maxN = Math.max(2, Math.round(Number(maxStrands) || 8));
  let best = /** @type {{ d_mm: number, n: number, minBreak_kN: number, utilFactor: number } | null} */ (null);
  for (const row of WIRE_ROPE_CATALOG) {
    const F = row.minBreak_kN * 1000;
    const n = Math.ceil((W * SF) / F);
    if (n <= maxN) {
      const util = W / (n * F);
      if (!best || row.d_mm < best.d_mm || (row.d_mm === best.d_mm && n < best.n)) {
        best = { d_mm: row.d_mm, n, minBreak_kN: row.minBreak_kN, utilFactor: util };
      }
    }
  }
  if (!best) {
    const row = WIRE_ROPE_CATALOG[WIRE_ROPE_CATALOG.length - 1];
    const F = row.minBreak_kN * 1000;
    const n = Math.ceil((W * SF) / F);
    best = { d_mm: row.d_mm, n, minBreak_kN: row.minBreak_kN, utilFactor: W / (n * F) };
  }
  return best;
}

/**
 * Par de frenado orientativo en la polea (par resistente a desequilibrio máximo).
 */
export function emergencyBrakeTorque_Nm(Mc, Q, Mcp, sheaveDiameter_m, brakeFactor = 1.25) {
  const D = Math.max(0.1, Number(sheaveDiameter_m) || 0.5);
  const bf = Math.max(1, Number(brakeFactor) || 1.25);
  const dF = Math.max(Math.abs(Mc + Q - Mcp), Math.abs(Mcp - Mc)) * g;
  return bf * dF * (D / 2);
}

/**
 * @param {object} p
 * @param {number} p.usefulLoad_kg
 * @param {number} p.emptyCar_kg
 * @param {number | null} [p.counterweight_kg] — si null, se usa óptimo con p.counterweightFraction
 * @param {number} [p.counterweightFraction] — 0,4–0,5
 * @param {number} p.travelHeight_m
 * @param {number} p.speed_m_s
 * @param {ReevingType} p.reeving
 * @param {number} p.sheaveDiameter_m
 * @param {number} p.wrapAngle_deg — abrazamiento en polea tractora
 * @param {number} p.friction_mu — μ cable–canal (orientativo)
 * @param {ElevatorDuty} p.duty — freight → SF 10, persons → 12
 * @param {number} [p.maxStrands]
 */
export function computeTractionElevator(p) {
  const Q = Math.max(0, Number(p.usefulLoad_kg) || 0);
  const Mc = Math.max(1, Number(p.emptyCar_kg) || 500);
  const H = Math.max(0.5, Number(p.travelHeight_m) || 10);
  const v = Math.max(0.1, Number(p.speed_m_s) || 1);
  const D = Math.max(0.2, Number(p.sheaveDiameter_m) || 0.6);
  const alpha_deg = Math.max(90, Math.min(360, Number(p.wrapAngle_deg) || 180));
  const alpha = (alpha_deg * Math.PI) / 180;
  const mu = Math.max(0.05, Math.min(0.25, Number(p.friction_mu) || 0.1));
  const duty = p.duty === 'persons' ? 'persons' : 'freight';
  const SF = duty === 'persons' ? 12 : 10;
  const kCw = Math.max(0.35, Math.min(0.55, Number(p.counterweightFraction) ?? 0.45));
  const Mcp_opt = optimalCounterweight_kg(Mc, Q, kCw);
  const Mcp =
    p.counterweight_kg != null && Number.isFinite(Number(p.counterweight_kg))
      ? Math.max(Mc * 0.5, Number(p.counterweight_kg))
      : Mcp_opt;

  const reeving = p.reeving === '2_1' ? '2_1' : '1_1';
  const mechFactor = reeving === '2_1' ? 0.5 : 1;

  const ratio = worstStaticTensionRatio(Mc, Q, Mcp);
  const lim = eulerLimit(mu, alpha);
  const adhesionOk = ratio <= lim * 0.999;
  const adhesionMargin = lim / Math.max(ratio, 1e-6);

  const rope = selectWireRope(Mc, Q, SF, p.maxStrands ?? 8);
  const T_brake = emergencyBrakeTorque_Nm(Mc, Q, Mcp, D, 1.25);
  const DdRatio = (D * 1000) / Math.max(1, rope.d_mm);
  const minDdRecommended = duty === 'persons' ? 40 : 35;

  const F_imbalance = Math.abs(Mc + Q - Mcp) * g;
  const P_lift_kW = (F_imbalance * v * mechFactor) / 1000;
  const E_no_cw_J = (Mc + Q) * g * H * 2;
  const E_with_J = F_imbalance * H * 2;
  const savingPct = E_no_cw_J > 0 ? Math.min(95, ((E_no_cw_J - E_with_J) / E_no_cw_J) * 100) : 0;

  const omega = (v * (reeving === '2_1' ? 2 : 1) * 2) / D;
  const n_rpm = (omega * 60) / (2 * Math.PI);

  /** @type {Array<{ level: 'ok'|'warn'|'err', code: string, text: string }>} */
  const verdicts = [];
  if (!adhesionOk) {
    verdicts.push({
      level: 'err',
      code: 'euler',
      text: `Riesgo de deslizamiento en la polea: T₁/T₂ ≈ ${ratio.toFixed(2)} supera e^(μα) ≈ ${lim.toFixed(2)}. Aumente abrazamiento, μ efectivo (entallas), o ajuste contrapeso / masas.`,
    });
  } else if (adhesionMargin < 1.12) {
    verdicts.push({
      level: 'warn',
      code: 'euler_margin',
      text: `Margen de adherencia bajo (≈ ${adhesionMargin.toFixed(2)}). Revise canal, estado de cables y carga máxima real.`,
    });
  }

  if (rope.utilFactor > 0.82) {
    verdicts.push({
      level: 'warn',
      code: 'rope_util',
      text: 'Utilización elevada de la resistencia nominal del cable en el modelo demo — prefiera diámetro superior o más tiras.',
    });
  }

  if (DdRatio < minDdRecommended) {
    verdicts.push({
      level: 'warn',
      code: 'dd_ratio',
      text: `Relación D/d baja (≈ ${DdRatio.toFixed(1)}). Recomendable D/d >= ${minDdRecommended} para este servicio; considere mayor polea o menor diámetro de cable.`,
    });
  }

  if (mu < 0.08 || mu > 0.15) {
    verdicts.push({
      level: 'warn',
      code: 'mu_range',
      text: `μ=${mu.toFixed(2)} fuera del rango orientativo habitual (0.08–0.15). Valide canal, acabado y condiciones reales de tracción.`,
    });
  }

  if (adhesionOk && adhesionMargin < 1.2) {
    verdicts.push({
      level: 'warn',
      code: 'adhesion_target',
      text: `Margen de adherencia correcto pero justo (x${adhesionMargin.toFixed(2)}). Objetivo recomendado: >= x1.20 en diseño preliminar.`,
    });
  }

  if ((duty === 'persons' && v > 1.75) || (duty === 'freight' && v > 1.25)) {
    verdicts.push({
      level: 'warn',
      code: 'speed_service',
      text: `Velocidad ${v.toFixed(2)} m/s elevada para servicio ${duty === 'persons' ? 'personas' : 'carga'} en este modelo simplificado; confirme dinámica de arranque/frenado y confort en cálculo detallado.`,
    });
  }

  const tractionOk = adhesionOk && rope.n <= (p.maxStrands ?? 8) + 2;
  if (tractionOk && verdicts.length === 0) {
    verdicts.push({
      level: 'ok',
      code: 'ok',
      text: `Cálculo de tracción OK (modelo orientativo). Se requieren ${rope.n} cable(s) de Ø${rope.d_mm} mm (SF ≈ ${SF}).`,
    });
  } else if (tractionOk && verdicts.every((x) => x.level !== 'err')) {
    verdicts.push({
      level: 'ok',
      code: 'rope_ok',
      text: `Configuración de cables: ${rope.n} × Ø${rope.d_mm} mm (rotura nominal ≈ ${rope.minBreak_kN} kN/cable).`,
    });
  }

  const steps = [
    {
      id: 'cw',
      title: 'Contrapeso objetivo',
      formula: 'Mcp_opt = Mc + k*Q',
      substitution: `Mc=${Mc.toFixed(0)} kg, Q=${Q.toFixed(0)} kg, k=${kCw.toFixed(2)}`,
      value: Mcp_opt,
      unit: 'kg',
      meaning: 'Compensación orientativa de cabina y fracción de carga útil.',
    },
    {
      id: 'euler',
      title: 'Límite de adherencia',
      formula: 'T1/T2 <= exp(mu*alpha)',
      substitution: `mu=${mu.toFixed(3)}, alpha=${alpha_deg.toFixed(0)}°`,
      value: lim,
      unit: '—',
      meaning: 'Criterio Euler-Eytelwein en polea tractora.',
    },
    {
      id: 'ratio',
      title: 'Relación de tensiones peor caso',
      formula: 'max((Mc+Q)/Mcp, Mcp/Mc)',
      substitution: `Mcp=${Mcp.toFixed(0)} kg`,
      value: ratio,
      unit: '—',
      meaning: 'Se compara contra exp(mu*alpha).',
    },
    {
      id: 'power',
      title: 'Potencia orientativa en polea',
      formula: 'P = |Mc+Q-Mcp|*g*v*factor',
      substitution: `v=${v.toFixed(2)} m/s, reeving=${reeving}`,
      value: P_lift_kW,
      unit: 'kW',
      meaning: 'Orden de magnitud por desequilibrio de masas.',
    },
    {
      id: 'brake',
      title: 'Par de frenado de emergencia',
      formula: 'T_brake = bf*DeltaF*(D/2)',
      substitution: `bf=1.25, D=${D.toFixed(2)} m`,
      value: T_brake,
      unit: 'N·m',
      meaning: 'Par resistente orientativo para retención.',
    },
    {
      id: 'dd',
      title: 'Chequeo geométrico D/d',
      formula: 'D/d = (D*1000) / d_cable',
      substitution: `D=${(D * 1000).toFixed(0)} mm, d=${rope.d_mm} mm`,
      value: DdRatio,
      unit: '—',
      meaning: `Referencia preliminar: D/d >= ${minDdRecommended} (${duty === 'persons' ? 'personas' : 'carga'}).`,
    },
  ];

  const explanations = [
    `Adherencia: T1/T2=${ratio.toFixed(2)} frente a limite exp(mu*alpha)=${lim.toFixed(2)} (margen x${adhesionMargin.toFixed(2)}).`,
    `Configuracion de cables sugerida: ${rope.n} x Ø${rope.d_mm} mm (${rope.minBreak_kN} kN por cable).`,
    `Chequeo D/d: ${DdRatio.toFixed(1)} (objetivo >= ${minDdRecommended}).`,
    `Ahorro energetico orientativo por contrapeso: ${Math.max(0, savingPct).toFixed(0)} %.`,
  ];

  const assumptions = [
    'Modelo estatico-orientativo de traccion por cables y polea; no sustituye EN 81 ni proyecto reglamentario.',
    'Se evalua adherencia con Euler-Eytelwein usando mu y angulo de abrazamiento declarados.',
    'Potencia orientativa basada en desequilibrio de masas (sin regeneracion ni ciclo real detallado).',
    'Seleccion de cables con catalogo demo de carga minima de rotura; validar cable real y terminaciones.',
    'Factor de seguridad demo: 10 (carga) y 12 (personas).',
  ];

  return {
    inputs: {
      Q,
      Mc,
      Mcp,
      Mcp_optimal: Mcp_opt,
      counterweightFraction: kCw,
      H,
      v,
      D,
      alpha_deg,
      mu,
      reeving,
      duty,
      SF,
    },
    euler: {
      tensionRatioWorst: ratio,
      limit: lim,
      adhesionOk,
      adhesionMargin,
    },
    rope,
    brake: { torque_Nm: T_brake },
    energy: {
      savingVsNoCounterweight_pct: Math.max(0, savingPct),
      note: 'Comparativa orientativa subida+bajada sin regeneración.',
    },
    drive: {
      imbalance_N: F_imbalance,
      power_kW_orientative: P_lift_kW,
      sheave_rpm: n_rpm,
    },
    steps,
    explanations,
    assumptions,
    verdicts,
    disclaimer:
      'No es memoria de instalación reglamentaria. Verifique EN 81, normas de cables (p. ej. EN 12385) y proyecto firmado.',
  };
}
