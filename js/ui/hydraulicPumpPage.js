/**
 * Modulo avanzado oleohidraulico:
 * - Bomba hidraulica (power input)
 * - Dimensionamiento de tuberias (Reynolds + Darcy)
 * - Veredicto integral
 */
import { mountCompactLabFieldHelp } from './labHelpCompact.js';
import { readLabNumber } from '../utils/labInputParse.js';
import { mountLabFluidPdfExportBar } from '../services/fluidLabPdfExport.js';
import { formatDateTimeLocale, getCurrentLang } from '../config/locales.js';

/** @type {object | null} */
let pumpPdfSnapshot = null;
const LANG = (() => {
  try {
    return localStorage.getItem('mdr-home-lang') === 'en' ? 'en' : 'es';
  } catch (_) {
    return 'es';
  }
})();
const TXT = {
  es: {
    title: 'Power Input - Bomba Hidraulica y Conducciones',
    lead: 'Modulo avanzado para analisis de bomba y lineas oleohidraulicas, con asesor IA de cavitacion, perdida de carga y criterio final de seguridad/eficiencia.',
    verdictOk: 'SISTEMA APTO',
    mType: 'Tipo de bomba',
    mPressure: 'Presion operacion',
    mQTheo: 'Caudal teorico',
    mQReal: 'Caudal real',
    mPower: 'Potencia absorbida',
    mTorque: 'Torque eje',
    mDiaS: 'Diametro succion',
    mDiaL: 'Diametro linea actual',
    mVIn: 'Velocidad en conexion bomba',
    mVLine: 'Velocidad en tuberia',
    mRe: 'Numero de Reynolds',
    mF: 'Factor friccion',
    mDp: 'Perdida de carga',
    mRange: 'Rango recomendado velocidad',
    mNpsh: 'Carga neta entrada (indicador)',
    mNpshFoot: 'Patm + rho g z - dP linea; NPSHa indicativa',
    mSug: 'Diametro sugerido',
    mMotor: 'Potencia motor recomendada',
  },
  en: {
    title: 'Power Input - Hydraulic Pump and Piping',
    lead: 'Advanced module for pump and hydraulic line analysis, with AI advisor for cavitation, pressure loss and final safety/efficiency criterion.',
    verdictOk: 'SYSTEM SUITABLE',
    mType: 'Pump type',
    mPressure: 'Operating pressure',
    mQTheo: 'Theoretical flow',
    mQReal: 'Real flow',
    mPower: 'Absorbed power',
    mTorque: 'Shaft torque',
    mDiaS: 'Suction diameter',
    mDiaL: 'Current line diameter',
    mVIn: 'Pump inlet velocity',
    mVLine: 'Line velocity',
    mRe: 'Reynolds number',
    mF: 'Friction factor',
    mDp: 'Pressure drop',
    mRange: 'Recommended speed range',
    mNpsh: 'Net inlet head (indicator)',
    mNpshFoot: 'Patm + rho g z - line dP; indicative NPSHa',
    mSug: 'Suggested diameter',
    mMotor: 'Recommended motor power',
  },
};
function tr(k, vars = {}) {
  const s = (TXT[LANG] && TXT[LANG][k]) || TXT.es[k] || k;
  return s.replace(/\{(\w+)\}/g, (_, kk) => (vars[kk] ?? `{${kk}}`));
}

