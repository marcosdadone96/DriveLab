/**
 * Cinta plana horizontal — modelo detallado paso a paso.
 *
 * - Rozamiento separado: carga (N_load) y banda (rama superior + inferior en rodillos).
 * - Régimen permanente + arranque: aceleración de masa transportada + banda; factor de inercia adicional.
 * - Potencia mecánica en tambor y corrección por η hasta el eje de motor.
 *
 * Nota: pérdidas por flexión continua de banda, elevación en rodillos y deriva pueden añadirse como término F_adicional.
 */

import {
  G,
  motorPowerWithEfficiency,
  parsePositive,
  parseNonNegative,
  clamp,
} from '../utils/calculations.js';
import { steadyForceStandardMultiplier, STANDARD_INFO } from './conveyorStandards.js';
import { resolveServiceFactor } from './serviceFactorByDuty.js';

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
 * @typedef {Object} FlatConveyorInputs
 * @property {number} beltLength_m
 * @property {number} [beltWidth_m]
 * @property {number} loadMass_kg
 * @property {number} [beltMass_kg]
 * @property {number} [loadDistribution] — 0–1 fracción de carga activa sobre rodillos (1 = plena)
 * @property {number} [beltCarryFraction] — fracción de masa de banda en rama portante (resto en retorno)
 * @property {number} [additionalResistance_N] — elevadores de rascadores, etc.
 * @property {number} beltSpeed_m_s
 * @property {number} [accelTime_s] — tiempo para alcanzar v desde parado
 * @property {number} [inertiaStartingFactor] — ≥1 cubre inercia de poleas, acoplamiento (no solo M·a)
 * @property {number} frictionCoeff
 * @property {number} efficiency_pct — puede venir >100 (solo alerta); el cálculo clamp 1–99 %
 * @property {number} rollerDiameter_mm
 * @property {number} [serviceFactor] — si loadDuty es custom
 * @property {import('./serviceFactorByDuty.js').LoadDutyClass} [loadDuty]
 * @property {import('./conveyorStandards.js').ConveyorDesignStandard} [designStandard]
 * @property {'rollers'|'slide_plate'} [carrySurface] — rama portante: rodillos o banda sobre plancha deslizante (misma F=μN; μ debe interpretarse según el caso)
 * @property {'es'|'en'} [lang]
 */

/**
 * @param {FlatConveyorInputs} raw
 */
