/**
 * Página cinta inclinada — motor de cálculo detallado.
 */

import { FEATURES } from '../config/features.js';
import { isPremiumEffective } from '../services/accessTier.js';
import { computeInclinedConveyor } from '../modules/inclinedConveyor.js';
import { LOAD_DUTY_OPTIONS, LOAD_DUTY_OPTIONS_EN } from '../modules/serviceFactorByDuty.js';
import { buildInputPhaseAlerts, buildResultPhaseAlerts } from '../modules/conveyorDesignAlerts.js';
import { renderInclinedConveyorDiagram } from './diagramInclined.js';
import { renderBrandRecommendationCards, initMotorVerification } from './driveSelection.js';
import { renderFullEngineeringAside } from './engineeringReport.js';
import { mountPremiumPdfExportBar, buildInclinedPdfPayload } from '../services/reportPdfExport.js';
import { readMountingPreferences } from '../modules/mountingPreferences.js';
import { injectMountingConfigSection, MOUNTING_INPUT_IDS } from './mountingConfigSection.js';
import { openMotorsRecommendationsAndScroll } from './motorsCollapsible.js';
import { applyMachinePremiumGates } from './machinePremiumGates.js';
import { foldAllMachineDetailsOncePerPageLoad } from './machineDetailsFold.js';
import { initInfoChipPopovers } from './infoChipPopover.js';
import { getI18nLabels } from '../config/i18nLabels.js';
import { getCurrentLang } from '../config/locales.js';

const inputIds = [
  'incLength',
  'incHeight',
  'incAngle',
  'incLoadMass',
  'incBeltWidth',
  'incBeltMass',
  'incLoadDistribution',
  'incBeltSlopePart',
  'incSpeed',
  'incFriction',
  'incEfficiency',
  'incRollerD',
  'incAdditionalResistance',
  'incAccelTime',
  'incInertiaFactor',
  'incServiceFactor',
];

const selectIds = ['incDesignStandard', 'incLoadDuty'];
const PHYSICAL_LIMITS = Object.freeze({
  incLength: { min: 0.5, max: 300 },
  incHeight: { min: 0, max: 300 },
  incAngle: { min: 0, max: 89 },
  incLoadMass: { min: 0.1, max: 500000 },
  incBeltWidth: { min: 0.08, max: 5 },
  incBeltMass: { min: 0, max: 200000 },
  incLoadDistribution: { min: 0.05, max: 1 },
  incBeltSlopePart: { min: 0.3, max: 1 },
  incSpeed: { min: 0, max: 12 },
  incFriction: { min: 0.05, max: 1.2 },
  incEfficiency: { min: 1, max: 99 },
  incRollerD: { min: 50, max: 3000 },
  incAdditionalResistance: { min: 0, max: 2000000 },
  incAccelTime: { min: 0.05, max: 120 },
  incInertiaFactor: { min: 1, max: 3 },
  incServiceFactor: { min: 1, max: 4 },
});