function applyStaticI18n() {
  document.documentElement.setAttribute('lang', LANG);
  if (LANG !== 'en') return;
  document.title = 'Hydraulic Power Input - MechAssist';
  const map = {
    Inicio: 'Home',
    Laboratorio: 'Laboratory',
    'Lienzo Pro': 'Pro canvas',
    'Power Input - Bomba Hidraulica y Conducciones': 'Power Input - Hydraulic Pump and Piping',
    'Modulo avanzado para analisis de bomba y lineas oleohidraulicas, con asesor IA de cavitacion, perdida de carga y criterio final de seguridad/eficiencia.':
      'Advanced module for hydraulic pump and piping analysis, with AI advisor for cavitation, pressure drop and final safety/efficiency verdict.',
    'Como obtener datos clave:': 'How to obtain key data:',
    '1) Bomba hidraulica - corte de engranajes externos': '1) Hydraulic pump - external gear cross-section',
    '2) Conducciones - mapa de perdida de carga': '2) Piping - pressure loss map',
    'Tipo de bomba': 'Pump type',
    'Engranajes': 'Gear',
    Paletas: 'Vane',
    Pistones: 'Piston',
    'Unidad de presion': 'Pressure unit',
    'Presion de trabajo': 'Working pressure',
    'Presion efectiva de operacion': 'Effective operating pressure',
    'Se usa para potencia hidraulica, potencia absorbida y validacion contra limites tipicos de la tecnologia seleccionada.':
      'Used for hydraulic power, absorbed power and validation against typical limits of selected technology.',
    'RPM motor': 'Motor RPM',
    'Velocidad del eje primario': 'Primary shaft speed',
    'Con el desplazamiento define el caudal teorico de bomba y el par requerido en el eje.':
      'Together with displacement, defines theoretical pump flow and required shaft torque.',
    'Desplazamiento (cm3/rev)': 'Displacement (cm3/rev)',
    'Volumen por vuelta': 'Volume per revolution',
    'Determina el caudal teorico Qteo = D x n; el caudal real incorpora eficiencia volumetrica.':
      'Defines theoretical flow Qtheo = D x n; real flow includes volumetric efficiency.',
    'Diametro de succion (in)': 'Suction diameter (in)',
    'Critico para cavitacion': 'Critical for cavitation',
    'Ingrese en pulgadas nominales. El sistema muestra tambien el equivalente en mm entre parentesis para trazabilidad.':
      'Enter nominal inches. The system also shows mm equivalent in parentheses for traceability.',
    'Tipo de linea': 'Line type',
    Aspiracion: 'Suction',
    Presion: 'Pressure',
    Retorno: 'Return',
    'Cambia rango recomendado de velocidad': 'Changes recommended speed range',
    'Rangos usados: aspiracion 0.5-1.2 m/s, presion 3-7 m/s, retorno 2-4 m/s.':
      'Used ranges: suction 0.5-1.2 m/s, pressure 3-7 m/s, return 2-4 m/s.',
    'Caudal (L/min)': 'Flow (L/min)',
    'Caudal en conduccion': 'Flow in line',
    'Con diametro interno permite obtener velocidad de fluido y numero de Reynolds para clasificacion del flujo.':
      'With inner diameter, it gives fluid velocity and Reynolds number for flow classification.',
    'Viscosidad cinematica (cSt)': 'Kinematic viscosity (cSt)',
    'Afecta Reynolds y friccion': 'Affects Reynolds and friction',
    'Se convierte a m2/s para calcular Reynolds y el factor de friccion dentro de Darcy-Weisbach.':
      'Converted to m2/s to calculate Reynolds and friction factor in Darcy-Weisbach.',
    'Longitud de linea (m)': 'Line length (m)',
    'Perdida lineal principal': 'Main linear loss',
    'Incrementa la perdida de carga proporcionalmente en el termino f*(L/D) de Darcy-Weisbach.':
      'Increases pressure loss proportionally in Darcy-Weisbach f*(L/D) term.',
    'Diametro interior actual (in)': 'Current inner diameter (in)',
    'Variable clave de optimizacion': 'Key optimization variable',
    'Use nomenclatura hidraulica en pulgadas (ej. 3/4, 1, 1 1/4). Se convierte a mm para las ecuaciones de fluidos.':
      'Use hydraulic inch nomenclature (e.g., 3/4, 1, 1 1/4). Converted to mm for fluid equations.',
    'Numero de codos': 'Number of elbows',
    'Perdidas menores por cambios de direccion': 'Minor losses by direction changes',
    'Cada codo agrega perdidas singulares al balance de energia, aumentando la caida de presion total.':
      'Each elbow adds minor losses to energy balance, increasing total pressure drop.',
    'Numero de valvulas': 'Number of valves',
    'Perdidas menores localizadas': 'Localized minor losses',
    'Se suman como coeficientes K para calcular perdida localizada adicional en la linea.':
      'Added as K coefficients to calculate additional localized line loss.',
    'SISTEMA APTO': 'SYSTEM SUITABLE',
  };
  document.querySelectorAll('label, span.hint, p.lab-field-help, p.lab-diagram-wrap__title, h2, p.lab-lead, nav a, option, #hpVerdict').forEach((el) => {
    const raw = (el.textContent || '').trim();
    if (map[raw]) el.textContent = map[raw];
  });
  const infoStrong = document.querySelector('.lab-alert--info .lab-alert__body strong');
  if (infoStrong) infoStrong.textContent = 'How to obtain key data:';
  const hpDiag = document.getElementById('hpDiagram');
  if (hpDiag) hpDiag.setAttribute('aria-label', 'Hydraulic pump cross-section diagram');
  const pipeDiag = document.getElementById('hpPipeDiagram');
  if (pipeDiag) pipeDiag.setAttribute('aria-label', 'Piping diagram with pressure-loss gradient');
}

const RHO_OIL = 860; // kg/m3
const G = 9.81; // m/s2
const PIPE_EPS = 0.000045; // m (acero comercial)
const DIA_STD_MM = [12, 16, 20, 25, 32, 40, 50, 65, 80, 100];
const P_ATM_BAR = 1.013;
const P_VAP_BAR = 0.01;

function getPumpPreset(type) {
  if (type === 'piston') return { etaV: 0.95, etaM: 0.91, maxPressureBar: 420, label: 'Pistones' };
  if (type === 'vane') return { etaV: 0.92, etaM: 0.88, maxPressureBar: 210, label: 'Paletas' };
  return { etaV: 0.9, etaM: 0.85, maxPressureBar: 250, label: 'Engranajes' };
}

function val(id, fallback = '') {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLSelectElement)) return fallback;
  return el.value || fallback;
}

function fmt(n, d = 2) {
  return Number.isFinite(n) ? n.toFixed(d) : '--';
}

function psiToBar(psi) {
  return psi * 0.0689476;
}

function barToPsi(bar) {
  return bar * 14.5038;
}

function inToMm(inch) {
  return inch * 25.4;
}

function mmToIn(mm) {
  return mm / 25.4;
}

function kwToHp(kw) {
  return kw / 0.7457;
}

function targetSpeedForLine(lineType) {
  if (lineType === 'suction') return { min: 0.5, max: 1.2, target: 0.9 };
  if (lineType === 'return') return { min: 2.0, max: 4.0, target: 3.0 };
  return { min: 3.0, max: 7.0, target: 5.0 };
}

function flowRegime(re) {
  if (re < 2300) return 'Laminar';
  if (re <= 4000) return 'Transicional';
  return 'Turbulento';
}

