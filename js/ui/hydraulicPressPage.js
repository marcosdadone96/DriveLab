import { mountCompactLabFieldHelp } from './labHelpCompact.js';
import { readLabNumber } from '../utils/labInputParse.js';
import { mountLabFluidPdfExportBar } from '../services/fluidLabPdfExport.js';
import { formatDateTimeLocale, getCurrentLang } from '../config/locales.js';

const G = 9.81;
const PI = Math.PI;
const ISO_PISTON_MM = [40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400];
const ETA_DIAG = 0.92;

/** @type {object | null} */
let pressPdfSnapshot = null;

function fmt(n, d = 2) {
  return Number.isFinite(n) ? n.toFixed(d) : '--';
}

function metric(label, value, unit = '') {
  return `
    <article class="lab-metric">
      <div class="k">${label}</div>
      <div class="v">${value}</div>
      ${unit ? `<div class="lab-metric__si">${unit}</div>` : ''}
    </article>
  `;
}

function nearestIsoAtOrAbove(mm) {
  for (let i = 0; i < ISO_PISTON_MM.length; i += 1) {
    if (ISO_PISTON_MM[i] >= mm) return ISO_PISTON_MM[i];
  }
  return ISO_PISTON_MM[ISO_PISTON_MM.length - 1];
}

function renderPressDiagram(svg, pistonMm, forceTon) {
  if (!(svg instanceof SVGElement)) return;
  const cylW = Math.max(34, Math.min(70, pistonMm * 0.16));
  svg.setAttribute('viewBox', '0 0 760 280');
  svg.innerHTML = `
    <defs>
      <marker id="hppArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#0ea5e9"/>
      </marker>
      <linearGradient id="hppSteel" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#e5e7eb"/>
        <stop offset="100%" stop-color="#cbd5e1"/>
      </linearGradient>
    </defs>
    <rect width="760" height="280" fill="#f8fafc"/>
    <text x="20" y="24" font-size="12.5" font-weight="800" fill="#0f172a" font-family="Inter,system-ui,sans-serif">Prensa hidraulica de 4 columnas - vista funcional</text>
    <rect x="125" y="38" width="510" height="20" rx="5" fill="url(#hppSteel)" stroke="#64748b" stroke-width="1.4"/>
    <rect x="102" y="226" width="556" height="24" rx="5" fill="url(#hppSteel)" stroke="#64748b" stroke-width="1.4"/>
    <rect x="164" y="58" width="12" height="168" fill="#d1d5db" stroke="#64748b" stroke-width="1.2"/>
    <rect x="236" y="58" width="12" height="168" fill="#d1d5db" stroke="#64748b" stroke-width="1.2"/>
    <rect x="512" y="58" width="12" height="168" fill="#d1d5db" stroke="#64748b" stroke-width="1.2"/>
    <rect x="584" y="58" width="12" height="168" fill="#d1d5db" stroke="#64748b" stroke-width="1.2"/>
    <rect x="${380 - cylW / 2}" y="58" width="${cylW}" height="52" rx="8" fill="#a7f3d0" stroke="#0f766e" stroke-width="1.4"/>
    <rect x="368" y="110" width="24" height="22" rx="4" fill="#94a3b8" stroke="#334155" stroke-width="1.2"/>
    <rect x="244" y="132" width="272" height="20" rx="4" fill="#dbeafe" stroke="#0284c7" stroke-width="1.4"/>
    <rect x="292" y="176" width="176" height="22" rx="4" fill="#f1f5f9" stroke="#94a3b8" stroke-dasharray="5 4"/>
    <text x="306" y="191" font-size="9.5" fill="#334155" font-family="Inter,system-ui,sans-serif">Zona de prensado</text>
    <path d="M380 82 L380 128" stroke="#0ea5e9" stroke-width="2.8" marker-end="url(#hppArrow)"/>
    <text x="398" y="92" font-size="10" fill="#0369a1" font-weight="700" font-family="Inter,system-ui,sans-serif">Presion aplicada</text>
    <text x="398" y="108" font-size="9.8" fill="#334155" font-family="Inter,system-ui,sans-serif">F = ${fmt(forceTon, 1)} t</text>
    <text x="${380 - cylW / 2 - 4}" y="54" font-size="9.5" fill="#334155" font-family="Inter,system-ui,sans-serif">Cilindro</text>
    <text x="322" y="127" font-size="9.5" fill="#334155" font-family="Inter,system-ui,sans-serif">Plato movil</text>
    <text x="332" y="244" font-size="9.5" fill="#334155" font-family="Inter,system-ui,sans-serif">Mesa fija</text>
    <text x="146" y="72" font-size="9.3" fill="#334155" font-family="Inter,system-ui,sans-serif">Columnas</text>
  `;
}

