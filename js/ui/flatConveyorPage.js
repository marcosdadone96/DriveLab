/**
 * Página cinta plana — motor de cálculo detallado + informe de ingeniería.
 */

import { FEATURES } from '../config/features.js';
import { isPremiumEffective } from '../services/accessTier.js';
import { computeFlatConveyor } from '../modules/flatConveyor.js';
import { LOAD_DUTY_OPTIONS, LOAD_DUTY_OPTIONS_EN } from '../modules/serviceFactorByDuty.js';
import { buildInputPhaseAlerts, buildResultPhaseAlerts } from '../modules/conveyorDesignAlerts.js';
import { renderFlatConveyorDiagram } from './diagramFlat.js';
import { initInfoChipPopovers } from './infoChipPopover.js';
import { renderBrandRecommendationCards, initMotorVerification } from './driveSelection.js';
import { renderFullEngineeringAside } from './engineeringReport.js';
import { mountPremiumPdfExportBar, buildFlatPdfPayload } from '../services/reportPdfExport.js';
import { readMountingPreferences } from '../modules/mountingPreferences.js';
import { injectMountingConfigSection, MOUNTING_INPUT_IDS } from './mountingConfigSection.js';
import { openMotorsRecommendationsAndScroll } from './motorsCollapsible.js';
import { applyMachinePremiumGates } from './machinePremiumGates.js';
import { foldAllMachineDetailsOncePerPageLoad } from './machineDetailsFold.js';
import { getI18nLabels } from '../config/i18nLabels.js';
import { getCurrentLang } from '../config/locales.js';

const inputIds = [
  'beltLength',
  'loadMass',
  'beltWidth',
  'beltMass',
  'loadDistribution',
  'beltCarryFraction',
  'beltSpeed',
  'friction',
  'efficiency',
  'rollerD',
  'additionalResistance',
  'accelTime',
  'inertiaFactor',
  'serviceFactor',
];

const selectIds = ['designStandard', 'loadDuty', 'carrySurface'];

/** Lectura segura: si falta un input en el HTML no rompe todo el cálculo. */
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
  const duty = /** @type {'uniform'|'moderate'|'heavy'|'custom'} */ (
    readSelect('loadDuty', 'moderate')
  );
  return {
    lang: getCurrentLang(),
    designStandard: readSelect('designStandard', 'ISO5048'),
    loadDuty: duty,
    carrySurface: readSelect('carrySurface', 'rollers'),
    beltLength_m: readNum('beltLength', 30),
    beltWidth_m: readNum('beltWidth', 0.8),
    loadMass_kg: readNum('loadMass', 800),
    beltMass_kg: readNum('beltMass', 0),
    loadDistribution: readNum('loadDistribution', 1),
    beltCarryFraction: readNum('beltCarryFraction', 0.5),
    beltSpeed_m_s: readNum('beltSpeed', 1.25),
    frictionCoeff: readNum('friction', 0.35),
    efficiency_pct: readNum('efficiency', 88),
    rollerDiameter_mm: readNum('rollerD', 500),
    additionalResistance_N: readNum('additionalResistance', 0),
    accelTime_s: readNum('accelTime', 3),
    inertiaStartingFactor: readNum('inertiaFactor', 1.15),
    serviceFactor: readNum('serviceFactor', 1.35),
  };
}

