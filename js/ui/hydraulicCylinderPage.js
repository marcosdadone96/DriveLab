import { mountCompactLabFieldHelp } from './labHelpCompact.js';
import { readLabNumber } from '../utils/labInputParse.js';
import { mountLabFluidPdfExportBar } from '../services/fluidLabPdfExport.js';
import { formatDateTimeLocale, getCurrentLang } from '../config/locales.js';

const G = 9.81;
/** @type {object | null} */
let cylinderPdfSnapshot = null;
const E_STEEL = 210e9;
const SIGMA_ALLOW = 140e6; // Pa
const DESIGN_FACTOR_PRESSURE = 1.5;
const ETA_DIAG = 0.92;
const WALL_STD_MM = [3, 4, 5, 6, 8, 10, 12, 14, 16, 20, 25];
const ISO_3320_RODS_BY_BORE = {
  32: [14, 18, 22],
  40: [18, 22, 28],
  50: [22, 28, 36],
  63: [28, 36, 45],
  80: [36, 45, 56],
  100: [45, 56, 70],
  125: [56, 70, 90],
  160: [70, 90, 110],
};
const LANG_KEY = 'mdr-home-lang';
const LANG = (() => {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return v === 'en' ? 'en' : 'es';
  } catch (_) {
    return 'es';
  }
})();
const I18N = {
  es: {
    title: 'Cilindro hidraulico - fuerza, caudal y seguridad estructural',
    lead: 'Valida fuerza de empuje/traccion, caudal requerido, pandeo del vastago (Euler) y espesor minimo de tubo para operar con seguridad a presion nominal.',
    verdictOk: 'SISTEMA APTO',
    detailsTitle: 'Ver Datos Tecnicos Secundarios',
    detailsHint: 'Caudales, pandeo y espesor',
    mPush: 'Fuerza de avance',
    mPull: 'Fuerza de traccion',
    mSpeed: 'Velocidad (segun caudal)',
    mArea: 'Relacion de areas',
    mStruct: 'Factor seguridad estructural',
    mFlowReq: 'Caudal requerido objetivo',
    mPortSpeed: 'Velocidad en puertos',
    mQout: 'Qout en retroceso',
    mEuler: 'Carga critica Euler',
    mTmin: 'Espesor minimo calculado',
    mTstd: 'Espesor comercial recomendado',
    mFsTube: 'FS tubo',
    mFsBuck: 'FS pandeo',
    mVsPneu: 'Comparativa vs neumatica 6 bar',
    mCapacity: 'Capacidad de empuje',
    detailsSub1: 'A_piston / A_anular (retorno mas rapido)',
    detailsSub2: 'pandeo + espesor',
    alertSpeed: 'Control de velocidad',
    alertSpeedBody: 'Tu bomba entrega mas caudal del necesario para la velocidad objetivo. Necesitaras una valvula reguladora de flujo para no exceder los {v} m/s.',
    alertThin: 'Espesor no apto',
    alertThinBody: '{wr} mm es menor que el minimo calculado ({tr} mm). Aumenta el espesor del tubo para evitar deformacion por presion.',
    alertCommercial: 'Espesor poco logico comercialmente',
    alertCommercialBody: 'Aunque cumple por calculo, se recomienda usar al menos {t} mm (serie estandar) para fabricacion y suministro.',
    alertThick: 'Espesor elevado',
    alertThickBody: '{wr} mm es muy superior al recomendado ({t} mm). Revisa peso, coste y disipacion termica del cilindro.',
    alertPort: 'Insight',
    alertPortBody: 'Velocidad de flujo alta. Considera aumentar el tamano de las conexiones para evitar sobrecalentamiento.',
    alertBuckling: 'RIESGO DE FLEXION',
    alertBucklingBody: 'El vastago podria doblarse bajo esta carga. Aumenta el diametro del vastago o usa un montaje con guia.',
    alertInstability: 'Inestabilidad detectada',
    alertInstabilityBody: 'Para una carrera de {s} mm, el vastago estandar de {d} mm corre riesgo de pandeo. Selecciona el vastago reforzado de {dr} mm.',
    alertArea: 'Relacion de areas ({r}x)',
    alertAreaBody: 'El aceite saldra {rr} veces mas rapido por el lado del vastago durante el retroceso (v_ret ~ {vr} m/s). Este dato ayuda a dimensionar valvulas de retorno y lineas de descarga.',
    alertReturn: 'Chequeo de retorno',
    alertReturnBody: 'En retroceso el caudal de salida por lado vastago sube a {q} L/min. Verifica capacidad de valvulas y linea de retorno para evitar bloqueo o contrapresion.',
    alertCompare: 'Comparativa',
    alertCompareBody: 'Diferencia con Neumatica: Este cilindro genera {x} veces mas fuerza que su equivalente neumatico a 6 bar, permitiendo un diseno mucho mas compacto.',
    sealInfo: 'Kit de sellos estandar disponible: KIT-ISO3320-{b}/{r}-{m} (equivalente comercial: Seal kit {b}x{r} DA {m}). Este formato es facil de encontrar en suministro industrial.',
    verdictApto: 'SISTEMA APTO - Estructura y vastago adecuados para la presion y carga indicadas.',
    verdictNo: 'SISTEMA NO APTO - Causas: {reasons}. Acciones: {actions}.',
    verdictMargin: 'SISTEMA CON MARGEN AJUSTADO - Funciona, pero conviene optimizar conexiones y seguridad estructural.',
    reasonForce: 'Fuerza insuficiente ({v}x < 1.25x)',
    reasonBuck: 'Pandeo critico (FS {v}x < 3.5x)',
    reasonTube: 'Espesor de tubo insuficiente (FS tubo {v}x < 2.0x)',
    actionForce: 'aumentar diametro de piston o presion de trabajo',
    actionBuck: 'aumentar diametro de vastago o reducir carrera libre',
    actionTube: 'subir espesor real a {t} mm o superior estandar',
    driverTube: 'Por que no cambia el FS al aumentar vastago',
    driverTubeBody: 'El limite actual lo impone el tubo (FS tubo {ft}x) y no el pandeo del vastago (FS pandeo {fb}x). Para subir el FS global debes aumentar espesor de tubo o reducir presion de trabajo.',
    driverBuck: 'FS controlado por pandeo',
    driverBuckBody: 'En este punto el vastago domina la seguridad. Aumentar diametro de vastago o reducir carrera mejorara directamente el FS global.',
    alertDiagPressure: 'Peligro: Esta superando la presion de diseno habitual del cilindro. Riesgo de fatiga en tubo, vastago o sellos.',
    errInputsTitle: 'Entrada no valida',
    errInputsVerdict: 'Revise los valores del formulario.',
    inpPressureBar: 'Presion de trabajo (bar)',
    inpBore: 'Diametro piston (mm)',
    inpRod: 'Diametro vastago (mm)',
    inpStroke: 'Carrera (mm)',
    inpLoad: 'Carga de trabajo (kg)',
    inpSpeed: 'Velocidad objetivo (m/s)',
    inpPumpFlow: 'Caudal disponible bomba (L/min)',
    inpPort: 'Diametro interno de puertos (mm)',
    inpWall: 'Espesor real del tubo (mm)',
    errRodGeBore: 'El vastago debe ser menor que el piston.',
  },
  en: {
    title: 'Hydraulic cylinder - force, flow and structural safety',
    lead: 'Validate push/pull force, required flow, rod buckling (Euler) and minimum tube wall thickness for safe operation at nominal pressure.',
    verdictOk: 'SYSTEM SUITABLE',
    detailsTitle: 'View Secondary Technical Data',
    detailsHint: 'Flow, buckling and wall thickness',
    mPush: 'Push force',
    mPull: 'Pull force',
    mSpeed: 'Speed (from flow)',
    mArea: 'Area ratio',
    mStruct: 'Structural safety factor',
    mFlowReq: 'Required target flow',
    mPortSpeed: 'Port velocity',
    mQout: 'Qout on retract',
    mEuler: 'Euler critical load',
    mTmin: 'Minimum required thickness',
    mTstd: 'Recommended commercial thickness',
    mFsTube: 'Tube SF',
    mFsBuck: 'Buckling SF',
    mVsPneu: 'Comparison vs pneumatic 6 bar',
    mCapacity: 'Push capacity',
    detailsSub1: 'A_piston / A_annular (faster retract)',
    detailsSub2: 'buckling + wall',
    alertSpeed: 'Speed control',
    alertSpeedBody: 'Your pump provides more flow than required for the target speed. You need a flow control valve to avoid exceeding {v} m/s.',
    alertThin: 'Unsuitable wall thickness',
    alertThinBody: '{wr} mm is below the calculated minimum ({tr} mm). Increase tube wall thickness to avoid pressure deformation.',
    alertCommercial: 'Commercially non-standard thickness',
    alertCommercialBody: 'Although it passes the formula, use at least {t} mm (standard series) for manufacturability and supply.',
    alertThick: 'Excessive wall thickness',
    alertThickBody: '{wr} mm is much higher than recommended ({t} mm). Review weight, cost and heat dissipation.',
    alertPort: 'Insight',
    alertPortBody: 'High fluid velocity. Consider increasing connection size to avoid overheating.',
    alertBuckling: 'BUCKLING RISK',
    alertBucklingBody: 'The rod may bend under this load. Increase rod diameter or use guided mounting.',
    alertInstability: 'Instability detected',
    alertInstabilityBody: 'For a {s} mm stroke, the standard {d} mm rod is at buckling risk. Select the reinforced {dr} mm rod.',
    alertArea: 'Area ratio ({r}x)',
    alertAreaBody: 'Oil exits {rr} times faster on rod side during retract (v_ret ~ {vr} m/s). This helps size return valves and discharge lines.',
    alertReturn: 'Return check',
    alertReturnBody: 'During retract, rod-side outlet flow rises to {q} L/min. Verify valve and return line capacity to avoid blockage or back pressure.',
    alertCompare: 'Comparison',
    alertCompareBody: 'Difference vs Pneumatics: This cylinder generates {x} times more force than the equivalent pneumatic cylinder at 6 bar, enabling a more compact design.',
    sealInfo: 'Standard seal kit available: KIT-ISO3320-{b}/{r}-{m} (commercial equivalent: Seal kit {b}x{r} DA {m}). This format is easy to source in industrial supply chains.',
    verdictApto: 'SYSTEM SUITABLE - Structure and rod are adequate for the selected pressure and load.',
    verdictNo: 'SYSTEM NOT SUITABLE - Causes: {reasons}. Actions: {actions}.',
    verdictMargin: 'SYSTEM WITH TIGHT MARGIN - Works, but connection and structural safety optimization is recommended.',
    reasonForce: 'Insufficient force ({v}x < 1.25x)',
    reasonBuck: 'Critical buckling (SF {v}x < 3.5x)',
    reasonTube: 'Insufficient tube wall (Tube SF {v}x < 2.0x)',
    actionForce: 'increase piston diameter or working pressure',
    actionBuck: 'increase rod diameter or reduce free stroke',
    actionTube: 'increase wall thickness to {t} mm or next standard size',
    driverTube: 'Why SF does not change by increasing rod',
    driverTubeBody: 'Current limit is tube wall (Tube SF {ft}x), not rod buckling (Buckling SF {fb}x). To raise global SF, increase wall thickness or reduce working pressure.',
    driverBuck: 'SF controlled by buckling',
    driverBuckBody: 'At this point, rod buckling dominates safety. Increasing rod diameter or reducing stroke will directly improve global SF.',
    alertDiagPressure: 'Danger: You are exceeding typical cylinder design pressure. Risk of fatigue in tube, rod or seals.',
    errInputsTitle: 'Invalid input',
    errInputsVerdict: 'Please correct the form values.',
    inpPressureBar: 'Working pressure (bar)',
    inpBore: 'Piston diameter (mm)',
    inpRod: 'Rod diameter (mm)',
    inpStroke: 'Stroke (mm)',
    inpLoad: 'Working load (kg)',
    inpSpeed: 'Target speed (m/s)',
    inpPumpFlow: 'Available pump flow (L/min)',
    inpPort: 'Port inner diameter (mm)',
    inpWall: 'Actual tube wall thickness (mm)',
    errRodGeBore: 'Rod diameter must be less than bore.',
  },
};
function t(key, vars = {}) {
  const str = (I18N[LANG] && I18N[LANG][key]) || (I18N.es[key] || key);
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}