function frictionFactor(re, dM) {
  if (re <= 0 || dM <= 0) return NaN;
  if (re < 2300) return 64 / re;
  const fTurb = 0.25 / Math.pow(Math.log10(PIPE_EPS / (3.7 * dM) + 5.74 / Math.pow(re, 0.9)), 2);
  if (re > 4000) return fTurb;
  const fLam = 64 / 2300;
  const w = (re - 2300) / (4000 - 2300);
  return fLam * (1 - w) + fTurb * w;
}

function scheduleSuggestion(dMm, pBarWork, lineType) {
  const dM = dMm / 1000;
  const sigmaAllow = 120e6; // Pa
  const pPa = (pBarWork * 4) * 1e5;
  const tM = (pPa * dM) / (2 * sigmaAllow);
  const tMm = Math.max(1.5, tM * 1000);

  if (lineType !== 'pressure') {
    if (tMm <= 3.6) return { tMm, sch: 'Sch 40' };
    return { tMm, sch: 'Sch 80' };
  }
  if (pBarWork > 250) return { tMm, sch: 'XXS' };
  if (pBarWork > 150) return { tMm, sch: 'Sch 160' };
  if (tMm <= 2.8) return { tMm, sch: 'Sch 40' };
  if (tMm <= 3.8) return { tMm, sch: 'Sch 80' };
  return { tMm, sch: 'Sch 160' };
}

function commercialDiameterForTargetSpeed(qLmin, targetV) {
  const qM3s = qLmin / 60000;
  let best = DIA_STD_MM[0];
  let bestErr = Infinity;
  DIA_STD_MM.forEach((d) => {
    const a = (Math.PI * Math.pow(d / 1000, 2)) / 4;
    const v = qM3s / a;
    const err = Math.abs(v - targetV);
    if (err < bestErr) {
      bestErr = err;
      best = d;
    }
  });
  return best;
}

function nearestMotorSizeKw(requiredKw) {
  const std = [0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110];
  for (let i = 0; i < std.length; i += 1) {
    if (std[i] >= requiredKw) return std[i];
  }
  return std[std.length - 1];
}

function renderPumpDiagram(svg) {
  if (!(svg instanceof SVGElement)) return;
  svg.setAttribute('viewBox', '0 0 780 320');
  svg.innerHTML = `
    <defs>
      <marker id="hpArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#22d3ee"/>
      </marker>
    </defs>
    <rect width="780" height="320" fill="#f8fafc"/>
    <rect x="30" y="40" width="720" height="230" rx="16" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <text x="50" y="66" font-size="14" font-weight="800" fill="#0f766e" font-family="Inter,system-ui,sans-serif">Bomba de engranajes externos - corte funcional</text>
    <rect x="90" y="110" width="600" height="120" rx="60" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
    <circle cx="300" cy="170" r="52" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
    <circle cx="430" cy="170" r="52" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
    <circle cx="300" cy="170" r="12" fill="#334155"/>
    <circle cx="430" cy="170" r="12" fill="#334155"/>
    <path d="M110 170 L200 170" stroke="#22d3ee" stroke-width="3" marker-end="url(#hpArrow)"/>
    <path d="M215 118 Q300 82 385 118" stroke="#22d3ee" stroke-width="3" fill="none" marker-end="url(#hpArrow)"/>
    <path d="M515 222 Q610 248 675 170" stroke="#22d3ee" stroke-width="3" fill="none" marker-end="url(#hpArrow)"/>
    <text x="112" y="158" font-size="10" fill="#334155" font-family="Inter,system-ui,sans-serif">${LANG === 'en' ? 'Suction' : 'Aspiracion'}</text>
    <text x="640" y="158" font-size="10" fill="#14532d" font-family="Inter,system-ui,sans-serif">${LANG === 'en' ? 'Discharge' : 'Descarga'}</text>
  `;
}

function colorFromDrop(dpBar) {
  const t = Math.max(0, Math.min(1, dpBar / 6));
  const r = Math.round(30 + 210 * t);
  const g = Math.round(220 - 150 * t);
  return `rgb(${r},${g},70)`;
}

function renderPipeDiagram(svg, dpBar) {
  if (!(svg instanceof SVGElement)) return;
  const c = colorFromDrop(dpBar);
  svg.setAttribute('viewBox', '0 0 780 220');
  svg.innerHTML = `
    <defs>
      <marker id="pipeArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="${c}"/>
      </marker>
    </defs>
    <rect width="780" height="220" fill="#f8fafc"/>
    <rect x="40" y="32" width="700" height="156" rx="14" fill="#ffffff" stroke="#cbd5e1"/>
    <path d="M90 110 H260 V70 H520 V145 H690" fill="none" stroke="${c}" stroke-width="14" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M90 110 H260 V70 H520 V145 H690" fill="none" stroke="#0f172a" stroke-width="2.8" stroke-dasharray="12 8"/>
    <text x="92" y="92" font-size="10" fill="#334155" font-family="Inter,system-ui,sans-serif">${LANG === 'en' ? 'Flow line' : 'Linea de flujo'}</text>
    <text x="520" y="172" font-size="11" font-weight="800" fill="${c}" font-family="Inter,system-ui,sans-serif">dP = ${fmt(dpBar, 2)} bar</text>
  `;
}

function metric(label, value, unit = '', valueClass = '', valueTitle = '') {
  return `
    <article class="lab-metric">
      <div class="k">${label}</div>
      <div class="v ${valueClass}" ${valueTitle ? `title="${valueTitle}"` : ''}>${value}</div>
      ${unit ? `<div class="lab-metric__si">${unit}</div>` : ''}
    </article>
  `;
}

