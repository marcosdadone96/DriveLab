/**
 * Transportador de rodillos motorizado (horizontal) — cálculo orientativo.
 */

import {
  G,
  motorPowerWithEfficiency,
  parseNonNegative,
  parsePositive,
} from '../utils/calculations.js';
import { resolveServiceFactor } from './serviceFactorByDuty.js';
import { steadyForceStandardMultiplier } from './conveyorStandards.js';

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
      formula: 'N = m · g',
      substitution: `${loadMass_kg} kg · ${G.toFixed(3)} m/s²`,
      value: normalForce_N,
      unit: 'N',
      meaning: 'Carga vertical sobre el tren de rodillos.',
    },
    {
      id: 'roll',
      title: 'Resistencia a la rodadura',
      formula: 'F_roll = N · Crr',
      substitution: `Crr = ${crr.toFixed(4)}`,
      value: F_roll_base_N,
      unit: 'N',
      meaning: 'Pérdidas por rodillos, rodamientos y contacto de rodadura.',
    },
    {
      id: 'steady',
      title: 'Fuerza de régimen',
      formula: stdMult > 1 ? 'F_reg = (F_roll + F_add) · factor norma' : 'F_reg = F_roll + F_add',
      substitution:
        stdMult > 1
          ? `(${F_roll_base_N.toFixed(1)} + ${additionalResistance_N.toFixed(1)}) · ${stdMult.toFixed(2)}`
          : `${F_roll_base_N.toFixed(1)} + ${additionalResistance_N.toFixed(1)}`,
      value: F_steady_N,
      unit: 'N',
      meaning: 'Esfuerzo estable para mover la línea a velocidad constante.',
    },
    {
      id: 'accel',
      title: 'Fuerza de aceleración',
      formula: 'F_acc = k_in · m · (v / t_acc)',
      substitution: `k_in ${inertiaStartingFactor.toFixed(2)} · m ${loadMass_kg} kg · v ${speed_m_s} m/s · t ${accelTime_s}s`,
      value: F_accel_N,
      unit: 'N',
      meaning: 'Pico de tracción en arranque.',
    },
    {
      id: 'torque',
      title: 'Par de diseño',
      formula: 'T = max(F_reg, F_arr) · R · SF',
      substitution: `R = ${R_m.toFixed(4)} m · SF ${serviceFactor.toFixed(2)}`,
      value: torqueWithService_Nm,
      unit: 'N·m',
      meaning: 'Par requerido para selección de motorreductor.',
    },
    {
      id: 'power',
      title: 'Potencia de motor',
      formula: 'P_motor = max(F_reg·v, F_arr·v) / ?',
      substitution: `? = ${efficiency_pct_effective.toFixed(1)} %`,
      value: requiredMotorPower_kW,
      unit: 'kW',
      meaning: 'Potencia mecánica en eje motor para catálogo.',
    },
  ];

  const assumptions = [
    'Modelo horizontal con rodadura equivalente (sin elevación).',
    'Crr representa pérdidas agregadas de rodillos + cojinetes + contacto de carga.',
    `Factor de servicio aplicado: ${serviceFactor.toFixed(2)} (${loadDuty === 'custom' ? 'manual' : 'tipo de carga'}).`,
    stdMult > 1
      ? `Margen normativo sobre régimen: ×${stdMult.toFixed(2)} (${designStandard}).`
      : 'Sin margen normativo adicional sobre el régimen.',
  ];

  const explanations = [
    `La resistencia de rodadura domina en horizontal (F_roll ? ${F_roll_base_N.toFixed(1)} N).`,
    'Si hay acumulación de producto o transferencia con golpe, suba F_adicional y/o SF.',
  ];

  return {
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
}

