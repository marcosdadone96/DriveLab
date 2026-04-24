/**
 * Elevador de coches mecanico (2 columnas) - husillo/tornillo sin fin con tuerca de bronce + tuerca de seguridad.
 * Modelo educativo; no sustituye diseno normativo, calculo de fatiga, estabilidad de columnas ni seleccion certificada.
 */

const g = 9.81;

/**
 * Angulo de helice (rad) en diametro medio aproximado.
 * Aproximacion: d_m ~ d - 0.5*p (p y d en mm).
 */
export function helixAngle_rad(pitch_mm, screwDiameter_mm) {
  const p = Math.max(0.5, Number(pitch_mm) || 6);
  const d = Math.max(6, Number(screwDiameter_mm) || 35);
  const dm = Math.max(0.6 * d, d - 0.5 * p);
  const lead = p; // 1 entrada por defecto
  return Math.atan(lead / (Math.PI * dm));
}

/**
 * Par de elevacion por columna (N*m) para tornillo de potencia con rozamiento en flanco.
 * Formula clasica (perfil cuadrado aproximado): T = F*(d_m/2)*tan(phi + lambda).
 */
export function raisingTorquePerColumn_Nm(forcePerColumn_N, pitch_mm, screwDiameter_mm, mu_thread) {
  const F = Math.max(0, Number(forcePerColumn_N) || 0);
  const p = Math.max(0.5, Number(pitch_mm) || 6);
  const d = Math.max(6, Number(screwDiameter_mm) || 35);
  const dm_mm = Math.max(0.6 * d, d - 0.5 * p);
  const dm = dm_mm / 1000;
  const mu = Math.max(0.03, Math.min(0.25, Number(mu_thread) || 0.12));
  const phi = Math.atan(mu);
  const lam = helixAngle_rad(p, d);
  return F * (dm / 2) * Math.tan(phi + lam);
}

/**
 * Presion de contacto media (MPa) en tuerca: p ~ F / (pi * d_m * L).
 * d_m y L en mm; F en N -> N/mm2 = MPa.
 */
export function nutContactPressure_MPa(force_N, meanDiameter_mm, nutLength_mm) {
  const F = Math.max(0, Number(force_N) || 0);
  const dm = Math.max(6, Number(meanDiameter_mm) || 30);
  const L = Math.max(10, Number(nutLength_mm) || 80);
  const area_mm2 = Math.PI * dm * L;
  return area_mm2 > 1e-6 ? F / area_mm2 : 0;
}

/**
 * Autofrenado (self-locking): lambda < phi (angulo de helice menor que angulo de rozamiento).
 */
export function isSelfLocking(pitch_mm, screwDiameter_mm, mu_thread) {
  const mu = Math.max(0.03, Math.min(0.25, Number(mu_thread) || 0.12));
  const phi = Math.atan(mu);
  const lam = helixAngle_rad(pitch_mm, screwDiameter_mm);
  return lam < phi * 0.995;
}

/**
 * @param {object} p
 * @param {number} p.capacity_kg - capacidad total (vehiculo) en kg
 * @param {number} p.liftHeight_m
 * @param {number} p.liftTime_s - tiempo deseado de elevacion (s)
 * @param {number} p.pitch_mm
 * @param {number} p.screwDiameter_mm
 * @param {number} p.nutLength_mm - longitud efectiva de tuerca (mm)
 * @param {number} p.mu_thread - rozamiento efectivo en rosca (acero-bronce orientativo)
 * @param {number} [p.columns] - por defecto 2
 * @param {number} [p.serviceFactor] - margen dinamico para motorreductor (1.0-2.0)
 * @param {number} [p.pAllow_MPa] - presion admisible bronce (orientativo)
 */