function reynoldsVisual(re) {
  if (re < 2000) return { cls: 'hp-re-laminar', title: 'Flujo laminar: ideal para minimizar espuma y calentamiento del aceite.' };
  if (re <= 4000) return { cls: 'hp-re-transitional', title: 'Flujo transicional: zona intermedia; revisar perdidas y estabilidad.' };
  return { cls: 'hp-re-turbulent', title: 'Flujo turbulento: mayor cizalla, perdidas y calentamiento del aceite.' };
}

function syncDiametersSuggestion() {
  const suctionEl = document.getElementById('hpSuctionIn');
  const pipeEl = document.getElementById('pipeDiaIn');
  if (!(suctionEl instanceof HTMLSelectElement) || !(pipeEl instanceof HTMLSelectElement)) return;
  const s = Number(suctionEl.value);
  const p = Number(pipeEl.value);
  if (!Number.isFinite(s) || !Number.isFinite(p)) return;
  if (p < s) pipeEl.value = suctionEl.value;
}

function computeAndRender() {
  const mode = val('hpMode', 'design');
  const type = val('hpType', 'gear');
  const pUnit = val('hpPressureUnit', 'bar');
  const pMaxGauge = pUnit === 'psi' ? 20000 : 600;

  const results = document.getElementById('hpResults');
  const advisor = document.getElementById('hpAdvisor');
  const verdict = document.getElementById('hpVerdict');
  const formulaBody = document.getElementById('hpFormulaBody');
  if (!(results instanceof HTMLElement) || !(advisor instanceof HTMLElement) || !(verdict instanceof HTMLElement)) return;

  pumpPdfSnapshot = { valid: false };

  const errLabel = (es, en) => (LANG === 'en' ? en : es);
  const errors = [];
  const need = (r) => {
    if (!r.ok) errors.push(r.error);
    return r.ok ? r.value : NaN;
  };

  const pressureInput = need(readLabNumber('hpPressure', 1, pMaxGauge, errLabel('Presion de trabajo', 'Working pressure')));
  const rpm = need(readLabNumber('hpRpm', 100, 12000, errLabel('RPM motor', 'Motor RPM')));
  const disp = need(readLabNumber('hpDispCm3Rev', 0.1, 5000, errLabel('Desplazamiento (cm3/rev)', 'Displacement (cm3/rev)')));
  const suctionIn = need(readLabNumber('hpSuctionIn', 0.125, 24, errLabel('Diametro de succion (in)', 'Suction diameter (in)')));
  const pipeLineType = val('pipeLineType', 'suction');
  let pipeFlowLminIn = 42;
  if (mode === 'design') {
    pipeFlowLminIn = need(readLabNumber('pipeFlowLmin', 0.1, 1e6, errLabel('Caudal linea (L/min)', 'Line flow (L/min)')));
  } else {
    const pf = readLabNumber('pipeFlowLmin', 0.1, 1e6, errLabel('Caudal linea (L/min)', 'Line flow (L/min)'));
    if (pf.ok) pipeFlowLminIn = pf.value;
  }
  const viscCst = need(readLabNumber('pipeViscCst', 0.5, 5000, errLabel('Viscosidad cinematica (cSt)', 'Kinematic viscosity (cSt)')));
  const lineLength = need(readLabNumber('pipeLengthM', 0.1, 5000, errLabel('Longitud de linea (m)', 'Line length (m)')));
  const pipeDiaIn = need(readLabNumber('pipeDiaIn', 0.125, 48, errLabel('Diametro interior tuberia (in)', 'Pipe inner diameter (in)')));
  const elbows = need(readLabNumber('pipeElbows', 0, 500, errLabel('Numero de codos', 'Number of elbows')));
  const valves = need(readLabNumber('pipeValves', 0, 500, errLabel('Numero de valvulas', 'Number of valves')));

  const labTierHp = document.getElementById('hpLabTier') instanceof HTMLSelectElement
    ? document.getElementById('hpLabTier').value
    : 'basic';
  let tankZM = 0;
  let npshrM = 0;
  let oilTempCHp = 46;
  if (labTierHp === 'project') {
    const zt = readLabNumber('hpTankZ_m', -50, 100, errLabel('Cota deposito z (m)', 'Tank head z (m)'));
    if (!zt.ok) errors.push(zt.error);
    else tankZM = zt.value;
    const nr = readLabNumber('hpNPSHr_m', 0, 80, errLabel('NPSHr bomba (m)', 'Pump NPSHr (m)'));
    if (!nr.ok) errors.push(nr.error);
    else npshrM = nr.value;
    const ot = readLabNumber('hpOilTempC', -20, 150, errLabel('Temperatura aceite (C)', 'Oil temperature (C)'));
    if (!ot.ok) errors.push(ot.error);
    else oilTempCHp = ot.value;
  }

  if (errors.length) {
    results.innerHTML = '';
    if (formulaBody instanceof HTMLElement) formulaBody.innerHTML = '';
    const title = LANG === 'en' ? 'Invalid input' : 'Entrada no valida';
    const vtext = LANG === 'en' ? 'Please correct the form values.' : 'Revise los valores del formulario.';
    advisor.innerHTML = `<div class="lab-alert lab-alert--danger"><div class="lab-alert__body"><strong>${title}:</strong><ul style="margin:0.4em 0 0 1.1em;padding:0">${errors.map((e) => `<li>${e}</li>`).join('')}</ul></div></div>`;
    verdict.className = 'lab-verdict lab-verdict--err';
    verdict.textContent = vtext;
    return;
  }

  const suctionMm = inToMm(suctionIn);
  const pipeDiaMm = inToMm(pipeDiaIn);
  const preset = getPumpPreset(type);

  const pBar = pUnit === 'psi' ? psiToBar(pressureInput) : pressureInput;
  const pPsi = barToPsi(pBar);

  const qTheoLmin = (disp * rpm) / 1000;
  const qRealLmin = qTheoLmin * preset.etaV;
  const pHydKw = (pBar * qRealLmin) / 600;
  const pAbsKw = pHydKw / (preset.etaV * preset.etaM);
  const pAbsHp = pAbsKw * 1.34102;
  const torqueNm = (9550 * pAbsKw) / rpm;

  const qSuctionM3s = qRealLmin / 60000;
  const areaSuction = (Math.PI * Math.pow(suctionMm / 1000, 2)) / 4;
  const vSuction = qSuctionM3s / areaSuction;
  const cavitationRisk = vSuction > 1.5;
  const pressureRisk = pBar > preset.maxPressureBar;

  const qPipeLmin = mode === 'diagnostic' ? qRealLmin : pipeFlowLminIn;
  const flowInput = document.getElementById('pipeFlowLmin');
  if (mode === 'diagnostic' && flowInput instanceof HTMLInputElement) {
    flowInput.value = fmt(qRealLmin, 2);
  }
  const qPipeM3s = qPipeLmin / 60000;
  const dPipeM = pipeDiaMm / 1000;
  const areaPipe = (Math.PI * Math.pow(dPipeM, 2)) / 4;
  const vPipe = qPipeM3s / areaPipe;
  const nu = viscCst * 1e-6;
  const re = (vPipe * dPipeM) / nu;
  const regime = flowRegime(re);
  const f = frictionFactor(re, dPipeM);
  const kMinor = elbows * 0.9 + valves * 6;
  const dpPa = (f * (lineLength / dPipeM) + kMinor) * ((RHO_OIL * vPipe * vPipe) / 2);
  const dpBar = dpPa / 1e5;
  const heatLossKw = (dpPa * qPipeM3s) / 1000;

  const speedTarget = targetSpeedForLine(pipeLineType);
  const speedOutOfRange = vPipe < speedTarget.min || vPipe > speedTarget.max;
  const dOptMm = commercialDiameterForTargetSpeed(qPipeLmin, speedTarget.target);
  const schedule = scheduleSuggestion(dOptMm, pBar, pipeLineType);
  const qOptM3s = qPipeM3s;
  const aOpt = (Math.PI * Math.pow(dOptMm / 1000, 2)) / 4;
  const vOpt = qOptM3s / aOpt;
  const reOpt = (vOpt * (dOptMm / 1000)) / nu;
  const fOpt = frictionFactor(reOpt, dOptMm / 1000);
  const dpOptPa = (fOpt * (lineLength / (dOptMm / 1000)) + kMinor) * ((RHO_OIL * vOpt * vOpt) / 2);
  const dpOptBar = dpOptPa / 1e5;
  const pStaticPa = P_ATM_BAR * 1e5 + RHO_OIL * G * tankZM;
  const pInletAbsPa = pStaticPa - dpPa;
  const pInletAbsBar = pInletAbsPa / 1e5;
  const pvPa = P_VAP_BAR * 1e5;
  const npshaM = Math.max(0, (pInletAbsPa - pvPa) / (RHO_OIL * 9.81) - (vSuction * vSuction) / (2 * 9.81));
  const npshMarginM = npshrM > 0 ? npshaM - npshrM : NaN;
  const highCavitationRisk = pInletAbsBar <= P_VAP_BAR || vSuction > 1.2
    || (labTierHp === 'project' && npshrM > 0 && npshaM < npshrM);
  const restrictionRisk = pipeDiaIn < suctionIn;
  const reVisual = reynoldsVisual(re);
  const pMotorRecKw = (pAbsKw / 0.9) * 1.1;
  const pMotorStdKw = nearestMotorSizeKw(pMotorRecKw);

  renderPumpDiagram(document.getElementById('hpDiagram'));
  renderPipeDiagram(document.getElementById('hpPipeDiagram'), dpBar);

  const mainCards = [
    metric(tr('mQReal'), `${fmt(qRealLmin, 2)} L/min`, `eta_v ${fmt(preset.etaV * 100, 1)} %`),
    metric(tr('mPressure'), `${fmt(pBar, 1)} bar`, `${fmt(pPsi, 0)} PSI`),
    metric(tr('mMotor'), `${fmt(pMotorRecKw, 2)} kW`, `${fmt(kwToHp(pMotorRecKw), 2)} HP`),
    metric(tr('mTorque'), `${fmt(torqueNm, 2)} N*m`),
  ].join('');

  const secondaryCards = [
    metric(tr('mType'), preset.label),
    metric(tr('mQTheo'), `${fmt(qTheoLmin, 2)} L/min`),
    metric(tr('mPower'), `${fmt(pAbsKw, 3)} kW`, `${fmt(pAbsHp, 2)} HP`),
    metric(tr('mDiaS'), `${fmt(suctionIn, 3)} in`, `(${fmt(suctionMm, 1)} mm)`),
    metric(tr('mDiaL'), `${fmt(pipeDiaIn, 3)} in`, `(${fmt(pipeDiaMm, 1)} mm)`),
    metric(tr('mVIn'), `${fmt(vSuction, 2)} m/s`),
    metric(tr('mVLine'), `${fmt(vPipe, 2)} m/s`, pipeLineType),
    metric(tr('mRe'), `${fmt(re, 0)}`, regime, reVisual.cls, reVisual.title),
    metric(tr('mF'), `${fmt(f, 4)}`),
    metric(tr('mDp'), `${fmt(dpBar, 3)} bar`, `${fmt(dpPa / 1000, 1)} kPa`),
    metric(tr('mRange'), `${fmt(speedTarget.min, 1)} - ${fmt(speedTarget.max, 1)} m/s`, pipeLineType),
    metric(
      tr('mNpsh'),
      `${fmt(npshaM, 2)} m`,
      `${tr('mNpshFoot')} | Pinlet=${fmt(pInletAbsBar, 3)} bar abs`,
      '',
      LANG === 'en'
        ? 'Guide only: assumes atmospheric supply minus modeled line loss. Full NPSHa needs tank elevation, suction line detail, fluid temperature, and comparison with pump NPSHr.'
        : 'Solo guia: supone alimentacion a Patm menos la perdida modelada. NPSHa real requiere cota del deposito, trazado de succion, temperatura del aceite y comparacion con NPSHr de la bomba.',
    ),
    metric(tr('mSug'), `${fmt(mmToIn(dOptMm), 3)} in`, `(${dOptMm} mm) - ${schedule.sch} / t~${fmt(schedule.tMm, 2)} mm`),
  ];
  if (labTierHp === 'project' && npshrM > 0) {
    secondaryCards.push(
      metric(
        LANG === 'en' ? 'NPSH margin' : 'Margen NPSH',
        `${fmt(npshMarginM, 2)} m`,
        `NPSHa ${fmt(npshaM, 2)} - NPSHr ${fmt(npshrM, 2)}`,
      ),
    );
  }
  const secondaryCardsHtml = secondaryCards.join('');

  const formulaLinesHp = LANG === 'en'
    ? [
        'Q_theo = displacement * rpm / 1000 L/min; Q_real = Q_theo * eta_v.',
        'P_hyd_kW = p_bar * Q_real / 600; P_shaft = P_hyd / (eta_v * eta_m).',
        'Re = v * D / nu; Darcy-Weisbach for dP with blended laminar/turbulent f.',
        `NPSHa (indicative): p_in_abs = p_atm + rho*g*z - dP_line; NPSHa = (p_in - Pv)/(rho*g) - v_s^2/(2g). z=${fmt(tankZM, 2)} m.`,
        'Schedule suggestion uses simplified hoop stress with pressure factor; for traceability only.',
      ]
    : [
        'Q_teo = desplazamiento * rpm / 1000 L/min; Q_real = Q_teo * eta_v.',
        'P_hid_kW = p_bar * Q_real / 600; P_eje = P_hid / (eta_v * eta_m).',
        'Re = v * D / nu; Darcy-Weisbach para dP con f laminar/turbulento interpolado.',
        `NPSHa (indicativa): p_ent_abs = p_atm + rho*g*z - dP_linea; NPSHa = (p_ent - Pv)/(rho*g) - v_s^2/(2g). z=${fmt(tankZM, 2)} m.`,
        'Sugerencia schedule: esfuerzo aro simplificado; solo trazabilidad.',
      ];

  if (formulaBody instanceof HTMLElement) {
    formulaBody.innerHTML = `
      <p class="lab-fluid-formulas__lead">${labTierHp === 'project' ? (LANG === 'en' ? 'Project: tank head z and NPSHr comparison enabled.' : 'Proyecto: cota z y comparacion NPSHr activas.') : (LANG === 'en' ? 'Classroom: z=0 unless project mode.' : 'Aula: z=0 salvo modo proyecto.')}</p>
      <p class="lab-fluid-formulas__sub">${LANG === 'en' ? 'Oil temperature recorded' : 'Temperatura aceite registrada'}: ${fmt(oilTempCHp, 0)} C (${LANG === 'en' ? 'Pv still simplified' : 'Pv aun simplificada'}).</p>
      <ol class="lab-fluid-formulas__list">${formulaLinesHp.map((x) => `<li>${x}</li>`).join('')}</ol>
    `;
  }

  results.innerHTML = `
    ${mainCards}
    <details class="lab-results-details hp-more-details">
      <summary>${LANG === 'en' ? 'Secondary technical data' : 'Datos tecnicos secundarios'}</summary>
      <div class="hp-more-details__body">
        <div class="lab-results">${secondaryCardsHtml}</div>
      </div>
    </details>
  `;

  const alerts = [];
  if (restrictionRisk) {
    alerts.push(`<div class="lab-alert lab-alert--danger"><div class="lab-alert__body"><strong>${LANG === 'en' ? 'Restriction detected' : 'Restriccion detectada'}:</strong> ${LANG === 'en' ? 'Reducing line diameter below pump suction dramatically increases cavitation risk.' : 'Reducir el diametro de tuberia por debajo de la succion de la bomba aumenta drasticamente el riesgo de cavitacion.'}</div></div>`);
  }
  if (highCavitationRisk) {
    alerts.push(`<div class="lab-alert lab-alert--danger"><div class="lab-alert__body"><strong>${LANG === 'en' ? 'HIGH CAVITATION RISK' : 'RIESGO ALTO DE CAVITACION'}:</strong> ${LANG === 'en' ? 'Pressure loss reduces inlet pressure below safe limits.' : 'La perdida de carga reduce la presion de entrada por debajo de los limites seguros.'}</div></div>`);
  } else if (cavitationRisk) {
    alerts.push(`<div class="lab-alert lab-alert--warn"><div class="lab-alert__body"><strong>${LANG === 'en' ? 'Cavitation' : 'Cavitacion'}:</strong> ${LANG === 'en' ? `Inlet velocity ${fmt(vSuction, 2)} m/s > 1.5 m/s. Increase suction diameter (in) to reduce velocity.` : `velocidad de entrada ${fmt(vSuction, 2)} m/s > 1.5 m/s. Aumentar diametro de succion (in) para reducir velocidad.`}</div></div>`);
  }
  if (pressureRisk) {
    alerts.push(`<div class="lab-alert lab-alert--danger"><div class="lab-alert__body"><strong>${LANG === 'en' ? 'Safety' : 'Seguridad'}:</strong> ${LANG === 'en' ? `${fmt(pBar, 1)} bar exceeds typical ${preset.label.toLowerCase()} limit (${preset.maxPressureBar} bar).` : `${fmt(pBar, 1)} bar supera limite tipico de ${preset.label.toLowerCase()} (${preset.maxPressureBar} bar).`}</div></div>`);
  }
  if (speedOutOfRange) {
    alerts.push(`<div class="lab-alert lab-alert--warn"><div class="lab-alert__body"><strong>${LANG === 'en' ? 'Line speed' : 'Velocidad de linea'}:</strong> ${LANG === 'en' ? `${fmt(vPipe, 2)} m/s is outside recommended range for ${pipeLineType}.` : `${fmt(vPipe, 2)} m/s fuera del rango recomendado para ${pipeLineType}.`}</div></div>`);
  }
  if (pipeLineType === 'suction' && vSuction > 1.2 && vSuction <= 1.5) {
    const pct = ((vSuction / 1.2) - 1) * 100;
    alerts.push(`<div class="lab-alert lab-alert--info"><div class="lab-alert__body"><strong>${LANG === 'en' ? 'Optimization' : 'Optimizacion'}:</strong> ${LANG === 'en' ? `You are only ${fmt(pct, 1)}% above the recommended limit. Increasing diameter by one commercial step removes noise and vibration.` : `Estas solo un ${fmt(pct, 1)}% por encima del limite recomendado. Aumentar el diametro un paso comercial eliminaria ruido y vibracion.`}</div></div>`);
  }
  if (Math.abs(pMotorStdKw - pMotorRecKw) <= 1.8 || (pMotorStdKw - pMotorRecKw) / pMotorStdKw < 0.1) {
    alerts.push(`<div class="lab-alert lab-alert--info"><div class="lab-alert__body"><strong>${LANG === 'en' ? 'Motor efficiency' : 'Eficiencia del motor'}:</strong> ${LANG === 'en' ? `Required power ${fmt(pMotorRecKw, 2)} kW. Suggested standard commercial size: ${fmt(pMotorStdKw, 1)} kW.` : `potencia requerida ${fmt(pMotorRecKw, 2)} kW. Tama?o comercial normalizado sugerido: ${fmt(pMotorStdKw, 1)} kW.`}</div></div>`);
  }
  alerts.push(`<div class="lab-alert lab-alert--info"><div class="lab-alert__body"><strong>Smart insight:</strong> ${LANG === 'en' ? `Current pipe causes ${fmt(dpBar, 3)} bar loss vs ${fmt(dpOptBar, 3)} bar with ${fmt(mmToIn(dOptMm), 3)} in (${dOptMm} mm). This implies ${fmt(heatLossKw, 3)} kW avoidable hydraulic heating.` : `tu tuberia actual genera una perdida de ${fmt(dpBar, 3)} bar frente a ${fmt(dpOptBar, 3)} bar con ${fmt(mmToIn(dOptMm), 3)} in (${dOptMm} mm). Esto implica ${fmt(heatLossKw, 3)} kW de calentamiento hidraulico evitable.`}</div></div>`);
  if (mode === 'diagnostic' && (rpm > 1800 || vSuction > 1.5)) {
    alerts.push(`<div class="lab-alert lab-alert--danger"><div class="lab-alert__body"><strong>${LANG === 'en' ? 'Diagnostic warning' : 'Advertencia diagnostico'}:</strong> ${LANG === 'en' ? 'RPM is high for this displacement. Cavitation risk increases due to excessive suction velocity.' : 'Las RPM son altas para este desplazamiento. Aumenta el riesgo de cavitacion por velocidad de succion excesiva.'}</div></div>`);
  }
  if (labTierHp === 'project' && npshrM > 0 && npshaM < npshrM) {
    alerts.push(`<div class="lab-alert lab-alert--danger"><div class="lab-alert__body"><strong>NPSH:</strong> NPSHa ${fmt(npshaM, 2)} m &lt; NPSHr ${fmt(npshrM, 2)} m.</div></div>`);
  }
  advisor.innerHTML = alerts.join('');

  let verdictText = LANG === 'en' ? 'SYSTEM SUITABLE' : 'SISTEMA APTO';
  let verdictClass = 'lab-verdict lab-verdict--ok';
  if (pressureRisk || highCavitationRisk || restrictionRisk || dpBar > 8) {
    verdictText = highCavitationRisk
      ? (LANG === 'en' ? 'SYSTEM NOT SUITABLE - Critical cavitation failure risk' : 'SISTEMA NO APTO - Riesgo de fallo critico por cavitacion')
      : (LANG === 'en' ? 'FAILURE RISK' : 'RIESGO DE FALLO');
    verdictClass = 'lab-verdict lab-verdict--err';
  } else if (speedOutOfRange || dpBar > 3 || heatLossKw > 0.8) {
    verdictText = LANG === 'en' ? 'LOW EFFICIENCY' : 'EFICIENCIA BAJA';
    verdictClass = 'lab-verdict lab-verdict--muted';
  }

  verdict.className = verdictClass;
  verdict.textContent = LANG === 'en'
    ? `${verdictText} - Recommended motor power: ${fmt(pMotorRecKw, 2)} kW (standardized ${fmt(pMotorStdKw, 1)} kW).`
    : `${verdictText} - Potencia de motor recomendada: ${fmt(pMotorRecKw, 2)} kW (normalizado ${fmt(pMotorStdKw, 1)} kW).`;

  const langPdf = getCurrentLang();
  const ts = formatDateTimeLocale(new Date(), langPdf);
  pumpPdfSnapshot = {
    valid: true,
    title: langPdf === 'en' ? 'Report - Hydraulic pump and piping' : 'Informe - Bomba hidraulica y tuberias',
    fileBase: `${langPdf === 'en' ? 'report-hydraulic-pump' : 'informe-bomba-hidraulica'}-${new Date().toISOString().slice(0, 10)}`,
    timestamp: ts,
    tierLabel: labTierHp === 'project' ? (langPdf === 'en' ? 'Mode: Project' : 'Modo: Proyecto') : (langPdf === 'en' ? 'Mode: Classroom' : 'Modo: Aula'),
    kpis: [
      { title: 'Q', value: `${fmt(qRealLmin, 1)} L/min`, subtitle: 'real' },
      { title: 'p', value: `${fmt(pBar, 1)} bar`, subtitle: 'work' },
      { title: 'P motor', value: `${fmt(pMotorRecKw, 2)} kW`, subtitle: 'rec.' },
      { title: 'NPSHa', value: `${fmt(npshaM, 2)} m`, subtitle: langPdf === 'en' ? 'indicative' : 'indicativa' },
    ],
    inputRows: [
      { label: 'tier', value: labTierHp },
      { label: 'z tank', value: `${fmt(tankZM, 2)} m` },
      { label: 'NPSHr', value: `${fmt(npshrM, 2)} m` },
      { label: 'p', value: `${fmt(pBar, 1)} bar` },
      { label: 'rpm', value: String(rpm) },
      { label: 'D suction', value: `${fmt(suctionIn, 3)} in` },
    ],
    resultRows: [
      { label: 'dP', value: `${fmt(dpBar, 3)} bar` },
      { label: 'Re', value: fmt(re, 0) },
      { label: 'Pin abs', value: `${fmt(pInletAbsBar, 3)} bar` },
    ],
    formulaLines: formulaLinesHp,
    assumptions: [
      `rho=${RHO_OIL} kg/m3, Patm=${P_ATM_BAR} bar, Pv=${P_VAP_BAR} bar (simplified).`,
      langPdf === 'en' ? 'Line dP model is 1-D Darcy + K losses.' : 'Modelo dP: Darcy 1D + perdidas K.',
    ],
    verdict: verdict.textContent,
    disclaimer: langPdf === 'en'
      ? 'NPSHa is indicative; use manufacturer NPSHr curves and site layout for final acceptance.'
      : 'NPSHa es indicativa; usar curvas NPSHr del fabricante y trazado real para aceptacion final.',
  };
}

