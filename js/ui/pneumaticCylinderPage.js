import { mountCompactLabFieldHelp } from './labHelpCompact.js';
import { readLabNumber } from '../utils/labInputParse.js';
import { mountLabFluidPdfExportBar } from '../services/fluidLabPdfExport.js';
import { formatDateTimeLocale, getCurrentLang } from '../config/locales.js';

/** @type {object | null} */
let pcPdfSnapshot = null;

const G = 9.81;
const E_STEEL = 210e9;
const ETA_MECH = 0.9; // -10% por friccion interna
const LANG = (() => {
  try {
    return localStorage.getItem('mdr-home-lang') === 'en' ? 'en' : 'es';
  } catch (_) {
    return 'es';
  }
})();
const TXT = {
  es: {
    title: 'Cilindro neumatico - fuerza, consumo y estabilidad',
    lead: 'Calcula fuerza real, consumo de aire libre, chequeo de pandeo y margen de seguridad para validar si el cilindro es apto para la carga y la carrera.',
    details: 'Ver Datos Tecnicos Secundarios',
    detailsHint: 'Teoricos e intermedios',
    verdictOk: 'SISTEMA APTO',
    m1: 'Fuerza Real (Av/Ret)',
    m2: 'Factor de Seguridad Fuerza',
    m3: 'Consumo de Aire',
    m4: 'Carga Critica Pandeo',
    e1: 'Fuerza avance teorica',
    e2: 'Fuerza retroceso real',
    e3: 'Consumo por ciclo',
    e4: 'Velocidad estimada',
    e5: 'Carga equivalente',
    navHome: 'Inicio',
    navLab: 'Laboratorio',
    navCanvas: 'Lienzo Pro',
    diagramTitle: 'Corte de cilindro neumatico (doble efecto)',
    diagramCaption: 'Camara A: avance. Camara B: retroceso. Se muestran embolo, sellos y vastago.',
    fModeLabel: 'Modo de diametros',
    fModeHint: 'ISO reduce coste y plazo de entrega',
    fModeHelp: 'En modo ISO se usan medidas comerciales normalizadas. En modo manual se permite valor libre con aviso de cercania a estandar.',
    optIso: 'Estandar ISO (15552/6432)',
    optManual: 'Manual',
    fPressureLabel: 'Presion de red (bar)',
    fPressureHint: 'Presion manometrica de alimentacion',
    fPressureHelp: 'Valor disponible en la red neumatica en condiciones reales de operacion, sin caidas locales severas.',
    fBoreIsoLabel: 'Diametro de embolo ISO (mm)',
    fBoreIsoHint: 'Define area activa principal',
    fBoreIsoHelp: 'Area de avance A = pi*D^2/4. A mayor D, mayor fuerza disponible a igual presion.',
    fRodIsoLabel: 'Diametro de vastago ISO (mm)',
    fRodIsoHint: 'Afecta retroceso y pandeo',
    fRodIsoHelp: 'Reduce area efectiva en retroceso y determina rigidez a compresion frente a pandeo.',
    fBoreManualLabel: 'Diametro de embolo manual (mm)',
    fBoreManualHint: 'Solo para caso no estandar',
    fBoreManualHelp: 'Si el valor no coincide con ISO, el asesor propone el diametro normalizado mas cercano.',
    fRodManualLabel: 'Diametro de vastago manual (mm)',
    fRodManualHint: 'Validar disponibilidad comercial',
    fRodManualHelp: 'Los vastagos fuera de serie ISO pueden aumentar coste y plazo de suministro.',
    fStrokeLabel: 'Carrera (mm)',
    fStrokeHint: 'Longitud util de desplazamiento',
    fStrokeHelp: 'Carreras largas incrementan riesgo de pandeo y consumo por ciclo.',
    fLoadLabel: 'Carga a mover (kg)',
    fLoadHint: 'Carga externa equivalente',
    fLoadHelp: 'Se convierte a fuerza en N (F = m*g) para comparar con fuerza real del cilindro.',
    fCyclesLabel: 'Ciclos por minuto (cpm)',
    fCyclesHint: 'Frecuencia de operacion',
    fCyclesHelp: 'Permite calcular el consumo en Nl/min para dimensionar compresor y acumulacion.',
    fMotionLabel: 'Tipo de movimiento',
    fMotionHint: 'Ajusta el criterio del factor de seguridad',
    fMotionHelp: 'Para elevacion vertical se recomienda margen de fuerza mayor (habitualmente superior a 2.0x).',
    motionH: 'Horizontal',
    motionV: 'Vertical (elevacion)',
    warnNonStdBore: 'Diametro no normalizado',
    warnNonStdBoreBody: 'El estandar ISO mas cercano es {near} mm. Usar medidas estandar reduce costos y plazos de entrega.',
    warnNonStdRod: 'Vastago no normalizado',
    warnNonStdRodBody: 'Usa un diametro ISO para mejorar disponibilidad y mantenimiento.',
    warnFsHorizontal: 'Factor de seguridad ({fs}x)',
    warnFsHorizontalBody: 'Aceptable para movimiento horizontal, pero bajo para elevacion vertical (se recomienda >2.0x).',
    warnFsVertical: 'Fuerza insuficiente',
    warnFsVerticalBody: 'Para elevacion vertical se recomienda factor >2.0x para compensar inercia y variaciones de presion.',
    dangerBuckling: 'PELIGRO DE PANDEO',
    dangerBucklingBody: 'El vastago es demasiado largo para esta carga. Aumenta el diametro del vastago o reduce la carrera.',
    warnThrottle: 'Posible estrangulamiento',
    warnThrottleBody: 'A {v} m/s, racores o mangueras de 1/4" pueden limitar caudal. Revisar seccion de paso efectiva.',
    infoCushion: 'Cilindro de 63 mm',
    infoCushionBody: 'Se recomienda activar la amortiguacion neumatica para absorber la carga al final de carrera.',
    infoAir: 'Insight',
    infoAirBody: 'Este cilindro consumira {n} Nl por ciclo. Asegurate de que tu acumulador de aire tenga capacidad suficiente para mantener la presion.',
    verdictNo: 'SISTEMA NO APTO - Riesgo de fallo por capacidad o pandeo',
    verdictRiskV: 'RIESGO: Factor de seguridad bajo para elevacion vertical. Selecciona el siguiente diametro estandar ({d} mm).',
    verdictLow: 'EFICIENCIA BAJA - Margen de fuerza reducido',
    verdictOkLong: 'SISTEMA APTO - Cilindro valido para la carga y presion de red',
    rodFallback: 'Conexion: Vastago {d} mm, confirmar rosca en catalogo del fabricante.',
    diagramHead: 'Cilindro neumatico de doble efecto - corte longitudinal',
    diagramStroke: 'Carrera nominal {s} mm',
    diagramRodD: 'Dvastago {d} mm',
    diagramPiston: 'Embolo + sellos',
    diagramRod: 'Vastago',
    invalidTitle: 'Entrada no valida',
    invalidVerdict: 'Revise los valores del formulario.',
    errRodGeBore: 'El vastago debe ser menor que el piston.',
    fFormulasSummary: 'Memoria de calculo, formulas y supuestos',
    fLabTierLabel: 'Nivel de detalle memoria',
    fLabTierHint: 'Memoria ampliada y PDF',
    fLabTierHelp: 'Proyecto permite Patm distinta de 1 bar para Nl, factor de longitud efectiva en pandeo y nota de metodo.',
    fPatmLabel: 'Presion atmosferica local (bar abs)',
    fPatmHint: 'Para conversion a aire libre Nl',
    fEulerLabel: 'Factor longitud efectiva pandeo (x carrera)',
    fMethodNoteLabel: 'Nota de metodo / supuestos (opcional)',
    fMethodNoteHint: 'Aparece en memoria y PDF',
    fMethodNoteHelp: 'Ej. norma de montaje, guias, criterio de carga.',
    optTierBasic: 'Aula (basico)',
    optTierProject: 'Proyecto (Patm + Euler + nota)',
    fCalcModeLabel: '¿Qué quieres calcular?',
    fCalcModeHint: 'Cambia entre diseño y diagnóstico',
    fCalcModeHelp: 'El diagnóstico calcula la fuerza real a partir del diámetro y la presión de la máquina instalada.',
    optPcDesign: 'Diseñar nueva máquina',
    optPcDiagnostic: 'Diagnosticar máquina existente',
    fLoadHintAuto: 'Calculado automáticamente',
    fLoadHelpDiag: 'En modo diagnóstico se usa la capacidad máxima de carga con tus diámetros y presión actuales.',
    infoDiagTitle: 'Diagnóstico',
    infoDiagBody: 'Con tus componentes actuales, el factor de seguridad es {fs}x.',
    dangerPressureTitle: 'Presión fuera de rango',
    dangerPressureBody: 'El cilindro físico podría fallar estructuralmente.',
  },
  en: {
    title: 'Pneumatic cylinder - force, consumption and stability',
    lead: 'Calculate real force, free air consumption, buckling check and safety margin to validate if the cylinder is suitable for load and stroke.',
    details: 'View Secondary Technical Data',
    detailsHint: 'Theoretical and intermediate',
    verdictOk: 'SYSTEM SUITABLE',
    m1: 'Real Force (Ext/Ret)',
    m2: 'Force Safety Factor',
    m3: 'Air Consumption',
    m4: 'Critical Buckling Load',
    e1: 'Theoretical extension force',
    e2: 'Real retraction force',
    e3: 'Consumption per cycle',
    e4: 'Estimated speed',
    e5: 'Equivalent load',
    navHome: 'Home',
    navLab: 'Laboratory',
    navCanvas: 'Pro canvas',
    diagramTitle: 'Pneumatic cylinder cross-section (double acting)',
    diagramCaption: 'Chamber A: extension. Chamber B: retraction. Piston, seals and rod are shown.',
    fModeLabel: 'Diameter mode',
    fModeHint: 'ISO reduces cost and lead time',
    fModeHelp: 'ISO mode uses standardized commercial dimensions. Manual mode allows free values with nearest standard warning.',
    optIso: 'ISO standard (15552/6432)',
    optManual: 'Manual',
    fPressureLabel: 'Supply pressure (bar)',
    fPressureHint: 'Gauge supply pressure',
    fPressureHelp: 'Available pneumatic network pressure under real operating conditions, without severe local drops.',
    fBoreIsoLabel: 'ISO piston diameter (mm)',
    fBoreIsoHint: 'Defines main active area',
    fBoreIsoHelp: 'Extension area A = pi*D^2/4. Larger D means higher force at the same pressure.',
    fRodIsoLabel: 'ISO rod diameter (mm)',
    fRodIsoHint: 'Affects retract force and buckling',
    fRodIsoHelp: 'Reduces effective retraction area and determines compression rigidity against buckling.',
    fBoreManualLabel: 'Manual piston diameter (mm)',
    fBoreManualHint: 'Only for non-standard case',
    fBoreManualHelp: 'If value does not match ISO, the advisor suggests the nearest standardized diameter.',
    fRodManualLabel: 'Manual rod diameter (mm)',
    fRodManualHint: 'Validate market availability',
    fRodManualHelp: 'Non-ISO rods may increase cost and delivery time.',
    fStrokeLabel: 'Stroke (mm)',
    fStrokeHint: 'Useful displacement length',
    fStrokeHelp: 'Long strokes increase buckling risk and consumption per cycle.',
    fLoadLabel: 'Load to move (kg)',
    fLoadHint: 'Equivalent external load',
    fLoadHelp: 'Converted to force in N (F = m*g) to compare against real cylinder force.',
    fCyclesLabel: 'Cycles per minute (cpm)',
    fCyclesHint: 'Operating frequency',
    fCyclesHelp: 'Used to calculate Nl/min consumption for compressor and air storage sizing.',
    fMotionLabel: 'Motion type',
    fMotionHint: 'Adjusts safety factor criterion',
    fMotionHelp: 'Vertical lifting typically requires larger force margin (usually above 2.0x).',
    motionH: 'Horizontal',
    motionV: 'Vertical (lifting)',
    warnNonStdBore: 'Non-standard diameter',
    warnNonStdBoreBody: 'Nearest ISO standard is {near} mm. Using standard sizes reduces cost and lead time.',
    warnNonStdRod: 'Non-standard rod',
    warnNonStdRodBody: 'Use an ISO diameter to improve availability and maintenance.',
    warnFsHorizontal: 'Safety factor ({fs}x)',
    warnFsHorizontalBody: 'Acceptable for horizontal motion, but low for vertical lifting (recommended >2.0x).',
    warnFsVertical: 'Insufficient force',
    warnFsVerticalBody: 'For vertical lifting, factor >2.0x is recommended to compensate inertia and pressure variation.',
    dangerBuckling: 'BUCKLING RISK',
    dangerBucklingBody: 'Rod is too slender for this load. Increase rod diameter or reduce stroke.',
    warnThrottle: 'Possible flow choking',
    warnThrottleBody: 'At {v} m/s, 1/4" fittings or hoses may limit flow. Check effective passage area.',
    infoCushion: '63 mm cylinder',
    infoCushionBody: 'Enable pneumatic cushioning to absorb load at end of stroke.',
    infoAir: 'Insight',
    infoAirBody: 'This cylinder consumes {n} Nl per cycle. Ensure air storage capacity is enough to maintain pressure.',
    verdictNo: 'SYSTEM NOT SUITABLE - Failure risk by capacity or buckling',
    verdictRiskV: 'RISK: Low safety factor for vertical lifting. Select next standard diameter ({d} mm).',
    verdictLow: 'LOW EFFICIENCY - Reduced force margin',
    verdictOkLong: 'SYSTEM SUITABLE - Cylinder is valid for selected load and supply pressure',
    rodFallback: 'Connection: Rod {d} mm, verify thread in manufacturer catalog.',
    diagramHead: 'Double-acting pneumatic cylinder - longitudinal cross-section',
    diagramStroke: 'Nominal stroke {s} mm',
    diagramRodD: 'Drod {d} mm',
    diagramPiston: 'Piston + seals',
    diagramRod: 'Rod',
    invalidTitle: 'Invalid input',
    invalidVerdict: 'Please correct the form values.',
    errRodGeBore: 'Rod diameter must be less than bore.',
    fFormulasSummary: 'Calculation memory, formulas and assumptions',
    fLabTierLabel: 'Memory detail level',
    fLabTierHint: 'Expanded memory and PDF',
    fLabTierHelp: 'Project mode enables local Patm for free air Nl, Euler effective length factor and a method note.',
    fPatmLabel: 'Local atmospheric pressure (bar abs)',
    fPatmHint: 'For free-air Nl conversion',
    fEulerLabel: 'Euler effective length factor (x stroke)',
    fMethodNoteLabel: 'Method / assumptions note (optional)',
    fMethodNoteHint: 'Shown in memory and PDF',
    fMethodNoteHelp: 'E.g. mounting standard, guides, load criterion.',
    optTierBasic: 'Classroom (basic)',
    optTierProject: 'Project (Patm + Euler + note)',
    fCalcModeLabel: 'What do you want to calculate?',
    fCalcModeHint: 'Switch between design and diagnostic',
    fCalcModeHelp: 'Diagnostic mode derives real force from actual bore, rod and supply pressure.',
    optPcDesign: 'Design new machine',
    optPcDiagnostic: 'Diagnose existing machine',
    fLoadHintAuto: 'Calculated automatically',
    fLoadHelpDiag: 'In diagnostic mode, load is the maximum capacity from your current bore, rod and pressure.',
    infoDiagTitle: 'Diagnostic',
    infoDiagBody: 'With your current components, the safety factor is {fs}x.',
    dangerPressureTitle: 'Pressure out of typical range',
    dangerPressureBody: 'The physical cylinder could fail structurally.',
  },
};
function tr(k, vars = {}) {
  const s = (TXT[LANG] && TXT[LANG][k]) || TXT.es[k] || k;
  return s.replace(/\{(\w+)\}/g, (_, kk) => (vars[kk] ?? `{${kk}}`));
}