function applyStaticI18n() {
  document.documentElement.setAttribute('lang', LANG);
  document.title = t('title');
  const h2 = document.querySelector('.lab-panel h2');
  const lead = document.querySelector('.lab-lead');
  const verdict = document.getElementById('hcVerdict');
  const nav = document.querySelectorAll('.lab-header nav a');
  const mapEn = {
    Inicio: 'Home',
    Laboratorio: 'Laboratory',
    'Lienzo Pro': 'Pro canvas',
    'Corte de cilindro hidraulico (doble efecto, alta presion)': 'Hydraulic cylinder cross-section (double acting, high pressure)',
    'Puertos A/B de aceite, sellos de alta presion, guia de vastago y zonas de empuje/traccion.':
      'Oil ports A/B, high-pressure seals, rod guide, and push/pull zones.',
    'Presion de trabajo (bar)': 'Working pressure (bar)',
    'Presion hidraulica efectiva': 'Effective hydraulic pressure',
    'Usada para calcular fuerza real del cilindro y para el chequeo estructural del tubo.':
      'Used to calculate real cylinder force and tube structural check.',
    'Diametro piston (mm)': 'Piston diameter (mm)',
    'Define area de empuje': 'Defines push area',
    'A mayor diametro, mayor fuerza de avance para la misma presion.':
      'Larger diameter means higher extension force at same pressure.',
    'Diametro vastago (mm)': 'Rod diameter (mm)',
    'Afecta traccion y pandeo': 'Affects pull force and buckling',
    'Un vastago mayor mejora estabilidad al pandeo y reduce riesgo de flexion.':
      'Larger rod improves buckling stability and reduces bending risk.',
    'Carrera (mm)': 'Stroke (mm)',
    'Longitud util de desplazamiento': 'Useful travel length',
    'Carreras largas aumentan la carga critica del chequeo Euler.':
      'Long strokes increase critical load in Euler check.',
    'Carga de trabajo (kg)': 'Working load (kg)',
    'Carga mecanica externa': 'External mechanical load',
    'Se convierte a N para comparar con fuerza disponible y factor de seguridad.':
      'Converted to N to compare against available force and safety factor.',
    'Velocidad objetivo (m/s)': 'Target speed (m/s)',
    'Define caudal requerido': 'Defines required flow',
    'Con area de piston permite dimensionar el caudal que debe entregar la bomba.':
      'Together with piston area, it defines required pump flow.',
    'Caudal disponible bomba (L/min)': 'Available pump flow (L/min)',
    'Para estimar velocidad real': 'To estimate real speed',
    'Permite calcular la velocidad real del cilindro segun el flujo disponible.':
      'Allows estimating real cylinder speed based on available flow.',
    'Diametro interno de puertos (mm)': 'Port inner diameter (mm)',
    'Control de velocidad del aceite': 'Oil speed control',
    'Si la velocidad en puertos es alta, aumenta calentamiento y perdidas.':
      'High port velocity increases heating and losses.',
    'Espesor real del tubo (mm)': 'Actual tube wall thickness (mm)',
    'Chequeo estructural del cuerpo': 'Body structural check',
    'Se compara con espesor minimo calculado y con serie comercial estandar (3, 4, 5, 6, 8, 10, 12 mm, etc.) para evitar valores poco fabricables.':
      'Compared against calculated minimum and standard commercial wall series (3, 4, 5, 6, 8, 10, 12 mm, etc.) to avoid non-manufacturable values.',
    'Material kit de juntas': 'Seal kit material',
    'NBR (uso general)': 'NBR (general use)',
    'PU (alta abrasion)': 'PU (high abrasion)',
    'FKM / Viton (alta temperatura)': 'FKM / Viton (high temperature)',
    'Define nomenclatura del kit': 'Defines kit nomenclature',
    'La referencia de kit cambia segun material elastomerico seleccionado para compatibilidad con fluido y temperatura.':
      'Kit reference changes with selected elastomer for fluid and temperature compatibility.',
    'SISTEMA APTO': 'SYSTEM SUITABLE',
  };
  if (LANG === 'en') {
    document.querySelectorAll('label, span.hint, p.lab-field-help, p.lab-diagram-wrap__title, p.lab-diagram-caption, nav a, option, #hcVerdict').forEach((el) => {
      const k = (el.textContent || '').trim();
      if (mapEn[k]) el.textContent = mapEn[k];
    });
  }
  if (nav[0]) nav[0].textContent = LANG === 'en' ? 'Home' : 'Inicio';
  if (nav[1]) nav[1].textContent = LANG === 'en' ? 'Laboratory' : 'Laboratorio';
  if (nav[2]) nav[2].textContent = LANG === 'en' ? 'Pro canvas' : 'Lienzo Pro';
  if (h2) h2.textContent = t('title');
  if (lead) lead.textContent = t('lead');
  if (verdict) verdict.textContent = t('verdictOk');
}

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