export function computeFlatConveyor(raw) {
  const lang = raw.lang === 'en' ? 'en' : 'es';
  const beltLength_m = parsePositive(raw.beltLength_m, 1);
  const beltWidth_m = parsePositive(raw.beltWidth_m ?? 0.65, 0.65);
  const loadMass_kg = parsePositive(raw.loadMass_kg, 1);
  const beltMass_kg = parseNonNegative(raw.beltMass_kg ?? 0, 0);
  const loadDistribution = clamp(
    Number.isFinite(raw.loadDistribution) ? raw.loadDistribution : 1,
    0.05,
    1,
  );
  const beltCarryFraction = clamp(
    Number.isFinite(raw.beltCarryFraction) ? raw.beltCarryFraction : 0.5,
    0.1,
    0.9,
  );
  const additionalResistance_N = parseNonNegative(raw.additionalResistance_N ?? 0, 0);

  const beltSpeed_m_s = parseNonNegative(raw.beltSpeed_m_s, 0.5);
  const accelTime_s = Math.max(0.05, parsePositive(raw.accelTime_s ?? 3, 3));
  const inertiaStartingFactor = Math.max(
    1,
    parsePositive(raw.inertiaStartingFactor ?? 1.15, 1.15),
  );

  const frictionCoeff = parseNonNegative(raw.frictionCoeff, 0.3);
  const efficiency_pct_raw = parseEfficiencyRaw(raw.efficiency_pct);
  const efficiency_pct = clampEfficiency(efficiency_pct_raw);
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
    resolveServiceFactor(loadDuty, raw.serviceFactor ?? 1.25),
  );
  const stdMult = steadyForceStandardMultiplier(designStandard);
  const carrySurface = raw.carrySurface === 'slide_plate' ? 'slide_plate' : 'rollers';
  const contactCarry =
    carrySurface === 'slide_plate'
      ? 'banda sobre plancha / superficie deslizante'
      : 'banda y rodillos de apoyo';
  const contactReturn =
    carrySurface === 'slide_plate'
      ? 'rama inferior (típ. rodillos o zapatas; μ sigue siendo el coef. global introducido)'
      : 'rodillos de la rama inferior';

  const η = efficiency_pct / 100;
  const drumDiameter_m = rollerDiameter_mm / 1000;
  const R_m = drumDiameter_m / 2;

  /** --- Paso: normales --- */
  const N_load_N = loadMass_kg * G * loadDistribution;
  const N_belt_carry_N = beltMass_kg * G * beltCarryFraction;
  const N_belt_return_N = beltMass_kg * G * (1 - beltCarryFraction);

  /** Rozamiento (Coulomb) por cada aporte normal — en plancha, μ debe reflejar banda–placha */
  const F_friction_load_N = frictionCoeff * N_load_N;
  const F_friction_belt_carry_N = frictionCoeff * N_belt_carry_N;
  const F_friction_belt_return_N = frictionCoeff * N_belt_return_N;
  const F_friction_belt_total_N = F_friction_belt_carry_N + F_friction_belt_return_N;

  const F_steady_base_N =
    F_friction_load_N + F_friction_belt_carry_N + F_friction_belt_return_N + additionalResistance_N;
  const F_steady_N = F_steady_base_N * stdMult;

  /** --- Arranque / aceleración --- */
  const accel_m_s2 = beltSpeed_m_s > 0 ? beltSpeed_m_s / accelTime_s : 0;
  const massTranslational_kg = loadMass_kg + beltMass_kg;
  const F_accel_N = inertiaStartingFactor * massTranslational_kg * accel_m_s2;
  const F_total_start_N = F_steady_N + F_accel_N;

  /** Par en tambor (fuerza tangencial en la polea motriz = tracción de cálculo) */
  const torqueRun_Nm = F_steady_N * R_m;
  const torqueStart_Nm = F_total_start_N * R_m;
  const torqueDesign_Nm = Math.max(torqueRun_Nm, torqueStart_Nm) * serviceFactor;

  /** Régimen / arranque sin factor de servicio (transparente en el desglose) */
  const powerDrumRun_W = F_steady_N * beltSpeed_m_s;
  const powerDrumStart_W = F_total_start_N * beltSpeed_m_s;
  const powerMotorRun_W = motorPowerWithEfficiency(powerDrumRun_W, η);
  const powerMotorStart_W = motorPowerWithEfficiency(powerDrumStart_W, η);

  /**
   * Potencia de dimensionamiento alineada con el par de diseño (incluye factor de servicio):
   * P_tambor = T_diseño × ω, ω = v/R, P_motor = P_tambor / η.
   */
  const omega_rad_s = R_m > 0 && beltSpeed_m_s >= 0 ? beltSpeed_m_s / R_m : 0;
  const powerAtDrumDesign_W = torqueDesign_Nm * omega_rad_s;
  const powerMotorDesign_W = motorPowerWithEfficiency(powerAtDrumDesign_W, η);
  const powerMotor_kW = Number.isFinite(powerMotorDesign_W) ? powerMotorDesign_W / 1000 : NaN;

  const linearMassDensity = (loadMass_kg * loadDistribution) / beltLength_m;
  const massFlow_kg_s = linearMassDensity * beltSpeed_m_s;

  const drumRpm = beltSpeed_m_s > 0 && drumDiameter_m > 0 ? (beltSpeed_m_s / (Math.PI * drumDiameter_m)) * 60 : 0;

  /** Pasos numerados para UI */
  /** @type {CalcStep[]} */
  const steps = [
    {
      id: 'N_load',
      title: 'Fuerza normal debida a la carga sobre la banda',
      formula: 'Normal = masa carga × gravedad × fracción activa',
      substitution: `${loadMass_kg} kg × ${G.toFixed(5)} N/kg × ${loadDistribution}`,
      value: N_load_N,
      unit: 'N',
      meaning: `Reacción vertical de la carga sobre la rama portante (${contactCarry}); de ella depende parte del rozamiento.`,
    },
    {
      id: 'N_belt',
      title: 'Normales por el peso propio de la banda (portante y retorno)',
      formula: 'Suma de normales en rama superior e inferior',
      substitution: `Masa banda ${beltMass_kg} kg · fracción portante ${beltCarryFraction}`,
      value: N_belt_carry_N + N_belt_return_N,
      unit: 'N',
      meaning: `El peso de la banda se reparte entre portante y retorno; cada rama aporta rozamiento (${contactReturn}).`,
    },
    {
      id: 'F_mu_load',
      title: 'Rozamiento asociado a la carga',
      formula: 'Rozamiento carga = μ × normal carga',
      substitution: `μ = ${frictionCoeff} · normal = ${N_load_N.toFixed(1)} N`,
      value: F_friction_load_N,
      unit: 'N',
      meaning: `Fuerza tangencial para vencer el roce entre carga, banda y apoyo en zona cargada (${contactCarry}).`,
    },
    {
      id: 'F_mu_belt',
      title: 'Rozamiento asociado al peso de la banda',
      formula: 'Rozamiento banda = μ × (normales banda)',
      substitution: `μ = ${frictionCoeff} · peso banda ≈ ${(beltMass_kg * G).toFixed(1)} N`,
      value: F_friction_belt_total_N,
      unit: 'N',
      meaning:
        'Contribución del peso propio de la banda; en bandas pesadas no conviene ignorarla.',
    },
    {
      id: 'F_add',
      title: 'Otras resistencias (rascadores, guías, etc.)',
      formula: 'Valor introducido por el usuario',
      substitution: `${additionalResistance_N.toFixed(1)} N`,
      value: additionalResistance_N,
      unit: 'N',
      meaning: 'Suma de efectos que no están en el μ equivalente.',
    },
    {
      id: 'F_steady',
      title: 'Fuerza total en régimen (velocidad constante)',
      formula:
        stdMult > 1
          ? 'Régimen = (roz. carga + roz. banda + otras) × factor marco normativo'
          : 'Régimen = roz. carga + roz. banda + otras resistencias',
      substitution:
        stdMult > 1
          ? `${F_steady_base_N.toFixed(1)} N base × ${stdMult.toFixed(2)} (${designStandard})`
          : `${F_friction_load_N.toFixed(1)} + ${F_friction_belt_total_N.toFixed(1)} + ${additionalResistance_N.toFixed(1)} N`,
      value: F_steady_N,
      unit: 'N',
      meaning: 'Tracción de equilibrio en el tambor sin acelerar la masa.',
    },
    {
      id: 'F_accel',
      title: 'Fuerza extra para acelerar cinta y carga',
      formula: 'Aceleración = factor inercia × masa × (velocidad / tiempo de arranque)',
      substitution: `Factor ${inertiaStartingFactor} · masa ${massTranslational_kg} kg · acel. ${accel_m_s2.toFixed(4)} m/s²`,
      value: F_accel_N,
      unit: 'N',
      meaning:
        'El factor de inercia incluye de forma simplificada tambores, acoplamientos y masas rotativas.',
    },
    {
      id: 'F_start',
      title: 'Fuerza de pico en el arranque',
      formula: 'Arranque = régimen + aceleración',
      substitution: `${F_steady_N.toFixed(1)} + ${F_accel_N.toFixed(1)} N`,
      value: F_total_start_N,
      unit: 'N',
      meaning: 'Cota máxima de tracción durante la puesta en marcha; gobierna el par pico.',
    },
    {
      id: 'torque',
      title: 'Par de diseño en el tambor motriz',
      formula: 'Par = fuerza × radio tambor × factor de servicio (el mayor entre régimen y arranque)',
      substitution: `Diámetro ${drumDiameter_m.toFixed(3)} m (${rollerDiameter_mm} mm) · servicio ×${serviceFactor}`,
      value: torqueDesign_Nm,
      unit: 'N·m',
      meaning:
        'Par mecánico en el eje del tambor con márgenes de servicio sobre el peor caso régimen/arranque.',
    },
    {
      id: 'power',
      title: 'Potencia en el eje del motor (dimensionamiento)',
      formula: 'P_motor = (T_diseño · ω) / η con ω = v/R en el tambor motriz',
      substitution: `T_diseño = ${torqueDesign_Nm.toFixed(2)} N·m · ω = ${omega_rad_s.toFixed(4)} rad/s · η = ${(η * 100).toFixed(1)} %`,
      value: powerMotor_kW,
      unit: 'kW',
      meaning:
        'Coherente con el par de diseño (incluye factor de servicio). En el detalle se muestran régimen y arranque sin ese margen.',
    },
  ];

  const pctLoad = F_steady_N > 0 ? (100 * F_friction_load_N) / F_steady_N : 0;
  const pctBelt = F_steady_N > 0 ? (100 * F_friction_belt_total_N) / F_steady_N : 0;

  const explanations = [
    `En régimen, aproximadamente ${pctLoad.toFixed(0)} % del rozamiento viene de la carga y ${pctBelt.toFixed(0)} % de la banda (más resistencias adicionales si las hay).`,
    torqueStart_Nm > torqueRun_Nm * 1.05
      ? 'El arranque exige más par que el régimen: revise térmica del motor y tiempo de arranque.'
      : 'Con estos datos el régimen marca el par antes que el arranque.',
    beltMass_kg < 1e-6
      ? 'Sin masa de banda, solo se modela rozamiento de carga; en planta real añada el peso de banda en avanzado.'
      : `Masa de banda ${beltMass_kg} kg considerada en normales y en la masa a acelerar.`,
    `Ancho B = ${beltWidth_m.toFixed(2)} m es referencia de proyecto e informes; el μ introducido no depende de B en este modelo.`,
    ...(carrySurface === 'slide_plate'
      ? [
          'Plancha deslizante: μ suele ser mayor que con rodillos; use datos de su revestimiento (UHMW, acero, etc.). Las poleas de esquina pueden ser más pequeñas que el tambor motriz: D y ω = v/R siguen referidos al tambor motriz.',
        ]
      : []),
  ];

  const assumptions = [
    `${STANDARD_INFO[designStandard].shortLabel}: ${STANDARD_INFO[designStandard].description}`,
    stdMult > 1
      ? `Margen normativo aplicado sobre tracción de régimen: ×${stdMult.toFixed(2)} (solo tracción de equilibrio; la parte de aceleración no se escala).`
      : 'Sin factor empírico global adicional sobre la tracción de régimen (μ y resistencias según datos introducidos).',
    'Transporte horizontal: no hay componente de peso a lo largo de la cinta.',
    carrySurface === 'slide_plate'
      ? 'Rama portante modelada como deslizamiento banda–placha: F = μN con μ representando ese contacto (suele ser mayor que con rodillos). Poleas de retorno pueden ser más pequeñas; D y n de tambor se refieren al tambor motriz.'
      : 'Rama portante sobre rodillos: F = μN con μ entre banda y apoyo rodante.',
    'Rozamiento tipo Coulomb: proporcional a la normal en cada rama; no sustituye un cálculo DIN 22101 o CEMA completo.',
    'La tracción se aplica en el tambor motriz; no se calcula la adherencia por Euler entre ramas.',
    `Caudal másico = (m_carga × fracción activa / L) × v; L = ${beltLength_m.toFixed(2)} m es el tramo sobre el que reparte la masa nominal (no tiene por qué ser la longitud total de instalación).`,
    `Factor de servicio ${serviceFactor.toFixed(2)} aplicado al par de tambor y, de forma coherente, a la potencia vía P = T_diseño × ω / η (${loadDuty === 'custom' ? 'valor manual' : 'según tipo de carga'}).`,
  ];

  const toEnglish = (text) => {
    const exact = new Map([
      ['Fuerza normal debida a la carga sobre la banda', 'Normal force due to load on belt'],
      ['Normales por el peso propio de la banda (portante y retorno)', 'Normal forces due to belt self-weight (carry and return)'],
      ['Rozamiento asociado a la carga', 'Load-related friction force'],
      ['Rozamiento asociado al peso de la banda', 'Belt self-weight friction force'],
      ['Otras resistencias (rascadores, guías, etc.)', 'Additional resistances (scrapers, guides, etc.)'],
      ['Fuerza total en régimen (velocidad constante)', 'Total steady-state force (constant speed)'],
      ['Fuerza extra para acelerar cinta y carga', 'Additional force for belt acceleration'],
      ['Fuerza de pico en el arranque', 'Peak Startup Force'],
      ['Par de diseño en el tambor motriz', 'Design Torque at drive drum'],
      ['Potencia en el eje del motor (dimensionamiento)', 'Motor shaft power (sizing)'],
      ['Transporte horizontal: no hay componente de peso a lo largo de la cinta.', 'Horizontal transport: no gravity component along the belt.'],
      ['Rozamiento tipo Coulomb: proporcional a la normal en cada rama; no sustituye un cálculo DIN 22101 o CEMA completo.', 'Coulomb friction model: proportional to normal force on each strand; not a full DIN 22101 or CEMA calculation.'],
      ['La tracción se aplica en el tambor motriz; no se calcula la adherencia por Euler entre ramas.', 'Traction is applied at the drive drum; Euler traction adhesion is not calculated between strands.'],
    ]);
    let out = exact.get(text) || text;
    out = out
      .replace('Normal = masa carga × gravedad × fracción activa', 'Normal = load mass x gravity x active fraction')
      .replace('Suma de normales en rama superior e inferior', 'Sum of normal forces on carry and return strands')
      .replace('Rozamiento carga = μ × normal carga', 'Load friction = mu x load normal')
      .replace('Rozamiento banda = μ × (normales banda)', 'Belt friction = mu x (belt normal forces)')
      .replace('Valor introducido por el usuario', 'User-defined value')
      .replace('Régimen = (roz. carga + roz. banda + otras) × factor marco normativo', 'Steady = (load friction + belt friction + additional) x normative framework factor')
      .replace('Régimen = roz. carga + roz. banda + otras resistencias', 'Steady = load friction + belt friction + additional resistances')
      .replace('Aceleración = factor inercia × masa × (velocidad / tiempo de arranque)', 'Acceleration force = inertia factor x mass x (speed / startup time)')
      .replace('Arranque = régimen + aceleración', 'Startup = steady + acceleration')
      .replace('Par = fuerza × radio tambor × factor de servicio (el mayor entre régimen y arranque)', 'Torque = force x drum radius x service factor (worst case between steady and startup)')
      .replace('P_motor = (T_diseño · ω) / η con ω = v/R en el tambor motriz', 'P_motor = (T_design · omega) / eta with omega = v/R at drive drum')
      .replace('Reacción vertical de la carga sobre la rama portante', 'Vertical reaction of load on carrying strand')
      .replace('de ella depende parte del rozamiento.', 'it drives part of friction.')
      .replace('El peso de la banda se reparte entre portante y retorno; cada rama aporta rozamiento', 'Belt self-weight is distributed between carry and return; each strand contributes friction')
      .replace('Fuerza tangencial para vencer el roce entre carga, banda y apoyo en zona cargada', 'Tangential force to overcome friction between load, belt, and support in loaded zone')
      .replace('Contribución del peso propio de la banda; en bandas pesadas no conviene ignorarla.', 'Contribution from belt self-weight; should not be ignored for heavy belts.')
      .replace('Suma de efectos que no están en el μ equivalente.', 'Sum of effects not captured in equivalent mu.')
      .replace('Tracción de equilibrio en el tambor sin acelerar la masa.', 'Equilibrium traction at the drum without accelerating mass.')
      .replace('El factor de inercia incluye de forma simplificada tambores, acoplamientos y masas rotativas.', 'Inertia factor includes a simplified contribution from drums, couplings, and rotating masses.')
      .replace('Cota máxima de tracción durante la puesta en marcha; gobierna el par pico.', 'Maximum traction during startup; governs peak torque.')
      .replace('Par mecánico en el eje del tambor con márgenes de servicio sobre el peor caso régimen/arranque.', 'Mechanical torque at drum shaft with service margin on worst case steady/startup.')
      .replace('Coherente con el par de diseño (incluye factor de servicio). En el detalle se muestran régimen y arranque sin ese margen.', 'Consistent with design torque (includes service factor). Detailed view reports steady and startup without that margin.')
      .replace('En régimen, aproximadamente', 'In steady state, approximately')
      .replace('del rozamiento viene de la carga y', 'of friction comes from load and')
      .replace('de la banda (más resistencias adicionales si las hay).', 'from the belt (plus additional resistances when present).')
      .replace('El arranque exige más par que el régimen: revise térmica del motor y tiempo de arranque.', 'Startup demands more torque than steady state: review motor thermal sizing and startup time.')
      .replace('Con estos datos el régimen marca el par antes que el arranque.', 'With these inputs, steady-state sets torque before startup does.')
      .replace('Sin masa de banda, solo se modela rozamiento de carga; en planta real añada el peso de banda en avanzado.', 'Without belt mass, only load friction is modeled; in real plants add belt weight in advanced settings.')
      .replace('Masa de banda', 'Belt mass')
      .replace('considerada en normales y en la masa a acelerar.', 'included in normal-force terms and accelerated mass.')
      .replace('Ancho B =', 'Width B =')
      .replace('es referencia de proyecto e informes; el μ introducido no depende de B en este modelo.', 'is a project/report reference; introduced mu does not depend on B in this model.')
      .replace('Plancha deslizante: μ suele ser mayor que con rodillos; use datos de su revestimiento (UHMW, acero, etc.). Las poleas de esquina pueden ser más pequeñas que el tambor motriz: D y ω = v/R siguen referidos al tambor motriz.', 'Slide plate support: mu is usually higher than with rollers; use data from your lining (UHMW, steel, etc.). Corner pulleys can be smaller than the drive drum: D and omega = v/R remain referenced to the drive drum.')
      .replace('valor manual', 'manual value')
      .replace('según tipo de carga', 'according to load duty')
      .replace('Caudal másico', 'Mass Flow Rate');
    return out;
  };

  if (lang === 'en') {
    steps.forEach((s) => {
      s.title = toEnglish(s.title);
      s.formula = toEnglish(s.formula);
      s.substitution = toEnglish(s.substitution);
      s.meaning = toEnglish(s.meaning);
    });
  }

  return {
    designStandard,
    loadDuty,
    carrySurface,
    efficiency_pct_raw,
    efficiency_pct_effective: efficiency_pct,
    steadyStandardMultiplier: stdMult,
    beltLength_m,
    beltWidth_m,
    loadMass_kg,
    beltMass_kg,
    loadDistribution,
    beltCarryFraction,
    drumDiameter_m,
    drumRpm,
    massFlow_kg_s,
    /** Legacy / diagrama: fuerza de régimen y normal “equivalente” carga */
    normalForce_N: N_load_N,
    frictionForce_N: F_steady_N,
    effectiveTension_N: F_steady_N,
    powerAtDrum_W: powerDrumRun_W,
    powerAtDrumDesign_W,
    requiredMotorPower_W: Number.isFinite(powerMotorDesign_W) ? powerMotorDesign_W : NaN,
    requiredMotorPower_kW: powerMotor_kW,
    torqueAtDrum_Nm: torqueRun_Nm,
    torqueStart_Nm,
    torqueWithService_Nm: torqueDesign_Nm,
    serviceFactorUsed: serviceFactor,
    assumptions: lang === 'en' ? assumptions.map(toEnglish) : assumptions,
    steps,
    explanations: lang === 'en' ? explanations.map(toEnglish) : explanations,
    detail: {
      N_load_N,
      N_belt_carry_N,
      N_belt_return_N,
      F_friction_load_N,
      F_friction_belt_carry_N,
      F_friction_belt_return_N,
      F_friction_belt_total_N,
      additionalResistance_N,
      F_steady_N,
      accel_m_s2,
      F_accel_N,
      F_total_start_N,
      powerDrumRun_W,
      powerDrumStart_W,
      powerMotorRun_W,
      powerMotorStart_W,
      powerAtDrumDesign_W,
      powerMotorDesign_W,
      omega_rad_s,
      accelTime_s,
      inertiaStartingFactor,
    },
  };
}

function clampEfficiency(pct) {
  const p = parsePositive(pct, 85);
  return Math.min(99, Math.max(1, p));
}

function parseEfficiencyRaw(v) {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  if (!Number.isFinite(n)) return 88;
  return n;
}