export function computeCarLiftScrew(p) {
  const columns = Math.max(1, Math.round(Number(p.columns) || 2));
  const m = Math.max(0, Number(p.capacity_kg) || 3000);
  const H = Math.max(0.2, Number(p.liftHeight_m) || 1.8);
  const t = Math.max(2, Number(p.liftTime_s) || 45);
  const pitch = Math.max(0.5, Number(p.pitch_mm) || 8);
  const d = Math.max(10, Number(p.screwDiameter_mm) || 45);
  const mu = Math.max(0.03, Math.min(0.25, Number(p.mu_thread) || 0.12));
  const Lnut = Math.max(10, Number(p.nutLength_mm) || 90);
  const SF = Math.max(1.0, Math.min(2.2, Number(p.serviceFactor) || 1.35));
  const pAllow = Math.max(4, Math.min(25, Number(p.pAllow_MPa) || 10));

  const F_total = m * g;
  const F_col = F_total / columns;

  const dm_mm = Math.max(0.6 * d, d - 0.5 * pitch);
  const lam = helixAngle_rad(pitch, d);
  const phi = Math.atan(mu);
  const selfLocking = isSelfLocking(pitch, d, mu);

  const torque_col = raisingTorquePerColumn_Nm(F_col, pitch, d, mu);
  const torque_total = torque_col * columns;

  const turns = (H * 1000) / pitch;
  const rpm = (turns / (t / 60));
  const omega = (2 * Math.PI * rpm) / 60;
  const power_kW = (torque_total * omega) / 1000;

  const torque_design = torque_total * SF;
  const power_design_kW = power_kW * SF;

  const pContact = nutContactPressure_MPa(F_col, dm_mm, Lnut);

  /** @type {Array<{ level: 'ok'|'warn'|'err', code: string, text: string }>} */
  const verdicts = [];

  const lamDeg = (lam * 180) / Math.PI;
  const phiDeg = (phi * 180) / Math.PI;

  if (!selfLocking) {
    verdicts.push({
      level: 'err',
      code: 'self_lock',
      text: `No cumple autofrenado: angulo helice \u03bb=${lamDeg.toFixed(1)}\u00b0 \u2265 angulo rozamiento \u03c6=${phiDeg.toFixed(1)}\u00b0. Riesgo de bajada por gravedad; use freno/antirretorno o ajuste paso/diametro/mu.`,
    });
  } else if ((phi - lam) / Math.max(phi, 1e-6) < 0.12) {
    verdicts.push({
      level: 'warn',
      code: 'self_lock_margin',
      text: `Autofrenado OK pero con margen bajo (\u03bb\u2248${lamDeg.toFixed(1)}\u00b0, \u03c6\u2248${phiDeg.toFixed(1)}\u00b0). Considere freno redundante segun normativa del elevador.`,
    });
  }

  if (pContact > pAllow) {
    verdicts.push({
      level: 'err',
      code: 'nut_pressure',
      text: `Presion de contacto alta en tuerca: p\u2248${pContact.toFixed(1)} MPa > admisible ${pAllow.toFixed(0)} MPa (orient.). Aumente longitud de tuerca, diametro medio o reduzca carga por columna.`,
    });
  } else if (pContact > 0.85 * pAllow) {
    verdicts.push({
      level: 'warn',
      code: 'nut_pressure_margin',
      text: `Presion de contacto elevada en tuerca: p\u2248${pContact.toFixed(1)} MPa (cerca del limite ${pAllow.toFixed(0)} MPa). Revise desgaste y lubricacion.`,
    });
  }

  if (rpm > 60) {
    verdicts.push({
      level: 'warn',
      code: 'rpm',
      text: `RPM de husillo alta (${rpm.toFixed(1)} rpm) para tornillo de potencia tipico. Revise vibracion, lubricacion y calor; ajuste tiempo de elevacion o paso.`,
    });
  }

  if (verdicts.every((v) => v.level !== 'err')) {
    verdicts.push({
      level: 'ok',
      code: 'ok',
      text: `Calculo OK (modelo orientativo). Par elevacion \u2248 ${torque_total.toFixed(0)} N\u00b7m (total), potencia \u2248 ${power_kW.toFixed(2)} kW; autofrenado ${selfLocking ? 'OK' : 'NO'}.`,
    });
  }

  /** @type {Array<{ id: string, title: string, formula: string, substitution: string, value: number, unit: string, meaning: string }>} */
  const steps = [
    {
      id: 'f_tot',
      title: 'Fuerza total (peso)',
      formula: 'F = m * g',
      substitution: `${m.toFixed(0)} kg * ${g.toFixed(2)} m/s^2`,
      value: F_total,
      unit: 'N',
      meaning: 'Carga vertical total sobre el elevador (modelo 2 columnas).',
    },
    {
      id: 'f_col',
      title: 'Fuerza por columna',
      formula: 'F_col = F / n',
      substitution: `${F_total.toFixed(0)} N / ${columns}`,
      value: F_col,
      unit: 'N',
      meaning: 'Reparto simetrico entre columnas.',
    },
    {
      id: 'dm',
      title: 'Diametro medio (aprox.)',
      formula: 'dm = max(0,6d, d - 0,5p)',
      substitution: `d = ${d.toFixed(0)} mm, p = ${pitch.toFixed(1)} mm`,
      value: dm_mm,
      unit: 'mm',
      meaning: 'Para angulo de helice y presion en tuerca.',
    },
    {
      id: 'lambda',
      title: 'Angulo de helice',
      formula: 'lambda = atan(lead / (pi * dm))',
      substitution: `lead = ${pitch.toFixed(1)} mm`,
      value: lamDeg,
      unit: '\u00b0',
      meaning: 'Una entrada por revolucion (lead = paso).',
    },
    {
      id: 'phi',
      title: 'Angulo de rozamiento',
      formula: 'phi = atan(mu)',
      substitution: `mu = ${mu.toFixed(3)}`,
      value: phiDeg,
      unit: '\u00b0',
      meaning: 'Rozamiento efectivo acero-bronce en rosca.',
    },
    {
      id: 'torque_col',
      title: 'Par por columna (elevacion)',
      formula: 'T = F_col * (dm/2) * tan(phi + lambda)',
      substitution: `dm = ${(dm_mm / 1000).toFixed(4)} m`,
      value: torque_col,
      unit: 'N\u00b7m',
      meaning: 'Modelo tornillo de potencia simplificado.',
    },
    {
      id: 'torque_tot',
      title: 'Par total husillo',
      formula: 'T_tot = T_col * n',
      substitution: `${torque_col.toFixed(2)} N\u00b7m * ${columns}`,
      value: torque_total,
      unit: 'N\u00b7m',
      meaning: 'Acoplamiento mecanico entre columnas no modelado aqui.',
    },
    {
      id: 'rpm',
      title: 'Velocidad husillo',
      formula: 'rpm = (H/p) / (t/60)',
      substitution: `H = ${H.toFixed(2)} m, p = ${pitch.toFixed(1)} mm, t = ${t.toFixed(0)} s`,
      value: rpm,
      unit: '1/min',
      meaning: 'De carrera y tiempo de elevacion deseado.',
    },
    {
      id: 'power',
      title: 'Potencia mecanica (sin SF)',
      formula: 'P = T_tot * omega',
      substitution: `omega = 2*pi*rpm/60`,
      value: power_kW,
      unit: 'kW',
      meaning: 'En el husillo antes del factor de servicio del accionamiento.',
    },
    {
      id: 'p_nut',
      title: 'Presion contacto tuerca',
      formula: 'p = F_col / (pi * dm * L)',
      substitution: `L = ${Lnut.toFixed(0)} mm`,
      value: pContact,
      unit: 'MPa',
      meaning: 'Area cilindrica simplificada; valide con fabricante.',
    },
  ];

  const explanations = [
    'Autofrenado exige \u03bb < \u03c6 con el mu considerado; si no, la rosca no retiene la carga por si sola.',
    'La presion en tuerca es un modelo orientativo; desgaste, alineacion y lubricacion cambian la realidad.',
  ];

  const assumptions = [
    'Dos columnas simetricas; carga total m repartida en n = 2 (F_col = m*g/2 por columna).',
    'Tornillo de potencia, perfil simplificado; lead = paso p (una entrada).',
    'Diametro medio dm = max(0,6d, d - 0,5p) para angulo de helice y presion.',
    'No incluye pandeo del husillo, fatiga, ni verificacion normativa completa de elevador de vehiculos.',
    'Factor de servicio aplicado al par y potencia de dimensionamiento del motorreductor.',
  ];

  const disclaimerEs =
    'Modelo educativo. Verifique tuerca de seguridad, freno, finales de carrera, pandeo/estabilidad de columnas y normativa aplicable.';

  const result = {
    inputs: {
      columns,
      capacity_kg: m,
      liftHeight_m: H,
      liftTime_s: t,
      pitch_mm: pitch,
      screwDiameter_mm: d,
      meanDiameter_mm: dm_mm,
      nutLength_mm: Lnut,
      mu_thread: mu,
      serviceFactor: SF,
      pAllow_MPa: pAllow,
    },
    geometry: {
      helixAngle_deg: (lam * 180) / Math.PI,
      frictionAngle_deg: (phi * 180) / Math.PI,
    },
    selfLocking,
    loads: {
      forceTotal_N: F_total,
      forcePerColumn_N: F_col,
    },
    drive: {
      screw_rpm: rpm,
      torqueTotal_Nm: torque_total,
      power_kW: power_kW,
      torqueDesign_Nm: torque_design,
      powerDesign_kW: power_design_kW,
    },
    nut: {
      contactPressure_MPa: pContact,
    },
    verdicts,
    steps,
    explanations,
    assumptions,
    disclaimer: disclaimerEs,
  };

  if (p.lang === 'en') {
    return translateCarLiftScrewResultToEnglish(result, {
      lamDeg,
      phiDeg,
      pContact,
      pAllow,
      rpm,
      torque_total,
      power_kW,
      selfLocking,
    });
  }
  return result;
}