function readNum(id, fallback) {
  const el = document.getElementById(id);
  if (!el || !(el instanceof HTMLInputElement)) return fallback;
  const n = parseFloat(String(el.value).replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

function readSelect(id, fallback) {
  const el = document.getElementById(id);
  if (!el || !(el instanceof HTMLSelectElement)) return fallback;
  const v = el.value;
  return v || fallback;
}

function readInputs() {
  const angEl = document.getElementById('incAngle');
  const angStr = angEl instanceof HTMLInputElement ? angEl.value.trim() : '';
  const ang = angStr === '' ? null : parseFloat(angStr.replace(',', '.'));
  const duty = /** @type {'uniform'|'moderate'|'heavy'|'custom'} */ (
    readSelect('incLoadDuty', 'moderate')
  );
  return {
    lang: getCurrentLang(),
    designStandard: readSelect('incDesignStandard', 'ISO5048'),
    loadDuty: duty,
    length_m: readNum('incLength', 24),
    height_m: readNum('incHeight', 4.5),
    angle_deg: Number.isFinite(/** @type {number} */ (ang)) ? ang : null,
    loadMass_kg: readNum('incLoadMass', 900),
    beltWidth_m: readNum('incBeltWidth', 0.8),
    beltMass_kg: readNum('incBeltMass', 0),
    loadDistribution: readNum('incLoadDistribution', 1),
    beltSlopeParticipation: readNum('incBeltSlopePart', 0.9),
    beltSpeed_m_s: readNum('incSpeed', 1),
    frictionCoeff: readNum('incFriction', 0.4),
    efficiency_pct: readNum('incEfficiency', 86),
    rollerDiameter_mm: readNum('incRollerD', 500),
    additionalResistance_N: readNum('incAdditionalResistance', 0),
    accelTime_s: readNum('incAccelTime', 3),
    inertiaStartingFactor: readNum('incInertiaFactor', 1.2),
    serviceFactor: readNum('incServiceFactor', 1.35),
  };
}

function syncIncLoadDutyUi() {
  const dutyEl = document.getElementById('incLoadDuty');
  const sfIn = document.getElementById('incServiceFactor');
  const hint = document.getElementById('incLoadDutyHint');
  if (!(dutyEl instanceof HTMLSelectElement) || !(sfIn instanceof HTMLInputElement)) return;

  const lang = getCurrentLang();
  const en = lang === 'en';
  LOAD_DUTY_OPTIONS.forEach((optRow) => {
    const opt = dutyEl.querySelector(`option[value="${optRow.id}"]`);
    if (opt) opt.textContent = en ? LOAD_DUTY_OPTIONS_EN[optRow.id].label : optRow.label;
  });

  const duty = dutyEl.value;
  const row = LOAD_DUTY_OPTIONS.find((o) => o.id === duty);
  if (hint && row) hint.textContent = en ? LOAD_DUTY_OPTIONS_EN[row.id].hint : row.hint;

  if (duty === 'custom') {
    sfIn.readOnly = false;
    sfIn.classList.remove('input-synced');
  } else {
    sfIn.readOnly = true;
    sfIn.classList.add('input-synced');
    if (row && row.sf != null) sfIn.value = String(row.sf);
  }
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getEls() {
  return {
    diagram: /** @type {SVGSVGElement | null} */ (document.getElementById('diagramInclined')),
    results: document.getElementById('incResultsGrid'),
    engineeringReport: document.getElementById('incEngineeringReport'),
    motorBlock: document.getElementById('incMotorBlock'),
    premiumPdfMount: document.getElementById('premiumPdfExportMount'),
    premiumOpt: document.getElementById('incPremiumOptBlock'),
    assumptions: document.getElementById('incAssumptionsList'),
    designAlerts: document.getElementById('incDesignAlerts'),
    qualityChecklist: document.getElementById('incQualityChecklist'),
  };
}

function buildQualityChecklist(raw, r, lang) {
  const en = lang === 'en';
  const checks = [];
  const d = r.detail || {};
  const gravityN = (d.F_g_load_N ?? 0) + (d.F_g_belt_N ?? 0);
  const frictionN = (d.F_mu_load_N ?? 0) + (d.F_mu_belt_N ?? 0);
  const startRatio = r.torqueAtDrum_Nm > 0 ? r.torqueStart_Nm / r.torqueAtDrum_Nm : 1;
  const specificPower = raw.loadMass_kg > 0 ? (r.requiredMotorPower_kW * 1000) / raw.loadMass_kg : 0;

  checks.push(
    r.efficiency_pct_raw > 100
      ? {
          level: 'error',
          text: en
            ? `Efficiency eta=${formatNum(r.efficiency_pct_raw, 1)}% invalid (>100). Calculation uses safe cap ${formatNum(r.efficiency_pct_effective, 1)}%.`
            : `Rendimiento η=${formatNum(r.efficiency_pct_raw, 1)} % inválido (>100). El cálculo usa límite seguro de ${formatNum(
                r.efficiency_pct_effective,
                1,
              )} %.`,
        }
      : r.efficiency_pct_effective < 70
        ? {
            level: 'warn',
            text: en
              ? `Efficiency eta=${formatNum(r.efficiency_pct_effective, 1)}% is low for motor+transmission; review mechanical losses.`
              : `Rendimiento η=${formatNum(
                  r.efficiency_pct_effective,
                  1,
                )} % bajo para conjunto motor+transmisión; revise pérdidas mecánicas.`,
          }
        : {
            level: 'info',
            text: en
              ? `Efficiency eta=${formatNum(r.efficiency_pct_effective, 1)}% in a reasonable range for pre-sizing.`
              : `Rendimiento η=${formatNum(r.efficiency_pct_effective, 1)} % dentro de rango razonable para predimensionado.`,
          },
  );

  checks.push(
    raw.frictionCoeff < 0.2 || raw.frictionCoeff > 0.65
      ? {
          level: 'warn',
          text: en
            ? `mu=${formatNum(raw.frictionCoeff, 2)} outside typical range (0.20-0.65). Verify belt/roller conditions.`
            : `μ=${formatNum(raw.frictionCoeff, 2)} fuera del rango típico (0.20–0.65). Verifique condición real de banda/rodillos.`,
        }
      : {
          level: 'info',
          text: en
            ? `mu=${formatNum(raw.frictionCoeff, 2)} in indicative range.`
            : `μ=${formatNum(raw.frictionCoeff, 2)} en rango orientativo.`,
        },
  );

  checks.push(
    startRatio > 1.45
      ? {
          level: 'warn',
          text: en
            ? `High startup peak (T_start/T_steady ~ ${formatNum(startRatio, 2)}). Consider longer ramp, VFD, or inertia tuning.`
            : `Pico de arranque alto (Tarranque/Trégimen ≈ ${formatNum(
                startRatio,
                2,
              )}). Considere rampa mayor, variador o ajuste de inercia.`,
        }
      : {
          level: 'info',
          text: en
            ? `Controlled startup ratio (T_start/T_steady ~ ${formatNum(startRatio, 2)}).`
            : `Relación de arranque controlada (Tarranque/Trégimen ≈ ${formatNum(startRatio, 2)}).`,
        },
  );

  checks.push(
    raw.loadDuty === 'custom' && raw.serviceFactor < 1.15
      ? {
          level: 'warn',
          text: en
            ? `Manual service factor low (SF=${formatNum(raw.serviceFactor, 2)}). Industrial conveyors often use >= 1.15.`
            : `Factor de servicio manual bajo (SF=${formatNum(raw.serviceFactor, 2)}). Para transporte industrial suele usarse >= 1.15.`,
        }
      : {
          level: 'info',
          text: en
            ? `Service factor applied: SF=${formatNum(r.serviceFactorUsed ?? raw.serviceFactor, 2)}.`
            : `Factor de servicio aplicado: SF=${formatNum(r.serviceFactorUsed ?? raw.serviceFactor, 2)}.`,
        },
  );

  checks.push(
    specificPower > 18
      ? {
          level: 'warn',
          text: en
            ? `High specific power (${formatNum(specificPower, 1)} W/kg load). Review geometry, mu, and safety margin.`
            : `Potencia específica elevada (${formatNum(
                specificPower,
                1,
              )} W/kg de carga). Revise geometría, μ y sobredimensionado de seguridad.`,
        }
      : {
          level: 'info',
          text: en
            ? `Specific power in a typical belt range (${formatNum(specificPower, 1)} W/kg load).`
            : `Potencia específica en banda normal (${formatNum(specificPower, 1)} W/kg de carga).`,
        },
  );

  checks.push(
    gravityN > frictionN
      ? {
          level: 'info',
          text: en
            ? `Gravity dominates resistance (${formatNum(gravityN, 0)} N > ${formatNum(frictionN, 0)} N).`
            : `Predomina gravedad en la resistencia (${formatNum(gravityN, 0)} N > ${formatNum(
                frictionN,
                0,
              )} N).`,
        }
      : {
          level: 'info',
          text: en
            ? `Friction dominates resistance (${formatNum(frictionN, 0)} N >= ${formatNum(gravityN, 0)} N).`
            : `Predomina rozamiento en la resistencia (${formatNum(frictionN, 0)} N >= ${formatNum(
                gravityN,
                0,
              )} N).`,
        },
  );

  return checks;
}

function getDriveRequirements() {
  const r = computeInclinedConveyor(readInputs());
  return {
    power_kW: r.requiredMotorPower_kW,
    torque_Nm: r.torqueWithService_Nm,
    drum_rpm: r.drumRpm,
    ...readMountingPreferences(),
  };
}

function formatNum(x, d = 2) {
  if (!Number.isFinite(x)) return '—';
  return x.toFixed(d);
}

function formatMounting(pref) {
  const en = getCurrentLang() === 'en';
  const typeMap = en
    ? { B3: 'B3 foot', B5: 'B5 flange', B14: 'B14 flange', hollowShaft: 'Hollow shaft' }
    : { B3: 'B3 patas', B5: 'B5 brida', B14: 'B14 brida', hollowShaft: 'Eje hueco' };
  return `${typeMap[pref.mountingType] || pref.mountingType} · ${pref.orientation === 'vertical' ? 'Vertical' : 'Horizontal'}`;
}

function clampNum(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

function applyPhysicalLimitsToInputs() {
  Object.entries(PHYSICAL_LIMITS).forEach(([id, lim]) => {
    const el = document.getElementById(id);
    if (!(el instanceof HTMLInputElement)) return;
    el.min = String(lim.min);
    el.max = String(lim.max);
  });
}

function normalizePhysicalInputs() {
  let changed = false;
  Object.entries(PHYSICAL_LIMITS).forEach(([id, lim]) => {
    const el = document.getElementById(id);
    if (!(el instanceof HTMLInputElement)) return;
    const raw = parseFloat(String(el.value).replace(',', '.'));
    if (!Number.isFinite(raw)) return;
    const v = clampNum(raw, lim.min, lim.max);
    if (v !== raw) {
      el.value = String(v);
      changed = true;
      const rEl = document.getElementById(`${id}R`);
      if (rEl instanceof HTMLInputElement) rEl.value = String(v);
    }
  });

  const lenEl = document.getElementById('incLength');
  const hEl = document.getElementById('incHeight');
  if (lenEl instanceof HTMLInputElement && hEl instanceof HTMLInputElement) {
    const L = parseFloat(String(lenEl.value).replace(',', '.'));
    const H = parseFloat(String(hEl.value).replace(',', '.'));
    if (Number.isFinite(L) && Number.isFinite(H) && H > L) {
      hEl.value = String(L);
      const hr = document.getElementById('incHeightR');
      if (hr instanceof HTMLInputElement) hr.value = String(L);
      changed = true;
    }
  }
  return changed;
}

function bindIncRangeSlider(rangeId, numId, lo, hi, step = null) {
  const range = document.getElementById(rangeId);
  const num = document.getElementById(numId);
  if (!(range instanceof HTMLInputElement) || !(num instanceof HTMLInputElement)) return;

  const snap = (v) => {
    let x = clampNum(v, lo, hi);
    if (step != null && step > 0) x = Math.round(x / step) * step;
    return x;
  };

  const syncRangeFromNum = () => {
    const v = snap(parseFloat(String(num.value).replace(',', '.')) || lo);
    num.value = String(v);
    range.value = String(v);
  };

  const pushFromRange = () => {
    num.value = range.value;
    refresh();
  };

  range.addEventListener('input', pushFromRange);
  num.addEventListener('input', () => {
    syncRangeFromNum();
  });
  num.addEventListener('change', () => {
    syncRangeFromNum();
    refresh();
  });
  syncRangeFromNum();
}

function showRuntimeError(msg) {
  const box = document.getElementById('runtimeError');
  if (!box) return;
  box.hidden = false;
  box.textContent = msg;
}

function clearRuntimeError() {
  const box = document.getElementById('runtimeError');
  if (!box) return;
  box.hidden = true;
  box.textContent = '';
}

function localizeInclinedStaticContent() {
  const lang = getCurrentLang();
  if (lang !== 'en') return;
  document.documentElement.lang = 'en';
  document.title = 'Inclined Conveyor - MechAssist';
  const setText = (selector, text) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
  };
  const setHtml = (selector, html) => {
    const el = document.querySelector(selector);
    if (el) el.innerHTML = html;
  };
  setText('.app-header nav a[href="index.html"]', 'Home');
  setText('.app-header nav a[href="flat-conveyor.html"]', 'Flat Conveyor');
  setText('.app-header nav a[href="inclined-conveyor.html"]', 'Inclined Conveyor');
  setText('.app-header nav a[href="centrifugal-pump.html"]', 'Pump');
  setText('.app-header nav a[href="screw-conveyor.html"]', 'Screw Conveyor');
  setText('.flat-sidebar__title', 'Inclined conveyor');
  setText(
    '.flat-sidebar__lead',
    'Slope, friction and lift. Values recalculate instantly; the right panel shows the dashboard, schematic and gearmotors.',
  );
  setText('.help-details.flat-help > summary', 'Quick guide');
  setHtml(
    '.help-details.flat-help .help-details__body',
    `<p class="help-details__lead muted">
      Almost every label has a <span class="info-chip info-chip--static" aria-hidden="true">?</span>: on desktop hover; on touch <strong>tap</strong> for help.
    </p>
    <ul>
      <li><strong>L</strong>: length along slope; <strong>H</strong>: lift. If theta is empty, theta = arcsin(H/L).</li>
      <li>If you enter <strong>theta</strong>, it overrides H in the angle calculation.</li>
      <li>Resistance combines slope weight and friction; P and T at the drum follow.</li>
      <li><strong>Standard</strong>: ISO/DIN or CEMA (+6% on steady traction only, not the acceleration term).</li>
      <li><strong>Service factor</strong>: set by load duty; use Custom for a manual SF.</li>
    </ul>`,
  );
  setText('.flat-accordion:nth-of-type(1) .flat-accordion__label', 'Standard and service factor');
  setText('.flat-accordion:nth-of-type(2) .flat-accordion__label', 'Geometry and kinematics');
  setText('.flat-accordion:nth-of-type(3) .flat-accordion__label', 'Load');
  setText('.flat-accordion:nth-of-type(4) .flat-accordion__label', 'Friction and efficiency');
  const isoOpt = document.querySelector('#incDesignStandard option[value="ISO5048"]');
  const cemaOpt = document.querySelector('#incDesignStandard option[value="CEMA"]');
  if (isoOpt) isoOpt.textContent = 'ISO 5048 / DIN 22101 - analytic approach';
  if (cemaOpt) cemaOpt.textContent = 'CEMA - +6% margin on steady traction';
  setText('#btnCalcularInc', 'View suggested gearmotors');
  setText('.flat-dashboard__title', 'Sizing dashboard');
  setHtml(
    '.flat-dashboard__lead',
    'Design torque = max(steady, startup) x SF. Power <strong>(T<sub>design</sub> x omega) / eta</strong>. <a href="#inclined-conveyor-assumptions">Assumptions</a>.',
  );
  setText('.diagram-schematic-note', 'Schematic: forces along slope; qualitative drawing.');
  setHtml(
    '#incVerifyPanel h2',
    '<span class="panel-icon">\u2713</span> Check a gearmotor I already have',
  );
  setText('#incVerifyPanel .panel-lead', 'Use the sample catalog or manual entry; validation uses the same duty point as final results.');
  setText('[for="incVerifyBrand"]', 'Brand');
  setText('[for="incVerifySearch"]', 'Filter model');
  setText('[for="incVerifyModel"]', 'Catalog model');
  setText('[data-verify-run]', 'Check for this machine');
  setText('#section-motores .motors-details__title', 'Gearmotors (sample catalog)');
  setText('#section-motores .motors-details__hint', 'Recommendations, export, verification');
  setText('#inclined-conveyor-assumptions .motors-details__title', 'Model assumptions');
  setText('#inclined-conveyor-assumptions .motors-details__hint', 'Assumptions and limits');
  const pdfSection = document.querySelector('#premiumPdfExportMount')?.closest('section.panel');
  const pdfH2 = pdfSection?.querySelector('h2');
  if (pdfH2) pdfH2.innerHTML = '<span class="panel-icon">PDF</span> Export report';
  if (location.protocol === 'file:') {
    const fpw = document.getElementById('fileProtoWarn');
    if (fpw) {
      fpw.textContent =
        'Recommendation: use a local HTTP server (npx --yes serve .). With file:// the browser may block JS modules and hide diagrams and results.';
    }
  }
  const eng = document.querySelector('#incEngineeringReport')?.closest('.panel');
  if (eng) {
    const t = eng.querySelector('.motors-details__title');
    const h = eng.querySelector('.motors-details__hint');
    const lead = eng.querySelector('.panel-lead');
    if (t) t.textContent = 'Engineering breakdown';
    if (h) h.textContent = 'Expand for intermediate calculations and rationale';
    if (lead) lead.textContent = 'Gearbox, motor strategies, and step-by-step detail.';
  }
}

function refresh() {
  const LBL = getI18nLabels();
  const lang = getCurrentLang();
  const en = lang === 'en';
  const TX = en
    ? {
        cannotCalcPower: 'Cannot calculate motor power: check eta (1-99%) in the calculation.',
        normativeMargin: 'Normative margin (steady)',
        withSf: 'With service factor applied',
        motorPower: 'Motor power',
        sizingHint: '(T x omega) / eta - sizing',
        slopeSpeed: 'Slope / speed',
        drumRpmHint: 'drum',
        serviceFactor: 'Service factor',
        mountingType: 'Mounting type',
        beltDrumSpeed: 'Belt / drum speed',
        mechanicalDetails: 'Mechanical details',
        fullResult: 'Full result',
        fullResultHint: 'Forces, partial powers and extended metrics',
        slopeAngle: 'Slope angle',
        steadyForceDrum: 'Steady force (drum)',
        peakStartup: 'Peak startup force',
        weightOnSlope: 'Weight on slope (load+belt)',
        frictionLoadBelt: 'Friction (load+belt)',
        torqueSteadyStart: 'Steady / startup torque',
        motorPowerSteadyPeak: 'Motor power steady / peak',
        engineeringError: 'Report error:',
        gearmotorPrefix: 'Gearmotors:',
        fileProto: 'Use an HTTP server if opening via file://.',
        machineDiagram: 'Machine diagram',
        premiumOptTitle: 'Optimization (Premium)',
        premiumOptDesc: 'Brake / backstop: reserved.',
        checklistLead: (ok, w, b) =>
          `<strong>Quick technical checklist</strong> - ${ok} OK - ${w} warnings - ${b} critical`,
        calcError: 'Calculation error:',
        calcErrorSuffix: 'Use HTTP server if file://. See F12 console.',
      }
    : {
        cannotCalcPower: 'No se puede calcular la potencia de motor: revise η (1–99 % en el cálculo).',
        normativeMargin: 'Margen normativo (régimen)',
        withSf: 'Con factor de servicio aplicado',
        motorPower: 'Potencia motor',
        sizingHint: '(T×ω)/η · dimensionamiento',
        slopeSpeed: 'Pendiente / velocidad',
        drumRpmHint: 'tambor',
        serviceFactor: 'Factor de servicio',
        mountingType: 'Tipo de montaje',
        beltDrumSpeed: 'Velocidad cinta / tambor',
        mechanicalDetails: 'Detalles mecánicos',
        fullResult: 'Resultado completo',
        fullResultHint: 'Fuerzas, potencias parciales y métricas extendidas',
        slopeAngle: 'Ángulo de pendiente',
        steadyForceDrum: 'Fuerza régimen (tambor)',
        peakStartup: 'Fuerza arranque (pico)',
        weightOnSlope: 'Peso en pendiente (carga+banda)',
        frictionLoadBelt: 'Rozamiento (carga+banda)',
        torqueSteadyStart: 'Par régimen / arranque',
        motorPowerSteadyPeak: 'Potencia motor régimen / pico',
        engineeringError: 'Error informe:',
        gearmotorPrefix: 'Motorreductores:',
        fileProto: 'Use servidor HTTP si abre con file://.',
        machineDiagram: 'Diagrama de la máquina',
        premiumOptTitle: 'Optimización (premium)',
        premiumOptDesc: 'Freno / anti-retorno: reservado.',
        checklistLead: (ok, w, b) =>
          `<strong>Checklist técnica rápida</strong> · ${ok} OK · ${w} avisos · ${b} críticos`,
        calcError: 'Error al calcular:',
        calcErrorSuffix: 'Use servidor HTTP si abre con file://. Consola F12 para más detalle.',
      };
  const els = getEls();
  try {
    clearRuntimeError();
    normalizePhysicalInputs();
    const raw = readInputs();
    const r = computeInclinedConveyor(raw);
    const d = r.detail || {};
    const liftForDiagram_m = raw.length_m * Math.sin(r.angle_rad);

    const effIn = document.getElementById('incEfficiency');
    if (effIn instanceof HTMLInputElement) {
      effIn.classList.toggle('field-input--danger', (r.efficiency_pct_raw ?? 0) > 100);
    }

    if (els.designAlerts) {
      const sfUsed = r.serviceFactorUsed ?? readNum('incServiceFactor', 1);
      const inputAlerts = buildInputPhaseAlerts({
        efficiency_pct_raw: r.efficiency_pct_raw ?? raw.efficiency_pct,
        efficiency_pct_used: r.efficiency_pct_effective ?? 86,
        serviceFactor: sfUsed,
        loadDuty: raw.loadDuty,
        serviceFactorFieldRaw: raw.loadDuty === 'custom' ? raw.serviceFactor : undefined,
        rollerDiameter_mm: raw.rollerDiameter_mm,
      });
      const resultAlerts = buildResultPhaseAlerts({
        rollerDiameter_mm: raw.rollerDiameter_mm,
        powerMotor_kW: r.requiredMotorPower_kW,
        torqueDesign_Nm: r.torqueWithService_Nm,
        beltWidth_m: raw.beltWidth_m,
      });
      const nanAlert = !Number.isFinite(r.requiredMotorPower_kW)
        ? [
            {
              level: /** @type {const} */ ('error'),
              text: TX.cannotCalcPower,
            },
          ]
        : [];
      const all = [...inputAlerts, ...nanAlert, ...resultAlerts];
      els.designAlerts.innerHTML = all
        .map((a) => `<p class="design-alert design-alert--${a.level}">${escHtml(a.text)}</p>`)
        .join('');
    }

    if (els.diagram) {
      renderInclinedConveyorDiagram(els.diagram, {
        lang,
        length_m: raw.length_m,
        height_m: liftForDiagram_m,
        angle_rad: r.angle_rad,
        beltSpeed_m_s: raw.beltSpeed_m_s,
        loadMass_kg: raw.loadMass_kg,
        frictionCoeff: raw.frictionCoeff,
        totalForce_N: r.totalForce_N,
        gravityForce_N: r.gravityForce_N,
        frictionForce_N: r.frictionForce_N,
        powerAtDrum_W: r.powerAtDrum_W,
        torqueAtDrum_Nm: r.torqueAtDrum_Nm,
        detail: Object.keys(d).length ? d : undefined,
      });
    }

    if (els.results) {
      const mount = readMountingPreferences();
      const mechanicalSummary = [
        en ? `Slope ${formatNum(r.angle_deg, 2)} deg` : `Pendiente ${formatNum(r.angle_deg, 2)}°`,
        en ? `Drum ${formatNum(raw.rollerDiameter_mm, 2)} mm` : `Tambor ${formatNum(raw.rollerDiameter_mm, 2)} mm`,
        mount.machineShaftDiameter_mm != null
          ? `${en ? 'shaft' : 'eje'} ${formatNum(mount.machineShaftDiameter_mm, 2)} mm`
          : null,
      ]
        .filter(Boolean)
        .join(' · ');
      const normaRow =
        r.steadyStandardMultiplier > 1
          ? `<div class="metric"><div class="label">${TX.normativeMargin}</div><div class="value">×${formatNum(r.steadyStandardMultiplier, 2)} (${r.designStandard})</div></div>`
          : '';
      const vLine = `${formatNum(raw.beltSpeed_m_s, 2)} m/s · ${formatNum(r.drumRpm, 2)} rpm`;
      els.results.innerHTML = `
    <div class="flat-kpi-row" role="group" aria-label="${LBL.resultsMain}">
      <article class="flat-kpi flat-kpi--torque">
        <span class="flat-kpi__eyebrow">${LBL.designTorque} · ${en ? 'drum' : 'tambor'}</span>
        <p class="flat-kpi__value">${formatNum(r.torqueWithService_Nm, 2)}<span class="flat-kpi__unit">N·m</span></p>
        <p class="flat-kpi__hint">${TX.withSf}</p>
      </article>
      <article class="flat-kpi flat-kpi--power">
        <span class="flat-kpi__eyebrow">${TX.motorPower}</span>
        <p class="flat-kpi__value">${formatNum(r.requiredMotorPower_kW, 2)}<span class="flat-kpi__unit">kW</span></p>
        <p class="flat-kpi__hint">${TX.sizingHint}</p>
      </article>
      <article class="flat-kpi flat-kpi--speed">
        <span class="flat-kpi__eyebrow">${TX.slopeSpeed}</span>
        <p class="flat-kpi__value">${formatNum(r.angle_deg, 2)}<span class="flat-kpi__unit">°</span></p>
        <p class="flat-kpi__hint">${vLine} · ${TX.drumRpmHint}</p>
      </article>
    </div>
    <div class="result-focus-grid flat-kpi-secondary">
      <div class="metric"><div class="label">${TX.serviceFactor}</div><div class="value">${formatNum(r.serviceFactorUsed ?? raw.serviceFactor, 2)}</div></div>
      <div class="metric metric--text"><div class="label">${TX.mountingType}</div><div class="value">${formatMounting(mount)}</div></div>
      <div class="metric metric--text"><div class="label">${TX.beltDrumSpeed}</div><div class="value">${vLine}</div></div>
      <div class="metric metric--text"><div class="label">${TX.mechanicalDetails}</div><div class="value">${mechanicalSummary || '—'}</div></div>
    </div>
    <details class="motors-details result-focus-extra">
      <summary class="motors-details__summary">
        <span class="motors-details__summary-main">
          <span class="panel-icon">≡</span>
          <span class="motors-details__text">
            <span class="motors-details__title">${TX.fullResult}</span>
            <span class="motors-details__hint">${TX.fullResultHint}</span>
          </span>
        </span>
      </summary>
      <div class="motors-details__body">
        <div class="results-grid">
          ${normaRow}
          <div class="metric"><div class="label">${TX.slopeAngle}</div><div class="value">${formatNum(r.angle_deg, 2)}°</div></div>
          <div class="metric"><div class="label">${TX.steadyForceDrum}</div><div class="value">${formatNum(d.F_steady_N, 0)} N</div></div>
          <div class="metric"><div class="label">${TX.peakStartup}</div><div class="value">${formatNum(d.F_total_start_N, 0)} N</div></div>
          <div class="metric"><div class="label">${TX.weightOnSlope}</div><div class="value">${formatNum((d.F_g_load_N ?? 0) + (d.F_g_belt_N ?? 0), 0)} N</div></div>
          <div class="metric"><div class="label">${TX.frictionLoadBelt}</div><div class="value">${formatNum((d.F_mu_load_N ?? 0) + (d.F_mu_belt_N ?? 0), 0)} N</div></div>
          <div class="metric"><div class="label">${TX.torqueSteadyStart}</div><div class="value">${formatNum(r.torqueAtDrum_Nm, 1)} / ${formatNum(r.torqueStart_Nm, 1)} N·m</div></div>
          <div class="metric"><div class="label">${LBL.massFlow}</div><div class="value">${formatNum(r.massFlow_kg_s, 3)} kg/s</div></div>
          <div class="metric"><div class="label">${TX.motorPowerSteadyPeak}</div><div class="value">${formatNum((d.powerMotorRun_W ?? 0) / 1000, 3)} / ${formatNum((d.powerMotorStart_W ?? 0) / 1000, 3)} kW</div></div>
        </div>
      </div>
    </details>
  `;
    }

    if (els.qualityChecklist) {
      const checks = buildQualityChecklist(raw, r, lang);
      const bad = checks.filter((c) => c.level === 'error').length;
      const warn = checks.filter((c) => c.level === 'warn').length;
      const ok = checks.length - bad - warn;
      els.qualityChecklist.innerHTML = `
        <p class="muted" style="margin:0 0 0.5rem;font-size:0.83rem">${TX.checklistLead(ok, warn, bad)}</p>
        ${checks.map((c) => `<p class="design-alert design-alert--${c.level}">${escHtml(c.text)}</p>`).join('')}
      `;
    }

    if (els.engineeringReport) {
      try {
        els.engineeringReport.innerHTML = renderFullEngineeringAside(r, { lang });
      } catch (err) {
        console.error(err);
        els.engineeringReport.innerHTML = `<div class="motor-error">${TX.engineeringError} ${String(err.message || err)}</div>`;
      }
    }

    if (els.motorBlock) {
      try {
        els.motorBlock.innerHTML = renderBrandRecommendationCards(getDriveRequirements());
      } catch (err) {
        console.error(err);
        els.motorBlock.innerHTML = `<div class="motor-error">${TX.gearmotorPrefix} ${String(err.message || err)}. ${TX.fileProto}</div>`;
      }
    }

    if (els.premiumPdfMount) {
      mountPremiumPdfExportBar(els.premiumPdfMount, {
        isPremium: isPremiumEffective(),
        getPayload: () => buildInclinedPdfPayload(raw, r),
        getDiagramElement: () => els.diagram,
        diagramTitle: TX.machineDiagram,
      });
    }

    if (els.assumptions) {
      els.assumptions.innerHTML = (r.assumptions || []).map((a) => `<li>${a}</li>`).join('');
    }

    if (els.premiumOpt) {
      if (isPremiumEffective() && FEATURES.safetyOptimization) {
        els.premiumOpt.innerHTML = `
      <section class="panel">
        <h2><span class="panel-icon">★</span> ${TX.premiumOptTitle}</h2>
        <p class="muted" style="margin:0">${TX.premiumOptDesc}</p>
      </section>
    `;
      } else {
        els.premiumOpt.innerHTML = '';
      }
    }

    applyMachinePremiumGates();
    foldAllMachineDetailsOncePerPageLoad();
  } catch (err) {
    console.error(err);
    showRuntimeError(`${TX.calcError} ${String(err.message || err)}. ${TX.calcErrorSuffix}`);
  }
}

inputIds.forEach((id) => {
  const el = document.getElementById(id);
  if (el instanceof HTMLInputElement) {
    el.addEventListener('input', refresh);
    el.addEventListener('change', refresh);
  }
});

selectIds.forEach((id) => {
  const el = document.getElementById(id);
  if (el instanceof HTMLSelectElement) {
    el.addEventListener('change', () => {
      syncIncLoadDutyUi();
      refresh();
    });
  }
});

try {
  initMotorVerification(document.getElementById('incVerifyPanel'), getDriveRequirements);
} catch (e) {
  console.error(e);
}

document.getElementById('btnCalcularInc')?.addEventListener('click', () => {
  refresh();
  openMotorsRecommendationsAndScroll('section-motores');
});

document.querySelectorAll('[data-friction-preset-for]').forEach((wrap) => {
  const id = wrap.getAttribute('data-friction-preset-for');
  if (!id) return;
  wrap.querySelectorAll('button[data-mu]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const el = document.getElementById(id);
      const mu = btn.getAttribute('data-mu');
      if (el instanceof HTMLInputElement && mu) {
        el.value = mu;
        const rId = `${id}R`;
        const rEl = document.getElementById(rId);
        if (rEl instanceof HTMLInputElement) rEl.value = mu;
        refresh();
      }
    });
  });
});

injectMountingConfigSection();
MOUNTING_INPUT_IDS.forEach((id) => {
  document.getElementById(id)?.addEventListener('input', refresh);
  document.getElementById(id)?.addEventListener('change', refresh);
});

applyPhysicalLimitsToInputs();
syncIncLoadDutyUi();
localizeInclinedStaticContent();
initInfoChipPopovers(document.body);

bindIncRangeSlider('incLengthR', 'incLength', 2, 120, 0.1);
bindIncRangeSlider('incHeightR', 'incHeight', 0, 40, 0.05);
bindIncRangeSlider('incLoadMassR', 'incLoadMass', 10, 8000, 1);
bindIncRangeSlider('incSpeedR', 'incSpeed', 0.05, 5, 0.01);
bindIncRangeSlider('incRollerDR', 'incRollerD', 50, 1200, 1);
bindIncRangeSlider('incFrictionR', 'incFriction', 0.15, 0.65, 0.01);

refresh();



