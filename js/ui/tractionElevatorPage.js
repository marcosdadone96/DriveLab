/**
 * Ascensor de tracción — formulario, diagrama, motorreductores.
 */

import { readMountingPreferences } from '../modules/mountingPreferences.js';
import { computeTractionElevator } from '../modules/tractionElevator.js';
import { renderBrandRecommendationCards, initMotorVerification } from './driveSelection.js';
import { injectMountingConfigSection, MOUNTING_INPUT_IDS } from './mountingConfigSection.js';
import { openMotorsRecommendationsAndScroll } from './motorsCollapsible.js';
import { renderTractionElevatorDiagram } from './diagramTractionElevator.js';
import { applyMachinePremiumGates } from './machinePremiumGates.js';
import { foldAllMachineDetailsOncePerPageLoad } from './machineDetailsFold.js';
import { isPremiumEffective } from '../services/accessTier.js';
import { mountPremiumPdfExportBar, buildTractionPdfPayload } from '../services/reportPdfExport.js';
import { renderFullEngineeringAside } from './engineeringReport.js';
import { initInfoChipPopovers } from './infoChipPopover.js';
import { getI18nLabels, getCurrentLang } from '../config/i18nLabels.js';

function recoCopyTraction(en) {
  return en
    ? {
        torqueLabel: 'torque at traction sheave',
        rpmLabel: 'sheave rpm',
        contextHtml: `Recommendations from <strong>motor power</strong> (gearbox side), <strong>sheave torque</strong> and <strong>sheave rpm</strong>
    for this traction model. Each card links to manufacturer docs — always validate with your supplier.`,
      }
    : {
        torqueLabel: 'par en polea tractora',
        rpmLabel: 'rpm de la polea',
        contextHtml: `Recomendaciones según la <strong>potencia de motor</strong> (lado reductor), <strong>par en la polea</strong> y <strong>rpm de la polea</strong>
    del modelo de tracción. Cada tarjeta enlaza a documentación del fabricante — valide siempre con su proveedor.`,
      };
}

const ETA_TRANS_DEFAULT = 0.96;

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

function formatMounting(pref) {
  const en = getCurrentLang() === 'en';
  const typeMap = en
    ? { B3: 'B3 foot', B5: 'B5 flange', B14: 'B14 flange', hollowShaft: 'Hollow shaft' }
    : { B3: 'B3 patas', B5: 'B5 brida', B14: 'B14 brida', hollowShaft: 'Eje hueco' };
  return `${typeMap[pref.mountingType] || pref.mountingType} · ${pref.orientation === 'vertical' ? 'Vertical' : 'Horizontal'}`;
}

function buildParams() {
  const useOptimal = !document.getElementById('teCwManual')?.checked;
  const manualCw = readNum('teMcpManual', 0);
  return {
    usefulLoad_kg: readNum('teQ', 2000),
    emptyCar_kg: readNum('teMc', 1200),
    counterweight_kg: useOptimal ? null : manualCw,
    counterweightFraction: readNum('teKcw', 0.45),
    travelHeight_m: readNum('teH', 12),
    speed_m_s: readNum('teV', 1),
    reeving: /** @type {'1_1'|'2_1'} */ (readSelect('teReeving', '1_1')),
    sheaveDiameter_m: readNum('teD', 0.55),
    wrapAngle_deg: readNum('teAlpha', 180),
    friction_mu: readNum('teMu', 0.1),
    duty: /** @type {'freight'|'persons'} */ (readSelect('teDuty', 'freight')),
    maxStrands: readNum('teMaxN', 8),
  };
}

/** Requisitos de accionamiento en la polea (potencia motor orientativa incl. η transmisión). */
function getDriveRequirements() {
  const p = buildParams();
  let r;
  try {
    r = computeTractionElevator(p);
  } catch {
    return {
      power_kW: 0,
      torque_Nm: 0,
      drum_rpm: 0.01,
      ...readMountingPreferences(),
    };
  }
  const P_sheave = Math.max(0.001, r.drive.power_kW_orientative);
  const n = Math.max(0.02, r.drive.sheave_rpm);
  const torque_Nm = (9550 * P_sheave) / n;
  const power_kW = P_sheave / ETA_TRANS_DEFAULT;
  return {
    power_kW,
    torque_Nm,
    drum_rpm: n,
    ...readMountingPreferences(),
  };
}

