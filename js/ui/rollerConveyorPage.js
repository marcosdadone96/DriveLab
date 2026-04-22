/**
 * Página transportador de rodillos.
 */

import { FEATURES } from '../config/features.js';
import { isPremiumEffective } from '../services/accessTier.js';
import { computeRollerConveyor } from '../modules/rollerConveyor.js';
import { LOAD_DUTY_OPTIONS } from '../modules/serviceFactorByDuty.js';
import { renderRollerConveyorDiagram } from './diagramRoller.js';
import { renderBrandRecommendationCards, initMotorVerification } from './driveSelection.js';
import { renderFullEngineeringAside } from './engineeringReport.js';
import { mountPremiumPdfExportBar } from '../services/reportPdfExport.js';
import { readMountingPreferences } from '../modules/mountingPreferences.js';
import { injectMountingConfigSection, MOUNTING_INPUT_IDS } from './mountingConfigSection.js';
import { openMotorsRecommendationsAndScroll } from './motorsCollapsible.js';

const inputIds = [
  'length',
  'loadMass',
  'speed',
  'rollerD',
  'rollingResistance',
  'efficiency',
  'additionalResistance',
  'accelTime',
  'inertiaFactor',
  'serviceFactor',
];
const selectIds = ['designStandard', 'loadDuty'];

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

function readInputs() {
  const duty = /** @type {'uniform'|'moderate'|'heavy'|'custom'} */ (readSelect('loadDuty', 'moderate'));
  return {
    designStandard: readSelect('designStandard', 'ISO5048'),
    loadDuty: duty,
    length_m: readNum('length', 5),
    loadMass_kg: readNum('loadMass', 350),
    speed_m_s: readNum('speed', 0.35),
    rollerDiameter_mm: readNum('rollerD', 89),
    rollingResistanceCoeff: readNum('rollingResistance', 0.03),
    efficiency_pct: readNum('efficiency', 90),
    additionalResistance_N: readNum('additionalResistance', 0),
    accelTime_s: readNum('accelTime', 2.5),
    inertiaStartingFactor: readNum('inertiaFactor', 1.1),
    serviceFactor: readNum('serviceFactor', 1.25),
  };
}

function formatNum(v, d = 2) {
  return Number.isFinite(v) ? v.toFixed(d) : '—';
}

function formatMounting(pref) {
  const typeMap = { B3: 'B3 patas', B5: 'B5 brida', B14: 'B14 brida', hollowShaft: 'Eje hueco' };
  return `${typeMap[pref.mountingType] || pref.mountingType} · ${pref.orientation === 'vertical' ? 'Vertical' : 'Horizontal'}`;
}

function syncLoadDutyUi() {
  const dutyEl = document.getElementById('loadDuty');
  const sfIn = document.getElementById('serviceFactor');
  const hint = document.getElementById('loadDutyHint');
  if (!(dutyEl instanceof HTMLSelectElement) || !(sfIn instanceof HTMLInputElement)) return;
  const row = LOAD_DUTY_OPTIONS.find((o) => o.id === dutyEl.value);
  if (hint && row) hint.textContent = row.hint;
  if (dutyEl.value === 'custom') {
    sfIn.readOnly = false;
    sfIn.classList.remove('input-synced');
  } else {
    sfIn.readOnly = true;
    sfIn.classList.add('input-synced');
    if (row && row.sf != null) sfIn.value = String(row.sf);
  }
}

function getEls() {
  return {
    diagram: /** @type {SVGSVGElement | null} */ (document.getElementById('diagramRoller')),
    results: document.getElementById('resultsGrid'),
    engineeringReport: document.getElementById('engineeringReport'),
    motorBlock: document.getElementById('motorBlock'),
    assumptions: document.getElementById('assumptionsList'),
    premiumOpt: document.getElementById('premiumOptBlock'),
    premiumPdfMount: document.getElementById('premiumPdfExportMount'),
  };
}

function getDriveRequirements() {
  const r = computeRollerConveyor(readInputs());
  return {
    power_kW: r.requiredMotorPower_kW,
    torque_Nm: r.torqueWithService_Nm,
    drum_rpm: r.drumRpm,
    ...readMountingPreferences(),
  };
}