function syncHpLabTierUi() {
  const tier = document.getElementById('hpLabTier') instanceof HTMLSelectElement
    ? document.getElementById('hpLabTier').value
    : 'basic';
  const panel = document.getElementById('hpProjectPanel');
  if (panel instanceof HTMLElement) panel.hidden = tier !== 'project';
}

function syncPumpModeUi() {
  const mode = val('hpMode', 'design');
  const flowField = document.getElementById('pipeFlowField');
  const flowInput = document.getElementById('pipeFlowLmin');
  if (flowField instanceof HTMLElement) flowField.classList.toggle('lab-field--auto', mode === 'diagnostic');
  if (flowInput instanceof HTMLInputElement) {
    flowInput.readOnly = mode === 'diagnostic';
    flowInput.setAttribute('aria-readonly', mode === 'diagnostic' ? 'true' : 'false');
  }
}

[
  'hpType',
  'hpMode',
  'hpLabTier',
  'hpTankZ_m',
  'hpNPSHr_m',
  'hpOilTempC',
  'hpPressureUnit',
  'hpPressure',
  'hpRpm',
  'hpDispCm3Rev',
  'hpSuctionIn',
  'pipeLineType',
  'pipeFlowLmin',
  'pipeViscCst',
  'pipeLengthM',
  'pipeDiaIn',
  'pipeElbows',
  'pipeValves',
].forEach((id) => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', () => {
      if (id === 'hpMode') syncPumpModeUi();
      if (id === 'hpLabTier') syncHpLabTierUi();
      if (id === 'hpSuctionIn') syncDiametersSuggestion();
      computeAndRender();
    });
    el.addEventListener('change', () => {
      if (id === 'hpMode') syncPumpModeUi();
      if (id === 'hpLabTier') syncHpLabTierUi();
      if (id === 'hpSuctionIn') syncDiametersSuggestion();
      computeAndRender();
    });
  }
});

syncDiametersSuggestion();
syncHpLabTierUi();
syncPumpModeUi();
applyStaticI18n();
mountCompactLabFieldHelp();
computeAndRender();

mountLabFluidPdfExportBar(document.getElementById('labFluidPdfMountHp'), {
  getPayload: () => pumpPdfSnapshot,
  getDiagramElements: () => {
    const a = document.getElementById('hpDiagram');
    const b = document.getElementById('hpPipeDiagram');
    return [a, b].filter((el) => el instanceof SVGSVGElement);
  },
});