function setFieldText(id, label, hint, help) {
  const root = document.getElementById(id)?.closest('.lab-field');
  if (!(root instanceof HTMLElement)) return;
  const l = root.querySelector(`label[for="${id}"]`);
  const h = root.querySelector('.hint');
  const p = root.querySelector('.lab-field-help');
  if (l) l.textContent = label;
  if (h) h.textContent = hint;
  if (p) p.textContent = help;
}

function applyStaticI18n() {
  document.documentElement.setAttribute('lang', LANG);
  document.title = tr('title');
  const nav = document.querySelectorAll('.lab-header nav a');
  if (nav[0]) nav[0].textContent = tr('navHome');
  if (nav[1]) nav[1].textContent = tr('navLab');
  if (nav[2]) nav[2].textContent = tr('navCanvas');
  const pTitle = document.querySelector('.lab-panel h2');
  const pLead = document.querySelector('.lab-lead');
  const pVerdict = document.getElementById('pcVerdict');
  const dTitle = document.querySelector('.lab-diagram-wrap__title');
  const dCap = document.querySelector('.lab-diagram-caption');
  if (pTitle) pTitle.textContent = tr('title');
  if (pLead) pLead.textContent = tr('lead');
  if (pVerdict) pVerdict.textContent = tr('verdictOk');
  if (dTitle) dTitle.textContent = tr('diagramTitle');
  if (dCap) dCap.textContent = tr('diagramCaption');

  setFieldText('pcMode', tr('fCalcModeLabel'), tr('fCalcModeHint'), tr('fCalcModeHelp'));
  const calcModeSel = document.getElementById('pcMode');
  if (calcModeSel instanceof HTMLSelectElement && calcModeSel.options.length >= 2) {
    calcModeSel.options[0].textContent = tr('optPcDesign');
    calcModeSel.options[1].textContent = tr('optPcDiagnostic');
  }
  setFieldText('pcDiameterMode', tr('fModeLabel'), tr('fModeHint'), tr('fModeHelp'));
  setFieldText('pcPressureBar', tr('fPressureLabel'), tr('fPressureHint'), tr('fPressureHelp'));
  setFieldText('pcBoreIso', tr('fBoreIsoLabel'), tr('fBoreIsoHint'), tr('fBoreIsoHelp'));
  setFieldText('pcRodIso', tr('fRodIsoLabel'), tr('fRodIsoHint'), tr('fRodIsoHelp'));
  setFieldText('pcBoreManual', tr('fBoreManualLabel'), tr('fBoreManualHint'), tr('fBoreManualHelp'));
  setFieldText('pcRodManual', tr('fRodManualLabel'), tr('fRodManualHint'), tr('fRodManualHelp'));
  setFieldText('pcStrokeMm', tr('fStrokeLabel'), tr('fStrokeHint'), tr('fStrokeHelp'));
  setFieldText('pcLoadKg', tr('fLoadLabel'), tr('fLoadHint'), tr('fLoadHelp'));
  setFieldText('pcCyclesMin', tr('fCyclesLabel'), tr('fCyclesHint'), tr('fCyclesHelp'));
  setFieldText('pcMotionType', tr('fMotionLabel'), tr('fMotionHint'), tr('fMotionHelp'));

  const mode = document.getElementById('pcDiameterMode');
  if (mode instanceof HTMLSelectElement && mode.options.length >= 2) {
    mode.options[0].textContent = tr('optIso');
    mode.options[1].textContent = tr('optManual');
  }
  const motion = document.getElementById('pcMotionType');
  if (motion instanceof HTMLSelectElement && motion.options.length >= 2) {
    motion.options[0].textContent = tr('motionH');
    motion.options[1].textContent = tr('motionV');
  }
  const formSum = document.querySelector('#pcFormulasBlock summary');
  if (formSum) formSum.textContent = tr('fFormulasSummary');
  setFieldText('pcLabTier', tr('fLabTierLabel'), tr('fLabTierHint'), tr('fLabTierHelp'));
  setFieldText('pcPatmBar', tr('fPatmLabel'), tr('fPatmHint'), '');
  setFieldText('pcEulerLengthFactor', tr('fEulerLabel'), '', '');
  setFieldText('pcMethodNote', tr('fMethodNoteLabel'), tr('fMethodNoteHint'), tr('fMethodNoteHelp'));
  const tierSel = document.getElementById('pcLabTier');
  if (tierSel instanceof HTMLSelectElement && tierSel.options.length >= 2) {
    tierSel.options[0].textContent = tr('optTierBasic');
    tierSel.options[1].textContent = tr('optTierProject');
  }
}
const ISO_BORES = [32, 40, 50, 63, 80, 100, 125];
const ISO_RODS_BY_BORE = {
  32: [12],
  40: [16],
  50: [20],
  63: [20, 25],
  80: [25, 30],
  100: [25, 35],
  125: [32, 40],
};
const ROD_THREAD_INFO = {
  12: { es: 'Conexion: Vastago 12 mm tipicamente usa rosca M10x1.25', en: 'Connection: 12 mm rod typically uses M10x1.25 thread' },
  16: { es: 'Conexion: Vastago 16 mm tipicamente usa rosca M12x1.25', en: 'Connection: 16 mm rod typically uses M12x1.25 thread' },
  20: { es: 'Conexion: Vastago 20 mm tipicamente usa rosca M16x1.5', en: 'Connection: 20 mm rod typically uses M16x1.5 thread' },
  25: { es: 'Conexion: Vastago 25 mm tipicamente usa rosca M20x1.5', en: 'Connection: 25 mm rod typically uses M20x1.5 thread' },
  30: { es: 'Conexion: Vastago 30 mm tipicamente usa rosca M24x2', en: 'Connection: 30 mm rod typically uses M24x2 thread' },
  32: { es: 'Conexion: Vastago 32 mm tipicamente usa rosca M27x2', en: 'Connection: 32 mm rod typically uses M27x2 thread' },
  35: { es: 'Conexion: Vastago 35 mm tipicamente usa rosca M30x2', en: 'Connection: 35 mm rod typically uses M30x2 thread' },
  40: { es: 'Conexion: Vastago 40 mm tipicamente usa rosca M36x2', en: 'Connection: 40 mm rod typically uses M36x2 thread' },
};

