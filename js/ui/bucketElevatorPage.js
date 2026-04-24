/**
 * Página elevador de cangilones — asistente 3 pasos + diagrama + motorreductores.
 */

import { readMountingPreferences } from '../modules/mountingPreferences.js';
import {
  BUCKET_CATALOG,
  computeBucketElevator,
  displayBucketLabel,
} from '../modules/bucketElevator.js';
import {
  renderBrandRecommendationCards,
  initMotorVerification,
  refreshMotorVerificationManual,
} from './driveSelection.js';
import {
  injectMountingConfigSection,
  MOUNTING_INPUT_IDS,
} from './mountingConfigSection.js';
import { openMotorsRecommendationsAndScroll } from './motorsCollapsible.js';
import { renderBucketElevatorDiagram } from './diagramBucketElevator.js';
import { applyMachinePremiumGates } from './machinePremiumGates.js';
import { foldAllMachineDetailsOncePerPageLoad } from './machineDetailsFold.js';
import { isPremiumEffective } from '../services/accessTier.js';
import { mountPremiumPdfExportBar, buildBucketPdfPayload } from '../services/reportPdfExport.js';
import { renderFullEngineeringAside } from './engineeringReport.js';
import { initInfoChipPopovers } from './infoChipPopover.js';
import { getI18nLabels } from '../config/i18nLabels.js';
import { getCurrentLang } from '../config/locales.js';
import { BUCKET_ELEVATOR_LANG_EVENT } from './bucketElevatorStaticI18n.js';

let animPhase = 0;
let animId = 0;
let collapsedOnce = false;
/** @type {any} */
let lastR = null;
/** @type {any} */
let lastP = null;

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

function selectedBucket() {
  const id = readSelect('beBucket', 'b2');
  return BUCKET_CATALOG.find((b) => b.id === id) || BUCKET_CATALOG[3];
}

/** Requisito de accionamiento para catálogo demo (potencia motor, par y rpm en tambor de cabeza). */
function getDriveRequirements() {
  const p = buildParams();
  let r;
  try {
    r = computeBucketElevator(p, getCurrentLang());
  } catch {
    return {
      power_kW: 0,
      torque_Nm: 0,
      drum_rpm: 0.01,
      ...readMountingPreferences(),
    };
  }
  const v = Math.max(0.05, p.beltSpeed_m_s);
  const D = Math.max(0.15, p.headDrumDiameter_m);
  const drum_rpm = (60 * v) / (Math.PI * D);
  const P_drum_kW = r.power.pureLift_kW + r.power.dragBoot_kW;
  const torque_Nm = drum_rpm > 0.02 ? (9550 * P_drum_kW) / drum_rpm : 0;
  return {
    power_kW: r.power.shaft_kW,
    torque_Nm,
    drum_rpm: Math.max(0.01, drum_rpm),
    ...readMountingPreferences(),
  };
}

