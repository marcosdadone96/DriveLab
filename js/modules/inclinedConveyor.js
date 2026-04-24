/**
 * Cinta inclinada (subida) — desglose detallado de gravedad, normales y rozamiento.
 * Incluye masa de banda, distribución de carga, aceleración e inercia simplificada.
 */

import {
  G,
  degToRad,
  radToDeg,
  motorPowerWithEfficiency,
  parsePositive,
  parseNonNegative,
  clamp,
} from '../utils/calculations.js';
import { steadyForceStandardMultiplier, STANDARD_INFO } from './conveyorStandards.js';
import { resolveServiceFactor } from './serviceFactorByDuty.js';
import { applyInclinedConveyorEnglish } from './conveyorCalcEn.js';

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
 * @param {object} raw
 */
export function computeInclinedConveyor(raw) {
  const length_m = parsePositive(raw.length_m, 10);
  const height_m = parseNonNegative(raw.height_m, 2);
  const beltWidth_m = parsePositive(raw.beltWidth_m ?? 0.65, 0.65);
  let angle_deg = raw.angle_deg;
  let angleFromGeometry = false;
  /** @type {number} */
  let angle_rad;

  if (angle_deg == null || !Number.isFinite(angle_deg)) {
    const ratio = height_m / length_m;
    const clamped = Math.min(1, Math.max(0, ratio));
    angle_rad = Math.asin(clamped);
    angle_deg = radToDeg(angle_rad);
    angleFromGeometry = true;
  } else {
    angle_deg = Math.min(89, Math.max(0, Number(angle_deg)));
    angle_rad = degToRad(angle_deg);
  }

  const loadMass_kg = parsePositive(raw.loadMass_kg, 100);
  const beltMass_kg = parseNonNegative(raw.beltMass_kg ?? 0, 0);
  const loadDistribution = clamp(
    Number.isFinite(raw.loadDistribution) ? raw.loadDistribution : 1,
    0.05,
    1,
  );
  const beltSlopeParticipation = clamp(
    Number.isFinite(raw.beltSlopeParticipation) ? raw.beltSlopeParticipation : 1,
    0.3,
    1,
  );
  const additionalResistance_N = parseNonNegative(raw.additionalResistance_N ?? 0, 0);

  const beltSpeed_m_s = parseNonNegative(raw.beltSpeed_m_s, 0.5);
  const accelTime_s = Math.max(0.05, parsePositive(raw.accelTime_s ?? 3, 3));
  const inertiaStartingFactor = Math.max(
    1,
    parsePositive(raw.inertiaStartingFactor ?? 1.2, 1.2),
  );

  const frictionCoeff = parseNonNegative(raw.frictionCoeff, 0.35);
  const efficiency_pct_raw = parseEfficiencyRawInc(raw.efficiency_pct);
  const efficiency_pct = Math.min(99, Math.max(1, parsePositive(efficiency_pct_raw, 85)));
  const rollerDiameter_mm = parsePositive(raw.rollerDiameter_mm, 400);
  const designStandard = raw.designStandard === 'CEMA' ? 'CEMA' : 'ISO5048';
  const loadDuty =
    raw.loadDuty === 'uniform' ||
    raw.loadDuty === 'moderate' ||
    raw.loadDuty === 'heavy' ||
    raw.loadDuty === 'custom'
      ? raw.loadDuty
      : 'moderate';
  const serviceFactor = Math.max(
    1,
    resolveServiceFactor(loadDuty, raw.serviceFactor ?? 1.35),
  );
  const stdMult = steadyForceStandardMultiplier(designStandard);

  const η = efficiency_pct / 100;
  const drumDiameter_m = rollerDiameter_mm / 1000;
  const R_m = drumDiameter_m / 2;
  const sinθ = Math.sin(angle_rad);
  const cosθ = Math.cos(angle_rad);

  /** Masas efectivas */
  const mL = loadMass_kg * loadDistribution;
  const mB_eff = beltMass_kg * beltSlopeParticipation;

  /** Componentes de peso paralelas a la banda (subida) */
  const F_g_load_N = mL * G * sinθ;
  const F_g_belt_N = mB_eff * G * sinθ;

  /** Normales perpendiculares a la banda */
  const N_load_N = mL * G * cosθ;
  const N_belt_N = beltMass_kg * G * cosθ;

  const F_mu_load_N = frictionCoeff * N_load_N;
  const F_mu_belt_N = frictionCoeff * N_belt_N;

  const F_steady_base_N =
    F_g_load_N + F_g_belt_N + F_mu_load_N + F_mu_belt_N + additionalResistance_N;
  const F_steady_N = F_steady_base_N * stdMult;

  const accel_m_s2 = beltSpeed_m_s > 0 ? beltSpeed_m_s / accelTime_s : 0;
  const massTranslational_kg = loadMass_kg * loadDistribution + beltMass_kg;
  const F_accel_N = inertiaStartingFactor * massTranslational_kg * accel_m_s2;
  const F_total_start_N = F_steady_N + F_accel_N;

  const torqueRun_Nm = F_steady_N * R_m;
  const torqueStart_Nm = F_total_start_N * R_m;
  const torqueDesign_Nm = Math.max(torqueRun_Nm, torqueStart_Nm) * serviceFactor;

  const powerDrumRun_W = F_steady_N * beltSpeed_m_s;
  const powerDrumStart_W = F_total_start_N * beltSpeed_m_s;
  const powerMotorRun_W = motorPowerWithEfficiency(powerDrumRun_W, η);
  const powerMotorStart_W = motorPowerWithEfficiency(powerDrumStart_W, η);
  const powerMotor_kW = Math.max(powerMotorRun_W, powerMotorStart_W) / 1000;

  const drumRpm =
    beltSpeed_m_s > 0 && drumDiameter_m > 0 ? (beltSpeed_m_s / (Math.PI * drumDiameter_m)) * 60 : 0;

  const linearMassDensity = (loadMass_kg * loadDistribution) / length_m;
  const massFlow_kg_s = linearMassDensity * beltSpeed_m_s;

  const fgPct = F_steady_N > 0 ? (100 * (F_g_load_N + F_g_belt_N)) / F_steady_N : 0;
  const fmuPct = F_steady_N > 0 ? (100 * (F_mu_load_N + F_mu_belt_N)) / F_steady_N : 0;

  /** @type {CalcStep[]} */
  const steps = [
    {
      id: 'angle',
      title: 'Ángulo de la cinta respecto a la horizontal',
      formula: angleFromGeometry ? 'Ángulo a partir de desnivel H y longitud L' : 'Ángulo introducido directamente',
      substitution: angleFromGeometry
        ? `H = ${height_m} m, L = ${length_m} m`
        : `θ = ${angle_deg.toFixed(2)}°`,
      value: angle_deg,
      unit: '°',
      meaning: 'Inclinación del plano de rodillos; condiciona peso y rozamiento.',
    },
    {
      id: 'Fg_load',
      title: 'Parte del peso de la carga que tira cuesta abajo',
      formula: 'Peso en pendiente = masa carga × fracción × gravedad × sen(θ)',
      substitution: `${loadMass_kg} kg · fracción ${loadDistribution} · sen θ = ${sinθ.toFixed(4)}`,
      value: F_g_load_N,
      unit: 'N',
      meaning: 'Componente de peso paralela a la banda; hay que vencerla al subir.',
    },
    {
      id: 'Fg_belt',
      title: 'Parte del peso de la banda en la pendiente',
      formula: 'Peso banda en pendiente = masa banda × fracción en pendiente × g × sen(θ)',
      substitution: `Masa banda ${beltMass_kg} kg · participación ${beltSlopeParticipation}`,
      value: F_g_belt_N,
      unit: 'N',
      meaning: 'Contribución del peso propio de la banda según la fracción que sigue la subida.',
    },
    {
      id: 'N',
      title: 'Fuerzas normales (carga y banda apoyadas en la pendiente)',
      formula: 'Normal total relacionada con m · g · cos(θ)',
      substitution: `cos θ = ${cosθ.toFixed(4)}`,
      value: N_load_N + N_belt_N,
      unit: 'N',
      meaning: 'Apoyos perpendiculares a la banda; de ellos sale el rozamiento μ × normal.',
    },
    {
      id: 'Fmu',
      title: 'Rozamiento paralelo a la banda (se opone a la subida)',
      formula: 'Rozamiento = μ × (normal carga + normal banda)',
      substitution: `μ = ${frictionCoeff}`,
      value: F_mu_load_N + F_mu_belt_N,
      unit: 'N',
      meaning: 'Fricción en el contacto banda–soporte; en pendientes moderadas puede ser gran parte del total.',
    },
    {
      id: 'F_add',
      title: 'Otras resistencias',
      formula: 'Valor introducido por el usuario',
      substitution: `${additionalResistance_N.toFixed(1)} N`,
      value: additionalResistance_N,
      unit: 'N',
      meaning: 'Rascadores, guías, contrapesos, etc.',
    },
    {
      id: 'F_reg',
      title: 'Fuerza total en régimen (subida a velocidad constante)',
      formula:
        stdMult > 1
          ? 'Régimen = (peso en pendiente + roz. + otras) × factor marco normativo'
          : 'Régimen = peso en pendiente + rozamiento + otras',
      substitution:
        stdMult > 1
          ? `${F_steady_base_N.toFixed(1)} N base × ${stdMult.toFixed(2)} (${designStandard})`
          : `Peso ${(F_g_load_N + F_g_belt_N).toFixed(1)} N + roz. ${(F_mu_load_N + F_mu_belt_N).toFixed(1)} N + extras`,
      value: F_steady_N,
      unit: 'N',
      meaning: 'Tracción de equilibrio en el tambor motriz en marcha estable.',
    },
    {
      id: 'F_accel',
      title: 'Fuerza extra al acelerar',
      formula: 'Aceleración = factor inercia × masa × (velocidad / tiempo)',
      substitution: `Masa ${massTranslational_kg} kg · factor inercia ${inertiaStartingFactor}`,
      value: F_accel_N,
      unit: 'N',
      meaning: 'Incremento de tracción mientras la cinta gana velocidad.',
    },
    {
      id: 'T',
      title: 'Par de diseño en el tambor',
      formula: 'Par = fuerza × radio × factor servicio (régimen o arranque, el que mande)',
      substitution: `Diámetro ${drumDiameter_m.toFixed(3)} m (${rollerDiameter_mm} mm) · servicio ×${serviceFactor}`,
      value: torqueDesign_Nm,
      unit: 'N·m',
      meaning: 'Par mecánico en el eje del tambor con márgenes.',
    },
    {
      id: 'P',
      title: 'Potencia de eje de motor (con rendimiento η)',
      formula: 'Potencia motor = (fuerza × velocidad) / η',
      substitution: `η global = ${(η * 100).toFixed(1)} %`,
      value: powerMotor_kW,
      unit: 'kW',
      meaning: 'Potencia mecánica pedida al motor antes de pérdidas eléctricas del propio motor.',
    },
  ];

  const explanations = [
    `En régimen, la gravedad aporta ~${fgPct.toFixed(0)} % y el rozamiento ~${fmuPct.toFixed(0)} % de la fuerza total (más adicionales).`,
    F_g_load_N + F_g_belt_N > F_mu_load_N + F_mu_belt_N
      ? 'Predomina el término gravitatorio: pendiente exigente; revise freno/anti-retorno.'
      : 'Predomina el rozamiento: revise μ real en condiciones de polvo/humedad.',
    `Ancho B = ${beltWidth_m.toFixed(2)} m guardado para futuras ampliaciones del modelo (flexión, presión).`,
  ];

  const assumptions = [
    `${STANDARD_INFO[designStandard].shortLabel}: ${STANDARD_INFO[designStandard].description}`,
    stdMult > 1
      ? `Margen normativo sobre tracción de régimen: ×${stdMult.toFixed(2)} (gravedad+roz. de equilibrio; aceleración sin escalar).`
      : 'Sin factor empírico global adicional sobre la tracción de régimen.',
    'Movimiento de subida con carga estable (sin derrame dinámico).',
    'Rozamiento tipo Coulomb; no se modela adhesión ni bloqueo de material.',
    'La masa de banda usa una fracción “en pendiente” para aproximar tramos mixtos del circuito.',
    `Factor de servicio aplicado: ${serviceFactor.toFixed(2)} (${loadDuty === 'custom' ? 'manual' : 'tipo de carga'}).`,
  ];
  if (angleFromGeometry) {
    assumptions.push(`θ obtenido de H=${height_m.toFixed(3)} m y L=${length_m.toFixed(3)} m.`);
  }

  const result = {
    designStandard,
    loadDuty,
    efficiency_pct_raw,
    efficiency_pct_effective: efficiency_pct,
    steadyStandardMultiplier: stdMult,
    angle_deg,
    angle_rad,
    angleFromGeometry,
    drumDiameter_m,
    drumRpm,
    massFlow_kg_s,
    gravityForce_N: F_g_load_N + F_g_belt_N,
    frictionForce_N: F_mu_load_N + F_mu_belt_N,
    totalForce_N: F_steady_N,
    powerAtDrum_W: powerDrumRun_W,
    requiredMotorPower_W: Math.max(powerMotorRun_W, powerMotorStart_W),
    requiredMotorPower_kW: powerMotor_kW,
    torqueAtDrum_Nm: torqueRun_Nm,
    torqueStart_Nm,
    torqueWithService_Nm: torqueDesign_Nm,
    serviceFactorUsed: serviceFactor,
    assumptions,
    steps,
    explanations,
    detail: {
      F_g_load_N,
      F_g_belt_N,
      N_load_N,
      N_belt_N,
      F_mu_load_N,
      F_mu_belt_N,
      additionalResistance_N,
      F_steady_N,
      F_accel_N,
      F_total_start_N,
      powerDrumRun_W,
      powerDrumStart_W,
      powerMotorRun_W,
      powerMotorStart_W,
      accelTime_s,
      inertiaStartingFactor,
    },
  };

  if (raw.lang === 'en') {
    applyInclinedConveyorEnglish(result, {
      angleFromGeometry,
      height_m,
      length_m,
      beltWidth_m,
      designStandard,
      stdMult,
      loadDuty,
      serviceFactor,
      fgPct,
      fmuPct,
      FgTot: F_g_load_N + F_g_belt_N,
      FmuTot: F_mu_load_N + F_mu_belt_N,
    });
  }

  return result;
}

function parseEfficiencyRawInc(v) {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  if (!Number.isFinite(n)) return 86;
  return n;
}