function nearestStandardWallAtOrAbove(tReqMm) {
  for (let i = 0; i < WALL_STD_MM.length; i += 1) {
    if (WALL_STD_MM[i] >= tReqMm) return WALL_STD_MM[i];
  }
  return WALL_STD_MM[WALL_STD_MM.length - 1];
}

function setRodOptionsForBore(boreMm, preferredRod = null) {
  const rodEl = document.getElementById('hcRodMm');
  if (!(rodEl instanceof HTMLSelectElement)) return;
  const rods = ISO_3320_RODS_BY_BORE[boreMm] || [36];
  rodEl.innerHTML = rods.map((d) => `<option value="${d}">${d}</option>`).join('');
  const chosen = preferredRod && rods.includes(preferredRod) ? preferredRod : rods[0];
  rodEl.value = String(chosen);
}

function renderCylinderDiagram(svg, strokeMm, rodMm) {
  if (!(svg instanceof SVGElement)) return;
  const rodScale = Math.max(10, Math.min(22, rodMm * 0.34));
  const bodyW = Math.max(300, Math.min(430, strokeMm * 0.3));
  const x0 = 72;
  const y0 = 92;
  const h = 122;
  const capW = 28;
  const tubeX = x0 + capW;
  const pistonX = tubeX + bodyW * 0.44;
  const rodStart = pistonX + 12;
  const rodEnd = tubeX + bodyW + 180;
  const midY = y0 + h / 2;

  svg.setAttribute('viewBox', '0 0 820 350');
  svg.innerHTML = `
    <defs>
      <marker id="hcArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#0ea5e9"/>
      </marker>
      <linearGradient id="hcTube" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#f1f5f9"/>
        <stop offset="100%" stop-color="#dbeafe"/>
      </linearGradient>
      <linearGradient id="hcRod" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#d1d5db"/>
        <stop offset="100%" stop-color="#9ca3af"/>
      </linearGradient>
    </defs>
    <rect width="820" height="350" fill="#f8fafc"/>
    <text x="28" y="28" font-size="13" font-weight="800" fill="#0f172a" font-family="Inter,system-ui,sans-serif">${t('title')}</text>

    <rect x="${tubeX}" y="${y0}" width="${bodyW}" height="${h}" rx="14" fill="url(#hcTube)" stroke="#475569" stroke-width="2"/>
    <rect x="${x0}" y="${y0 + 6}" width="${capW}" height="${h - 12}" rx="8" fill="#94a3b8" stroke="#334155" stroke-width="1.8"/>
    <rect x="${tubeX + bodyW}" y="${y0 + 6}" width="${capW}" height="${h - 12}" rx="8" fill="#94a3b8" stroke="#334155" stroke-width="1.8"/>

    <rect x="${tubeX + 12}" y="${y0 + 12}" width="${pistonX - tubeX - 12}" height="${h - 24}" rx="8" fill="#bae6fd"/>
    <rect x="${pistonX + 13}" y="${y0 + 12}" width="${tubeX + bodyW - pistonX - 13}" height="${h - 24}" rx="8" fill="#dbeafe"/>

    <rect x="${pistonX - 10}" y="${y0 + 9}" width="20" height="${h - 18}" rx="5" fill="#334155"/>
    <rect x="${pistonX - 14}" y="${y0 + 20}" width="4" height="${h - 40}" fill="#0f172a"/>
    <rect x="${pistonX + 10}" y="${y0 + 20}" width="4" height="${h - 40}" fill="#0f172a"/>
    <circle cx="${pistonX}" cy="${midY}" r="2.6" fill="#e2e8f0"/>

    <rect x="${rodStart}" y="${midY - rodScale / 2}" width="${rodEnd - rodStart}" height="${rodScale}" rx="8" fill="url(#hcRod)" stroke="#475569"/>
    <rect x="${tubeX + bodyW + 5}" y="${midY - rodScale / 2 - 5}" width="12" height="${rodScale + 10}" rx="3" fill="#334155"/>
    <circle cx="${rodEnd + 15}" cy="${midY}" r="12" fill="#cbd5e1" stroke="#64748b"/>

    <rect x="${tubeX + 38}" y="${y0 - 16}" width="12" height="16" rx="3" fill="#0284c7"/>
    <rect x="${tubeX + bodyW - 52}" y="${y0 - 16}" width="12" height="16" rx="3" fill="#0284c7"/>
    <text x="${tubeX + 32}" y="${y0 - 22}" font-size="10.5" font-weight="800" fill="#0c4a6e" font-family="Inter,system-ui,sans-serif">Puerto A</text>
    <text x="${tubeX + bodyW - 94}" y="${y0 - 22}" font-size="10.5" font-weight="800" fill="#0c4a6e" font-family="Inter,system-ui,sans-serif">Puerto B</text>

    <path d="M${tubeX + 44} ${midY} L${pistonX - 18} ${midY}" stroke="#0ea5e9" stroke-width="2.6" marker-end="url(#hcArrow)"/>
    <path d="M${tubeX + bodyW - 46} ${midY} L${pistonX + 30} ${midY}" stroke="#0ea5e9" stroke-width="2.6" marker-end="url(#hcArrow)"/>

    <text x="${tubeX + 20}" y="${y0 + h + 26}" font-size="10" fill="#334155" font-family="Inter,system-ui,sans-serif">Camara de empuje (avance)</text>
    <text x="${tubeX + bodyW - 175}" y="${y0 + h + 26}" font-size="10" fill="#334155" font-family="Inter,system-ui,sans-serif">Camara de traccion (retorno)</text>
    <text x="${pistonX - 35}" y="${y0 + h + 45}" font-size="10" fill="#334155" font-family="Inter,system-ui,sans-serif">Sellos alta presion</text>
    <text x="${rodEnd - 10}" y="${y0 + h + 45}" font-size="10" fill="#334155" font-family="Inter,system-ui,sans-serif">Vastago</text>

    <line x1="${tubeX}" y1="${y0 + h + 62}" x2="${tubeX + bodyW}" y2="${y0 + h + 62}" stroke="#64748b" stroke-width="1.3"/>
    <line x1="${tubeX}" y1="${y0 + h + 57}" x2="${tubeX}" y2="${y0 + h + 67}" stroke="#64748b" stroke-width="1.3"/>
    <line x1="${tubeX + bodyW}" y1="${y0 + h + 57}" x2="${tubeX + bodyW}" y2="${y0 + h + 67}" stroke="#64748b" stroke-width="1.3"/>
    <text x="${tubeX + bodyW / 2 - 56}" y="${y0 + h + 80}" font-size="10" fill="#475569" font-family="Inter,system-ui,sans-serif">Carrera ${fmt(strokeMm, 0)} mm</text>
  `;
}