/**
 * @param {object} r
 * @param {object} x
 */
function translateCarLiftScrewResultToEnglish(r, x) {
  const vMap = {
    self_lock: `Self-locking not satisfied: helix angle lambda=${x.lamDeg.toFixed(1)} deg >= friction angle phi=${x.phiDeg.toFixed(1)} deg. Risk of gravity descent; use a brake/backstop or adjust pitch, diameter or mu.`,
    self_lock_margin: `Self-locking OK but low margin (lambda~${x.lamDeg.toFixed(1)} deg, phi~${x.phiDeg.toFixed(1)} deg). Consider redundant braking per lift code.`,
    nut_pressure: `High nut contact pressure: p~${x.pContact.toFixed(1)} MPa > allowable ${x.pAllow.toFixed(0)} MPa (indicative). Increase nut length, mean diameter or reduce load per column.`,
    nut_pressure_margin: `Elevated nut contact pressure: p~${x.pContact.toFixed(1)} MPa (near ${x.pAllow.toFixed(0)} MPa limit). Review wear and lubrication.`,
    rpm: `High screw RPM (${x.rpm.toFixed(1)} rpm) for a typical power screw. Check vibration, lubrication and heat; adjust lift time or pitch.`,
    ok: `Calculation OK (indicative model). Lift torque ~ ${x.torque_total.toFixed(0)} N*m (total), power ~ ${x.power_kW.toFixed(2)} kW; self-locking ${x.selfLocking ? 'OK' : 'NO'}.`,
  };
  const verdicts = r.verdicts.map((v) => ({ ...v, text: vMap[v.code] ?? v.text }));

  const stepTxt = {
    f_tot: {
      title: 'Total force (weight)',
      formula: 'F = m * g',
      meaning: 'Total vertical load on the lift (two-column model).',
    },
    f_col: {
      title: 'Force per column',
      formula: 'F_col = F / n',
      meaning: 'Symmetric share between columns.',
    },
    dm: {
      title: 'Mean diameter (approx.)',
      formula: 'dm = max(0.6d, d - 0.5p)',
      meaning: 'For helix angle and nut pressure.',
    },
    lambda: {
      title: 'Helix angle',
      formula: 'lambda = atan(lead / (pi * dm))',
      meaning: 'Single start (lead = pitch p).',
    },
    phi: {
      title: 'Friction angle',
      formula: 'phi = atan(mu)',
      meaning: 'Effective steel-bronze friction in thread.',
    },
    torque_col: {
      title: 'Torque per column (lifting)',
      formula: 'T = F_col * (dm/2) * tan(phi + lambda)',
      meaning: 'Simplified power-screw model.',
    },
    torque_tot: {
      title: 'Total screw torque',
      formula: 'T_tot = T_col * n',
      meaning: 'Mechanical coupling between columns not modeled.',
    },
    rpm: {
      title: 'Screw speed',
      formula: 'rpm = (H/p) / (t/60)',
      meaning: 'From stroke and target lift time.',
    },
    power: {
      title: 'Mechanical power (no SF)',
      formula: 'P = T_tot * omega',
      meaning: 'At the screw before drive service factor.',
    },
    p_nut: {
      title: 'Nut contact pressure',
      formula: 'p = F_col / (pi * dm * L)',
      meaning: 'Simplified cylindrical area; confirm with OEM.',
    },
  };
  const steps = r.steps.map((s) => {
    const t = stepTxt[s.id];
    if (!t) return s;
    return { ...s, title: t.title, formula: t.formula, meaning: t.meaning };
  });

  return {
    ...r,
    verdicts,
    steps,
    explanations: [
      'Self-locking requires lambda < phi for the mu used; otherwise the thread cannot hold load alone.',
      'Nut pressure is indicative; wear, alignment and lubrication change real conditions.',
    ],
    assumptions: [
      'Two symmetric columns; total mass m split with n = 2 (F_col = m*g/2 per column).',
      'Power screw, simplified profile; lead = pitch p (single start).',
      'Mean diameter dm = max(0.6d, d - 0.5p) for helix angle and pressure.',
      'Excludes screw buckling, fatigue, and full regulatory proof for vehicle lifts.',
      'Service factor applied to gearmotor sizing torque and power.',
    ],
    disclaimer:
      'Educational model. Verify safety nut, brake, limit switches, column buckling/stability and applicable codes.',
  };
}

