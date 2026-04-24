/**
 * Alertas inmediatas de diseño (rendimiento, factor de servicio, tambor vs potencia).
 */

/** @typedef {'error'|'warn'|'info'} AlertLevel */

/**
 * @param {object} p
 * @param {number} p.efficiency_pct_raw — valor tal como lo escribe el usuario (puede ser >100)
 * @param {number} p.efficiency_pct_used — tras clamp para el cálculo
 * @param {number} p.serviceFactor — valor aplicado en el cálculo
 * @param {string} p.loadDuty
 * @param {number} [p.serviceFactorFieldRaw] — valor en el campo si duty es custom (para validar &lt; 1)
 * @param {number} p.rollerDiameter_mm
 * @param {number} [p.beltWidth_m]
 * @param {number} [p.powerMotor_kW]
 * @param {number} [p.torqueDesign_Nm]
 * @returns {Array<{ level: AlertLevel; text: string }>}
 */
export function buildInputPhaseAlerts(p) {
  /** @type {Array<{ level: AlertLevel; text: string }>} */
  const out = [];

  if (p.efficiency_pct_raw > 100) {
    out.push({
      level: 'error',
      text: `Rendimiento η = ${p.efficiency_pct_raw} % no es físico (no puede superar 100 %). Se usa ${p.efficiency_pct_used} % en el cálculo hasta que corrija el valor.`,
    });
  } else if (p.efficiency_pct_raw > 99) {
    out.push({
      level: 'warn',
      text: 'η por encima del 99 % es muy optimista para cadena motor–reductor–tambor; confirme con datos reales.',
    });
  } else if (p.efficiency_pct_raw < 40 && p.efficiency_pct_raw >= 1) {
    out.push({
      level: 'warn',
      text: 'η muy bajo: revise si incluye solo el reductor o toda la transmisión hasta el tambor.',
    });
  }

  if (p.loadDuty === 'custom' && p.serviceFactorFieldRaw != null && p.serviceFactorFieldRaw < 1) {
    out.push({
      level: 'error',
      text: 'El factor de servicio personalizado debe ser ≥ 1 (AGMA/ISO: aplicación sobre el par nominal).',
    });
  } else if (p.serviceFactor < 1) {
    out.push({
      level: 'error',
      text: 'El factor de servicio aplicado debe ser ≥ 1. Revise el tipo de carga o el valor manual.',
    });
  } else if (p.serviceFactor < 1.1 && (p.loadDuty === 'moderate' || p.loadDuty === 'heavy')) {
    out.push({
      level: 'warn',
      text: 'Con choque moderado o pesado, un SF tan bajo suele ser insuficiente para la vida del reductor; revise AGMA/ISO o al fabricante.',
    });
  } else if (p.serviceFactor > 2.5) {
    out.push({
      level: 'info',
      text: 'SF elevado: dimensiona muy conservador; valide que no esté duplicando márgenes con η pesimista y choque ya modelado en aceleración.',
    });
  }

  return out;
}

/**
 * @param {object} p
 * @param {number} p.rollerDiameter_mm
 * @param {number} p.powerMotor_kW
 * @param {number} p.torqueDesign_Nm
 * @param {number} p.beltWidth_m
 * @returns {Array<{ level: AlertLevel; text: string }>}
 */
export function buildResultPhaseAlerts(p) {
  /** @type {Array<{ level: AlertLevel; text: string }>} */
  const out = [];
  const D = p.rollerDiameter_mm;
  const P = p.powerMotor_kW;
  const B = Math.max(p.beltWidth_m || 0.65, 0.15);
  const T = p.torqueDesign_Nm;
  const R = D / 2000;

  if (!Number.isFinite(P) || !Number.isFinite(T) || R <= 0) return out;

  if (P > 100 && D < 630) {
    out.push({
      level: 'warn',
      text: `Potencia de eje ≈ ${P.toFixed(2)} kW con tambor Ø ${D} mm: diámetro habitualmente pequeño para esa clase de potencia; riesgo de vida útil de banda y contacto Hertz. Consulte tablas de tambor mínimo del fabricante de banda.`,
    });
  } else if (P > 30 && D < 400) {
    out.push({
      level: 'warn',
      text: `Ø ${D} mm frente a ≈ ${P.toFixed(2)} kW: valide radio mínimo de curvatura de la banda y presión en el contacto.`,
    });
  } else if (P > 5 && D < 250) {
    out.push({
      level: 'info',
      text: `Tambor Ø ${D} mm con ≈ ${P.toFixed(2)} kW: aceptable en equipos ligeros; confirme si la banda exige diámetro mínimo mayor.`,
    });
  }

  const Fcirc = T / R;
  const tensionPerWidth = Fcirc / B;
  if (tensionPerWidth > 120000) {
    out.push({
      level: 'warn',
      text: `Tracción periférica elevada frente al ancho (${(tensionPerWidth / 1000).toFixed(0)} kN/m aprox.): compruebe capa de banda y unión; puede requerirse tambor mayor o banda de mayor resistencia.`,
    });
  }

  return out;
}