function syncLabTierUi() {
  const tier = document.getElementById('hppLabTier') instanceof HTMLSelectElement
    ? document.getElementById('hppLabTier').value
    : 'basic';
  const panel = document.getElementById('hppProjectPanel');
  if (panel instanceof HTMLElement) panel.hidden = tier !== 'project';
}

function computeAndRender() {
  const mode = document.getElementById('hppMode') instanceof HTMLSelectElement
    ? document.getElementById('hppMode').value
    : 'design';
  const labTier = document.getElementById('hppLabTier') instanceof HTMLSelectElement
    ? document.getElementById('hppLabTier').value
    : 'basic';

  const results = document.getElementById('hppResults');
  const advisor = document.getElementById('hppAdvisor');
  const verdict = document.getElementById('hppVerdict');
  const formulaBody = document.getElementById('hppFormulaBody');
  if (!(results instanceof HTMLElement) || !(advisor instanceof HTMLElement) || !(verdict instanceof HTMLElement)) return;

  pressPdfSnapshot = { valid: false };

  const errors = [];
  const need = (r) => {
    if (!r.ok) errors.push(r.error);
    return r.ok ? r.value : NaN;
  };

  const forceTon = need(readLabNumber('hppForceTon', 1, undefined, 'Fuerza de prensado (t)'));
  const pBar = need(readLabNumber('hppPressureBar', 50, undefined, 'Presion maxima (bar)'));
  const strokeMm = need(readLabNumber('hppStrokeMm', 20, undefined, 'Carrera (mm)'));
  const cycleS = need(readLabNumber('hppCycleS', 1, undefined, 'Tiempo de ciclo (s)'));
  const approachFactor = need(readLabNumber('hppApproachFactor', 1, 6, 'Factor velocidad aproximacion'));
  const pumpFlowLmin = need(readLabNumber('hppPumpFlowLmin', 1, undefined, 'Caudal de bomba (L/min)'));
  const sigmaAllowMpa = need(readLabNumber('hppSteelMpa', 80, undefined, 'Tension admisible columna (MPa)'));

  const colsEl = document.getElementById('hppColumns');
  const nColsRaw = colsEl instanceof HTMLSelectElement ? Number(colsEl.value) : NaN;
  let nCols = 4;
  if (nColsRaw === 2 || nColsRaw === 4) nCols = nColsRaw;
  else errors.push('Numero de columnas: valor no valido.');

  let diagPistonMm = 250;
  let diagColMm = 110;
  if (mode === 'diagnostic') {
    const dp = readLabNumber('hppDiagPistonMm', 20, undefined, 'Diametro piston existente (mm)');
    const dc = readLabNumber('hppDiagColumnMm', 20, undefined, 'Diametro real de columnas (mm)');
    if (!dp.ok) errors.push(dp.error);
    else diagPistonMm = dp.value;
    if (!dc.ok) errors.push(dc.error);
    else diagColMm = dc.value;
  }

  let colLengthMm = 2200;
  let colK = 0.7;
  let eGpa = 210;
  if (labTier === 'project') {
    const rL = readLabNumber('hppColLengthMm', 200, 20000, 'Longitud libre columna (mm)');
    const rE = readLabNumber('hppEGpa', 70, 220, 'Modulo E (GPa)');
    if (!rL.ok) errors.push(rL.error);
    else colLengthMm = rL.value;
    if (!rE.ok) errors.push(rE.error);
    else eGpa = rE.value;
    const kEl = document.getElementById('hppColK');
    colK = kEl instanceof HTMLSelectElement ? Number(kEl.value) : 0.7;
    if (!Number.isFinite(colK) || colK <= 0) errors.push('Coeficiente K: valor no valido.');
  }

  if (errors.length) {
    results.innerHTML = '';
    if (formulaBody instanceof HTMLElement) formulaBody.innerHTML = '';
    advisor.innerHTML = `<div class="lab-alert lab-alert--danger"><div class="lab-alert__body"><strong>Entrada no valida:</strong><ul style="margin:0.4em 0 1.1em;padding:0">${errors.map((e) => `<li>${e}</li>`).join('')}</ul></div></div>`;
    verdict.className = 'lab-verdict lab-verdict--err';
    verdict.textContent = 'Revise los valores del formulario.';
    return;
  }

  const forceNDesign = forceTon * 1000 * G;
  const pPa = pBar * 1e5;

  const areaReqM2 = forceNDesign / pPa;
  const pistonReqM = Math.sqrt((4 * areaReqM2) / PI);
  const pistonReqMm = pistonReqM * 1000;
  const pistonIsoMm = nearestIsoAtOrAbove(pistonReqMm);
  const pistonUseMm = mode === 'diagnostic' ? diagPistonMm : pistonIsoMm;
  const areaUseM2 = (PI * Math.pow(pistonUseMm / 1000, 2)) / 4;
  const forceN = mode === 'diagnostic' ? pPa * areaUseM2 * ETA_DIAG : pPa * areaUseM2;
  const tonReal = forceN / (1000 * G);

  const tApproach = cycleS * 0.45;
  const tWork = cycleS * 0.55;
  const vWork = (strokeMm / 1000) / Math.max(0.1, tWork);
  const vApproach = vWork * approachFactor;
  const qWorkLmin = areaUseM2 * vWork * 60000;
  const qApproachLmin = areaUseM2 * vApproach * 60000;
  const qReqLmin = Math.max(qWorkLmin, qApproachLmin);

  const motorKw = (pBar * qReqLmin) / (600 * 0.85);
  const motorKwFromPump = (pBar * pumpFlowLmin) / (600 * 0.85);
  const motorStd = [5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 160, 200, 250, 315, 355, 400];
  const motorRec = motorStd.find((k) => k >= motorKw) || motorStd[motorStd.length - 1];
  const cycleScale = Math.max(1, qReqLmin / Math.max(0.1, pumpFlowLmin));
  const cycleRealS = cycleS * cycleScale;

  const forcePerColN = forceN / nCols;
  const sigmaAllowPa = sigmaAllowMpa * 1e6;
  const areaColM2 = forcePerColN / sigmaAllowPa;
  const colDiaMm = Math.sqrt((4 * areaColM2) / PI) * 1000;
  const colDiaSafeMm = colDiaMm * 1.2;
  const diagColAreaM2 = (PI * Math.pow(diagColMm / 1000, 2)) / 4;
  const maxTonByCols = (diagColAreaM2 * sigmaAllowPa * nCols) / (1000 * G);

  const dColEulerMm = mode === 'diagnostic' ? diagColMm : colDiaSafeMm;
  const Lcol = colLengthMm / 1000;
  const Epa = eGpa * 1e9;
  const dM = dColEulerMm / 1000;
  const Icol = (PI * Math.pow(dM, 4)) / 64;
  const pCrColN = labTier === 'project'
    ? (PI * PI * Epa * Icol) / Math.pow(Math.max(0.01, colK * Lcol), 2)
    : NaN;
  const fsEulerCol = labTier === 'project' && Number.isFinite(pCrColN) ? pCrColN / Math.max(1, forcePerColN) : NaN;

  renderPressDiagram(document.getElementById('hpPressDiagram'), pistonUseMm, tonReal);

  const mainCards = [
    metric('Tonelaje real', `${fmt(tonReal, 1)} t`, mode === 'diagnostic' ? `estimado por D=${fmt(diagPistonMm, 1)} mm` : `objetivo ${fmt(forceTon, 1)} t`),
    metric('Diametro piston sugerido (ISO)', `${fmt(pistonIsoMm, 0)} mm`, `req. teorico ${fmt(pistonReqMm, 1)} mm`),
    metric('Caudal bomba necesario', `${fmt(qReqLmin, 1)} L/min`, `aprox ${fmt(qApproachLmin, 1)} / trabajo ${fmt(qWorkLmin, 1)}`),
    metric('Potencia motor electrico', `${fmt(motorKw, 2)} kW`, `normalizado ${fmt(motorRec, 1)} kW`),
  ].join('');

  const secondaryCards = [
    metric('Caudal de aproximacion', `${fmt(qApproachLmin, 1)} L/min`, `factor aprox ${fmt(approachFactor, 2)}x`),
    metric('Caudal de trabajo', `${fmt(qWorkLmin, 1)} L/min`, `fase de prensado`),
    metric('Potencia disponible (bomba actual)', `${fmt(motorKwFromPump, 2)} kW`, `Q actual ${fmt(pumpFlowLmin, 1)} L/min`),
    metric('Tiempo de ciclo estimado con bomba actual', `${fmt(cycleRealS, 2)} s`, `objetivo ${fmt(cycleS, 2)} s`),
  ];
  if (labTier === 'project' && Number.isFinite(pCrColN)) {
    secondaryCards.push(
      metric('Carga crit. Euler columna', `${fmt(pCrColN / 1000, 1)} kN`, `FS ${fmt(fsEulerCol, 2)} (D=${fmt(dColEulerMm, 0)} mm)`),
    );
  }

  results.innerHTML = `
    ${mainCards}
    <details class="hpp-more-details">
      <summary>Datos tecnicos secundarios</summary>
      <div class="hpp-more-details__body">
        <div class="lab-results">${secondaryCards.join('')}</div>
      </div>
    </details>
  `;

  const formulaLines = [
    'Fuerza objetivo (diseno): F = m_t * 1000 * g con m_t en toneladas metricas (equiv. ~kN/g).',
    'Area piston requerida: A_req = F / p con p en Pa (bar * 1e5).',
    'Diametro teorico: d = sqrt(4*A_req/pi). Se normaliza a carrera ISO de piston.',
    `Caudal trabajo: Q = A * v * 60000 L/min con v = carrera_m / t_trabajo (t_trabajo = 0.55 * t_ciclo).`,
    'Caudal aproximacion: Q_aprox = A * v_aprox * 60000 con v_aprox = factor * v_trabajo.',
    'Potencia hidraulica aprox.: P_kW = (p_bar * Q_Lmin) / (600 * eta_motor_hidr) con eta_motor_hidr=0.85.',
    'Columnas (tension axial): A_col = (F/n) / sigma_adm; d_min = sqrt(4*A_col/pi); sugerido x1.2.',
  ];
  if (labTier === 'project' && Number.isFinite(pCrColN)) {
    formulaLines.push(`Pandeo Euler: I = pi*d^4/64, Pcr = pi^2*E*I/(K*L)^2 con L en m, E en Pa, K coef. longitud efectiva.`);
    formulaLines.push(`D usado en I: ${mode === 'diagnostic' ? 'diametro real columnas' : 'diametro minimo x1.2 (diseno)'}.`);
  } else if (labTier === 'basic') {
    formulaLines.push('Modo aula: no se evalua pandeo de columnas; el chequeo axial es orientativo.');
  }

  const assumptions = [
    'g = 9.81 m/s2. Presion uniforme en piston sin caida dinamica modelada.',
    'Rendimiento mecanico/hidraulico agregado 0.85 en potencia de motor.',
    mode === 'diagnostic' ? `Modo diagnostico: fuerza efectiva ~ eta_diag=${ETA_DIAG} sobre P*A.` : 'Modo diseno: fuerza nominal P*A sin eta de diagnostico.',
    labTier === 'project'
      ? `Pandeo: columna circular maciza, E=${fmt(eGpa, 0)} GPa, L=${fmt(colLengthMm, 0)} mm, K=${fmt(colK, 2)}.`
      : 'Sin verificacion de pandeo de columnas en modo aula.',
    'No sustituye analisis FEM, fatiga ni guiado de plato.',
  ];

  if (formulaBody instanceof HTMLElement) {
    formulaBody.innerHTML = `
      <p class="lab-fluid-formulas__lead">${labTier === 'project' ? 'Modo proyecto: incluye pandeo Euler en columnas.' : 'Modo aula: formulas basicas y tension axial en columnas.'}</p>
      <ol class="lab-fluid-formulas__list">
        ${formulaLines.map((x) => `<li>${x}</li>`).join('')}
      </ol>
      <p class="lab-fluid-formulas__sub"><strong>Supuestos</strong></p>
      <ul class="lab-fluid-formulas__list">
        ${assumptions.map((x) => `<li>${x}</li>`).join('')}
      </ul>
    `;
  }

  const alerts = [];
  if (pBar > 350) {
    alerts.push('<div class="lab-alert lab-alert--danger"><div class="lab-alert__body"><strong>Presion extrema:</strong> Requiere componentes de alta gama y sellos especiales. Considera aumentar el diametro del piston para trabajar a presiones estandar (210-250 bar).</div></div>');
  }
  if (mode === 'diagnostic' && pBar > 250) {
    alerts.push('<div class="lab-alert lab-alert--danger"><div class="lab-alert__body"><strong>Peligro:</strong> Estas superando la presion de diseno. Riesgo de fatiga en columnas o rotura de sellos.</div></div>');
  }
  if (labTier === 'project' && Number.isFinite(fsEulerCol) && fsEulerCol < 2) {
    alerts.push(`<div class="lab-alert lab-alert--danger"><div class="lab-alert__body"><strong>Pandeo columnas:</strong> FS Euler ${fmt(fsEulerCol, 2)} &lt; 2. Aumente diametro, arriostre o reduzca L/K.</div></div>`);
  }
  if (pumpFlowLmin < qReqLmin) {
    alerts.push(`<div class="lab-alert lab-alert--warn"><div class="lab-alert__body"><strong>Optimizacion:</strong> Para bajar el plato en ${fmt(tApproach, 1)} s, tu bomba actual es insuficiente. Necesitas un caudal de ${fmt(qReqLmin, 1)} L/min.</div></div>`);
  }
  if (motorKwFromPump < motorKw) {
    alerts.push(`<div class="lab-alert lab-alert--danger"><div class="lab-alert__body"><strong>Advertencia de potencia:</strong> Para cumplir tu objetivo de tiempo de ciclo necesitas ${fmt(motorKw, 2)} kW. Con una potencia disponible de ${fmt(motorKwFromPump, 2)} kW (equivalente al caudal actual), el tiempo de ciclo aumentara a ${fmt(cycleRealS, 2)} s.</div></div>`);
  }
  alerts.push(`<div class="lab-alert lab-alert--info"><div class="lab-alert__body"><strong>Seguridad:</strong> Con ${fmt(tonReal, 1)} toneladas, las columnas deben tener un diametro minimo de ${fmt(colDiaSafeMm, 1)} mm para evitar deformacion elastica (tension axial).</div></div>`);
  if (mode === 'diagnostic') {
    alerts.push(`<div class="lab-alert lab-alert--info"><div class="lab-alert__body"><strong>Veredicto estructural:</strong> Tus columnas de ${fmt(diagColMm, 1)} mm soportan un maximo de ${fmt(maxTonByCols, 1)} toneladas antes de deformarse (axial).</div></div>`);
  }
  advisor.innerHTML = alerts.join('');

  const balanced = pBar <= 300 && pumpFlowLmin >= qReqLmin * 0.95 && motorRec <= motorKw * 1.3 && (mode !== 'diagnostic' || maxTonByCols >= tonReal)
    && !(labTier === 'project' && Number.isFinite(fsEulerCol) && fsEulerCol < 2);
  verdict.className = balanced ? 'lab-verdict lab-verdict--ok' : 'lab-verdict lab-verdict--muted';
  verdict.textContent = balanced
    ? `CONFIGURACION EQUILIBRADA - Productividad y costo de potencia en rango razonable.`
    : `CONFIGURACION AJUSTABLE - Revisa caudal de bomba, presion de trabajo y potencia instalada para equilibrar productividad vs costo.`;

  const lang = getCurrentLang();
  const ts = formatDateTimeLocale(new Date(), lang);
  pressPdfSnapshot = {
    valid: true,
    title: lang === 'en' ? 'Report - Industrial hydraulic press' : 'Informe - Prensa hidraulica industrial',
    fileBase: `${lang === 'en' ? 'report-hydraulic-press' : 'informe-prensa-hidraulica'}-${new Date().toISOString().slice(0, 10)}`,
    timestamp: ts,
    tierLabel: labTier === 'project' ? (lang === 'en' ? 'Mode: Project (detailed)' : 'Modo: Proyecto (detallado)') : (lang === 'en' ? 'Mode: Classroom (basic)' : 'Modo: Aula (basico)'),
    kpis: [
      { title: lang === 'en' ? 'Real tonnage' : 'Tonelaje real', value: `${fmt(tonReal, 1)} t`, subtitle: 'F/g' },
      { title: lang === 'en' ? 'ISO piston' : 'Piston ISO', value: `${fmt(pistonIsoMm, 0)} mm`, subtitle: lang === 'en' ? 'Suggested' : 'Sugerido' },
      { title: 'Q', value: `${fmt(qReqLmin, 1)} L/min`, subtitle: lang === 'en' ? 'Pump flow' : 'Caudal bomba' },
      { title: 'P motor', value: `${fmt(motorKw, 2)} kW`, subtitle: `${fmt(motorRec, 1)} kW nom.` },
    ],
    inputRows: [
      { label: lang === 'en' ? 'Mode' : 'Modo calculo', value: mode },
      { label: lang === 'en' ? 'Detail tier' : 'Nivel memoria', value: labTier },
      { label: lang === 'en' ? 'Force' : 'Fuerza', value: `${fmt(forceTon, 1)} t` },
      { label: 'p', value: `${fmt(pBar, 1)} bar` },
      { label: 'Stroke', value: `${fmt(strokeMm, 0)} mm` },
      { label: lang === 'en' ? 'Cycle' : 'Ciclo', value: `${fmt(cycleS, 1)} s` },
      { label: 'n cols', value: String(nCols) },
      { label: 'sigma', value: `${fmt(sigmaAllowMpa, 0)} MPa` },
    ],
    resultRows: [
      { label: 'F', value: `${fmt(forceN / 1000, 1)} kN` },
      { label: 'A piston', value: `${fmt(areaUseM2 * 1e6, 0)} mm2` },
      { label: 'Q req', value: `${fmt(qReqLmin, 1)} L/min` },
      { label: lang === 'en' ? 'Column d min' : 'D col min', value: `${fmt(colDiaSafeMm, 1)} mm` },
    ],
    formulaLines,
    assumptions,
    verdict: verdict.textContent,
    disclaimer: lang === 'en'
      ? 'Educational pre-design. Verify columns for buckling and buckling-restrained lengths with qualified engineering.'
      : 'Predimensionado educativo. Verificar pandeo de columnas y arriostramientos con ingenieria cualificada.',
  };
  if (labTier === 'project' && Number.isFinite(pCrColN)) {
    pressPdfSnapshot.resultRows.push({ label: 'Pcr col', value: `${fmt(pCrColN / 1000, 1)} kN` });
    pressPdfSnapshot.resultRows.push({ label: 'FS Euler', value: fmt(fsEulerCol, 2) });
  }
}