function computeAndRender() {
  const mode = document.getElementById('hcMode') instanceof HTMLSelectElement
    ? document.getElementById('hcMode').value
    : 'design';

  const results = document.getElementById('hcResults');
  const advisor = document.getElementById('hcAdvisor');
  const sealInfo = document.getElementById('hcSealInfo');
  const verdict = document.getElementById('hcVerdict');
  const formulaBody = document.getElementById('hcFormulaBody');
  if (!(results instanceof HTMLElement) || !(advisor instanceof HTMLElement) || !(verdict instanceof HTMLElement)) return;

  cylinderPdfSnapshot = { valid: false };

  const errors = [];
  const need = (r) => {
    if (!r.ok) errors.push(r.error);
    return r.ok ? r.value : NaN;
  };

  const pBar = need(readLabNumber('hcPressureBar', 1, 500, t('inpPressureBar')));
  const boreMm = need(readLabNumber('hcBoreMm', 16, 2000, t('inpBore')));
  const rodMm = need(readLabNumber('hcRodMm', 8, 2000, t('inpRod')));
  const strokeMm = need(readLabNumber('hcStrokeMm', 20, 10000, t('inpStroke')));
  const loadInput = document.getElementById('hcLoadKg');
  const loadKgUser = mode === 'design'
    ? need(readLabNumber('hcLoadKg', 0.1, 1e9, t('inpLoad')))
    : 0;
  const vTarget = need(readLabNumber('hcTargetSpeedMs', 0.001, 10, t('inpSpeed')));
  const qPumpLmin = need(readLabNumber('hcPumpFlowLmin', 0.1, 1e6, t('inpPumpFlow')));
  const portDiaMm = need(readLabNumber('hcPortDiaMm', 1, 500, t('inpPort')));
  const wallRealMm = need(readLabNumber('hcWallMm', 0.5, 200, t('inpWall')));
  if (Number.isFinite(rodMm) && Number.isFinite(boreMm) && rodMm >= boreMm) {
    errors.push(t('errRodGeBore'));
  }

  if (errors.length) {
    results.innerHTML = '';
    if (sealInfo instanceof HTMLElement) sealInfo.textContent = '';
    if (formulaBody instanceof HTMLElement) formulaBody.innerHTML = '';
    advisor.innerHTML = `<div class="lab-alert lab-alert--danger"><div class="lab-alert__body"><strong>${t('errInputsTitle')}:</strong><ul style="margin:0.4em 0 0 1.1em;padding:0">${errors.map((e) => `<li>${e}</li>`).join('')}</ul></div></div>`;
    verdict.className = 'lab-verdict lab-verdict--err';
    verdict.textContent = t('errInputsVerdict');
    return;
  }

  const labTierHc = document.getElementById('hcLabTier') instanceof HTMLSelectElement
    ? document.getElementById('hcLabTier').value
    : 'basic';
  const eulerFacEl = document.getElementById('hcEulerLengthFactor');
  const eulerLengthFactor = labTierHc === 'project' && eulerFacEl instanceof HTMLSelectElement
    ? Number(eulerFacEl.value) || 1.2
    : 1.2;
  let oilTempC = 50;
  if (labTierHc === 'project') {
    const ot = readLabNumber('hcOilTempC', -40, 150, 'Temperatura aceite (C)');
    if (ot.ok) oilTempC = ot.value;
  }
  const sealMaterial = document.getElementById('hcSealMaterial') instanceof HTMLSelectElement
    ? document.getElementById('hcSealMaterial').value
    : 'NBR';
  const rodsForBore = ISO_3320_RODS_BY_BORE[Math.round(boreMm)] || [Math.round(rodMm)];

  const pPa = pBar * 1e5;
  const boreM = boreMm / 1000;
  const rodM = rodMm / 1000;
  const strokeM = strokeMm / 1000;
  const portM = portDiaMm / 1000;
  let loadN = loadKgUser * G;

  const areaPiston = (Math.PI * boreM * boreM) / 4;
  const areaRod = (Math.PI * rodM * rodM) / 4;
  const areaAnn = Math.max(1e-9, areaPiston - areaRod);
  const areaRatio = areaPiston / areaAnn;

  const forcePushN = pPa * areaPiston * (mode === 'diagnostic' ? ETA_DIAG : 1);
  const forcePullN = pPa * areaAnn * (mode === 'diagnostic' ? ETA_DIAG : 1);
  if (mode === 'diagnostic') {
    loadN = Math.max(1, forcePushN * 0.7);
    if (loadInput instanceof HTMLInputElement) {
      loadInput.value = fmt((forcePushN / G), 1);
      loadInput.readOnly = true;
      loadInput.setAttribute('aria-readonly', 'true');
    }
  } else if (loadInput instanceof HTMLInputElement) {
    loadInput.readOnly = false;
    loadInput.setAttribute('aria-readonly', 'false');
  }
  const loadKg = loadN / G;
  const forceRatioPush = forcePushN / loadN;

  const qReqM3s = areaPiston * vTarget;
  const qReqLmin = qReqM3s * 60000;
  const qPumpM3s = qPumpLmin / 60000;
  const vReal = qPumpM3s / areaPiston;
  const vReturn = qPumpM3s / areaAnn;
  const qOutRetractLmin = qPumpLmin * areaRatio;
  const vPort = qReqM3s / ((Math.PI * portM * portM) / 4);

  const iRod = (Math.PI * Math.pow(rodM, 4)) / 64;
  const lEff = strokeM * eulerLengthFactor;
  const pCrN = (Math.PI * Math.PI * E_STEEL * iRod) / Math.pow(Math.max(0.05, lEff), 2);
  const fsBuckling = pCrN / loadN;

  const dInnerM = boreM;
  const tReqM = ((pPa * DESIGN_FACTOR_PRESSURE) * dInnerM) / (2 * SIGMA_ALLOW);
  const tReqMm = tReqM * 1000;
  const tRecommendedMm = nearestStandardWallAtOrAbove(Math.max(3, tReqMm));
  const fsTube = wallRealMm / Math.max(0.5, tReqMm);
  const fsStruct = Math.min(fsBuckling / 3.5, fsTube / 2.0);
  const tooThinByCode = wallRealMm < tReqMm;
  const tooThinVsStandard = wallRealMm < tRecommendedMm;
  const overThick = wallRealMm > Math.max(tRecommendedMm * 2.5, boreMm * 0.28);

  const pneuEqForce = 6e5 * areaPiston * 0.9;
  const hydraulicVsPneumatic = forcePushN / Math.max(1, pneuEqForce);

  renderCylinderDiagram(document.getElementById('hcDiagram'), strokeMm, rodMm);

  const keyMetrics = [
    metric(mode === 'diagnostic' ? 'Tonelaje real (diagnostico)' : t('mPush'), mode === 'diagnostic' ? `${fmt(forcePushN / (1000 * G), 2)} t` : `${fmt(forcePushN, 0)} N`, mode === 'diagnostic' ? `${fmt(forcePushN, 0)} N` : `${fmt(forcePushN / 1000, 1)} kN`),
    metric(t('mPull'), `${fmt(forcePullN, 0)} N`, `${fmt(forcePullN / 1000, 1)} kN`),
    metric(t('mSpeed'), `${fmt(vReal, 3)} m/s`, `Q bomba ${fmt(qPumpLmin, 1)} L/min`),
    metric(t('mArea'), `${fmt(areaRatio, 3)} x`, t('detailsSub1')),
    metric(t('mStruct'), `${fmt(fsStruct, 2)} x`, t('detailsSub2')),
  ].join('');

  const extraMetrics = [
    metric(t('mFlowReq'), `${fmt(qReqLmin, 2)} L/min`, `v = ${fmt(vTarget, 3)} m/s`),
    metric(t('mPortSpeed'), `${fmt(vPort, 2)} m/s`, `D port ${fmt(portDiaMm, 1)} mm`),
    metric(t('mQout'), `${fmt(qOutRetractLmin, 2)} L/min`, 'rod-side outlet'),
    metric(t('mEuler'), `${fmt(pCrN, 0)} N`, `FS ${fmt(fsBuckling, 2)}x`),
    metric(t('mTmin'), `${fmt(tReqMm, 2)} mm`, `real ${fmt(wallRealMm, 2)} mm`),
    metric(t('mTstd'), `${fmt(tRecommendedMm, 1)} mm`, 'std series'),
    metric(t('mFsTube'), `${fmt(fsTube, 2)} x`, 'real wall / min wall'),
    metric(t('mFsBuck'), `${fmt(fsBuckling, 2)} x`, 'Pcr / load'),
    metric(t('mVsPneu'), `${fmt(hydraulicVsPneumatic, 2)} x`, 'hydraulic / pneumatic'),
    metric(t('mCapacity'), `${fmt(forceRatioPush, 2)} x`, 'F push / load'),
  ].join('');

  results.innerHTML = `
    ${keyMetrics}
    <details class="hc-more-details">
      <summary>
        <span class="hc-more-details__title">${t('detailsTitle')}</span>
        <span class="hc-more-details__hint">${t('detailsHint')}</span>
      </summary>
      <div class="hc-more-details__body">
        <div class="lab-results">
          ${extraMetrics}
        </div>
      </div>
    </details>
  `;

  const formulaLines = LANG === 'en'
    ? [
        'Push force: F = p * A_piston with p in Pa (bar * 1e5). Pull: F = p * A_annular.',
        'Areas: A_piston = pi*D^2/4, A_rod = pi*d^2/4, A_ann = A_piston - A_rod.',
        `Flow for target speed: Q = A_piston * v_target (m3/s) => L/min = Q * 60000.`,
        `Real speed from pump: v = (Q_pump/60000) / A_piston.`,
        `Euler buckling (rod): I = pi*d^4/64, L_eff = stroke * ${fmt(eulerLengthFactor, 2)}, Pcr = pi^2*E*I/L_eff^2, FS = Pcr/F_load.`,
        'Tube (thin hoop): t_req = (p * d_inner * fd) / (2 * sigma_allow) with fd=1.5 here.',
        labTierHc === 'project' ? `Oil temperature note: ${fmt(oilTempC, 0)} C recorded for traceability (viscosity not auto-updated).` : 'Classroom mode: L_eff factor fixed at 1.2 unless project mode is selected.',
      ]
    : [
        'Fuerza avance: F = p * A_piston con p en Pa (bar * 1e5). Retorno: F = p * A_anular.',
        'Areas: A_piston = pi*D^2/4, A_vastago = pi*d^2/4, A_anular = A_piston - A_vastago.',
        `Caudal para velocidad objetivo: Q = A_piston * v (m3/s); L/min = Q * 60000.`,
        `Velocidad real con bomba: v = (Q_bomba/60000) / A_piston.`,
        `Pandeo Euler vastago: I = pi*d^4/64, L_eff = carrera * ${fmt(eulerLengthFactor, 2)}, Pcr = pi^2*E*I/L_eff^2, FS = Pcr/F_carga.`,
        'Tubo (fondo delgado): t_req = (p * d_int * fd) / (2 * sigma_adm) con fd=1.5.',
        labTierHc === 'project' ? `Nota temperatura aceite: ${fmt(oilTempC, 0)} C a efectos de trazabilidad (sin recalcular viscosidad).` : 'Modo aula: factor L_eff 1.2 salvo modo proyecto.',
      ];

  const assumptionsHc = LANG === 'en'
    ? [
        'E_steel = 210 GPa for rod buckling.',
        `Buckling uses stroke (${fmt(strokeMm, 0)} mm) * factor ${fmt(eulerLengthFactor, 2)} as unsupported length proxy.`,
        `Tube check: sigma_allow = ${fmt(SIGMA_ALLOW / 1e6, 0)} MPa nominal table value.`,
        'Does not replace ISO 6020/6022 manufacturer ratings.',
      ]
    : [
        'E acero = 210 GPa para pandeo de vastago.',
        `Pandeo: longitud libre modelada como carrera (${fmt(strokeMm, 0)} mm) * ${fmt(eulerLengthFactor, 2)}.`,
        `Tubo: sigma_adm de referencia ${fmt(SIGMA_ALLOW / 1e6, 0)} MPa en el modulo.`,
        'No sustituye catalogos ISO 6020/6022 del fabricante.',
      ];

  if (formulaBody instanceof HTMLElement) {
    formulaBody.innerHTML = `
      <p class="lab-fluid-formulas__lead">${labTierHc === 'project' ? (LANG === 'en' ? 'Project mode: adjustable Euler length factor and oil temperature note.' : 'Modo proyecto: factor de pandeo y nota de temperatura.') : (LANG === 'en' ? 'Classroom mode: standard formulas.' : 'Modo aula: formulas estandar.')}</p>
      <ol class="lab-fluid-formulas__list">${formulaLines.map((x) => `<li>${x}</li>`).join('')}</ol>
      <p class="lab-fluid-formulas__sub"><strong>${LANG === 'en' ? 'Assumptions' : 'Supuestos'}</strong></p>
      <ul class="lab-fluid-formulas__list">${assumptionsHc.map((x) => `<li>${x}</li>`).join('')}</ul>
    `;
  }

  const alerts = [];
  if (vReal > vTarget * 1.05) {
    alerts.push(`<div class="lab-alert lab-alert--warn"><div class="lab-alert__body"><strong>${t('alertSpeed')}:</strong> ${t('alertSpeedBody', { v: fmt(vTarget, 3) })}</div></div>`);
  }
  if (mode === 'diagnostic' && pBar > 250) {
    alerts.push(`<div class="lab-alert lab-alert--danger"><div class="lab-alert__body">${t('alertDiagPressure')}</div></div>`);
  }
  if (tooThinByCode) {
    alerts.push(`<div class="lab-alert lab-alert--danger"><div class="lab-alert__body"><strong>${t('alertThin')}:</strong> ${t('alertThinBody', { wr: fmt(wallRealMm, 2), tr: fmt(tReqMm, 2) })}</div></div>`);
  } else if (tooThinVsStandard) {
    alerts.push(`<div class="lab-alert lab-alert--warn"><div class="lab-alert__body"><strong>${t('alertCommercial')}:</strong> ${t('alertCommercialBody', { t: fmt(tRecommendedMm, 1) })}</div></div>`);
  } else if (overThick) {
    alerts.push(`<div class="lab-alert lab-alert--info"><div class="lab-alert__body"><strong>${t('alertThick')}:</strong> ${t('alertThickBody', { wr: fmt(wallRealMm, 1), t: fmt(tRecommendedMm, 1) })}</div></div>`);
  }
  if (vPort > 5.0) {
    alerts.push(`<div class="lab-alert lab-alert--warn"><div class="lab-alert__body"><strong>${t('alertPort')}:</strong> ${t('alertPortBody')}</div></div>`);
  }
  if (fsBuckling < 3.0) {
    alerts.push(`<div class="lab-alert lab-alert--danger"><div class="lab-alert__body"><strong>${t('alertBuckling')}:</strong> ${t('alertBucklingBody')}</div></div>`);
  }
  if (fsBuckling < 3.0) {
    const currentIdx = rodsForBore.indexOf(Math.round(rodMm));
    const reinforced = currentIdx >= 0 && currentIdx < rodsForBore.length - 1 ? rodsForBore[currentIdx + 1] : null;
    if (reinforced) {
      alerts.push(`<div class="lab-alert lab-alert--warn"><div class="lab-alert__body"><strong>${t('alertInstability')}:</strong> ${t('alertInstabilityBody', { s: fmt(strokeMm, 0), d: fmt(rodMm, 0), dr: reinforced })}</div></div>`);
    }
  }
  alerts.push(`<div class="lab-alert lab-alert--info"><div class="lab-alert__body"><strong>${t('alertArea', { r: fmt(areaRatio, 3) })}:</strong> ${t('alertAreaBody', { rr: fmt(areaRatio, 2), vr: fmt(vReturn, 3) })}</div></div>`);
  if (qOutRetractLmin > qPumpLmin * 1.25) {
    alerts.push(`<div class="lab-alert lab-alert--warn"><div class="lab-alert__body"><strong>${t('alertReturn')}:</strong> ${t('alertReturnBody', { q: fmt(qOutRetractLmin, 1) })}</div></div>`);
  }
  alerts.push(`<div class="lab-alert lab-alert--info"><div class="lab-alert__body"><strong>${t('alertCompare')}:</strong> ${t('alertCompareBody', { x: fmt(hydraulicVsPneumatic, 2) })}</div></div>`);
  if (mode === 'diagnostic') {
    alerts.push(`<div class="lab-alert lab-alert--info"><div class="lab-alert__body"><strong>Diagnostico:</strong> Con tus componentes actuales, tu factor de seguridad estructural es ${fmt(fsStruct, 2)}x.</div></div>`);
  }
  advisor.innerHTML = alerts.join('');

  if (sealInfo instanceof HTMLElement) {
    const boreTag = fmt(boreMm, 0);
    const rodTag = fmt(rodMm, 0);
    sealInfo.textContent = t('sealInfo', { b: boreTag, r: rodTag, m: sealMaterial });
  }

  const forceOk = mode === 'diagnostic' ? true : forceRatioPush >= 1.25;
  const bucklingOk = fsBuckling >= 3.5;
  const tubeOk = fsTube >= 2.0 && !tooThinByCode;
  const fsDrivenBy = fsTube <= fsBuckling ? 'tubo' : 'pandeo';

  let verdictText = t('verdictApto');
  let verdictClass = 'lab-verdict lab-verdict--ok';
  if (!forceOk || !bucklingOk || !tubeOk) {
    verdictClass = 'lab-verdict lab-verdict--err';
    const reasons = [];
    const actions = [];
    if (!forceOk) {
      reasons.push(t('reasonForce', { v: fmt(forceRatioPush, 2) }));
      actions.push(t('actionForce'));
    }
    if (!bucklingOk) {
      reasons.push(t('reasonBuck', { v: fmt(fsBuckling, 2) }));
      actions.push(t('actionBuck'));
    }
    if (!tubeOk) {
      reasons.push(t('reasonTube', { v: fmt(fsTube, 2) }));
      actions.push(t('actionTube', { t: fmt(tRecommendedMm, 1) }));
    }
    verdictText = t('verdictNo', { reasons: reasons.join('; '), actions: actions.join('; ') });
  } else if (vPort > 5.0 || fsStruct < 1.1) {
    verdictClass = 'lab-verdict lab-verdict--muted';
    verdictText = t('verdictMargin');
  }

  if (fsDrivenBy === 'tubo') {
    alerts.push(`<div class="lab-alert lab-alert--info"><div class="lab-alert__body"><strong>${t('driverTube')}:</strong> ${t('driverTubeBody', { ft: fmt(fsTube, 2), fb: fmt(fsBuckling, 2) })}</div></div>`);
  } else {
    alerts.push(`<div class="lab-alert lab-alert--info"><div class="lab-alert__body"><strong>${t('driverBuck')}:</strong> ${t('driverBuckBody')}</div></div>`);
  }
  advisor.innerHTML = alerts.join('');

  verdict.className = verdictClass;
  verdict.textContent = verdictText;

  const langPdf = getCurrentLang();
  const ts = formatDateTimeLocale(new Date(), langPdf);
  cylinderPdfSnapshot = {
    valid: true,
    title: langPdf === 'en' ? 'Report - Hydraulic cylinder' : 'Informe - Cilindro hidraulico',
    fileBase: `${langPdf === 'en' ? 'report-hydraulic-cylinder' : 'informe-cilindro-hidraulico'}-${new Date().toISOString().slice(0, 10)}`,
    timestamp: ts,
    tierLabel: labTierHc === 'project' ? (langPdf === 'en' ? 'Mode: Project' : 'Modo: Proyecto') : (langPdf === 'en' ? 'Mode: Classroom' : 'Modo: Aula'),
    kpis: [
      { title: langPdf === 'en' ? 'Push' : 'Empuje', value: `${fmt(forcePushN / 1000, 1)} kN`, subtitle: `${pBar} bar` },
      { title: langPdf === 'en' ? 'Pull' : 'Tiron', value: `${fmt(forcePullN / 1000, 1)} kN`, subtitle: 'annular' },
      { title: 'Q', value: `${fmt(qReqLmin, 1)} L/min`, subtitle: langPdf === 'en' ? 'target' : 'objetivo' },
      { title: 'FS', value: `${fmt(fsStruct, 2)}`, subtitle: langPdf === 'en' ? 'structural' : 'estructural' },
    ],
    inputRows: [
      { label: 'mode', value: mode },
      { label: 'tier', value: labTierHc },
      { label: 'p', value: `${fmt(pBar, 1)} bar` },
      { label: 'D/d', value: `${fmt(boreMm, 0)} / ${fmt(rodMm, 0)} mm` },
      { label: 'stroke', value: `${fmt(strokeMm, 0)} mm` },
      { label: 'L_eff x', value: fmt(eulerLengthFactor, 2) },
    ],
    resultRows: [
      { label: 'Pcr', value: `${fmt(pCrN, 0)} N` },
      { label: 'FS buckling', value: fmt(fsBuckling, 2) },
      { label: 't tube', value: `${fmt(tReqMm, 2)} mm` },
    ],
    formulaLines,
    assumptions: assumptionsHc,
    verdict: verdictText,
    disclaimer: langPdf === 'en'
      ? 'Educational tool. Validate with manufacturer and applicable standards.'
      : 'Herramienta educativa. Validar con fabricante y normativa.',
  };
}