function refresh() {
  const els = getEls();
  const raw = readInputs();
  const r = computeRollerConveyor(raw);
  const d = r.detail || {};
  const mount = readMountingPreferences();
  const mechanicalSummary = [
    `Ø rodillo ${formatNum(raw.rollerDiameter_mm, 0)} mm`,
    mount.machineShaftDiameter_mm != null ? `eje ${formatNum(mount.machineShaftDiameter_mm, 0)} mm` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  if (els.diagram) {
    renderRollerConveyorDiagram(els.diagram, {
      ...raw,
      drumRpm: r.drumRpm,
    });
  }

  if (els.results) {
    const normRow =
      r.steadyStandardMultiplier > 1
        ? `<div class="metric"><div class="label">Margen normativo</div><div class="value">×${formatNum(r.steadyStandardMultiplier, 2)} (${r.designStandard})</div></div>`
        : '';
    els.results.innerHTML = `
      <div class="result-focus-grid">
        <div class="metric"><div class="label">Par requerido</div><div class="value">${formatNum(r.torqueWithService_Nm, 2)} N·m</div></div>
        <div class="metric"><div class="label">Factor de servicio</div><div class="value">${formatNum(r.serviceFactorUsed, 2)}</div></div>
        <div class="metric metric--text"><div class="label">Tipo de montaje</div><div class="value">${formatMounting(mount)}</div></div>
        <div class="metric"><div class="label">Velocidad</div><div class="value">${formatNum(r.drumRpm, 2)} min?¹</div></div>
        <div class="metric"><div class="label">Motor (kW)</div><div class="value">${formatNum(r.requiredMotorPower_kW, 3)} kW</div></div>
        <div class="metric metric--text"><div class="label">Detalles mecánicos</div><div class="value">${mechanicalSummary || 'Configuración estándar'}</div></div>
      </div>
      <details class="motors-details result-focus-extra">
        <summary class="motors-details__summary">
          <span class="motors-details__summary-main">
            <span class="panel-icon">?</span>
            <span class="motors-details__text">
              <span class="motors-details__title">Resultado completo</span>
              <span class="motors-details__hint">Fuerzas, potencia y métricas extendidas</span>
            </span>
          </span>
        </summary>
        <div class="motors-details__body">
          <div class="results-grid">
            ${normRow}
            <div class="metric"><div class="label">Fuerza régimen</div><div class="value">${formatNum(d.F_steady_N, 1)} N</div></div>
            <div class="metric"><div class="label">Fuerza arranque</div><div class="value">${formatNum(d.F_total_start_N, 1)} N</div></div>
            <div class="metric"><div class="label">Fuerza de aceleración</div><div class="value">${formatNum(d.F_accel_N, 1)} N</div></div>
            <div class="metric"><div class="label">Par régimen / arranque</div><div class="value">${formatNum(r.torqueAtDrum_Nm, 2)} / ${formatNum(r.torqueStart_Nm, 2)} N·m</div></div>
            <div class="metric"><div class="label">Potencia motor régimen / pico</div><div class="value">${formatNum((d.powerMotorRun_W ?? 0) / 1000, 3)} / ${formatNum((d.powerMotorStart_W ?? 0) / 1000, 3)} kW</div></div>
            <div class="metric"><div class="label">Caudal másico</div><div class="value">${formatNum(r.massFlow_kg_s, 3)} kg/s</div></div>
          </div>
        </div>
      </details>
    `;
  }

  if (els.engineeringReport) {
    els.engineeringReport.innerHTML = renderFullEngineeringAside(r, {
      shaftLabel: 'rodillo motriz',
      shaftOutLabel: 'Salida reductor / rodillo',
      motorSubtitle: 'Referencia con motor asíncrono industrial para línea de rodillos.',
    });
  }

  if (els.motorBlock) {
    els.motorBlock.innerHTML = renderBrandRecommendationCards(getDriveRequirements());
  }

  if (els.assumptions) {
    els.assumptions.innerHTML = (r.assumptions || []).map((a) => `<li>${a}</li>`).join('');
  }

  if (els.premiumOpt) {
    els.premiumOpt.innerHTML =
      isPremiumEffective() && FEATURES.safetyOptimization
        ? `<section class="panel"><h2><span class="panel-icon">?</span> Optimización (premium)</h2><p class="muted" style="margin:0">Espacio reservado para validaciones avanzadas.</p></section>`
        : '';
  }

  if (els.premiumPdfMount) {
    mountPremiumPdfExportBar(els.premiumPdfMount, {
      isPremium: isPremiumEffective(),
      getPayload: () => ({
        machineType: 'transportador_rodillos',
        machineLabel: 'Transportador de rodillos',
        timestampIso: new Date().toISOString(),
        inputs: raw,
        outputs: r,
      }),
    });
  }
}

inputIds.forEach((id) => {
  document.getElementById(id)?.addEventListener('input', refresh);
  document.getElementById(id)?.addEventListener('change', refresh);
});
selectIds.forEach((id) => {
  document.getElementById(id)?.addEventListener('change', () => {
    syncLoadDutyUi();
    refresh();
  });
});

injectMountingConfigSection();
MOUNTING_INPUT_IDS.forEach((id) => {
  document.getElementById(id)?.addEventListener('input', refresh);
  document.getElementById(id)?.addEventListener('change', refresh);
});

try {
  initMotorVerification(document.getElementById('verifyPanel'), getDriveRequirements);
} catch (err) {
  console.error(err);
}

document.getElementById('btnCalcular')?.addEventListener('click', () => {
  refresh();
  openMotorsRecommendationsAndScroll('section-motores');
});

syncLoadDutyUi();
refresh();