function syncLoadDutyUi() {
  const dutyEl = document.getElementById('loadDuty');
  const sfIn = document.getElementById('serviceFactor');
  const hint = document.getElementById('loadDutyHint');
  if (!(dutyEl instanceof HTMLSelectElement) || !(sfIn instanceof HTMLInputElement)) return;

  const lang = getCurrentLang();
  const en = lang === 'en';
  LOAD_DUTY_OPTIONS.forEach((optRow) => {
    const opt = dutyEl.querySelector(`option[value="${optRow.id}"]`);
    if (opt) {
      opt.textContent = en ? LOAD_DUTY_OPTIONS_EN[optRow.id].label : optRow.label;
    }
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
    diagram: /** @type {SVGSVGElement | null} */ (document.getElementById('diagramFlat')),
    results: document.getElementById('resultsGrid'),
    engineeringReport: document.getElementById('engineeringReport'),
    motorBlock: document.getElementById('motorBlock'),
    premiumPdfMount: document.getElementById('premiumPdfExportMount'),
    premiumOpt: document.getElementById('premiumOptBlock'),
    assumptions: document.getElementById('assumptionsList'),
    runtimeError: document.getElementById('runtimeError'),
    designAlerts: document.getElementById('designAlerts'),
  };
}

function getDriveRequirements() {
  const r = computeFlatConveyor(readInputs());
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
  const ori = pref.orientation === 'vertical' ? 'Vertical' : 'Horizontal';
  return `${typeMap[pref.mountingType] || pref.mountingType} \u00b7 ${ori}`;
}

function clampNum(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

/** Resalta L, D, F, v, μ en el SVG al pasar el ratón (delegación: el objetivo suele ser texto/línea hijo). */
function initFlatDiagramMetricHover(svg) {
  if (!(svg instanceof SVGSVGElement)) return;
  let active = /** @type {string | null} */ (null);
  const setMetric = (m) => {
    if (m === active) return;
    svg.querySelectorAll('.diagram-metric--hover').forEach((el) => el.classList.remove('diagram-metric--hover'));
    active = m;
    if (m) svg.querySelectorAll(`[data-diagram-metric="${m}"]`).forEach((el) => el.classList.add('diagram-metric--hover'));
  };
  svg.addEventListener('mousemove', (e) => {
    const hit = e.target && /** @type {Element} */ (e.target).closest?.('[data-diagram-metric]');
    const m = hit?.getAttribute('data-diagram-metric') ?? null;
    setMetric(m);
  });
  svg.addEventListener('mouseleave', () => setMetric(null));
}

function bindFlatRangeSlider(rangeId, numId, lo, hi, step = null) {
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

function localizeFlatStaticContent() {
  const lang = getCurrentLang();
  if (lang !== 'en') return;
  document.documentElement.lang = 'en';
  document.title = 'Flat Conveyor - MechAssist';
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
  setText('.flat-sidebar__title', 'Flat Conveyor');
  setText(
    '.flat-sidebar__lead',
    'Consistent torque and power at the drive drum. Data updates instantly; use the right panel for the schematic and result dashboard.',
  );
  setText('.help-details.flat-help > summary', 'Quick Guide for Each Parameter');
  setText('.flat-accordion:nth-of-type(1) .flat-accordion__label', 'Geometry and Kinematics');
  setText('.flat-accordion:nth-of-type(2) .flat-accordion__label', 'Load');
  setText('.flat-accordion:nth-of-type(3) .flat-accordion__label', 'Friction and Efficiency');
  setText('.flat-accordion:nth-of-type(4) .flat-accordion__label', 'Standard and Service Factor');
  setText('.adv-details > summary', 'Advanced Options - Belt, Load, Startup, and Extras');
  setText('#btnCalcular', 'View Suggested Gearmotors');
  setText('.flat-calc-hint', 'Results and diagram update automatically. This button expands suggested gearmotors.');
  setText('.flat-dashboard__title', 'Sizing Dashboard');
  setHtml(
    '.flat-dashboard__lead',
    'Design Torque = max(steady, startup) x SF. Power <strong>(T<sub>design</sub> x omega) / eta</strong>. <a href="#flat-conveyor-assumptions">Assumptions</a> · hover <strong>L, D, F, v</strong> in the schematic.',
  );
  setText('.diagram-schematic-note', 'Quick read: top row compares steady-state (without SF) versus design (with SF and eta). Over the carrying strand, L and D match your form inputs; the drawing is qualitative. Bottom boxes repeat steady-state values (left) and motor sizing values (right), aligned with Final Results.');
  setText('.diagram-duo__real figcaption', 'Reference: real conveyor installation (example).');
  setHtml(
    '#verifyPanel h2',
    '<span class="panel-icon">\u2713</span> Check a gearmotor I already have',
  );
  setText(
    '#verifyPanel .panel-lead',
    'Two methods: (1) pick brand/model from the sample catalog and click "Check for this machine". (2) If your unit is not listed, open manual entry, fill nameplate/spec data and click "Check with these values". Both methods validate motor power, output torque, and output rpm against the computed duty point.',
  );
  setText('[for="verifyBrand"]', 'Brand');
  setText('[for="verifySearch"]', 'Filter model');
  setText('[for="verifyModel"]', 'Catalog Model');
  setText('[data-verify-run]', 'Check for this machine');
  setText('#section-motores .motors-details__title', 'Gearmotors (SEW-Eurodrive, Siemens Simogear, Nord, Bonfiglioli, Motovario)');
  setText('#flat-conveyor-assumptions .motors-details__title', 'Model Assumptions');
  const pdfSection = document.querySelector('#premiumPdfExportMount')?.closest('section.panel');
  const pdfH2 = pdfSection?.querySelector('h2');
  if (pdfH2) {
    pdfH2.innerHTML = '<span class="panel-icon">PDF</span> Export report';
  }

  if (location.protocol === 'file:') {
    const fpw = document.getElementById('fileProtoWarn');
    if (fpw) {
      fpw.textContent =
        'Recommendation: use a local HTTP server (from the project folder run npx --yes serve . and open the URL shown, e.g. http://localhost:3000). Opening the HTML file directly may block JavaScript and hide results and diagrams.';
    }
  }

  setHtml(
    '.help-details.flat-help .help-details__body',
    `<p class="help-details__lead muted">
      Almost every label has a <span class="info-chip info-chip--static" aria-hidden="true">?</span>: on desktop, hover; on touch, <strong>tap</strong> the same symbol to read help without lengthening the form.
    </p>
    <ul>
      <li><strong>L</strong>: length of the <strong>loaded run</strong> the model uses to spread nominal mass (mass flow \u2248 (m/L)\u00b7v). It need not match total belt length on site.</li>
      <li><strong>m</strong>: nominal load mass associated with that run L (uniform spread model).</li>
      <li>
        <strong>v, D, \u03bc, \u03b7</strong>: speed, drive drum diameter, equivalent friction, and efficiency <strong>from motor to drum</strong> (one chain; typically 85\u201392% if it lumps motor+gearbox+coupling).
      </li>
      <li>
        <strong>Standard</strong>: declared framework in reports \u2014 <strong>ISO/DIN</strong> uses a simplified analytic approach (not a full DIN 22101 memo); <strong>CEMA</strong> applies +6% on steady traction (not the full CEMA manual).
      </li>
      <li><strong>Load duty</strong>: sets the service factor (AGMA/ISO-oriented); \u201cCustom\u201d unlocks the numeric field.</li>
      <li><strong>\u03b7</strong>: if it exceeds 100%, the app warns and caps the calculation at 99%.</li>
    </ul>`,
  );

  const carryOpt0 = document.querySelector('#carrySurface option[value="rollers"]');
  const carryOpt1 = document.querySelector('#carrySurface option[value="slide_plate"]');
  if (carryOpt0) carryOpt0.textContent = 'Rollers (rolling support)';
  if (carryOpt1)
    carryOpt1.textContent = 'Slide plate (boxes, steel, UHMW\u2026)';

  setHtml(
    'label[for="carrySurface"]',
    `Carrying surface <span class="info-chip" title="Rollers: load on idlers (\u03bc usually lower). Slide plate: belt on sheet/UHMW (\u03bc often higher; D is still the drive drum for torque and rpm)." aria-label="Help: rollers vs slide plate and \u03bc.">?</span>`,
  );
  setHtml(
    'label[for="beltLength"]',
    `Length L <span class="info-chip" title="Loaded run: the model spreads mass m over L giving mass flow \u2248 (m/L)\u00b7v. Not necessarily total belt length on site." aria-label="Help: loaded run L.">?</span>`,
  );
  setHtml(
    'label[for="rollerD"]',
    `Drive drum diameter D <span class="info-chip" title="Drive drum diameter (T = F\u00d7R, R = D/2). Light lines often use smaller drums; always validate belt minimum diameter with the belt vendor." aria-label="Help: drum diameter.">?</span>`,
  );
  setHtml(
    'label[for="beltSpeed"]',
    `Speed v <span class="info-chip" title="Belt line speed at steady state. Enters power (F\u00b7v) and drum rpm from v and D." aria-label="Help: belt speed.">?</span>`,
  );
  setHtml(
    'label[for="loadMass"]',
    `Load mass m <span class="info-chip" title="Nominal mass on run L; model assumes uniform distribution." aria-label="Help: load mass.">?</span>`,
  );
  setHtml(
    'label[for="friction"]',
    `Coefficient \u03bc <span class="info-chip" title="Global Coulomb friction: on rollers, belt\u2013roller; on slide, belt\u2013plate/liner (\u03bc often higher). When unsure, pick a slightly higher value (more conservative power). Use the table below." aria-label="Help: friction coefficient.">?</span>`,
  );
  setHtml(
    'label[for="efficiency"]',
    `Efficiency \u03b7 <span class="info-chip" title="From electric motor power to drum: gearbox, coupling, and whatever is in between, as one value. E.g. ~88% if ~12% losses. Do not discount motor efficiency again. If \u03b7 &gt; 100% the app warns." aria-label="Help: efficiency to drum.">?</span>`,
  );
  setHtml(
    'label[for="serviceFactor"]',
    `Service factor (number) <span class="info-chip" title="Synced with Load duty below (read-only here except Custom). Same factor applied to design torque." aria-label="Help: service factor field.">?</span>`,
  );
  setHtml(
    'label[for="designStandard"]',
    `Reference standard <span class="info-chip" title="For reports. ISO/DIN: simplified analytic model here (not full DIN 22101). CEMA: +6% on steady traction only. Limits: see Model assumptions at page end." aria-label="Help: design standard.">?</span>`,
  );
  setHtml(
    'label[for="loadDuty"]',
    `Load duty (sets SF) <span class="info-chip" title="Service class (AGMA/ISO oriented). Sets the numeric factor above except Custom, where you edit the number." aria-label="Help: load duty.">?</span>`,
  );

  const dsIso = document.querySelector('#designStandard option[value="ISO5048"]');
  const dsCema = document.querySelector('#designStandard option[value="CEMA"]');
  if (dsIso)
    dsIso.textContent = 'ISO 5048 / DIN 22101 \u2014 analytic approach (default)';
  if (dsCema) dsCema.textContent = 'CEMA \u2014 +6% margin on steady traction';

  setText('.friction-guide > summary', 'Typical \u03bc table');
  const fgBody = document.querySelector('.friction-guide__body');
  if (fgBody) {
    const presets = fgBody.querySelector('.friction-presets');
    presets?.remove();
    fgBody.innerHTML = `<p>
      \u03bc here is a <strong>global indicative coefficient</strong>: it lumps roller friction, belt bending, and material. When unsure, pick a value
      <strong>slightly above</strong> your best estimate (more conservative = more power).
    </p>
    <table>
      <thead>
        <tr>
          <th>Typical situation</th>
          <th>Indicative \u03bc</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Free rollers, dry rubber belt, good maintenance</td>
          <td>0.22 \u2013 0.30</td>
        </tr>
        <tr>
          <td>General industrial (light dust, standard rollers)</td>
          <td>0.30 \u2013 0.40</td>
        </tr>
        <tr>
          <td>Wet, mud, or irregular maintenance</td>
          <td>0.40 \u2013 0.55</td>
        </tr>
        <tr>
          <td>Very sticky material or high drag (validate on site)</td>
          <td>\u2265 0.50</td>
        </tr>
      </tbody>
    </table>`;
    if (presets) {
      fgBody.appendChild(presets);
      const plab = presets.querySelector('.friction-presets__label');
      if (plab) plab.textContent = 'Apply to \u03bc:';
    }
  }

  setHtml(
    '.flat-model-scope',
    `<strong>Model:</strong> horizontal \u00b7 Coulomb \u00b7 no Euler.
    <a href="#flat-conveyor-assumptions">Assumptions and exclusions</a>`,
  );

  setHtml(
    '.adv-details > summary',
    `Advanced options \u2014 belt fine-tuning, load, startup, extras <span class="field-badge field-badge--optional">Advanced</span>`,
  );
  setHtml(
    '.adv-details__note',
    `<strong>When to open this:</strong> to include <strong>belt weight</strong>, part of the load off idlers, <strong>scrapers/guides</strong> as extra force, or refine <strong>startup</strong> (time to reach v and rotational inertia).
    If you lack data, keep defaults: <strong>0</strong> belt mass excludes it; <strong>1</strong> active fraction = all load on idlers. Each field has <strong>?</strong> with an explanation.`,
  );

  const advLabels = [
    [
      'label[for="beltWidth"]',
      `Belt width B <span class="info-chip" title="Geometric reference for reports/PDF. This calculator\u2019s \u03bc does not use B." aria-label="Help: belt width.">?</span>`,
    ],
    [
      'label[for="beltMass"]',
      `Belt mass m_b <span class="info-chip" title="Total belt mass. Adds friction from dead load (carry + return) and mass accelerated at startup. 0 = ignored." aria-label="Help: belt mass.">?</span>`,
    ],
    [
      'label[for="loadDistribution"]',
      `Active load fraction f_dist <span class="info-chip" title="Share of mass m that creates normal on idlers (0.05\u20131). 1 = all load on idlers; lower if weight goes to structure, hopper, etc." aria-label="Help: load fraction.">?</span>`,
    ],
    [
      'label[for="beltCarryFraction"]',
      `Belt on carry strand <span class="info-chip" title="Share of belt mass on the top strand; remainder on return. Affects normals and belt friction." aria-label="Help: belt carry fraction.">?</span>`,
    ],
    [
      'label[for="additionalResistance"]',
      `Additional resistance F_ad <span class="info-chip" title="Sum of constant resisting forces in N not in \u03bc: scrapers, guides, cleaners, etc." aria-label="Help: extra resistance.">?</span>`,
    ],
    [
      'label[for="accelTime"]',
      `Acceleration time t_ac <span class="info-chip" title="Time to reach speed v from standstill. Shorter \u21d2 higher acceleration force on load + belt." aria-label="Help: accel time.">?</span>`,
    ],
    [
      'label[for="inertiaFactor"]',
      `Inertia factor k_in <span class="info-chip" title="\u22651 scales startup force beyond mass\u00d7acceleration: simplified drums, couplings, rotating mass." aria-label="Help: inertia factor.">?</span>`,
    ],
  ];
  advLabels.forEach(([sel, html]) => setHtml(sel, html));

  document.getElementById('btnCalcular')?.setAttribute(
    'title',
    'Scrolls to suggested gearmotors (calculation is already live)',
  );

  document.getElementById('beltLengthR')?.setAttribute('aria-label', 'L (slider)');
  document.getElementById('loadMassR')?.setAttribute('aria-label', 'm (slider)');
  document.getElementById('beltSpeedR')?.setAttribute('aria-label', 'v (slider)');
  document.getElementById('rollerDR')?.setAttribute('aria-label', 'D (slider)');
  document.getElementById('frictionR')?.setAttribute('aria-label', '\u03bc (slider)');

  document.getElementById('diagramFlat')?.setAttribute(
    'aria-label',
    'Qualitative flat belt schematic',
  );

  const engWrap = document.querySelector('#engineeringReport')?.closest('.panel');
  if (engWrap) {
    const t = engWrap.querySelector('.motors-details__title');
    const h = engWrap.querySelector('.motors-details__hint');
    const lead = engWrap.querySelector('.panel-lead');
    if (t) t.textContent = 'Engineering breakdown';
    if (h)
      h.textContent =
        'Collapsed by default \u2014 expand for intermediate calculations and rationale';
    if (lead)
      lead.textContent =
        'Intermediate math, gearbox summary, three motor strategies, and engineering rationale.';
  }

  const motHint = document.querySelector('#section-motores .motors-details__hint');
  if (motHint)
    motHint.textContent =
      'Collapsed by default \u2014 expand for recommendations, export, and verification';

  const asmHint = document.querySelector('#flat-conveyor-assumptions .motors-details__hint');
  if (asmHint)
    asmHint.textContent =
      'Assumptions and limits used in the calculation (horizontal, Coulomb, no Euler\u2026)';

  const fig = document.querySelector('.diagram-duo__real img');
  if (fig) {
    fig.alt = 'Real conveyor installation with belt and structure (example)';
  }
  setHtml(
    '.diagram-duo__real figcaption',
    `Reference: conveyor on site (example).
    <a href="https://commons.wikimedia.org/wiki/File:Conveyor_belt_(2).jpg" target="_blank" rel="noopener">Wikimedia Commons</a>
    \u2014 replace with your own photo in <code>assets/conveyor-belt-reference.png</code> if you wish.`,
  );

  const vph = document.getElementById('verifySearch');
  if (vph instanceof HTMLInputElement) vph.placeholder = 'e.g. R47, H 083\u2026';
}

function refresh() {
  const LBL = getI18nLabels();
  const lang = getCurrentLang();
  const TX = lang === 'en'
    ? {
        cannotCalcPower:
          'Cannot calculate motor power: check eta (1-99%) and ensure speed and drum diameter are valid.',
        carryingRollers: 'Carrying Rollers',
        carryingSlidePlate: 'Carrying Slide Plate',
        drum: 'Drum',
        shaftLabel: 'shaft',
        normativeMargin: 'Normative Margin (steady)',
        motorPower: 'Motor Power',
        withServiceFactorApplied: 'With service factor applied',
        sizingHint: '(T x omega) / eta · sizing',
        serviceFactor: 'Service Factor',
        mountingType: 'Mounting Type',
        beltAndDrumSpeed: 'Belt / Drum Speed',
        mechanicalDetails: 'Mechanical Details',
        standardConfig: 'Standard configuration',
        fullResult: 'Full Result',
        fullResultHint: 'Forces, partial powers, and extended metrics',
        steadyForceDrum: 'Steady Force (drum)',
        peakStartupForce: 'Peak Startup Force',
        loadVsBeltFriction: 'Load Friction / Belt Friction',
        accelerationForce: 'Additional force for belt acceleration',
        torqueSteadyStartup: 'Steady / Startup Torque',
        motorPowerDesignSf: 'Motor Power (design, with SF)',
        motorPowerRunStartNoSf: 'Motor Power steady / startup (without SF)',
        engineeringReportError: 'Error generating detailed engineering report.',
        gearmotorPrefix: 'Gearmotors:',
        fileProtoHint: 'If using file://, run the site with an HTTP server.',
        machineDiagram: 'Machine Diagram',
        speed: 'Speed',
        drumRpmHintSuffix: 'drum rpm',
        premiumOptimization: 'Optimization (Premium)',
        premiumPlaceholder: 'Reserved space for thermal ranking / ERP.',
        scenarioCompare: 'Scenario comparison A/B/C',
        advancedMultiModel: 'Advanced multi-model comparator',
        presetLibrary: 'Technical preset library',
        proPreparedFeatures: 'Prepared Pro Features',
        proPreparedDesc: 'Billing-ready matrix for flat conveyor.',
        calcErrorPrefix: 'Calculation error:',
        calcErrorSuffix:
          'Check console (F12). If opened by double click, use a local server: npx --yes serve .',
      }
    : {
        cannotCalcPower:
          'No se puede calcular la potencia de motor: compruebe η (1–99 %) y que velocidad y tambor sean válidos.',
        carryingRollers: 'Rodillos portantes',
        carryingSlidePlate: 'Plancha portante',
        drum: 'Tambor',
        shaftLabel: 'eje',
        normativeMargin: 'Margen normativo (régimen)',
        motorPower: 'Potencia motor',
        withServiceFactorApplied: 'Con factor de servicio aplicado',
        sizingHint: '(T×ω)/η · dimensionamiento',
        serviceFactor: 'Factor de servicio',
        mountingType: 'Tipo de montaje',
        beltAndDrumSpeed: 'Velocidad cinta / tambor',
        mechanicalDetails: 'Detalles mecánicos',
        standardConfig: 'Configuración estándar',
        fullResult: 'Resultado completo',
        fullResultHint: 'Fuerzas, potencias parciales y métricas extendidas',
        steadyForceDrum: 'Fuerza régimen (tambor)',
        peakStartupForce: 'Fuerza arranque (pico)',
        loadVsBeltFriction: 'Roz. carga / roz. banda',
        accelerationForce: 'Fuerza por aceleración',
        torqueSteadyStartup: 'Par régimen / arranque',
        motorPowerDesignSf: 'Potencia motor (diseño, con SF)',
        motorPowerRunStartNoSf: 'Potencia motor régimen / arranque (sin SF)',
        engineeringReportError: 'Error al generar el informe detallado.',
        gearmotorPrefix: 'Motorreductores:',
        fileProtoHint: 'Si usa <code>file://</code>, abra el sitio con un servidor HTTP.',
        machineDiagram: 'Diagrama de la máquina',
        speed: 'Velocidad',
        drumRpmHintSuffix: 'rpm tambor',
        premiumOptimization: 'Optimización (premium)',
        premiumPlaceholder: 'Espacio reservado para ranking térmico / ERP.',
        scenarioCompare: 'Comparación de escenarios A/B/C',
        advancedMultiModel: 'Comparador avanzado multi-modelo',
        presetLibrary: 'Biblioteca de presets técnicos',
        proPreparedFeatures: 'Funciones Pro preparadas',
        proPreparedDesc: 'Matriz de cobro lista para activar en cinta plana.',
        calcErrorPrefix: 'Error al calcular:',
        calcErrorSuffix:
          'Compruebe la consola (F12). Si abrió el archivo con doble clic, use un servidor local: npx --yes serve .',
      };
  const els = getEls();
  try {
    clearRuntimeError();
    const raw = readInputs();
    const r = computeFlatConveyor(raw);
    const d = r.detail || {};

    const effIn = document.getElementById('efficiency');
    if (effIn instanceof HTMLInputElement) {
      effIn.classList.toggle('field-input--danger', (r.efficiency_pct_raw ?? 0) > 100);
    }

    if (els.designAlerts) {
      const duty = raw.loadDuty;
      const sfUsed = r.serviceFactorUsed ?? readNum('serviceFactor', 1);
      const inputAlerts = buildInputPhaseAlerts({
        efficiency_pct_raw: r.efficiency_pct_raw ?? raw.efficiency_pct,
        efficiency_pct_used: r.efficiency_pct_effective ?? 88,
        serviceFactor: sfUsed,
        loadDuty: duty,
        serviceFactorFieldRaw: duty === 'custom' ? raw.serviceFactor : undefined,
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
      renderFlatConveyorDiagram(els.diagram, {
        lang,
        carrySurface: raw.carrySurface,
        beltLength_m: raw.beltLength_m,
        rollerDiameter_mm: raw.rollerDiameter_mm,
        beltSpeed_m_s: raw.beltSpeed_m_s,
        loadMass_kg: raw.loadMass_kg,
        frictionCoeff: raw.frictionCoeff,
        frictionForce_N: r.frictionForce_N,
        normalForce_N: r.normalForce_N,
        massFlow_kg_s: r.massFlow_kg_s,
        powerAtDrum_W: r.powerAtDrum_W,
        torqueAtDrum_Nm: r.torqueAtDrum_Nm,
        torqueRun_Nm: r.torqueAtDrum_Nm,
        torqueStart_Nm: r.torqueStart_Nm,
        torqueDesign_Nm: r.torqueWithService_Nm,
        powerDrumRun_W: r.powerAtDrum_W,
        powerDrumStart_W: d.powerDrumStart_W,
        powerMotorDesign_W: d.powerMotorDesign_W,
        serviceFactor: r.serviceFactorUsed ?? raw.serviceFactor,
        efficiency_pct: r.efficiency_pct_effective,
        omega_rad_s: d.omega_rad_s,
        detail: Object.keys(d).length ? d : undefined,
      });
      initFlatDiagramMetricHover(els.diagram);
    }

    if (els.results) {
      const mount = readMountingPreferences();
      const carryLabel =
        raw.carrySurface === 'slide_plate' ? TX.carryingSlidePlate : TX.carryingRollers;
      const mechanicalSummary = [
        carryLabel,
        `${TX.drum} ${formatNum(raw.rollerDiameter_mm, 2)} mm`,
        mount.machineShaftDiameter_mm != null ? `${TX.shaftLabel} ${formatNum(mount.machineShaftDiameter_mm, 2)} mm` : null,
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
        <span class="flat-kpi__eyebrow">${LBL.designTorque} · ${TX.drum.toLowerCase()}</span>
        <p class="flat-kpi__value">${formatNum(r.torqueWithService_Nm, 2)}<span class="flat-kpi__unit">N·m</span></p>
        <p class="flat-kpi__hint">${TX.withServiceFactorApplied}</p>
      </article>
      <article class="flat-kpi flat-kpi--power">
        <span class="flat-kpi__eyebrow">${TX.motorPower}</span>
        <p class="flat-kpi__value">${formatNum(r.requiredMotorPower_kW, 2)}<span class="flat-kpi__unit">kW</span></p>
        <p class="flat-kpi__hint">${TX.sizingHint}</p>
      </article>
      <article class="flat-kpi flat-kpi--speed">
        <span class="flat-kpi__eyebrow">${TX.speed}</span>
        <p class="flat-kpi__value">${formatNum(raw.beltSpeed_m_s, 2)}<span class="flat-kpi__unit">m/s</span></p>
        <p class="flat-kpi__hint">${formatNum(r.drumRpm, 2)} ${TX.drumRpmHintSuffix}</p>
      </article>
    </div>
    <div class="result-focus-grid flat-kpi-secondary">
      <div class="metric"><div class="label">${TX.serviceFactor}</div><div class="value">${formatNum(r.serviceFactorUsed ?? raw.serviceFactor, 2)}</div></div>
      <div class="metric metric--text"><div class="label">${TX.mountingType}</div><div class="value">${formatMounting(mount)}</div></div>
      <div class="metric metric--text"><div class="label">${TX.beltAndDrumSpeed}</div><div class="value">${vLine}</div></div>
      <div class="metric metric--text"><div class="label">${TX.mechanicalDetails}</div><div class="value">${mechanicalSummary || TX.standardConfig}</div></div>
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
          <div class="metric"><div class="label">${TX.steadyForceDrum}</div><div class="value">${formatNum(d.F_steady_N, 2)} N</div></div>
          <div class="metric"><div class="label">${TX.peakStartupForce}</div><div class="value">${formatNum(d.F_total_start_N, 2)} N</div></div>
          <div class="metric"><div class="label">${TX.loadVsBeltFriction}</div><div class="value">${formatNum(d.F_friction_load_N, 2)} / ${formatNum(d.F_friction_belt_total_N, 2)} N</div></div>
          <div class="metric"><div class="label">${TX.accelerationForce}</div><div class="value">${formatNum(d.F_accel_N, 2)} N</div></div>
          <div class="metric"><div class="label">${LBL.massFlow}</div><div class="value">${formatNum(r.massFlow_kg_s, 2)} kg/s</div></div>
          <div class="metric"><div class="label">${TX.torqueSteadyStartup}</div><div class="value">${formatNum(r.torqueAtDrum_Nm, 2)} / ${formatNum(r.torqueStart_Nm, 2)} N·m</div></div>
          <div class="metric"><div class="label">${TX.motorPowerDesignSf}</div><div class="value">${formatNum((d.powerMotorDesign_W ?? 0) / 1000, 2)} kW</div></div>
          <div class="metric"><div class="label">${TX.motorPowerRunStartNoSf}</div><div class="value">${formatNum((d.powerMotorRun_W ?? 0) / 1000, 2)} / ${formatNum((d.powerMotorStart_W ?? 0) / 1000, 2)} kW</div></div>
        </div>
      </div>
    </details>
  `;
    }

    if (els.engineeringReport) {
      try {
        els.engineeringReport.innerHTML = renderFullEngineeringAside(r, { lang });
      } catch (err) {
        console.error(err);
        els.engineeringReport.innerHTML = `<div class="motor-error">${TX.engineeringReportError} ${String(err.message || err)}</div>`;
      }
    }

    if (els.motorBlock) {
      try {
        els.motorBlock.innerHTML = renderBrandRecommendationCards(getDriveRequirements());
      } catch (err) {
        console.error(err);
        els.motorBlock.innerHTML = `<div class="motor-error"><strong>${TX.gearmotorPrefix}</strong> ${String(err.message || err)}. ${TX.fileProtoHint}</div>`;
      }
    }

    if (els.premiumPdfMount) {
      mountPremiumPdfExportBar(els.premiumPdfMount, {
        isPremium: isPremiumEffective(),
        getPayload: () => buildFlatPdfPayload(raw, r),
        getDiagramElement: () => els.diagram,
        diagramTitle: TX.machineDiagram,
      });
    }

    if (els.assumptions) {
      els.assumptions.innerHTML = (r.assumptions || []).map((a) => `<li>${a}</li>`).join('');
    }

    if (els.premiumOpt) {
      const m = FEATURES.monetization?.flat;
      const hasPreparedGate =
        !!m && (m.scenarioCompare || m.advancedMotorCompare || m.premiumPresets);
      if (isPremiumEffective() && FEATURES.safetyOptimization) {
        els.premiumOpt.innerHTML = `
      <section class="panel">
        <h2><span class="panel-icon">★</span> ${TX.premiumOptimization}</h2>
        <p class="muted" style="margin:0">${TX.premiumPlaceholder}</p>
      </section>
    `;
      } else if (!isPremiumEffective() && hasPreparedGate) {
        const items = [
          m.scenarioCompare ? TX.scenarioCompare : '',
          m.advancedMotorCompare ? TX.advancedMultiModel : '',
          m.premiumPresets ? TX.presetLibrary : '',
        ]
          .filter(Boolean)
          .map((x) => `<li>${x}</li>`)
          .join('');
        els.premiumOpt.innerHTML = `
      <section class="panel">
        <h2><span class="panel-icon">★</span> ${TX.proPreparedFeatures}</h2>
        <p class="muted" style="margin:0 0 .5rem">${TX.proPreparedDesc}</p>
        <ul class="assumptions" style="margin:0">${items}</ul>
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
    showRuntimeError(
      `${TX.calcErrorPrefix} ${String(err.message || err)}. ${TX.calcErrorSuffix}`,
    );
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
      syncLoadDutyUi();
      refresh();
    });
  }
});

try {
  initMotorVerification(document.getElementById('verifyPanel'), getDriveRequirements);
} catch (e) {
  console.error(e);
}

document.getElementById('btnCalcular')?.addEventListener('click', () => {
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
        const r = document.getElementById('frictionR');
        if (r instanceof HTMLInputElement) r.value = mu;
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

syncLoadDutyUi();
localizeFlatStaticContent();
initInfoChipPopovers(document.body);

bindFlatRangeSlider('beltLengthR', 'beltLength', 2, 80, 0.1);
bindFlatRangeSlider('loadMassR', 'loadMass', 10, 8000, 1);
bindFlatRangeSlider('beltSpeedR', 'beltSpeed', 0.05, 5, 0.01);
bindFlatRangeSlider('rollerDR', 'rollerD', 50, 1200, 1);
bindFlatRangeSlider('frictionR', 'friction', 0.15, 0.65, 0.01);

refresh();

if (location.hash === '#flat-conveyor-assumptions') {
  const assumptionsSection = document.getElementById('flat-conveyor-assumptions');
  const details = assumptionsSection?.querySelector('details');
  if (details) details.open = true;
}
window.addEventListener('hashchange', () => {
  if (location.hash !== '#flat-conveyor-assumptions') return;
  const assumptionsSection = document.getElementById('flat-conveyor-assumptions');
  const details = assumptionsSection?.querySelector('details');
  if (details) details.open = true;
});