function drawDiagram(H, reeving) {
  const svg = document.getElementById('teDiagram');
  renderTractionElevatorDiagram(svg instanceof SVGSVGElement ? svg : null, {
    travelHeight_m: H,
    reeving,
  });
}

function computeAndRender() {
  const LBL = getI18nLabels();
  const lang = getCurrentLang();
  const en = lang === 'en';
  const TX = en
    ? {
        fullTitle: 'Full result',
        fullHint: 'Traction, counterweight, ropes and energy',
        sheaveLine: 'Sheave',
        ropesLine: 'ropes',
        shaftLine: 'shaft',
        mechDetail: 'Mechanical detail',
        cwModel: 'Counterweight (model)',
        cwOpt: 'Optimal counterweight',
        tensionEuler: 'T₁/T₂ · e^μα',
        adhesion: 'Traction',
        adhesionReview: 'review',
        margin: 'margin',
        utilNom: 'Nominal breaking strength usage',
        brakeTorque: 'Emergency brake torque',
        energySav: 'Energy saving vs no counterweight',
      }
    : {
        fullTitle: 'Resultado completo',
        fullHint: 'Adherencia, contrapeso, cables y energía',
        sheaveLine: 'Polea',
        ropesLine: 'cables',
        shaftLine: 'eje',
        mechDetail: 'Detalles mecánicos',
        cwModel: 'Contrapeso (modelo)',
        cwOpt: 'Contrapeso óptimo',
        tensionEuler: 'T₁/T₂ · e^μα',
        adhesion: 'Adherencia',
        adhesionReview: 'revisar',
        margin: 'margen',
        utilNom: 'Uso resist. nominal',
        brakeTorque: 'Par freno emerg.',
        energySav: 'Ahorro energía vs sin CP',
      };
  const p = buildParams();
  let r;
  try {
    r = computeTractionElevator(p);
  } catch (e) {
    console.error(e);
    return;
  }

  drawDiagram(p.travelHeight_m, p.reeving);

  const res = document.getElementById('teResults');
  if (res) {
    const eu = r.euler;
    const rope = r.rope;
    const drive = getDriveRequirements();
    const mount = readMountingPreferences();
    const mechanicalSummary = [
      `${TX.sheaveLine} Ø${p.sheaveDiameter_m.toFixed(2)} m`,
      `${TX.ropesLine} ${rope.n}×Ø${rope.d_mm}`,
      mount.machineShaftDiameter_mm != null
        ? `${TX.shaftLine} ${mount.machineShaftDiameter_mm.toFixed(0)} mm`
        : null,
    ]
      .filter(Boolean)
      .join(' · ');
    const adhesionVal = eu.adhesionOk
      ? `OK · ${TX.margin} ×${eu.adhesionMargin.toFixed(2)}`
      : `${TX.adhesionReview} · ${TX.margin} ×${eu.adhesionMargin.toFixed(2)}`;
    res.innerHTML = `
      <div class="result-focus-grid">
        <div class="metric"><div class="label">${LBL.requiredTorque}</div><div class="value">${drive.torque_Nm.toFixed(0)} N·m</div></div>
        <div class="metric"><div class="label">${LBL.serviceFactor}</div><div class="value">${r.inputs.SF.toFixed(0)}</div></div>
        <div class="metric metric--text"><div class="label">${LBL.mountingType}</div><div class="value">${formatMounting(mount)}</div></div>
        <div class="metric"><div class="label">${LBL.speed}</div><div class="value">${r.drive.sheave_rpm.toFixed(1)} rpm</div></div>
        <div class="metric"><div class="label">${LBL.motorPower} (kW)</div><div class="value">${drive.power_kW.toFixed(3)} kW</div></div>
        <div class="metric metric--text"><div class="label">${TX.mechDetail}</div><div class="value">${mechanicalSummary}</div></div>
      </div>
      <details class="motors-details result-focus-extra">
        <summary class="motors-details__summary">
          <span class="motors-details__summary-main">
            <span class="panel-icon">≡</span>
            <span class="motors-details__text">
              <span class="motors-details__title">${TX.fullTitle}</span>
              <span class="motors-details__hint">${TX.fullHint}</span>
            </span>
          </span>
        </summary>
        <div class="motors-details__body">
          <div class="results-grid">
            <div class="metric"><div class="label">${TX.cwModel}</div><div class="value">${r.inputs.Mcp.toFixed(0)} kg</div></div>
            <div class="metric"><div class="label">${TX.cwOpt}</div><div class="value">${r.inputs.Mcp_optimal.toFixed(0)} kg</div></div>
            <div class="metric"><div class="label">${TX.tensionEuler}</div><div class="value">${eu.tensionRatioWorst.toFixed(2)} · ${eu.limit.toFixed(2)}</div></div>
            <div class="metric"><div class="label">${TX.adhesion}</div><div class="value">${adhesionVal}</div></div>
            <div class="metric"><div class="label">${TX.utilNom}</div><div class="value">${(rope.utilFactor * 100).toFixed(1)} %</div></div>
            <div class="metric"><div class="label">${TX.brakeTorque}</div><div class="value">${r.brake.torque_Nm.toFixed(0)} N·m</div></div>
            <div class="metric"><div class="label">${TX.energySav}</div><div class="value">${r.energy.savingVsNoCounterweight_pct.toFixed(0)} %</div></div>
          </div>
        </div>
      </details>
    `;
  }

  const ver = document.getElementById('teVerdicts');
  if (ver) {
    ver.innerHTML = r.verdicts
      .map(
        (v) =>
          `<p class="design-alert design-alert--${v.level === 'err' ? 'error' : v.level === 'warn' ? 'warn' : 'info'}">${esc(v.text)}</p>`,
      )
      .join('');
  }

  const disc = document.getElementById('teDisclaimer');
  if (disc) disc.textContent = r.disclaimer;

  const mb = document.getElementById('teMotorBlock');
  if (mb) {
    try {
      mb.innerHTML = renderBrandRecommendationCards(getDriveRequirements(), recoCopyTraction(en));
    } catch (err) {
      console.error(err);
      mb.innerHTML = `<div class="motor-error"><strong>${en ? 'Gearmotors:' : 'Motorreductores:'}</strong> ${String(/** @type {Error} */ (err).message || err)}. ${en ? 'Use an HTTP server if you opened <code>file://</code>.' : 'Use servidor HTTP si abre en <code>file://</code>.'}</div>`;
    }
  }

  const eng = document.getElementById('teEngineeringReport');
  if (eng) {
    const dreq = getDriveRequirements();
    const rEng = {
      drumRpm: dreq.drum_rpm,
      torqueWithService_Nm: dreq.torque_Nm,
      requiredMotorPower_kW: dreq.power_kW,
      steps: r.steps || [],
      explanations: r.explanations || [],
    };
    eng.innerHTML = renderFullEngineeringAside(rEng, {
      lang,
      shaftLabel: en ? 'traction sheave' : 'polea tractora',
      shaftOutLabel: en ? 'Gearbox output / sheave' : 'Salida reductora / polea',
      motorSubtitle: en
        ? 'Indicative reference for traction lifts; validate with codes and OEM.'
        : 'Referencia orientativa para ascensor de tracción; valide normativa y fabricante.',
      motorStrategyLabels: en
        ? {
            designTorqueLabel: 'Design torque (sheave)',
            drumSpeedLabel: 'Sheave speed / ratio <var>i</var>',
          }
        : {
            designTorqueLabel: 'Par de diseño (polea)',
            drumSpeedLabel: 'Velocidad polea / relación <var>i</var>',
          },
    });
  }

  const asu = document.getElementById('teAssumptionsList');
  if (asu) {
    asu.innerHTML = (r.assumptions || []).map((a) => `<li>${esc(a)}</li>`).join('');
  }
  const pdfMount = document.getElementById('premiumPdfExportMount');
  if (pdfMount) {
    const driveReq = getDriveRequirements();
    mountPremiumPdfExportBar(pdfMount, {
      isPremium: isPremiumEffective(),
      getPayload: () => buildTractionPdfPayload(p, r, driveReq),
      getDiagramElement: () => {
        const el = document.getElementById('teDiagram');
        return el instanceof SVGSVGElement ? el : null;
      },
      diagramTitle: en ? 'Traction elevator diagram' : 'Diagrama ascensor de traccion',
    });
  }
  applyMachinePremiumGates();
  foldAllMachineDetailsOncePerPageLoad();
}