function buildParams() {
  const b = selectedBucket();
  return {
    bulkDensity_kg_m3: readNum('beRho', 850),
    particle_mm: readNum('beParticle', 8),
    fluidity: /** @type {'poor'|'medium'|'good'} */ (readSelect('beFluidity', 'medium')),
    materialNature: /** @type {'fragile_abrasive'|'normal'|'fluid_light'} */ (readSelect('beNature', 'normal')),
    liftHeight_m: readNum('beH', 28),
    centerDistance_m: readNum('beC', 30),
    capacity_tph: readNum('beQ', 45),
    headDrumDiameter_m: readNum('beDhead', 0.65),
    bootDrumDiameter_m: readNum('beDboot', 0.55),
    beltSpeed_m_s: readNum('beVbelt', 1.9),
    bucketVolume_L: b.volume_L,
    minBeltFromCatalog_mm: b.minBelt_mm,
    beltWidth_mm: readNum('beWidth', b.minBelt_mm),
    beltStrength_N_per_mm: readNum('beSigma', 315),
    etaElev: readNum('beEta', 0.78),
    kBootDrag: readNum('beKboot', 0.18),
    etaTransmission: readNum('beEtaTrans', 0.96),
  };
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function formatMounting(pref, lang = getCurrentLang()) {
  const en = lang === 'en';
  const typeMap = en
    ? { B3: 'B3 foot mount', B5: 'B5 flange', B14: 'B14 flange', hollowShaft: 'Hollow shaft' }
    : { B3: 'B3 patas', B5: 'B5 brida', B14: 'B14 brida', hollowShaft: 'Eje hueco' };
  const ori = pref.orientation === 'vertical' ? 'Vertical' : 'Horizontal';
  return `${typeMap[pref.mountingType] || pref.mountingType} \u00b7 ${ori}`;
}

function drawDiagramOnly() {
  const svg = document.getElementById('beDiagram');
  if (!lastP || !lastR) return;
  renderBucketElevatorDiagram(svg instanceof SVGSVGElement ? svg : null, {
    liftHeight_m: lastP.liftHeight_m,
    centerDistance_m: lastP.centerDistance_m,
    headDrumDiameter_m: lastP.headDrumDiameter_m,
    bootDrumDiameter_m: lastP.bootDrumDiameter_m,
    pitch_mm: lastR.pitch_mm,
    beltSpeed_m_s: lastP.beltSpeed_m_s,
    animPhase,
    lang: getCurrentLang(),
  });
}

function computeAndRender() {
  const lang = getCurrentLang();
  const en = lang === 'en';
  const LBL = getI18nLabels();
  const p = buildParams();
  let r;
  try {
    r = computeBucketElevator(p, lang);
  } catch (e) {
    console.error(e);
    return;
  }
  lastP = p;
  lastR = r;

  const recoCopyBucketElevator = en
    ? {
        torqueLabel: 'torque at head drum',
        rpmLabel: 'head drum rpm',
        contextHtml: `Recommendations from <strong>motor power</strong> (gearbox side), <strong>torque at the head drum</strong> and <strong>head drum rpm</strong>
    from the elevator model (step 3). Each card links to manufacturer documentation \u2014 always confirm with your supplier.`,
      }
    : {
        torqueLabel: 'par en tambor de cabeza',
        rpmLabel: 'rpm del tambor de cabeza',
        contextHtml: `Recomendaciones seg\u00fan la <strong>potencia de motor</strong> (lado reductor), <strong>par en el tambor de cabeza</strong> y <strong>rpm del tambor</strong>
    obtenidos del modelo de elevador (paso 3). Cada tarjeta enlaza a documentaci\u00f3n del fabricante \u2014 valide siempre con su proveedor.`,
      };

  const step2 = document.getElementById('beStep2Hints');
  if (step2) {
    const sr = r.speedRecommendation;
    step2.innerHTML = en
      ? `
      <div class="be-hints__card">
        <strong>Recommended speed</strong> (${esc(sr.label)}): <strong>${sr.vMin.toFixed(1)} \u2013 ${sr.vMax.toFixed(1)} m/s</strong>
        (nominal \u2248 ${sr.vNominal.toFixed(1)} m/s).
      </div>
      <div class="be-hints__card">
        <strong>Fill factor \u03c6</strong> (indicative): <strong>${r.fillFactor.toFixed(2)}</strong>
      </div>
      <div class="be-hints__card">
        <strong>Minimum bucket spacing</strong> for the requested <em>Q</em> with this <em>v</em> and bucket:
        <strong>${r.pitch_mm.toFixed(0)} mm</strong>
        (check commercial pitch vs. CEMA / vendor).
      </div>
      <div class="be-hints__card">
        <strong>Minimum belt width</strong> (demo catalog): <strong>${r.minBeltWidth_mm} mm</strong>
      </div>
      <div class="be-hints__card muted">
        Check capacity with computed pitch: <strong>${r.capacity_check_tph.toFixed(2)} t/h</strong>
      </div>`
      : `
      <div class="be-hints__card">
        <strong>Velocidad recomendada</strong> (${esc(sr.label)}): <strong>${sr.vMin.toFixed(1)} \u2013 ${sr.vMax.toFixed(1)} m/s</strong>
        (nominal \u2248 ${sr.vNominal.toFixed(1)} m/s).
      </div>
      <div class="be-hints__card">
        <strong>Factor de llenado \u03c6</strong> (orientativo): <strong>${r.fillFactor.toFixed(2)}</strong>
      </div>
      <div class="be-hints__card">
        <strong>Paso m\u00ednimo entre cangilones</strong> para la <em>Q</em> solicitada con este <em>v</em> y cangil\u00f3n:
        <strong>${r.pitch_mm.toFixed(0)} mm</strong>
        (comprobar paso comercial CEMA / fabricante).
      </div>
      <div class="be-hints__card">
        <strong>Ancho m\u00ednimo de banda</strong> (cat\u00e1logo demo): <strong>${r.minBeltWidth_mm} mm</strong>
      </div>
      <div class="be-hints__card muted">
        Capacidad de comprobaci\u00f3n con paso calculado: <strong>${r.capacity_check_tph.toFixed(2)} t/h</strong>
      </div>`;
  }

  const res = document.getElementById('beResults');
  if (res) {
    const pw = r.power;
    const drive = getDriveRequirements();
    const mount = readMountingPreferences();
    const mechanicalSummary = [
      `Tambor cabeza Ø${p.headDrumDiameter_m.toFixed(2)} m`,
      `banda ${p.beltWidth_mm.toFixed(0)} mm`,
      mount.machineShaftDiameter_mm != null ? `eje ${mount.machineShaftDiameter_mm.toFixed(0)} mm` : null,
    ]
      .filter(Boolean)
      .join(' · ');
    res.innerHTML = `
      <div class="result-focus-grid">
        <div class="metric"><div class="label">${LBL.requiredTorque}</div><div class="value">${drive.torque_Nm.toFixed(0)} N·m</div></div>
        <div class="metric"><div class="label">${LBL.serviceFactor}</div><div class="value">1.00</div></div>
        <div class="metric metric--text"><div class="label">${LBL.mountingType}</div><div class="value">${formatMounting(mount)}</div></div>
        <div class="metric"><div class="label">${LBL.speed}</div><div class="value">${drive.drum_rpm.toFixed(1)} rpm</div></div>
        <div class="metric"><div class="label">${LBL.motorPower} (kW)</div><div class="value">${drive.power_kW.toFixed(3)} kW</div></div>
        <div class="metric metric--text"><div class="label">Detalles mecánicos</div><div class="value">${mechanicalSummary}</div></div>
      </div>
      <details class="motors-details result-focus-extra">
        <summary class="motors-details__summary">
          <span class="motors-details__summary-main">
            <span class="panel-icon">≡</span>
            <span class="motors-details__text">
              <span class="motors-details__title">Resultado completo</span>
              <span class="motors-details__hint">Potencias internas, tensión y chequeo centrífugo</span>
            </span>
          </span>
        </summary>
        <div class="motors-details__body">
          <div class="results-grid">
            <div class="metric"><div class="label">Potencia elevación pura <em>P</em>ₑ</div><div class="value">${pw.pureLift_kW.toFixed(3)} kW</div></div>
            <div class="metric"><div class="label">Potencia arrastre bota</div><div class="value">${pw.dragBoot_kW.toFixed(3)} kW</div></div>
            <div class="metric"><div class="label">${LBL.shaftPower} (reductor)</div><div class="value">${pw.shaft_kW.toFixed(3)} kW · ${pw.shaft_HP.toFixed(2)} HP</div></div>
            <div class="metric"><div class="label">Tensión trabajo / admisible</div><div class="value">${r.tension.working_N.toFixed(0)} / ${r.tension.admissible_N.toFixed(0)} N</div></div>
            <div class="metric"><div class="label">Uso tensión τ/τ<sub>adm</sub></div><div class="value">${(r.tension.ratio * 100).toFixed(1)} % · ${r.tension.ok ? 'OK' : 'revisar'}</div></div>
            <div class="metric"><div class="label"><em>K</em> = v²/(gR) cabeza</div><div class="value">${r.centrifugal.K.toFixed(2)}</div></div>
            <div class="metric"><div class="label">Paso cangilones (calc.)</div><div class="value">${r.pitch_mm.toFixed(0)} mm</div></div>
          </div>
        </div>
      </details>
    `;
  }

  const ver = document.getElementById('beVerdicts');
  if (ver) {
    ver.innerHTML = r.verdicts
      .map(
        (v) =>
          `<p class="design-alert design-alert--${v.level === 'err' ? 'error' : v.level === 'warn' ? 'warn' : 'info'}">${esc(v.text)}</p>`,
      )
      .join('');
  }

  const disc = document.getElementById('beDisclaimer');
  if (disc) disc.textContent = r.disclaimer;

  const eng = document.getElementById('beEngineeringReport');
  if (eng) {
    const rEng = {
      drumRpm: getDriveRequirements().drum_rpm,
      torqueWithService_Nm: getDriveRequirements().torque_Nm,
      requiredMotorPower_kW: getDriveRequirements().power_kW,
      steps: r.steps || [],
      explanations: r.explanations || [],
    };
    eng.innerHTML = renderFullEngineeringAside(rEng, {
      lang,
      shaftLabel: en ? 'head drum' : 'tambor de cabeza',
      shaftOutLabel: en ? 'Gearbox output / drum' : 'Salida reductora / tambor',
      motorSubtitle: en
        ? 'Indicative reference for bucket elevators; validate with CEMA and your vendor.'
        : 'Referencia orientativa para elevador de cangilones; validar con CEMA y fabricante.',
    });
  }

  const asu = document.getElementById('beAssumptionsList');
  if (asu) {
    asu.innerHTML = (r.assumptions || []).map((a) => `<li>${esc(a)}</li>`).join('');
  }

  try {
    drawDiagramOnly();
  } catch (e) {
    console.error('Bucket elevator diagram:', e);
  }

  const mb = document.getElementById('beMotorBlock');
  if (mb) {
    try {
      mb.innerHTML = renderBrandRecommendationCards(getDriveRequirements(), recoCopyBucketElevator);
    } catch (err) {
      console.error(err);
      mb.innerHTML = en
        ? `<div class="motor-error"><strong>Gearmotors:</strong> ${String(err.message || err)}. Use an HTTP server if you opened this page as <code>file://</code>.</div>`
        : `<div class="motor-error"><strong>Motorreductores:</strong> ${String(err.message || err)}. Use servidor HTTP si abre en <code>file://</code>.</div>`;
    }
  }
  const pdfMount = document.getElementById('premiumPdfExportMount');
  if (pdfMount) {
    const driveReq = getDriveRequirements();
    mountPremiumPdfExportBar(pdfMount, {
      isPremium: isPremiumEffective(),
      getPayload: () => buildBucketPdfPayload(p, r, driveReq),
      getDiagramElement: () => {
        const el = document.getElementById('beDiagram');
        return el instanceof SVGSVGElement ? el : null;
      },
      diagramTitle: en ? 'Bucket elevator diagram' : 'Diagrama elevador de cangilones',
    });
  }
  applyMachinePremiumGates();
  foldAllMachineDetailsOncePerPageLoad();
}

function animLoop() {
  animPhase = (performance.now() / 14000) % 1;
  drawDiagramOnly();
  animId = requestAnimationFrame(animLoop);
}

function fillBucketSelect() {
  const sel = document.getElementById('beBucket');
  if (!(sel instanceof HTMLSelectElement)) return;
  const lang = getCurrentLang();
  const en = lang === 'en';
  const minWord = en ? 'min.' : 'm\u00edn.';
  const cur = sel.value;
  sel.innerHTML = BUCKET_CATALOG.map(
    (b) =>
      `<option value="${b.id}">${esc(displayBucketLabel(b, lang))} \u00b7 ${minWord} ${b.minBelt_mm} mm</option>`,
  ).join('');
  sel.value = BUCKET_CATALOG.some((b) => b.id === cur) ? cur : 'b2';
}

function setStep(n) {
  const step = Math.max(1, Math.min(3, n));
  document.querySelectorAll('[data-be-panel]').forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    const on = Number(el.getAttribute('data-be-panel')) === step;
    el.hidden = !on;
  });
  document.querySelectorAll('[data-be-step]').forEach((btn) => {
    if (!(btn instanceof HTMLElement)) return;
    const b = Number(btn.getAttribute('data-be-step')) === step;
    btn.classList.toggle('be-wizard-nav__btn--active', b);
  });
  if (step === 3) {
    if (!animId) animId = requestAnimationFrame(animLoop);
  } else {
    cancelAnimationFrame(animId);
    animId = 0;
    animPhase = 0;
    computeAndRender();
  }
}

