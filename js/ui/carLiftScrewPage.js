/**
 * Pagina: elevador de coches por husillo — layout flat + motorreductor.
 */

import { computeCarLiftScrew } from '../modules/carLiftScrew.js';
import { readMountingPreferences } from '../modules/mountingPreferences.js';
import { renderBrandRecommendationCards, initMotorVerification } from './driveSelection.js';
import { injectMountingConfigSection, MOUNTING_INPUT_IDS } from './mountingConfigSection.js';
import { openMotorsRecommendationsAndScroll } from './motorsCollapsible.js';
import { renderCarLiftScrewDiagram } from './diagramCarLiftScrew.js';
import { applyMachinePremiumGates } from './machinePremiumGates.js';
import { foldAllMachineDetailsOncePerPageLoad } from './machineDetailsFold.js';
import { isPremiumEffective } from '../services/accessTier.js';
import { mountPremiumPdfExportBar, buildCarLiftPdfPayload } from '../services/reportPdfExport.js';
import { renderFullEngineeringAside } from './engineeringReport.js';
import { initInfoChipPopovers } from './infoChipPopover.js';
import { getI18nLabels, getCurrentLang } from '../config/i18nLabels.js';
import { FEATURES } from '../config/features.js';

function recoCopyCarLift(en) {
  return en
    ? {
        torqueLabel: 'screw torque (total)',
        rpmLabel: 'screw rpm',
        contextHtml:
          'Recommendations from <strong>motor power</strong>, <strong>torque</strong> and screw <strong>rpm</strong>. Always validate with your supplier and lift regulations.',
      }
    : {
        torqueLabel: 'par en husillo (total)',
        rpmLabel: 'rpm del husillo',
        contextHtml:
          'Recomendaciones según la <strong>potencia de motor</strong>, <strong>par</strong> y <strong>rpm</strong> del husillo. Valide siempre con su proveedor y normativa del elevador.',
      };
}

const THREAD_PRESETS = {
  tr40x7: { d_mm: 40, p_mm: 7, label: 'Tr 40 x 7' },
  tr45x7: { d_mm: 45, p_mm: 7, label: 'Tr 45 x 7' },
  tr50x8: { d_mm: 50, p_mm: 8, label: 'Tr 50 x 8' },
};

const inputIds = [
  'clCapacity',
  'clH',
  'clT',
  'clPitch',
  'clD',
  'clNutL',
  'clMu',
  'clPallow',
  'clSF',
];
const selectIds = ['clMotorPos', 'clThreadPreset'];

