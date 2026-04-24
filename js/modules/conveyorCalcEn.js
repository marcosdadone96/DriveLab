/**
 * English strings for conveyor calculation outputs when raw.lang === 'en'.
 */

import { LOAD_DUTY_OPTIONS_EN } from './serviceFactorByDuty.js';

const STD_EN = {
  ISO5048: {
    shortLabel: 'ISO 5048 / DIN 22101 (analytic approach)',
    description:
      'Calculation basis aligned with the European approach: split resistances and explicit mu, without extra global empirical factors in this simulator.',
  },
  CEMA: {
    shortLabel: 'CEMA (US reference)',
    description:
      'A practical 6% margin on steady traction reflects typical CEMA-style uncertainty; always validate with the CEMA manual and belt vendor.',
  },
};

/**
 * @param {object} result computeInclinedConveyor return
 * @param {object} v fields needed for English copy
 */
export function applyInclinedConveyorEnglish(result, v) {
  const { steps, explanations, assumptions } = result;
  const std = v.designStandard === 'CEMA' ? 'CEMA' : 'ISO5048';
  const stdEn = STD_EN[std];
  const dutyWord = v.loadDuty === 'custom' ? 'manual' : 'load duty class';

  for (const s of steps) {
    if (s.id === 'angle') {
      s.title = 'Belt angle from horizontal';
      s.formula = v.angleFromGeometry ? 'Angle from lift H and length L' : 'User-entered angle';
      s.meaning = 'Slope of the roller plane; drives gravity and friction terms.';
    } else if (s.id === 'Fg_load') {
      s.title = 'Downslope weight component from load';
      s.formula = 'Slope weight = load mass x active fraction x g x sin(theta)';
      s.meaning = 'Weight component parallel to the belt; must be overcome on uphill run.';
    } else if (s.id === 'Fg_belt') {
      s.title = 'Belt weight on slope';
      s.formula = 'Belt slope weight = belt mass x slope share x g x sin(theta)';
      s.meaning = 'Self-weight of the belt on the inclined run.';
    } else if (s.id === 'N') {
      s.title = 'Normal forces (load and belt on slope)';
      s.formula = 'Total normal related to m x g x cos(theta)';
      s.meaning = 'Support perpendicular to the belt; friction is mu x normal.';
    } else if (s.id === 'Fmu') {
      s.title = 'Friction parallel to belt (opposes uphill motion)';
      s.formula = 'Friction = mu x (load normal + belt normal)';
      s.meaning = 'Belt-support friction; on moderate slopes it can dominate.';
    } else if (s.id === 'F_add') {
      s.title = 'Additional resistances';
      s.formula = 'User-entered value';
      s.meaning = 'Scrapers, guides, take-up, etc.';
    } else if (s.id === 'F_reg') {
      s.title = 'Steady-state traction (uphill at constant speed)';
      s.formula =
        v.stdMult > 1
          ? 'Steady = (slope weight + friction + extras) x normative framework factor'
          : 'Steady = slope weight + friction + extras';
      s.meaning = 'Equilibrium traction at the drive drum in steady operation.';
    } else if (s.id === 'F_accel') {
      s.title = 'Extra force while accelerating';
      s.formula = 'Acceleration = inertia factor x mass x (speed / time)';
      s.meaning = 'Extra traction while the belt speeds up.';
    } else if (s.id === 'T') {
      s.title = 'Design torque at drum';
      s.formula = 'Torque = force x radius x service factor (steady or startup, whichever governs)';
      s.meaning = 'Shaft torque at the drum including service margins.';
    } else if (s.id === 'P') {
      s.title = 'Motor shaft power (with efficiency eta)';
      s.formula = 'Motor power = (force x speed) / eta';
      s.meaning = 'Mechanical power demanded from the motor (before electrical losses).';
    }
  }

  explanations.length = 0;
  explanations.push(
    `In steady state, gravity contributes ~${v.fgPct.toFixed(0)}% and friction ~${v.fmuPct.toFixed(
      0,
    )}% of total force (plus extras).`,
    v.FgTot > v.FmuTot
      ? 'Gravity term dominates: demanding slope; review brake / backstop.'
      : 'Friction dominates: verify mu under dust / moisture.',
    `Width B = ${v.beltWidth_m.toFixed(2)} m kept for future model extensions (bending, pressure).`,
  );

  assumptions.length = 0;
  assumptions.push(
    `${stdEn.shortLabel}: ${stdEn.description}`,
    v.stdMult > 1
      ? `Normative margin on steady traction: x${v.stdMult.toFixed(2)} (gravity+friction equilibrium; acceleration not scaled).`
      : 'No extra global empirical factor on steady traction.',
    'Uphill motion with stable load (no dynamic spillage).',
    'Coulomb friction; no adhesion or material jamming model.',
    'Belt mass uses an on-slope fraction to approximate mixed return/carry paths.',
    `Service factor applied: ${v.serviceFactor.toFixed(2)} (${dutyWord}).`,
  );
  if (v.angleFromGeometry) {
    assumptions.push(`theta from H=${v.height_m.toFixed(3)} m and L=${v.length_m.toFixed(3)} m.`);
  }
}

/** @type {Record<string, string>} */
const ROLLER_WARN_EN = {
  'La huella en direcci\u00f3n de transporte supera la longitud \u00fatil L: revise datos o aumente L.':
    'Footprint along transport exceeds useful length L: check inputs or increase L.',
  'Menos de 2 rodillos bajo la huella con este paso: riesgo de apoyo inestable; revise paso u orientaci\u00f3n de la paleta.':
    'Fewer than 2 rollers under footprint at this pitch: unstable support risk; check pitch or pallet orientation.',
};