fillBucketSelect();
injectMountingConfigSection();

document.getElementById('beOpenMotors')?.addEventListener('click', () => {
  openMotorsRecommendationsAndScroll('section-be-motores');
});

document.querySelectorAll('[data-be-step]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const n = Number(btn.getAttribute('data-be-step'));
    if (Number.isFinite(n)) setStep(n);
  });
});

const inputs = [
  'beRho',
  'beParticle',
  'beFluidity',
  'beNature',
  'beQ',
  'beH',
  'beC',
  'beDhead',
  'beDboot',
  'beBucket',
  'beVbelt',
  'beWidth',
  'beSigma',
  'beEta',
  'beKboot',
  'beEtaTrans',
];
inputs.forEach((id) => {
  document.getElementById(id)?.addEventListener('input', computeAndRender);
  document.getElementById(id)?.addEventListener('change', computeAndRender);
});

function onMountingHostInput(ev) {
  const t = ev.target;
  if (!(t instanceof HTMLElement)) return;
  if (!MOUNTING_INPUT_IDS.includes(/** @type {string} */ (t.id))) return;
  computeAndRender();
}

document.getElementById('mountingConfigHost')?.addEventListener('input', onMountingHostInput);
document.getElementById('mountingConfigHost')?.addEventListener('change', onMountingHostInput);

window.addEventListener(BUCKET_ELEVATOR_LANG_EVENT, () => {
  fillBucketSelect();
  refreshMotorVerificationManual(document.getElementById('beVerifyPanel'), getDriveRequirements);
  document.getElementById('beVerifyBrand')?.dispatchEvent(new Event('change'));
  computeAndRender();
});

try {
  initMotorVerification(document.getElementById('beVerifyPanel'), getDriveRequirements);
} catch (e) {
  console.error(e);
}

setStep(1);
computeAndRender();
initInfoChipPopovers(document.body);