function syncModeUi() {
  const mode = document.getElementById('hppMode') instanceof HTMLSelectElement
    ? document.getElementById('hppMode').value
    : 'design';
  const forceField = document.getElementById('hppForceTon')?.closest('.lab-field');
  const diagPistonField = document.getElementById('hppDiagPistonField');
  const diagColField = document.getElementById('hppDiagColField');
  if (diagPistonField instanceof HTMLElement) diagPistonField.hidden = mode !== 'diagnostic';
  if (diagColField instanceof HTMLElement) diagColField.hidden = mode !== 'diagnostic';
  if (forceField instanceof HTMLElement) forceField.classList.toggle('lab-field--auto', mode === 'diagnostic');
}

[
  'hppForceTon',
  'hppPressureBar',
  'hppStrokeMm',
  'hppCycleS',
  'hppApproachFactor',
  'hppPumpFlowLmin',
  'hppColumns',
  'hppSteelMpa',
  'hppDiagPistonMm',
  'hppDiagColumnMm',
  'hppMode',
  'hppLabTier',
  'hppColLengthMm',
  'hppColK',
  'hppEGpa',
].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', computeAndRender);
  el.addEventListener('change', computeAndRender);
});

document.getElementById('hppMode')?.addEventListener('change', () => {
  syncModeUi();
  computeAndRender();
});

document.getElementById('hppLabTier')?.addEventListener('change', () => {
  syncLabTierUi();
  computeAndRender();
});

syncLabTierUi();
syncModeUi();
mountCompactLabFieldHelp();
computeAndRender();

mountLabFluidPdfExportBar(document.getElementById('labFluidPdfMount'), {
  getPayload: () => pressPdfSnapshot,
  getDiagramElements: () => {
    const svg = document.getElementById('hpPressDiagram');
    return svg instanceof SVGSVGElement ? [svg] : [];
  },
});