function localizeTractionStaticContent() {
  const lang = getCurrentLang();
  if (lang !== 'en') return;
  document.documentElement.lang = 'en';
  document.title = 'Traction elevator — MechAssist';
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
  setText('.app-header nav a[href="bucket-elevator.html"]', 'Bucket elevator');
  setText('.app-header nav a[href="traction-elevator.html"]', 'Traction elevator');
  setText('.app-header nav a[href="screw-conveyor.html"]', 'Screw conveyor');
  setText('.app-header nav a[href="centrifugal-pump.html"]', 'Pump');
  setHtml(
    '.app-main > .panel > h2',
    '<span class="panel-icon">⇅</span> Traction elevator (freight / passenger)',
  );
  setText('#btnTeCalc', 'View suggested gearmotors');
  setHtml(
    '.flat-calc-hint',
    'Results and the diagram <strong>update when inputs change</strong>. This button expands the gearmotor block.',
  );
  setHtml(
    '.app-main > .panel > .form-lead',
    'Indicative <strong>ropes and counterweight</strong> model: tension ratio vs <strong>Euler–Eytelwein</strong>, counterweight mass (car + 40–50% useful load), <strong>diameter and rope count</strong> with safety factor (≈10 freight / 12 passenger), and <strong>braking torque</strong> at the sheave. The <strong>shaft diagram</strong> is on the right. Does not replace EN 81 or a full installation study.',
  );
  setText('.help-details.flat-help > summary', 'Quick guide');
  setText('#teAccLoads .flat-accordion__label', 'Loads and travel');
  setText('#teAccCw .flat-accordion__label', 'Counterweight');
  setText('#teAccSheave .flat-accordion__label', 'Sheave and traction (Euler–Eytelwein)');
  setHtml(
    '.layout-right > .panel:first-child h2',
    '<span class="panel-icon">∑</span> Results and verdicts',
  );
  setHtml(
    '.be-diag-panel h2',
    '<span class="panel-icon">◇</span> Shaft · side view',
  );
  setHtml(
    '#teVerifyPanel h2',
    '<span class="panel-icon">✓</span> Check a gearmotor I already have',
  );
  setText('#section-te-motores .motors-details__title', 'Gearmotors (sample catalog)');
  setText('#section-te-motores .motors-details__hint', 'Collapsed by default — open for brand cards and verifier');
  const engDet = document.querySelector('#teEngineeringReport')?.closest('.motors-details');
  if (engDet) {
    const t = engDet.querySelector('.motors-details__title');
    const h = engDet.querySelector('.motors-details__hint');
    if (t) t.textContent = 'Engineering breakdown';
    if (h) h.textContent = 'Collapsed by default — ratio, strategies and model steps';
  }
  const asu = document.querySelector('#traction-assumptions .motors-details__title');
  const asuh = document.querySelector('#traction-assumptions .motors-details__hint');
  if (asu) asu.textContent = 'Model assumptions';
  if (asuh) asuh.textContent = 'Indicative limits (not a certified lift calculation)';
  const pdfH2 = document.querySelector('#premiumPdfExportMount')?.closest('section.panel')?.querySelector('h2');
  if (pdfH2) pdfH2.innerHTML = '<span class="panel-icon">PDF</span> Export report';
}

