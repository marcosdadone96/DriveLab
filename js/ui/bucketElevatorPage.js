/**
 * Página elevador de cangilones — asistente 3 pasos + diagrama + motorreductores.
 */

import { readMountingPreferences } from '../modules/mountingPreferences.js';
import { BUCKET_CATALOG, computeBucketElevator } from '../modules/bucketElevator.js';
import { renderBrandRecommendationCards, initMotorVerification } from './driveSelection.js';
import { injectMountingConfigSection, MOUNTING_INPUT_IDS } from './mountingConfigSection.js';
import { openMotorsRecommendationsAndScroll } from './motorsCollapsible.js';
import { renderBucketElevatorDiagram } from './diagramBucketElevator.js';

const recoCopyBucketElevator = {
  torqueLabel: 'par en tambor de cabeza',
  rpmLabel: 'rpm del tambor de cabeza',
  contextHtml: `Recomendaciones según la <strong>potencia de motor</strong> (lado reductor), <strong>par en el tambor de cabeza</strong> y <strong>rpm del tambor</strong>
    obtenidos del modelo de elevador (paso 3). Cada tarjeta enlaza a documentación del fabricante — valide siempre con su proveedor.`,
};

let animPhase = 0;
let animId = 0;
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
    r = computeBucketElevator(p);
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

function formatMounting(pref) {
  const typeMap = { B3: 'B3 patas', B5: 'B5 brida', B14: 'B14 brida', hollowShaft: 'Eje hueco' };
  return `${typeMap[pref.mountingType] || pref.mountingType} · ${pref.orientation === 'vertical' ? 'Vertical' : 'Horizontal'}`;
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
  });
}

function computeAndRender() {
  const p = buildParams();
  let r;
  try {
    r = computeBucketElevator(p);
  } catch (e) {
    console.error(e);
    return;
  }
  lastP = p;
  lastR = r;

  const step2 = document.getElementById('beStep2Hints');
  if (step2) {
    const sr = r.speedRecommendation;
    step2.innerHTML = `
      <div class="be-hints__card">
        <strong>Velocidad recomendada</strong> (${esc(sr.label)}): <strong>${sr.vMin.toFixed(1)} – ${sr.vMax.toFixed(1)} m/s</strong>
        (nominal ≈ ${sr.vNominal.toFixed(1)} m/s).
      </div>
      <div class="be-hints__card">
        <strong>Factor de llenado φ</strong> (orientativo): <strong>${r.fillFactor.toFixed(2)}</strong>
      </div>
      <div class="be-hints__card">
        <strong>Paso mínimo entre cangilones</strong> para la <em>Q</em> solicitada con este <em>v</em> y cangilón:
        <strong>${r.pitch_mm.toFixed(0)} mm</strong>
        (comprobar paso comercial CEMA / fabricante).
      </div>
      <div class="be-hints__card">
        <strong>Ancho mínimo de banda</strong> (catálogo demo): <strong>${r.minBeltWidth_mm} mm</strong>
      </div>
      <div class="be-hints__card muted">
        Capacidad de comprobación con paso calculado: <strong>${r.capacity_check_tph.toFixed(2)} t/h</strong>
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
        <div class="metric"><div class="label">Par requerido</div><div class="value">${drive.torque_Nm.toFixed(0)} N·m</div></div>
        <div class="metric"><div class="label">Factor de servicio</div><div class="value">1.00</div></div>
        <div class="metric metric--text"><div class="label">Tipo de montaje</div><div class="value">${formatMounting(mount)}</div></div>
        <div class="metric"><div class="label">Velocidad</div><div class="value">${drive.drum_rpm.toFixed(1)} rpm</div></div>
        <div class="metric"><div class="label">Motor (kW)</div><div class="value">${drive.power_kW.toFixed(3)} kW</div></div>
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
            <div class="metric"><div class="label">Potencia eje (reductor)</div><div class="value">${pw.shaft_kW.toFixed(3)} kW · ${pw.shaft_HP.toFixed(2)} HP</div></div>
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

  drawDiagramOnly();

  const mb = document.getElementById('beMotorBlock');
  if (mb) {
    try {
      mb.innerHTML = renderBrandRecommendationCards(getDriveRequirements(), recoCopyBucketElevator);
    } catch (err) {
      console.error(err);
      mb.innerHTML = `<div class="motor-error"><strong>Motorreductores:</strong> ${String(err.message || err)}. Use servidor HTTP si abre en <code>file://</code>.</div>`;
    }
  }
}

function animLoop() {
  animPhase = (performance.now() / 14000) % 1;
  drawDiagramOnly();
  animId = requestAnimationFrame(animLoop);
}

function fillBucketSelect() {
  const sel = document.getElementById('beBucket');
  if (!(sel instanceof HTMLSelectElement)) return;
  sel.innerHTML = BUCKET_CATALOG.map(
    (b) => `<option value="${b.id}">${b.label} · mín. ${b.minBelt_mm} mm</option>`,
  ).join('');
  sel.value = 'b2';
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

MOUNTING_INPUT_IDS.forEach((id) => {
  document.getElementById(id)?.addEventListener('input', computeAndRender);
  document.getElementById(id)?.addEventListener('change', computeAndRender);
});

try {
  initMotorVerification(document.getElementById('beVerifyPanel'), getDriveRequirements);
} catch (e) {
  console.error(e);
}

setStep(1);
computeAndRender();



