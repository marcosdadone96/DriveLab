/**
 * Verificación orientativa al espíritu AGMA 2001-D04 (engranajes cilíndricos rectos).
 * Modelo educativo simplificado: Lewis + contacto Hertziano aproximado — NO sustituye
 * análisis AGMA completo (K_v, K_B, K_Hβ, Z_I, factores de distribución, etc.).
 */

/** Factor de forma Lewis Y (20° profundidad total) — interpolación en tabla típica. */
export function lewisFormFactorY(z) {
  const zz = Math.max(6, Math.min(400, z));
  const pts = [
    [12, 0.245],
    [15, 0.275],
    [17, 0.302],
    [20, 0.32],
    [25, 0.339],
    [30, 0.348],
    [40, 0.389],
    [50, 0.408],
    [80, 0.436],
    [100, 0.446],
    [150, 0.47],
    [200, 0.502],
  ];
  if (zz <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (zz <= pts[i][0]) {
      const [z0, y0] = pts[i - 1];
      const [z1, y1] = pts[i];
      const t = (zz - z0) / (z1 - z0);
      return y0 + t * (y1 - y0);
    }
  }
  return pts[pts.length - 1][1];
}

/**
 * Velocidad de línea de engrane (primitivo) m/s — d en mm, n en min⁻¹.
 */
export function pitchLineVelocity_m_s(d_mm, n_rpm) {
  return (Math.PI * d_mm * n_rpm) / 60000;
}

/**
 * Carga tangencial en N a partir del par en el piñón (N·m) y diámetro primitivo (mm).
 */
export function tangentialLoad_N(T_Nm, d_mm) {
  const d_m = d_mm / 1000;
  if (d_m <= 0) return NaN;
  return (2 * T_Nm) / d_m;
}

/**
 * Tensión de flexión orientativa Lewis σ_F (MPa). Ft en N, b,m en mm.
 */
export function bendingStressLewis_MPa(Ft_N, b_mm, m_mm, Y) {
  if (b_mm <= 0 || m_mm <= 0 || Y <= 0) return NaN;
  return Ft_N / (b_mm * m_mm * Y);
}

/**
 * Tensión de contacto orientativa (acero-acero, 20°) — forma reducida tipo Hertz.
 * u = z2/z1 (relación). Coeficiente calibrado para órdenes de magnitud de enseñanza.
 */
export function contactStressApprox_MPa(Ft_N, b_mm, d1_mm, u) {
  if (b_mm <= 0 || d1_mm <= 0 || u <= 0) return NaN;
  return 169 * Math.sqrt((Ft_N * (u + 1)) / (b_mm * d1_mm * u));
}

/**
 * @param {object} p
 * @param {number} p.z1
 * @param {number} p.z2
 * @param {number} p.module_mm
 * @param {number} p.d1_mm
 * @param {number} p.faceWidth_mm
 * @param {number} p.n1_rpm
 * @param {number} [p.torquePinion_Nm]
 * @param {number} [p.powerPinion_kW]
 * @param {'grease'|'oil'} p.lubrication
 */
export function computeAgmaSimplifiedCheck(p) {
  const z1 = p.z1;
  const m = p.module_mm;
  const d1 = p.d1_mm;
  const b = Math.max(0.5, p.faceWidth_mm);
  const n1raw = Number(p.n1_rpm);
  const n1 = Number.isFinite(n1raw) && n1raw > 0 ? n1raw : 0;
  const u = p.z2 / p.z1;
  const Y = lewisFormFactorY(z1);
  const v_p = n1 > 0 ? pitchLineVelocity_m_s(d1, n1) : 0;

  let T = Number(p.torquePinion_Nm);
  if (!Number.isFinite(T) || T <= 0) {
    const P = Number(p.powerPinion_kW);
    if (Number.isFinite(P) && P > 0 && n1 > 0) {
      T = (9550 * P) / n1;
    } else {
      T = NaN;
    }
  }

  const hasLoad = Number.isFinite(T) && T > 0;
  const Ft = hasLoad ? tangentialLoad_N(T, d1) : NaN;
  const sigmaF = hasLoad ? bendingStressLewis_MPa(Ft, b, m, Y) : NaN;
  const sigmaH = hasLoad ? contactStressApprox_MPa(Ft, b, d1, u) : NaN;

  /** Valores orientativos acero templado/revenido gama industrial (no certificación). */
  const sigmaFallow = 420;
  const sigmaHallow = 1100;
  const SF = hasLoad && sigmaF > 0 ? sigmaFallow / sigmaF : NaN;
  const SH = hasLoad && sigmaH > 0 ? sigmaHallow / sigmaH : NaN;

  const lub = p.lubrication === 'grease' ? 'grease' : 'oil';
  const vpAlerts = [];
  if (n1 > 0 && lub === 'grease') {
    if (v_p > 12) vpAlerts.push({ level: 'danger', text: 'v_p > 12 m/s con grasa: riesgo de falta de película y sobrecalentamiento — valorar aceite baño o pulverización.' });
    else if (v_p > 8) vpAlerts.push({ level: 'warn', text: 'v_p elevada para lubricación con grasa: confirme tipo NLGI, sellos y límite del fabricante.' });
  } else if (n1 > 0) {
    if (v_p > 28) vpAlerts.push({ level: 'warn', text: 'v_p muy alta para engrase por salpicadura típico: puede requerir inyección forzada o diseño especial (AGMA/ISO).' });
    if (v_p > 35) vpAlerts.push({ level: 'danger', text: 'v_p excepcionalmente alta: verificar refrigeración, acabado de flancos y criterio del fabricante.' });
  }

  return {
    pitchLineVelocity_m_s: v_p,
    lewisY: Y,
    tangentialLoad_N: Ft,
    bendingStress_MPa: sigmaF,
    contactStress_MPa: sigmaH,
    bendingSafety_SF: SF,
    contactSafety_SH: SH,
    allowableBending_MPa: sigmaFallow,
    allowableContact_MPa: sigmaHallow,
    hasLoad,
    lubrication: lub,
    velocityAlerts: vpAlerts,
    disclaimer:
      'Modelo simplificado para enseñanza. AGMA 2001 completo incluye factores dinámicos, distribución de carga, confiabilidad y datos de material certificados.',
  };
}