function syncCwManualUi() {
  const cb = document.getElementById('teCwManual');
  const row = document.getElementById('teMcpManualRow');
  const on = cb instanceof HTMLInputElement && cb.checked;
  if (row instanceof HTMLElement) row.hidden = !on;
}

injectMountingConfigSection();

document.getElementById('teOpenMotors')?.addEventListener('click', () => {
  openMotorsRecommendationsAndScroll('section-te-motores');
});

document.getElementById('teCwManual')?.addEventListener('change', () => {
  syncCwManualUi();
  computeAndRender();
});

[
  'teQ',
  'teMc',
  'teH',
  'teV',
  'teReeving',
  'teDuty',
  'teD',
  'teAlpha',
  'teMu',
  'teKcw',
  'teMcpManual',
  'teMaxN',
].forEach((id) => {
  document.getElementById(id)?.addEventListener('input', computeAndRender);
  document.getElementById(id)?.addEventListener('change', computeAndRender);
});

MOUNTING_INPUT_IDS.forEach((id) => {
  document.getElementById(id)?.addEventListener('input', computeAndRender);
  document.getElementById(id)?.addEventListener('change', computeAndRender);
});

localizeTractionStaticContent();
try {
  initMotorVerification(document.getElementById('teVerifyPanel'), getDriveRequirements);
} catch (e) {
  console.error(e);
}

syncCwManualUi();
computeAndRender();
initInfoChipPopovers(document.body);