function readNum(id, fallback) {
  const el = document.getElementById(id);
  if (!el || !(el instanceof HTMLInputElement)) return fallback;
  const n = parseFloat(String(el.value).replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

function readSelect(id, fallback) {
  const el = document.getElementById(id);
  if (!el || !(el instanceof HTMLSelectElement)) return fallback;
  return el.value || fallback;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function formatNum(v, d = 2) {
  return Number.isFinite(v) ? v.toFixed(d) : '\u2014';
}

function formatMounting(pref) {
  const en = getCurrentLang() === 'en';
  const typeMap = en
    ? { B3: 'B3 foot', B5: 'B5 flange', B14: 'B14 flange', hollowShaft: 'Hollow shaft' }
    : { B3: 'B3 patas', B5: 'B5 brida', B14: 'B14 brida', hollowShaft: 'Eje hueco' };
  return `${typeMap[pref.mountingType] || pref.mountingType} \u00b7 ${pref.orientation === 'vertical' ? 'Vertical' : 'Horizontal'}`;
}

function clampNum(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

function bindCarLiftRangeSlider(rangeId, numId, lo, hi, step = null) {
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

function syncThreadPresetUi() {
  const presetEl = document.getElementById('clThreadPreset');
  const pitchEl = document.getElementById('clPitch');
  const dEl = document.getElementById('clD');
  const pitchR = document.getElementById('clPitchR');
  const dR = document.getElementById('clDR');
  const hint = document.getElementById('clThreadPresetHint');
  if (!(presetEl instanceof HTMLSelectElement)) return;
  if (!(pitchEl instanceof HTMLInputElement) || !(dEl instanceof HTMLInputElement)) return;
  if (!(pitchR instanceof HTMLInputElement) || !(dR instanceof HTMLInputElement)) return;

  const preset = THREAD_PRESETS[presetEl.value];
  const custom = presetEl.value === 'custom' || !preset;

  const en = getCurrentLang() === 'en';
  if (custom) {
    pitchEl.readOnly = false;
    dEl.readOnly = false;
    pitchR.disabled = false;
    dR.disabled = false;
    pitchEl.classList.remove('input-synced');
    dEl.classList.remove('input-synced');
    if (hint) {
      hint.textContent = en
        ? 'Custom mode: enter screw diameter and lead manually'
        : 'modo personalizado: puede introducir d y paso manualmente';
    }
    return;
  }

  pitchEl.value = String(preset.p_mm);
  dEl.value = String(preset.d_mm);
  pitchR.value = String(preset.p_mm);
  dR.value = String(preset.d_mm);
  pitchEl.readOnly = true;
  dEl.readOnly = true;
  pitchR.disabled = true;
  dR.disabled = true;
  pitchEl.classList.add('input-synced');
  dEl.classList.add('input-synced');
  if (hint) {
    hint.textContent = en
      ? `${preset.label}: diameter and lead locked to this standard`
      : `${preset.label}: d y paso fijados segun estandar`;
  }
}

function buildParams() {
  return {
    lang: getCurrentLang(),
    capacity_kg: readNum('clCapacity', 3500),
    liftHeight_m: readNum('clH', 1.8),
    liftTime_s: readNum('clT', 45),
    pitch_mm: readNum('clPitch', 8),
    screwDiameter_mm: readNum('clD', 45),
    nutLength_mm: readNum('clNutL', 90),
    mu_thread: readNum('clMu', 0.12),
    columns: 2,
    serviceFactor: readNum('clSF', 1.35),
    pAllow_MPa: readNum('clPallow', 10),
  };
}

function getDriveRequirements() {
  const p = buildParams();
  let r;
  try {
    r = computeCarLiftScrew(p);
  } catch {
    return {
      power_kW: 0,
      torque_Nm: 0,
      drum_rpm: 0.01,
      ...readMountingPreferences(),
    };
  }
  return {
    power_kW: Math.max(0, r.drive.powerDesign_kW),
    torque_Nm: Math.max(0, r.drive.torqueDesign_Nm),
    drum_rpm: Math.max(0.01, r.drive.screw_rpm),
    ...readMountingPreferences(),
  };
}

function localizeCarLiftStaticContent() {
  const lang = getCurrentLang();
  if (lang !== 'en') return;
  document.documentElement.lang = 'en';
  document.title = 'Screw Car Lift - MechAssist';
  const setText = (sel, t) => {
    const el = document.querySelector(sel);
    if (el) el.textContent = t;
  };
  const setHtml = (sel, h) => {
    const el = document.querySelector(sel);
    if (el) el.innerHTML = h;
  };
  setText('.app-header nav a[href="index.html"]', 'Home');
  setText('.app-header nav a[href="flat-conveyor.html"]', 'Flat conveyor');
  setText('.app-header nav a[href="inclined-conveyor.html"]', 'Inclined conveyor');
  setText('.app-header nav a[href="car-lift-screw.html"]', 'Car lift');
  setText('.app-header nav a[href="centrifugal-pump.html"]', 'Pump');
  setText('.app-header nav a[href="screw-conveyor.html"]', 'Screw conveyor');
  setText('.flat-sidebar__title', 'Screw-type car lift');
  setText(
    '.flat-sidebar__lead',
    'Two columns, power screw and bronze nut. Torque, power, nut pressure and self-locking (lambda < phi) — same workflow as belt tools: form on the left, schematic and results on the right.',
  );
  setText('.help-details.flat-help > summary', 'Quick guide');
  setHtml(
    '.help-details.flat-help .help-details__body',
    `<p class="help-details__lead muted">
      Several labels have a <span class="info-chip info-chip--static" aria-hidden="true">?</span>: hover on desktop; on touch, <strong>tap</strong> for help.
    </p>
    <ul>
      <li><strong>m, H, t:</strong> mass lifted, useful stroke and target time; set screw rpm via pitch and turns.</li>
      <li><strong>p, d:</strong> lead (single start) and nominal diameter; define helix angle and torque.</li>
      <li><strong>Nut:</strong> bearing length and steel–bronze mu; pressure is indicative.</li>
      <li><strong>Self-locking:</strong> if lambda &ge; phi, the model flags an error; real installs need brake and safety nut.</li>
    </ul>`,
  );
  setText('#carLiftAccStandards .flat-accordion__label', 'Standards and power-screw safety');
  setText('#carLiftAccGeometry .flat-accordion__label', 'Geometry and kinematics');
  setText('#carLiftAccNut .flat-accordion__label', 'Nut, friction and service factor');
  setHtml(
    '#carLiftAccStandards .flat-accordion__body',
    `<p class="muted" style="margin: 0 0 0.8rem; line-height: 1.45">
      <strong>ISO metric trapezoidal thread family:</strong> <strong>ISO 2901, 2902, 2903 and 2904</strong> define the basic profile, tolerances, gauging and designation for screw–nut interchangeability. In industrial design they give a reproducible geometry before validating load, wear and life with the manufacturer.
    </p>
    <p class="muted" style="margin: 0 0 0.8rem; line-height: 1.45">
      <strong>Irreversibility (safety):</strong> to prevent back-driving under gravity, helix angle <strong>alpha</strong> must stay below the friction angle. Compact form: <strong>alpha &lt; arctan(mu)</strong>. If not, the screw can be overhauling and needs brake, anti-backdrive and redundant safety elements.
    </p>
    <div style="overflow-x: auto; margin: 0.8rem 0">
      <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem">
        <thead>
          <tr>
            <th style="text-align: left; border-bottom: 1px solid #d7dee7; padding: 0.45rem 0.4rem">Designation (Tr d x P)</th>
            <th style="text-align: left; border-bottom: 1px solid #d7dee7; padding: 0.45rem 0.4rem">Nominal diameter</th>
            <th style="text-align: left; border-bottom: 1px solid #d7dee7; padding: 0.45rem 0.4rem">Pitch</th>
            <th style="text-align: left; border-bottom: 1px solid #d7dee7; padding: 0.45rem 0.4rem">Core area (approx.)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border-bottom: 1px solid #edf1f5; padding: 0.45rem 0.4rem"><strong>Tr 40 x 7</strong></td>
            <td style="border-bottom: 1px solid #edf1f5; padding: 0.45rem 0.4rem">40 mm</td>
            <td style="border-bottom: 1px solid #edf1f5; padding: 0.45rem 0.4rem">7 mm</td>
            <td style="border-bottom: 1px solid #edf1f5; padding: 0.45rem 0.4rem">~855 mm²</td>
          </tr>
          <tr>
            <td style="border-bottom: 1px solid #edf1f5; padding: 0.45rem 0.4rem"><strong>Tr 45 x 7</strong></td>
            <td style="border-bottom: 1px solid #edf1f5; padding: 0.45rem 0.4rem">45 mm</td>
            <td style="border-bottom: 1px solid #edf1f5; padding: 0.45rem 0.4rem">7 mm</td>
            <td style="border-bottom: 1px solid #edf1f5; padding: 0.45rem 0.4rem">~1,134 mm²</td>
          </tr>
          <tr>
            <td style="padding: 0.45rem 0.4rem"><strong>Tr 50 x 8</strong></td>
            <td style="padding: 0.45rem 0.4rem">50 mm</td>
            <td style="padding: 0.45rem 0.4rem">8 mm</td>
            <td style="padding: 0.45rem 0.4rem">~1,385 mm²</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="muted" style="margin: 0 0 0.8rem; line-height: 1.45">
      <strong>Materials and wear:</strong> typical industrial lift pairing: <strong>carbon steel screw (e.g. C45)</strong> + <strong>bronze nut (e.g. CuSn12)</strong>. Goal: reduce galling and concentrate wear in the replaceable nut.
    </p>
    <div style="margin-top: 0.8rem; padding: 0.7rem 0.8rem; border: 1px solid rgba(2, 132, 199, 0.35); background: rgba(14, 165, 233, 0.08); border-radius: 8px">
      <p style="margin: 0; font-size: 0.9rem; line-height: 1.45">
        <strong>Engineering note:</strong> keep a <strong>periodic lubrication</strong> plan. If lubrication fails, effective friction drifts from design: torque, temperature, wear and self-lock margin all change.
      </p>
    </div>`,
  );
  const tp = document.getElementById('clThreadPreset');
  if (tp) {
    const o40 = tp.querySelector('option[value="tr40x7"]');
    const o45 = tp.querySelector('option[value="tr45x7"]');
    const o50 = tp.querySelector('option[value="tr50x8"]');
    const oc = tp.querySelector('option[value="custom"]');
    if (o40) o40.textContent = 'Tr 40 x 7 (standard)';
    if (o45) o45.textContent = 'Tr 45 x 7 (standard)';
    if (o50) o50.textContent = 'Tr 50 x 8 (standard)';
    if (oc) oc.textContent = 'Custom (manual entry)';
  }
  const mp = document.getElementById('clMotorPos');
  if (mp) {
    const ot = mp.querySelector('option[value="top"]');
    const ob = mp.querySelector('option[value="base"]');
    if (ot) ot.textContent = 'Top';
    if (ob) ob.textContent = 'Base / bottom';
  }
  setHtml(
    '.flat-model-scope',
    '<strong>Model:</strong> educational, 2 columns, simplified power screw. <a href="#car-lift-assumptions">Assumptions and exclusions</a>',
  );
  setText('#btnCarLiftCalc', 'View suggested gearmotors');
  setHtml(
    '.flat-calc-hint',
    'Results and the diagram <strong>update when inputs change</strong>. This button expands the gearmotor block.',
  );
  setText('.flat-dashboard__title', 'Sizing dashboard');
  setHtml(
    '.flat-dashboard__lead',
    'Torque and power at the <strong>screw</strong> (design includes service factor). Check <strong>self-locking</strong> and <strong>nut pressure</strong> alerts. <a href="#car-lift-assumptions">Assumptions</a> - indicative model, not a full code check.',
  );
  setHtml(
    '.diagram-schematic-note',
    '<strong>Quick read:</strong> qualitative <strong>two-post</strong> layout, screw, load and safety nuts, motor position (top or bottom per your selection). <strong>H</strong>, <strong>p</strong> and <strong>d</strong> are your form values; always validate with the lift OEM.',
  );
  const dia = document.getElementById('clDiagram');
  if (dia) dia.setAttribute('aria-label', 'Screw car lift diagram');
  const img = document.querySelector('.diagram-duo__real img');
  if (img) img.setAttribute('alt', 'Two-post car lift in a workshop');
  const cap = document.querySelector('.diagram-duo__real figcaption');
  if (cap) {
    cap.innerHTML =
      'Reference: workshop application (example). <a href="https://commons.wikimedia.org/wiki/File:Two-post_lift.jpg" target="_blank" rel="noopener">Wikimedia Commons</a> — replace with <code>assets/car-lift-reference.png</code> for your own photo.';
  }
  setHtml(
    '#carLiftVerifyPanel h2',
    '<span class="panel-icon">&#10003;</span> Check a gearmotor I already have',
  );
  setHtml(
    '#carLiftVerifyPanel .panel-lead',
    '<strong>Two ways:</strong> (1) Brand and model from the <strong>sample catalog</strong> and <em>Check for this lift</em>. (2) <em>Or enter my gearmotor manually</em>, nameplate data and run the check. Motor power, torque and <strong>output rpm vs. screw</strong> are compared to the calculated duty.',
  );
  setText('[for="carLiftVerifyBrand"]', 'Brand');
  setText('[for="carLiftVerifySearch"]', 'Filter model');
  setText('[for="carLiftVerifyModel"]', 'Catalog model');
  setText('#carLiftVerifyPanel [data-verify-run]', 'Check for this lift');
  setText('#carLiftEngDetailsTitle', 'Engineering breakdown');
  setText(
    '#carLiftEngDetailsHint',
    'Collapsed by default — gearbox, motor strategies and power-screw steps',
  );
  setText(
    '#carLiftEngDetailsLead',
    'Screw torque, kinematics, nut pressure and indicative gearmotor approaches.',
  );
  setText('#carLiftMotorsDetailsTitle', 'Gearmotors (sample catalog)');
  setText(
    '#carLiftMotorsDetailsHint',
    'Collapsed by default — recommendations, export and verification',
  );
  setText('#carLiftAssumptionsTitle', 'Model assumptions');
  setText('#carLiftAssumptionsHint', 'Educational limits (not a certified lift calculation)');
  document.getElementById('carLiftDiagramDuo')?.setAttribute('aria-label', 'Schematic and reference photo');
  const pdfH2 = document.querySelector('#premiumPdfExportMount')?.closest('section.panel')?.querySelector('h2');
  if (pdfH2) pdfH2.innerHTML = '<span class="panel-icon">PDF</span> Export report';
  if (location.protocol === 'file:') {
    const fpw = document.getElementById('fileProtoWarn');
    if (fpw) {
      fpw.textContent =
        'Recommendation: use a local HTTP server (npx --yes serve .). With file:// the browser may block modules and hide results.';
    }
  }
  const setLabelKeepChip = (forId, plainText) => {
    const lab = document.querySelector(`label[for="${forId}"]`);
    if (!lab) return;
    const chip = lab.querySelector('.info-chip');
    const chipHtml = chip ? chip.outerHTML : '';
    lab.innerHTML = chipHtml ? `${plainText}\n                ${chipHtml}` : plainText;
  };
  setLabelKeepChip('clCapacity', 'Capacity (total mass)');
  setLabelKeepChip('clH', 'Lift height H');
  setLabelKeepChip('clT', 'Lift time');
  setLabelKeepChip('clThreadPreset', 'Trapezoidal screw (ISO)');
  setLabelKeepChip('clPitch', 'Screw lead');
  setLabelKeepChip('clD', 'Screw diameter d');
  setLabelKeepChip('clMotorPos', 'Motor position');
  setLabelKeepChip('clNutL', 'Effective nut length');
  setLabelKeepChip('clMu', 'Friction mu (thread)');
  setLabelKeepChip('clPallow', 'Allowable bronze pressure');
  setLabelKeepChip('clSF', 'Service factor');

  syncThreadPresetUi();
}

function refresh() {
  const LBL = getI18nLabels();
  const lang = getCurrentLang();
  const en = lang === 'en';
  const TX = en
    ? {
        withSf: 'With service factor applied',
        motorPowerHint: 'P x SF at the drive',
        screwSpeed: 'Screw speed',
        screwSpeedHint: 'From H, pitch and time',
        torqueNoSf: 'Lift torque (no extra SF)',
        mechDetail: 'Mechanical detail',
        screwWord: 'Screw',
        pitchWord: 'pitch',
        shaftWord: 'shaft',
        fullResult: 'Full result',
        fullHint: 'lambda / phi angles, self-locking, nut pressure',
        torqueTotal: 'Lift torque (total)',
        powerNoSf: 'Power (no SF)',
        angles: 'Angles lambda / phi',
        selfLock: 'Self-locking',
        nutP: 'Nut pressure (per column)',
        gearmotors: 'Gearmotors:',
        premTitle: 'Optimization and checklist (Premium)',
        premDesc: 'Reserved for safety checklist and extended validation.',
        proTitle: 'Pro features (ready to enable)',
        proLead: 'Billing matrix ready for the car-lift tool.',
        pro1: 'Scenario compare (screw, mu, SF)',
        pro2: 'Advanced multi-model comparator',
        pro3: 'Exportable safety checklist',
        pdfDiag: 'Car lift diagram',
        engShaft: 'lift screw',
        engOut: 'Gearbox output / screw',
        engMotor:
          '~4-pole induction motor reference for vertical screw; confirm mounting, IP and lubrication with OEM.',
      }
    : {
        withSf: 'Con factor de servicio aplicado',
        motorPowerHint: 'P x SF en el accionamiento',
        screwSpeed: 'Velocidad husillo',
        screwSpeedHint: 'De H, paso y tiempo',
        torqueNoSf: 'Par elevaci\u00f3n (sin SF extra)',
        mechDetail: 'Detalle mec\u00e1nico',
        screwWord: 'Husillo',
        pitchWord: 'paso',
        shaftWord: 'eje',
        fullResult: 'Resultado completo',
        fullHint: '\u00c1ngulos \u03bb / \u03c6, autofrenado, presi\u00f3n de tuerca',
        torqueTotal: 'Par elevaci\u00f3n (total)',
        powerNoSf: 'Potencia (sin SF)',
        angles: '\u00c1ngulos \u03bb / \u03c6',
        selfLock: 'Autofrenado',
        nutP: 'Presi\u00f3n tuerca (por columna)',
        gearmotors: 'Motorreductores:',
        premTitle: 'Optimizaci\u00f3n y checklist (premium)',
        premDesc: 'Espacio reservado para checklist de seguridad y validaciones reforzadas.',
        proTitle: 'Funciones Pro preparadas',
        proLead: 'Matriz de cobro lista para activar en elevador de coches.',
        pro1: 'Comparaci\u00f3n de escenarios (husillo, mu, SF)',
        pro2: 'Comparador avanzado multi-modelo',
        pro3: 'Checklist exportable de seguridad',
        pdfDiag: 'Diagrama elevador de coches',
        engShaft: 'husillo elevador',
        engOut: 'Salida reductora / husillo',
        engMotor:
          'Referencia motor asincrono ~4 polos para husillo vertical; valide montaje, IP y lubricacion con el fabricante.',
      };
  const p = buildParams();
  let r;
  try {
    r = computeCarLiftScrew(p);
  } catch (e) {
    console.error(e);
    return;
  }

  const svg = document.getElementById('clDiagram');
  renderCarLiftScrewDiagram(
    svg instanceof SVGSVGElement ? svg : null,
    {
      lang,
      liftHeight_m: p.liftHeight_m,
      pitch_mm: p.pitch_mm,
      screwDiameter_mm: p.screwDiameter_mm,
      motorPosition: /** @type {'top'|'base'} */ (readSelect('clMotorPos', 'top')),
    },
  );

  const res = document.getElementById('clResults');
  if (res) {
    const mount = readMountingPreferences();
    const mechanicalSummary = [
      `${TX.screwWord} \u00d8${p.screwDiameter_mm.toFixed(0)} mm`,
      `${TX.pitchWord} ${p.pitch_mm.toFixed(1)} mm`,
      mount.machineShaftDiameter_mm != null
        ? `${TX.shaftWord} ${mount.machineShaftDiameter_mm.toFixed(0)} mm`
        : null,
    ]
      .filter(Boolean)
      .join(' \u00b7 ');
    res.innerHTML = `
      <div class="flat-kpi-row" role="group" aria-label="${LBL.resultsMain}">
        <article class="flat-kpi flat-kpi--torque">
          <span class="flat-kpi__eyebrow">${LBL.designTorque} \u00b7 ${en ? 'screw' : 'husillo'}</span>
          <p class="flat-kpi__value">${formatNum(r.drive.torqueDesign_Nm, 0)}<span class="flat-kpi__unit">N\u00b7m</span></p>
          <p class="flat-kpi__hint">${TX.withSf}</p>
        </article>
        <article class="flat-kpi flat-kpi--power">
          <span class="flat-kpi__eyebrow">${LBL.motorPower} (${en ? 'indic.' : 'orient.'})</span>
          <p class="flat-kpi__value">${formatNum(r.drive.powerDesign_kW, 2)}<span class="flat-kpi__unit">kW</span></p>
          <p class="flat-kpi__hint">${TX.motorPowerHint}</p>
        </article>
        <article class="flat-kpi flat-kpi--speed">
          <span class="flat-kpi__eyebrow">${TX.screwSpeed}</span>
          <p class="flat-kpi__value">${formatNum(r.drive.screw_rpm, 1)}<span class="flat-kpi__unit">rpm</span></p>
          <p class="flat-kpi__hint">${TX.screwSpeedHint}</p>
        </article>
      </div>
      <div class="result-focus-grid flat-kpi-secondary">
        <div class="metric"><div class="label">${LBL.serviceFactor}</div><div class="value">${formatNum(p.serviceFactor, 2)}</div></div>
        <div class="metric metric--text"><div class="label">${LBL.mountingType}</div><div class="value">${formatMounting(mount)}</div></div>
        <div class="metric"><div class="label">${TX.torqueNoSf}</div><div class="value">${formatNum(r.drive.torqueTotal_Nm, 0)} N\u00b7m</div></div>
        <div class="metric metric--text"><div class="label">${TX.mechDetail}</div><div class="value">${mechanicalSummary || '\u2014'}</div></div>
      </div>
      <details class="motors-details result-focus-extra">
        <summary class="motors-details__summary">
          <span class="motors-details__summary-main">
            <span class="panel-icon">\u2261</span>
            <span class="motors-details__text">
              <span class="motors-details__title">${TX.fullResult}</span>
              <span class="motors-details__hint">${TX.fullHint}</span>
            </span>
          </span>
        </summary>
        <div class="motors-details__body">
          <div class="results-grid">
            <div class="metric"><div class="label">${TX.torqueTotal}</div><div class="value">${formatNum(r.drive.torqueTotal_Nm, 0)} N\u00b7m</div></div>
            <div class="metric"><div class="label">${TX.powerNoSf}</div><div class="value">${formatNum(r.drive.power_kW, 2)} kW</div></div>
            <div class="metric"><div class="label">${TX.angles}</div><div class="value">${formatNum(r.geometry.helixAngle_deg, 1)}\u00b0 / ${formatNum(r.geometry.frictionAngle_deg, 1)}\u00b0</div></div>
            <div class="metric"><div class="label">${TX.selfLock}</div><div class="value">${r.selfLocking ? 'OK' : 'NO'}</div></div>
            <div class="metric"><div class="label">${TX.nutP}</div><div class="value">${formatNum(r.nut.contactPressure_MPa, 1)} MPa</div></div>
          </div>
        </div>
      </details>
    `;
  }

  const ver = document.getElementById('clVerdicts');
  if (ver) {
    ver.innerHTML = r.verdicts
      .map(
        (v) =>
          `<p class="design-alert design-alert--${v.level === 'err' ? 'error' : v.level === 'warn' ? 'warn' : 'info'}">${esc(v.text)}</p>`,
      )
      .join('');
  }

  const disc = document.getElementById('clDisclaimer');
  if (disc) disc.textContent = r.disclaimer;

  const eng = document.getElementById('carLiftEngineeringReport');
  if (eng) {
    const rEng = {
      drumRpm: r.drive.screw_rpm,
      torqueWithService_Nm: r.drive.torqueDesign_Nm,
      requiredMotorPower_kW: r.drive.powerDesign_kW,
      steps: r.steps,
      explanations: r.explanations,
    };
    eng.innerHTML = renderFullEngineeringAside(rEng, {
      lang,
      shaftLabel: TX.engShaft,
      shaftOutLabel: TX.engOut,
      motorSubtitle: TX.engMotor,
      motorStrategyLabels: en
        ? {
            designTorqueLabel: 'Design torque (screw)',
            drumSpeedLabel: 'Screw speed / ratio <var>i</var>',
          }
        : {
            designTorqueLabel: 'Par de dise\u00f1o (husillo)',
            drumSpeedLabel: 'Velocidad husillo / relaci\u00f3n <var>i</var>',
          },
    });
  }

  const asul = document.getElementById('clAssumptionsList');
  if (asul) {
    asul.innerHTML = (r.assumptions || []).map((a) => `<li>${esc(a)}</li>`).join('');
  }

  const mb = document.getElementById('carLiftMotorBlock');
  if (mb) {
    try {
      mb.innerHTML = renderBrandRecommendationCards(getDriveRequirements(), recoCopyCarLift(en));
    } catch (err) {
      console.error(err);
      mb.innerHTML = `<div class="motor-error"><strong>${TX.gearmotors}</strong> ${esc(String(/** @type {Error} */ (err).message || err))}</div>`;
    }
  }

  const premiumOpt = document.getElementById('premiumOptBlock');
  if (premiumOpt) {
    const m = FEATURES.monetization?.carLift;
    const hasPreparedGate = !!m && (m.scenarioCompare || m.advancedMotorCompare || m.safetyChecklist);
    if (isPremiumEffective() && FEATURES.safetyOptimization) {
      premiumOpt.innerHTML = `<section class="panel"><h2><span class="panel-icon">★</span> ${TX.premTitle}</h2><p class="muted" style="margin:0">${TX.premDesc}</p></section>`;
    } else if (!isPremiumEffective() && hasPreparedGate) {
      const items = [
        m.scenarioCompare ? TX.pro1 : '',
        m.advancedMotorCompare ? TX.pro2 : '',
        m.safetyChecklist ? TX.pro3 : '',
      ]
        .filter(Boolean)
        .map((x) => `<li>${x}</li>`)
        .join('');
      premiumOpt.innerHTML = `<section class="panel"><h2><span class="panel-icon">★</span> ${TX.proTitle}</h2><p class="muted" style="margin:0 0 .5rem">${TX.proLead}</p><ul class="assumptions" style="margin:0">${items}</ul></section>`;
    } else {
      premiumOpt.innerHTML = '';
    }
  }

  const pdfMount = document.getElementById('premiumPdfExportMount');
  if (pdfMount) {
    mountPremiumPdfExportBar(pdfMount, {
      isPremium: isPremiumEffective(),
      getPayload: () => buildCarLiftPdfPayload(p, r),
      getDiagramElement: () => (svg instanceof SVGSVGElement ? svg : null),
      diagramTitle: TX.pdfDiag,
    });
  }
  applyMachinePremiumGates();
  foldAllMachineDetailsOncePerPageLoad();
}

inputIds.forEach((id) => {
  document.getElementById(id)?.addEventListener('input', refresh);
  document.getElementById(id)?.addEventListener('change', refresh);
});

selectIds.forEach((id) => {
  document.getElementById(id)?.addEventListener('change', () => {
    syncThreadPresetUi();
    refresh();
  });
});

document.getElementById('btnCarLiftCalc')?.addEventListener('click', () => {
  refresh();
  openMotorsRecommendationsAndScroll('section-car-motores');
});

injectMountingConfigSection();
MOUNTING_INPUT_IDS.forEach((id) => {
  document.getElementById(id)?.addEventListener('input', refresh);
  document.getElementById(id)?.addEventListener('change', refresh);
});

bindCarLiftRangeSlider('clCapacityR', 'clCapacity', 800, 6000, 50);
bindCarLiftRangeSlider('clHR', 'clH', 1.2, 4.5, 0.05);
bindCarLiftRangeSlider('clTR', 'clT', 15, 120, 1);
bindCarLiftRangeSlider('clPitchR', 'clPitch', 4, 20, 0.5);
bindCarLiftRangeSlider('clDR', 'clD', 30, 90, 1);
bindCarLiftRangeSlider('clNutLR', 'clNutL', 40, 200, 5);
bindCarLiftRangeSlider('clMuR', 'clMu', 0.06, 0.22, 0.01);
bindCarLiftRangeSlider('clPallowR', 'clPallow', 5, 22, 0.5);
bindCarLiftRangeSlider('clSFR', 'clSF', 1, 2.2, 0.05);

initInfoChipPopovers(document.body);
syncThreadPresetUi();

localizeCarLiftStaticContent();
try {
  initMotorVerification(document.getElementById('carLiftVerifyPanel'), getDriveRequirements);
} catch (e) {
  console.error(e);
}
refresh();