function syncHcLabTierUi() {
  const tier = document.getElementById('hcLabTier') instanceof HTMLSelectElement
    ? document.getElementById('hcLabTier').value
    : 'basic';
  const panel = document.getElementById('hcProjectPanel');
  if (panel instanceof HTMLElement) panel.hidden = tier !== 'project';
}

function syncModeUi() {
  const mode = document.getElementById('hcMode') instanceof HTMLSelectElement
    ? document.getElementById('hcMode').value
    : 'design';
  const loadField = document.getElementById('hcLoadKg')?.closest('.lab-field');
  if (loadField instanceof HTMLElement) {
    loadField.classList.toggle('lab-field--auto', mode === 'diagnostic');
    const hint = loadField.querySelector('.hint');
    const help = loadField.querySelector('.lab-field-help');
    if (hint) hint.textContent = mode === 'diagnostic' ? 'Calculado automaticamente' : 'Carga mecanica externa';
    if (help) help.textContent = mode === 'diagnostic'
      ? 'En modo diagnostico se calcula como capacidad maxima del cilindro para la presion y diametro actuales.'
      : 'Se convierte a N para comparar con fuerza disponible y factor de seguridad.';
  }
}

[
  'hcPressureBar',
  'hcBoreMm',
  'hcRodMm',
  'hcStrokeMm',
  'hcLoadKg',
  'hcTargetSpeedMs',
  'hcPumpFlowLmin',
  'hcPortDiaMm',
  'hcWallMm',
  'hcSealMaterial',
  'hcMode',
  'hcLabTier',
  'hcEulerLengthFactor',
  'hcOilTempC',
].forEach((id) => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', computeAndRender);
    el.addEventListener('change', computeAndRender);
  }
});

document.getElementById('hcMode')?.addEventListener('change', () => {
  syncModeUi();
  computeAndRender();
});

document.getElementById('hcLabTier')?.addEventListener('change', () => {
  syncHcLabTierUi();
  computeAndRender();
});

document.getElementById('hcBoreMm')?.addEventListener('change', () => {
  const b = readLabNumber('hcBoreMm', 1, 1e9, '');
  setRodOptionsForBore(Math.round(b.ok ? b.value : 63));
  computeAndRender();
});

(() => {
  const b = readLabNumber('hcBoreMm', 1, 1e9, '');
  const r = readLabNumber('hcRodMm', 1, 1e9, '');
  setRodOptionsForBore(Math.round(b.ok ? b.value : 63), Math.round(r.ok ? r.value : 36));
})();
applyStaticI18n();
syncHcLabTierUi();
syncModeUi();
mountCompactLabFieldHelp();
computeAndRender();

mountLabFluidPdfExportBar(document.getElementById('labFluidPdfMountHc'), {
  getPayload: () => cylinderPdfSnapshot,
  getDiagramElements: () => {
    const svg = document.getElementById('hcDiagram');
    return svg instanceof SVGSVGElement ? [svg] : [];
  },
});