/**
 * @param {object} result computeRollerConveyor return
 * @param {object} v
 */
export function applyRollerConveyorEnglish(result, v) {
  const { steps, explanations, assumptions, supportInfo } = result;
  const dutyWord = v.loadDuty === 'custom' ? 'manual' : 'load duty class';

  for (const s of steps) {
    if (s.id === 'normal') {
      s.title = 'Total normal on rollers';
      s.meaning = 'Vertical load on the roller train.';
    } else if (s.id === 'roll') {
      s.title = 'Rolling resistance';
      s.meaning = 'Losses in rollers, bearings and rolling contact.';
    } else if (s.id === 'steady') {
      s.title = 'Steady-state traction';
      s.formula = v.stdMult > 1 ? 'F_steady = (F_roll + F_add) x standard factor' : 'F_steady = F_roll + F_add';
      s.meaning = 'Force to move the line at constant speed.';
    } else if (s.id === 'accel') {
      s.title = 'Acceleration force';
      s.meaning = 'Traction peak at startup (linear acceleration of modeled load).';
    } else if (s.id === 'torque') {
      s.title = 'Design torque';
      s.formula = 'T = max(F_steady*R, F_start*R) x SF';
      s.meaning = 'Torque for gearmotor selection.';
    } else if (s.id === 'power') {
      s.title = 'Motor power';
      s.meaning = 'Mechanical shaft power for catalog sizing.';
    }
  }

  explanations.length = 0;
  explanations.push(
    `Rolling resistance dominates on the flat run (F_roll ~ ${v.F_roll_base_N.toFixed(1)} N).`,
    'If product builds up or transfers with impact, raise additional resistance (N) and/or service factor (SF).',
  );

  assumptions.length = 0;
  assumptions.push(
    'Horizontal model with equivalent rolling (no lift).',
    'Crr aggregates roller, bearing and load contact losses.',
    'Mass flow ~ (m/L)*v assumes mass m spread uniformly over useful length L; for clustered pallets use as indicative only.',
    v.pitchLineEn,
    v.geometryLineEn,
    v.modelScopeLineEn,
    `Service factor applied: ${v.serviceFactor.toFixed(2)} (${dutyWord}).`,
    v.stdMult > 1
      ? `Normative margin on steady: x${v.stdMult.toFixed(2)} (${v.designStandard}). Only scales steady traction; not a full CEMA or ISO 5048 study.`
      : 'No extra normative margin on steady (ISO 5048 in this simulator: no empirical bump on F_steady).',
  );

  if (supportInfo?.warnings?.length) {
    supportInfo.warnings = supportInfo.warnings.map((w) => ROLLER_WARN_EN[w] || w);
  }
}

const ABR_EN = { low: 'low', medium: 'medium', high: 'high' };

/**
 * @param {object} result computeScrewConveyor return
 * @param {object} v
 */
export function applyScrewConveyorEnglish(result, v) {
  const { steps, explanations, assumptions, rpmRisk } = result;

  for (const s of steps) {
    if (s.id === 'q') {
      s.title = 'Volumetric flow rate';
      s.formula = 'Q [m3/s] from m3/h or t/h and rho';
      s.meaning = 'Basis for screw speed and power.';
    } else if (s.id === 'geom') {
      s.title = 'Geometry and fill';
      s.meaning = 'Theoretical volume per revolution with trough loading and indicative volumetric efficiency.';
    } else if (s.id === 'n') {
      s.title = 'Screw rotational speed';
      s.meaning = 'Speed required for capacity; compare to wear limit.';
    } else if (s.id === 'power') {
      s.title = 'Power at screw shaft';
      s.meaning = 'Order of magnitude for drive; does not include every CEMA term or full-load start.';
    } else if (s.id === 'torque') {
      s.title = 'Shaft torque';
      s.meaning = 'Reference for gearbox and keys.';
    } else if (s.id === 'sf') {
      s.title = 'Design torque and power';
      s.formula = 'T_des = T*SF; P_des = P_shaft*SF';
      s.meaning = 'Combined margin for duty + declared wear factors.';
      const ld = /** @type {keyof typeof LOAD_DUTY_OPTIONS_EN} */ (String(result.loadDuty || ''));
      const dutyLbl = ld in LOAD_DUTY_OPTIONS_EN ? LOAD_DUTY_OPTIONS_EN[ld].label : String(result.loadDuty ?? '');
      const sf = Number(result.serviceFactorUsed);
      s.substitution = `SF = ${(Number.isFinite(sf) ? sf : Number(s.value)).toFixed(3)} (${dutyLbl} \u00d7 wear factors)`;
    }
  }

  explanations.length = 0;
  explanations.push(
    `Working capacity ~ ${v.cap_m3h.toFixed(2)} m3/h with rho = ${v.rho} kg/m3 and ${v.lambdaPct.toFixed(0)}% fill.`,
    `Approx. bulk axial speed: v ~ ${(v.v_axial * 1000).toFixed(1)} mm/s (pitch * n/60).`,
  );
  if (rpmRisk && rpmRisk.level !== 'ok') {
    explanations.push(rpmRisk.label);
  } else {
    explanations.push(
      `Speed n = ${v.n_rpm.toFixed(1)} min-1 vs indicative cap ${v.nMax.toFixed(0)} min-1 (${ABR_EN[v.abrasive] || v.abrasive} abrasiveness).`,
    );
  }

  assumptions.length = 0;
  assumptions.push(
    'Bulk solid consistent with stated rho and mu; no pulsation or choke model.',
    'Trough fill is as declared; field fill depends on chute and pitch.',
    'Power does not break out hanger losses or start-up; add margin on critical plants.',
    'RPM limit is indicative: use screw vendor tables and material tests.',
  );
}