function fmt(n, d = 2) {
  return Number.isFinite(n) ? n.toFixed(d) : '--';
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

function nearestIsoBore(mm) {
  return ISO_BORES.reduce((best, cur) => (Math.abs(cur - mm) < Math.abs(best - mm) ? cur : best), ISO_BORES[0]);
}

function setRodOptionsForBore(boreMm, preferredRodMm = null) {
  const rodSel = document.getElementById('pcRodIso');
  if (!(rodSel instanceof HTMLSelectElement)) return;
  const rods = ISO_RODS_BY_BORE[boreMm] || [20];
  rodSel.innerHTML = rods.map((r) => `<option value="${r}">${r}</option>`).join('');
  if (preferredRodMm && rods.includes(preferredRodMm)) {
    rodSel.value = String(preferredRodMm);
  }
}

function syncManualVisibility() {
  const mode = document.getElementById('pcDiameterMode');
  const manual = mode instanceof HTMLSelectElement && mode.value === 'manual';
  const f1 = document.getElementById('pcBoreManualField');
  const f2 = document.getElementById('pcRodManualField');
  if (f1 instanceof HTMLElement) f1.hidden = !manual;
  if (f2 instanceof HTMLElement) f2.hidden = !manual;
}

function renderCylinderDiagram(svg, strokeMm, rodMm) {
  if (!(svg instanceof SVGElement)) return;
  const rodScale = Math.max(8, Math.min(20, rodMm * 0.42));
  const strokeScale = Math.max(160, Math.min(330, strokeMm * 0.32));
  const x0 = 62;
  const y0 = 108;
  const h = 98;
  const capW = 26;
  const tubeX = x0 + capW;
  const tubeW = strokeScale + 96;
  const pistonX = tubeX + tubeW * 0.44;
  const rodStart = pistonX + 10;
  const rodEndX = tubeX + tubeW + 150;
  const midY = y0 + h / 2;

  svg.setAttribute('viewBox', '0 0 760 320');
  svg.innerHTML = `
    <defs>
      <marker id="pcArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#0f766e"/>
      </marker>
      <linearGradient id="pcTube" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#eef2f7"/>
        <stop offset="100%" stop-color="#dbe3ed"/>
      </linearGradient>
      <linearGradient id="pcRod" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#cbd5e1"/>
        <stop offset="100%" stop-color="#94a3b8"/>
      </linearGradient>
    </defs>
    <rect width="760" height="320" fill="#f8fafc"/>
    <text x="30" y="26" font-size="13" font-weight="800" fill="#0f172a" font-family="Inter,system-ui,sans-serif">${tr('diagramHead')}</text>

    <!-- Cuerpo + tapas -->
    <rect x="${tubeX}" y="${y0}" width="${tubeW}" height="${h}" rx="14" fill="url(#pcTube)" stroke="#64748b" stroke-width="2"/>
    <rect x="${x0}" y="${y0 + 6}" width="${capW}" height="${h - 12}" rx="8" fill="#94a3b8" stroke="#475569" stroke-width="1.8"/>
    <rect x="${tubeX + tubeW}" y="${y0 + 6}" width="${capW}" height="${h - 12}" rx="8" fill="#94a3b8" stroke="#475569" stroke-width="1.8"/>
    <circle cx="${x0 + capW / 2}" cy="${midY}" r="6.5" fill="#64748b"/>
    <circle cx="${tubeX + tubeW + capW / 2}" cy="${midY}" r="6.5" fill="#64748b"/>

    <!-- Camaras -->
    <rect x="${tubeX + 10}" y="${y0 + 10}" width="${pistonX - tubeX - 10}" height="${h - 20}" rx="10" fill="#bae6fd" opacity="0.85"/>
    <rect x="${pistonX + 12}" y="${y0 + 10}" width="${tubeX + tubeW - pistonX - 12}" height="${h - 20}" rx="10" fill="#d1fae5" opacity="0.85"/>

    <!-- Embolo y sellos -->
    <rect x="${pistonX - 9}" y="${y0 + 8}" width="18" height="${h - 16}" rx="4" fill="#334155"/>
    <rect x="${pistonX - 11.5}" y="${y0 + 15}" width="3" height="${h - 30}" fill="#111827"/>
    <rect x="${pistonX + 8.5}" y="${y0 + 15}" width="3" height="${h - 30}" fill="#111827"/>
    <line x1="${pistonX}" y1="${y0 + 16}" x2="${pistonX}" y2="${y0 + h - 16}" stroke="#e2e8f0" stroke-width="1"/>

    <!-- Vastago + guia -->
    <rect x="${rodStart}" y="${midY - rodScale / 2}" width="${rodEndX - rodStart}" height="${rodScale}" rx="7" fill="url(#pcRod)" stroke="#475569"/>
    <rect x="${tubeX + tubeW + 5}" y="${midY - rodScale / 2 - 4}" width="10" height="${rodScale + 8}" rx="3" fill="#334155"/>
    <circle cx="${rodEndX + 12}" cy="${midY}" r="10" fill="#cbd5e1" stroke="#64748b"/>

    <!-- Puertos -->
    <rect x="${tubeX + 34}" y="${y0 - 14}" width="12" height="14" rx="2" fill="#0ea5e9"/>
    <rect x="${tubeX + tubeW - 44}" y="${y0 - 14}" width="12" height="14" rx="2" fill="#10b981"/>
    <text x="${tubeX + 28}" y="${y0 - 20}" font-size="10.5" font-weight="800" fill="#0c4a6e" font-family="Inter,system-ui,sans-serif">A</text>
    <text x="${tubeX + tubeW - 48}" y="${y0 - 20}" font-size="10.5" font-weight="800" fill="#14532d" font-family="Inter,system-ui,sans-serif">B</text>

    <!-- Flujo -->
    <path d="M${tubeX + 40} ${midY} L${pistonX - 20} ${midY}" stroke="#0f766e" stroke-width="2.5" marker-end="url(#pcArrow)"/>
    <path d="M${tubeX + tubeW - 38} ${midY} L${pistonX + 26} ${midY}" stroke="#166534" stroke-width="2.5" marker-end="url(#pcArrow)"/>

    <!-- Cotas -->
    <line x1="${tubeX}" y1="${y0 + h + 24}" x2="${tubeX + tubeW}" y2="${y0 + h + 24}" stroke="#64748b" stroke-width="1.3"/>
    <line x1="${tubeX}" y1="${y0 + h + 19}" x2="${tubeX}" y2="${y0 + h + 29}" stroke="#64748b" stroke-width="1.3"/>
    <line x1="${tubeX + tubeW}" y1="${y0 + h + 19}" x2="${tubeX + tubeW}" y2="${y0 + h + 29}" stroke="#64748b" stroke-width="1.3"/>
    <text x="${tubeX + tubeW / 2 - 52}" y="${y0 + h + 39}" font-size="10" fill="#475569" font-family="Inter,system-ui,sans-serif">${tr('diagramStroke', { s: fmt(strokeMm, 0) })}</text>
    <text x="${rodEndX - 8}" y="${y0 + h + 20}" font-size="10" fill="#475569" font-family="Inter,system-ui,sans-serif">${tr('diagramRodD', { d: fmt(rodMm, 0) })}</text>

    <text x="${pistonX - 38}" y="${y0 + h + 58}" font-size="10" fill="#334155" font-family="Inter,system-ui,sans-serif">${tr('diagramPiston')}</text>
    <text x="${rodEndX - 18}" y="${y0 + h + 58}" font-size="10" fill="#334155" font-family="Inter,system-ui,sans-serif">${tr('diagramRod')}</text>
  `;
}

function computeAndRender() {
  const calcMode = document.getElementById('pcMode') instanceof HTMLSelectElement
    ? document.getElementById('pcMode').value
    : 'design';
  const mode = document.getElementById('pcDiameterMode') instanceof HTMLSelectElement
    ? document.getElementById('pcDiameterMode').value
    : 'iso';
  const motionType = document.getElementById('pcMotionType') instanceof HTMLSelectElement
    ? document.getElementById('pcMotionType').value
    : 'horizontal';

  const results = document.getElementById('pcResults');
  const advisor = document.getElementById('pcAdvisor');
  const verdict = document.getElementById('pcVerdict');
  const rodThreadInfo = document.getElementById('pcRodThreadInfo');
  const formulaBody = document.getElementById('pcFormulaBody');
  if (!(results instanceof HTMLElement) || !(advisor instanceof HTMLElement) || !(verdict instanceof HTMLElement)) return;

  pcPdfSnapshot = { valid: false };

  const errors = [];
  const need = (r) => {
    if (!r.ok) errors.push(r.error);
    return r.ok ? r.value : NaN;
  };

  const pBar = need(readLabNumber('pcPressureBar', 0.5, 25, tr('fPressureLabel')));
  let boreMm = 63;
  let rodMm = 20;
  if (mode === 'manual') {
    boreMm = need(readLabNumber('pcBoreManual', 8, 500, tr('fBoreManualLabel')));
    rodMm = need(readLabNumber('pcRodManual', 4, 400, tr('fRodManualLabel')));
  } else {
    boreMm = need(readLabNumber('pcBoreIso', 8, 500, tr('fBoreIsoLabel')));
    rodMm = need(readLabNumber('pcRodIso', 4, 400, tr('fRodIsoLabel')));
  }
  const strokeMm = need(readLabNumber('pcStrokeMm', 10, 10000, tr('fStrokeLabel')));
  const loadInput = document.getElementById('pcLoadKg');
  const loadKgUser = calcMode === 'design'
    ? need(readLabNumber('pcLoadKg', 0.01, 1e9, tr('fLoadLabel')))
    : 0;
  const cyclesMin = need(readLabNumber('pcCyclesMin', 0.01, 6000, tr('fCyclesLabel')));
  if (Number.isFinite(rodMm) && Number.isFinite(boreMm) && rodMm >= boreMm) {
    errors.push(tr('errRodGeBore'));
  }

  const labTierPc = document.getElementById('pcLabTier') instanceof HTMLSelectElement
    ? document.getElementById('pcLabTier').value
    : 'basic';
  const eulerFacEl = document.getElementById('pcEulerLengthFactor');
  let eulerLengthFactor = 1.2;
  let patmBar = 1.013;
  let methodNote = '';
  if (labTierPc === 'project') {
    eulerLengthFactor = eulerFacEl instanceof HTMLSelectElement ? Number(eulerFacEl.value) : 1.2;
    if (!Number.isFinite(eulerLengthFactor)) eulerLengthFactor = 1.2;
    const pa = readLabNumber('pcPatmBar', 0.5, 1.2, tr('fPatmLabel'));
    if (!pa.ok) errors.push(pa.error);
    else patmBar = pa.value;
    const mn = document.getElementById('pcMethodNote');
    if (mn instanceof HTMLInputElement) methodNote = String(mn.value || '').trim().slice(0, 200);
  }

  if (errors.length) {
    results.innerHTML = '';
    if (formulaBody instanceof HTMLElement) formulaBody.innerHTML = '';
    if (rodThreadInfo instanceof HTMLElement) rodThreadInfo.textContent = '';
    advisor.innerHTML = `<div class="lab-alert lab-alert--danger"><div class="lab-alert__body"><strong>${tr('invalidTitle')}:</strong><ul style="margin:0.4em 0 0 1.1em;padding:0">${errors.map((e) => `<li>${e}</li>`).join('')}</ul></div></div>`;
    verdict.className = 'lab-verdict lab-verdict--err';
    verdict.textContent = tr('invalidVerdict');
    return;
  }

  const pPa = pBar * 1e5;
  const boreM = boreMm / 1000;
  const rodM = rodMm / 1000;
  const strokeM = strokeMm / 1000;
  const areaPiston = (Math.PI * Math.pow(boreM, 2)) / 4;
  const areaRod = (Math.PI * Math.pow(rodM, 2)) / 4;
  const areaAnn = Math.max(1e-9, areaPiston - areaRod);

  const forceTheoAdvN = pPa * areaPiston;
  const forceTheoRetN = pPa * areaAnn;
  const eta = calcMode === 'diagnostic' ? 0.9 : ETA_MECH;
  const forceRealAdvN = forceTheoAdvN * eta;
  const forceRealRetN = forceTheoRetN * eta;
  let loadN = loadKgUser * G;

  const vCapL = areaPiston * strokeM * 1000;
  const vRodL = areaAnn * strokeM * 1000;
  const nlFactor = labTierPc === 'project' ? (pBar + patmBar) / patmBar : (pBar + 1);
  const nlCycle = (vCapL + vRodL) * nlFactor;
  const nlMin = nlCycle * cyclesMin;

  const iRod = (Math.PI * Math.pow(rodM, 4)) / 64;
  const lEff = strokeM * eulerLengthFactor;
  const pCrN = (Math.PI * Math.PI * E_STEEL * iRod) / Math.pow(Math.max(0.05, lEff), 2);
  const bucklingRisk = pCrN < loadN * 2.2;

  if (calcMode === 'diagnostic') {
    loadN = Math.max(1, forceRealAdvN * 0.7);
    if (loadInput instanceof HTMLInputElement) {
      loadInput.value = fmt(forceRealAdvN / G, 1);
      loadInput.readOnly = true;
      loadInput.setAttribute('aria-readonly', 'true');
    }
  } else if (loadInput instanceof HTMLInputElement) {
    loadInput.readOnly = false;
    loadInput.setAttribute('aria-readonly', 'false');
  }
  const loadKg = loadN / G;
  const forceRatio = forceRealAdvN / loadN;
  const recommendedRatio = motionType === 'vertical' ? 2.0 : 1.5;
  const lowForceMargin = forceRatio < recommendedRatio;
  const highRisk = bucklingRisk || forceRatio < 1.0;

  renderCylinderDiagram(document.getElementById('pcDiagram'), strokeMm, rodMm);

  const estSpeed = (2 * strokeM * cyclesMin) / 60;

  const keyMetrics = [
    metric(tr('m1'), `${fmt(forceRealAdvN, 0)} / ${fmt(forceRealRetN, 0)} N`, LANG === 'en' ? '-10% friction' : '-10% friccion'),
    metric(tr('m2'), `${fmt(forceRatio, 2)} x`, LANG === 'en' ? 'Freal extension / F load' : 'Freal avance / F carga'),
    metric(tr('m3'), `${fmt(nlMin, 1)} Nl/min`, `${fmt(cyclesMin, 1)} cpm`),
    metric(
      tr('m4'),
      `${fmt(pCrN, 0)} N`,
      LANG === 'en'
        ? `Euler, L_eff stroke*${fmt(eulerLengthFactor, 2)}`
        : `Euler, L_eff carrera*${fmt(eulerLengthFactor, 2)}`,
    ),
  ].join('');

  const formulaLinesPc = LANG === 'en'
    ? [
        'F_push = P_gauge * A_piston * eta_mech; F_pull = P_gauge * (A_piston - A_rod) * eta_mech.',
        `Free air per cycle: (V_push + V_pull) * ${labTierPc === 'project' ? '(P_gauge+Patm)/Patm' : '(P_gauge+1) with Patm=1 bar'}.`,
        `Euler buckling (rod): I = pi*d^4/64, L_eff = stroke * ${fmt(eulerLengthFactor, 2)}, Pcr = pi^2*E*I/L_eff^2.`,
        'Consumption Nl/min = Nl/cycle * cpm.',
      ]
    : [
        'F_avance = P_man * A_embolo * eta_mec; F_retroceso = P_man * (A_embolo - A_vastago) * eta_mec.',
        `Aire libre por ciclo: (V_avance + V_retroceso) * ${labTierPc === 'project' ? '(P_man+Patm)/Patm' : '(P_man+1) con Patm=1 bar'}.`,
        `Pandeo Euler vastago: I = pi*d^4/64, L_eff = carrera * ${fmt(eulerLengthFactor, 2)}, Pcr = pi^2*E*I/L_eff^2.`,
        'Consumo Nl/min = Nl/ciclo * cpm.',
      ];

  if (formulaBody instanceof HTMLElement) {
    formulaBody.innerHTML = `
      <p class="lab-fluid-formulas__lead">${labTierPc === 'project' ? (LANG === 'en' ? 'Project: Patm, Euler factor and optional note enabled.' : 'Proyecto: Patm, factor Euler y nota opcional activos.') : (LANG === 'en' ? 'Classroom: Patm=1 bar implied in Nl factor; Euler factor fixed 1.2.' : 'Aula: Patm=1 bar implicita en factor Nl; factor Euler fijo 1.2.')}</p>
      ${methodNote ? `<p class="lab-fluid-formulas__sub"><strong>${LANG === 'en' ? 'Note' : 'Nota'}:</strong> ${escHtml(methodNote)}</p>` : ''}
      <ol class="lab-fluid-formulas__list">${formulaLinesPc.map((x) => `<li>${x}</li>`).join('')}</ol>
    `;
  }

  const extraMetrics = [
    metric(tr('e1'), `${fmt(forceTheoAdvN, 0)} N`),
    metric(tr('e2'), `${fmt(forceRealRetN, 0)} N`),
    metric(tr('e3'), `${fmt(nlCycle, 2)} ${LANG === 'en' ? 'Nl/cycle' : 'Nl/ciclo'}`),
    metric(tr('e4'), `${fmt(estSpeed, 3)} m/s`),
    metric(tr('e5'), `${fmt(loadN, 0)} N`, `${fmt(loadKg, 1)} kg`),
  ].join('');

  results.innerHTML = `
    ${keyMetrics}
    <details class="pc-more-details">
      <summary>
        <span class="pc-more-details__title">${tr('details')}</span>
        <span class="pc-more-details__hint">${tr('detailsHint')}</span>
      </summary>
      <div class="pc-more-details__body">
        <div class="lab-results">
          ${extraMetrics}
        </div>
      </div>
    </details>
  `;

  const alerts = [];
  if (mode === 'manual') {
    if (!ISO_BORES.includes(Math.round(boreMm))) {
      const near = nearestIsoBore(boreMm);
      alerts.push(`<div class="lab-alert lab-alert--warn"><div class="lab-alert__body"><strong>${tr('warnNonStdBore')}:</strong> ${tr('warnNonStdBoreBody', { near })}</div></div>`);
    }
    if (!Object.values(ISO_RODS_BY_BORE).flat().includes(Math.round(rodMm))) {
      alerts.push(`<div class="lab-alert lab-alert--warn"><div class="lab-alert__body"><strong>${tr('warnNonStdRod')}:</strong> ${tr('warnNonStdRodBody')}</div></div>`);
    }
  }
  if (lowForceMargin) {
    if (motionType === 'horizontal') {
      alerts.push(`<div class="lab-alert lab-alert--warn"><div class="lab-alert__body"><strong>${tr('warnFsHorizontal', { fs: fmt(forceRatio, 2) })}:</strong> ${tr('warnFsHorizontalBody')}</div></div>`);
    } else {
      alerts.push(`<div class="lab-alert lab-alert--warn"><div class="lab-alert__body"><strong>${tr('warnFsVertical')}:</strong> ${tr('warnFsVerticalBody')}</div></div>`);
    }
  }
  if (bucklingRisk) {
    alerts.push(`<div class="lab-alert lab-alert--danger"><div class="lab-alert__body"><strong>${tr('dangerBuckling')}:</strong> ${tr('dangerBucklingBody')}</div></div>`);
  }
  if (estSpeed > 0.5) {
    alerts.push(`<div class="lab-alert lab-alert--warn"><div class="lab-alert__body"><strong>${tr('warnThrottle')}:</strong> ${tr('warnThrottleBody', { v: fmt(estSpeed, 3) })}</div></div>`);
  }
  if (boreMm >= 63 && loadKg >= 80) {
      alerts.push(`<div class="lab-alert lab-alert--info"><div class="lab-alert__body"><strong>${tr('infoCushion')}:</strong> ${tr('infoCushionBody')}</div></div>`);
  }
  alerts.push(`<div class="lab-alert lab-alert--info"><div class="lab-alert__body"><strong>${tr('infoAir')}:</strong> ${tr('infoAirBody', { n: fmt(nlCycle, 2) })}</div></div>`);
  if (calcMode === 'diagnostic') {
    const fsDiag = pCrN / Math.max(1, forceRealAdvN);
    alerts.push(`<div class="lab-alert lab-alert--info"><div class="lab-alert__body"><strong>${tr('infoDiagTitle')}:</strong> ${tr('infoDiagBody', { fs: fmt(fsDiag, 2) })}</div></div>`);
  }
  if (calcMode === 'diagnostic' && pBar > 10) {
    alerts.push(`<div class="lab-alert lab-alert--danger"><div class="lab-alert__body"><strong>${tr('dangerPressureTitle')}:</strong> ${tr('dangerPressureBody')}</div></div>`);
  }
  advisor.innerHTML = alerts.join('');

  const minApto = motionType === 'vertical' ? 2.0 : 1.25;
  const isAptoByForce = forceRatio > minApto;
  verdict.className = highRisk ? 'lab-verdict lab-verdict--err' : isAptoByForce ? 'lab-verdict lab-verdict--ok' : 'lab-verdict lab-verdict--muted';
  if (highRisk) {
    verdict.textContent = tr('verdictNo');
  } else if (!isAptoByForce && motionType === 'vertical') {
    const nextBore = ISO_BORES.find((d) => d > boreMm) || ISO_BORES[ISO_BORES.length - 1];
    verdict.textContent = tr('verdictRiskV', { d: nextBore });
  } else if (!isAptoByForce) {
    verdict.textContent = tr('verdictLow');
  } else {
    verdict.textContent = tr('verdictOkLong');
  }

  if (rodThreadInfo instanceof HTMLElement) {
    const info = ROD_THREAD_INFO[Math.round(rodMm)];
    rodThreadInfo.textContent = info ? info[LANG] : tr('rodFallback', { d: fmt(rodMm, 0) });
  }

  const langPdf = getCurrentLang();
  const ts = formatDateTimeLocale(new Date(), langPdf);
  const assumptionsPc = [
    langPdf === 'en'
      ? `Mechanical efficiency ~ ${fmt((calcMode === 'diagnostic' ? 0.9 : ETA_MECH) * 100, 0)} % (mode).`
      : `Eficiencia mecanica ~ ${fmt((calcMode === 'diagnostic' ? 0.9 : ETA_MECH) * 100, 0)} % (modo).`,
    langPdf === 'en'
      ? `Nl scaling: ${labTierPc === 'project' ? `(P_gauge+${fmt(patmBar, 3)})/${fmt(patmBar, 3)}` : 'P_gauge+1 (1 bar atm teaching model)'}.`
      : `Factor Nl: ${labTierPc === 'project' ? `(P_man+${fmt(patmBar, 3)})/${fmt(patmBar, 3)}` : 'P_man+1 (Patm 1 bar modelo aula)'}.`,
    langPdf === 'en'
      ? `Steel rod E = ${(E_STEEL / 1e9).toFixed(0)} GPa for Pcr.`
      : `Vastago acero E = ${(E_STEEL / 1e9).toFixed(0)} GPa para Pcr.`,
  ];
  if (methodNote) assumptionsPc.push(`${langPdf === 'en' ? 'User note' : 'Nota usuario'}: ${methodNote}`);

  pcPdfSnapshot = {
    valid: true,
    title: langPdf === 'en' ? 'Report - Pneumatic cylinder' : 'Informe - Cilindro neumatico',
    fileBase: `${langPdf === 'en' ? 'report-pneumatic-cylinder' : 'informe-cilindro-neumatico'}-${new Date().toISOString().slice(0, 10)}`,
    timestamp: ts,
    tierLabel: labTierPc === 'project' ? (langPdf === 'en' ? 'Mode: Project' : 'Modo: Proyecto') : (langPdf === 'en' ? 'Mode: Classroom' : 'Modo: Aula'),
    kpis: [
      { title: langPdf === 'en' ? 'F push/pull' : 'F av/ret', value: `${fmt(forceRealAdvN, 0)}/${fmt(forceRealRetN, 0)} N`, subtitle: 'real' },
      { title: 'FS', value: `${fmt(forceRatio, 2)}`, subtitle: langPdf === 'en' ? 'force' : 'fuerza' },
      { title: 'Nl/min', value: `${fmt(nlMin, 1)}`, subtitle: langPdf === 'en' ? 'free air' : 'aire libre' },
      { title: 'Pcr', value: `${fmt(pCrN, 0)} N`, subtitle: 'Euler' },
    ],
    inputRows: [
      { label: 'tier', value: labTierPc },
      { label: 'p', value: `${fmt(pBar, 2)} bar` },
      { label: 'D/d', value: `${fmt(boreMm, 0)}/${fmt(rodMm, 0)} mm` },
      { label: 'stroke', value: `${fmt(strokeMm, 0)} mm` },
      { label: 'L_eff x', value: fmt(eulerLengthFactor, 2) },
      { label: 'Patm', value: labTierPc === 'project' ? `${fmt(patmBar, 3)} bar` : '1 (aula)' },
    ],
    resultRows: [
      { label: 'Nl/cycle', value: `${fmt(nlCycle, 2)}` },
      { label: 'v est.', value: `${fmt(estSpeed, 3)} m/s` },
      { label: 'load', value: `${fmt(loadN, 0)} N` },
    ],
    formulaLines: formulaLinesPc,
    assumptions: assumptionsPc,
    verdict: verdict.textContent,
    disclaimer: langPdf === 'en'
      ? 'Educational model; verify threads, mounting and buckling with manufacturer data.'
      : 'Modelo educativo; verificar roscas, montaje y pandeo con datos de fabricante.',
  };
}

function syncPcLabTierUi() {
  const tier = document.getElementById('pcLabTier') instanceof HTMLSelectElement
    ? document.getElementById('pcLabTier').value
    : 'basic';
  const panel = document.getElementById('pcProjectPanel');
  if (panel instanceof HTMLElement) panel.hidden = tier !== 'project';
}

function syncCalcModeUi() {
  const calcMode = document.getElementById('pcMode') instanceof HTMLSelectElement
    ? document.getElementById('pcMode').value
    : 'design';
  const loadField = document.getElementById('pcLoadKg')?.closest('.lab-field');
  if (loadField instanceof HTMLElement) {
    loadField.classList.toggle('lab-field--auto', calcMode === 'diagnostic');
    const hint = loadField.querySelector('.hint');
    const help = loadField.querySelector('.lab-field-help');
    if (hint) hint.textContent = calcMode === 'diagnostic' ? tr('fLoadHintAuto') : tr('fLoadHint');
    if (help) help.textContent = calcMode === 'diagnostic' ? tr('fLoadHelpDiag') : tr('fLoadHelp');
  }
}

document.getElementById('pcBoreIso')?.addEventListener('change', () => {
  const b = readLabNumber('pcBoreIso', 1, 1e9, '');
  setRodOptionsForBore(Math.round(b.ok ? b.value : 63));
  computeAndRender();
});

document.getElementById('pcDiameterMode')?.addEventListener('change', () => {
  syncManualVisibility();
  computeAndRender();
});

['pcPressureBar', 'pcRodIso', 'pcBoreManual', 'pcRodManual', 'pcStrokeMm', 'pcLoadKg', 'pcCyclesMin', 'pcMotionType', 'pcMode', 'pcLabTier', 'pcEulerLengthFactor', 'pcPatmBar', 'pcMethodNote'].forEach((id) => {
  document.getElementById(id)?.addEventListener('input', () => {
    if (id === 'pcLabTier') syncPcLabTierUi();
    if (id === 'pcMode') syncCalcModeUi();
    computeAndRender();
  });
  document.getElementById(id)?.addEventListener('change', () => {
    if (id === 'pcLabTier') syncPcLabTierUi();
    if (id === 'pcMode') syncCalcModeUi();
    computeAndRender();
  });
});

(() => {
  const b = readLabNumber('pcBoreIso', 1, 1e9, '');
  const r = readLabNumber('pcRodIso', 1, 1e9, '');
  setRodOptionsForBore(Math.round(b.ok ? b.value : 63), Math.round(r.ok ? r.value : 20));
})();
syncManualVisibility();
applyStaticI18n();
syncPcLabTierUi();
syncCalcModeUi();
mountCompactLabFieldHelp();
computeAndRender();

mountLabFluidPdfExportBar(document.getElementById('labFluidPdfMountPc'), {
  getPayload: () => pcPdfSnapshot,
  getDiagramElements: () => {
    const svg = document.getElementById('pcDiagram');
    return svg instanceof SVGSVGElement ? [svg] : [];
  },
});
