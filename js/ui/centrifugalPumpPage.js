/**
 * Página bomba centrífuga — mismo patrón que cintas: resultados, informe, motorreductores, PDF Pro.
 */

import { FEATURES } from '../config/features.js';
import { isPremiumEffective } from '../services/accessTier.js';
import {
  computeCentrifugalPump,
  buildPumpInstallationAlerts,
  FLUID_TYPE_PRESETS,
} from '../modules/centrifugalPump.js';
import { LOAD_DUTY_OPTIONS } from '../modules/serviceFactorByDuty.js';
import { renderBrandRecommendationCards, initMotorVerification } from './driveSelection.js';
import { renderFullEngineeringAside } from './engineeringReport.js';
import { renderCentrifugalPumpDiagram } from './diagramPump.js';
import { mountPremiumPdfExportBar, buildPumpPdfPayload } from '../services/reportPdfExport.js';
import { readMountingPreferences } from '../modules/mountingPreferences.js';
import { injectMountingConfigSection, MOUNTING_INPUT_IDS } from './mountingConfigSection.js';
import { openMotorsRecommendationsAndScroll } from './motorsCollapsible.js';

const pumpInputIds = [
  'pumpFlow',
  'pumpHead',
  'pumpEta',
  'rho',
  'viscosity',
  'tempC',
  'pumpSpeedRpm',
  'pumpServiceFactor',
  'suctionKpa',
  'pipeDiamMm',
  'dailyHours',
  'pumpVoltage',
  'pumpFreq',
];

const pumpSelectIds = ['pumpFlowUnit', 'fluidType', 'pumpLoadDuty', 'couplingType'];

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
  const premium = isPremiumEffective();
  const duty = /** @type {'uniform'|'moderate'|'heavy'|'custom'} */ (
    readSelect('pumpLoadDuty', 'moderate')
  );
  return {
    flowValue: readNum('pumpFlow', 48),
    flowUnit: /** @type {'m3h'|'lmin'} */ (readSelect('pumpFlowUnit', 'm3h')),
    head_m: readNum('pumpHead', 32),
    etaPump_pct: readNum('pumpEta', 75),
    fluidType: /** @type {'water'|'oil'|'brine'|'slurry'} */ (readSelect('fluidType', 'water')),
    rho_kg_m3: readNum('rho', 1000),
    viscosity_mm2_s: readNum('viscosity', 1),
    temp_C: readNum('tempC', 20),
    pumpSpeed_rpm: readNum('pumpSpeedRpm', 1455),
    loadDuty: duty,
    serviceFactor: readNum('pumpServiceFactor', 1.35),
    couplingType: /** @type {'direct'|'gearmotor'} */ (readSelect('couplingType', 'gearmotor')),
    voltage_V: readNum('pumpVoltage', 400),
    frequency_Hz: readNum('pumpFreq', 50),
    installationProActive: premium,
    suctionPressure_kPa_gauge: premium ? readNum('suctionKpa', 0) : undefined,
    pipeDiameter_mm: premium ? readNum('pipeDiamMm', 100) : undefined,
    dailyRunHours: premium ? readNum('dailyHours', 8) : undefined,
  };
}

function syncLoadDutyUi() {
  const dutyEl = document.getElementById('pumpLoadDuty');
  const sfIn = document.getElementById('pumpServiceFactor');
  const hint = document.getElementById('pumpLoadDutyHint');
  if (!(dutyEl instanceof HTMLSelectElement) || !(sfIn instanceof HTMLInputElement)) return;

  const duty = dutyEl.value;
  const row = LOAD_DUTY_OPTIONS.find((o) => o.id === duty);
  if (hint && row) hint.textContent = row.hint;

  if (duty === 'custom') {
    sfIn.readOnly = false;
    sfIn.classList.remove('input-synced');
  } else {
    sfIn.readOnly = true;
    sfIn.classList.add('input-synced');
    if (row && row.sf != null) sfIn.value = String(row.sf);
  }
}

function applyFluidPresetFromSelect() {
  const type = readSelect('fluidType', 'water');
  const p = FLUID_TYPE_PRESETS[type];
  if (!p) return;
  const rhoEl = document.getElementById('rho');
  const nuEl = document.getElementById('viscosity');
  if (rhoEl instanceof HTMLInputElement) rhoEl.value = String(p.rho);
  if (nuEl instanceof HTMLInputElement) nuEl.value = String(p.nu_default);
}

function syncProInstallUi() {
  const wrap = document.getElementById('proInstallWrap');
  const fields = document.getElementById('proInstallFields');
  const teaser = document.getElementById('proInstallTeaser');
  const ok = isPremiumEffective();
  if (wrap) wrap.classList.toggle('pro-install-wrap--locked', !ok);
  if (fields) {
    fields.querySelectorAll('input, select').forEach((el) => {
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) el.disabled = !ok;
    });
  }
  if (teaser) teaser.hidden = ok;
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
    diagram: /** @type {SVGSVGElement | null} */ (document.getElementById('diagramPump')),
    results: document.getElementById('pumpResultsGrid'),
    engineeringReport: document.getElementById('pumpEngineeringReport'),
    motorBlock: document.getElementById('pumpMotorBlock'),
    premiumPdfMount: document.getElementById('premiumPdfExportMount'),
    premiumOpt: document.getElementById('pumpPremiumOptBlock'),
    assumptions: document.getElementById('pumpAssumptionsList'),
    runtimeError: document.getElementById('runtimeError'),
    designAlerts: document.getElementById('pumpDesignAlerts'),
  };
}

function getDriveRequirements() {
  const r = computeCentrifugalPump(readInputs());
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
  const typeMap = { B3: 'B3 patas', B5: 'B5 brida', B14: 'B14 brida', hollowShaft: 'Eje hueco' };
  return `${typeMap[pref.mountingType] || pref.mountingType} · ${pref.orientation === 'vertical' ? 'Vertical' : 'Horizontal'}`;
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

const recoCopyPump = {
  torqueLabel: 'par en eje bomba',
  rpmLabel: 'rpm del eje de la bomba',
  rpmShortLabel: 'n eje',
  contextHtml: `Puntos de partida según la <strong>potencia de eje</strong> exigida por la bomba, el <strong>par de diseño</strong> en el eje y la <strong>velocidad de giro</strong>.
        Misma lógica de catálogo que en cintas; valide curva completa y NPSH con el fabricante de la bomba.`,
};

function refresh() {
  const els = getEls();
  try {
    clearRuntimeError();
    const raw = readInputs();
    const r = computeCentrifugalPump(raw);
    const d = r.detail || {};

    const etaEl = document.getElementById('pumpEta');
    if (etaEl instanceof HTMLInputElement) {
      const bad = (r.efficiency_pct_raw ?? 0) > 99 || (r.efficiency_pct_raw ?? 0) < 25;
      etaEl.classList.toggle('field-input--danger', bad);
    }

    if (els.diagram) {
      const flowUnitLabel = raw.flowUnit === 'lmin' ? 'L/min' : 'm³/h';
      const flowLabel = `${raw.flowValue} ${flowUnitLabel}`;
      const preset = FLUID_TYPE_PRESETS[raw.fluidType];
      const fluidShort = preset
        ? `${preset.label} · ${raw.rho_kg_m3} kg/m³`
        : `${raw.rho_kg_m3} kg/m³`;
      renderCentrifugalPumpDiagram(els.diagram, {
        flowLabel,
        head_m: raw.head_m,
        pumpSpeed_rpm: raw.pumpSpeed_rpm,
        hydraulicPower_kW: r.hydraulicPower_kW,
        shaftPower_kW: r.shaftPower_kW,
        etaPump_pct: raw.etaPump_pct,
        couplingType: raw.couplingType,
        fluidShort,
      });
    }

    if (els.designAlerts) {
      const alerts = [];
      const η = r.efficiency_pct_raw ?? raw.etaPump_pct;
      if (η > 92) {
        alerts.push({
          level: /** @type {const} */ ('warn'),
          text: 'Rendimiento η muy alto para un punto único: confirme en la curva del fabricante (η suele variar con Q).',
        });
      }
      if (η < 35) {
        alerts.push({
          level: /** @type {const} */ ('warn'),
          text: 'Rendimiento bajo: revise si el punto es extrapolado o si hay desgaste / recirculación.',
        });
      }
      if (raw.installationProActive) {
        alerts.push(
          ...buildPumpInstallationAlerts({
            Q_m3s: d.Q_m3s ?? 0,
            pipeDiameter_mm: raw.pipeDiameter_mm,
            suctionPressure_kPa_gauge: raw.suctionPressure_kPa_gauge,
            temp_C: raw.temp_C,
          }),
        );
      }
      if (FEATURES.safetyOptimization && raw.installationProActive && raw.dailyRunHours != null && raw.dailyRunHours >= 20) {
        alerts.push({
          level: 'info',
          text: `Servicio prolongado (${raw.dailyRunHours} h/día): se ha endurecido el factor de servicio respecto al valor base del tipo de carga.`,
        });
      }
      els.designAlerts.innerHTML = alerts
        .map((a) => `<p class="design-alert design-alert--${a.level}">${escHtml(a.text)}</p>`)
        .join('');
    }

    if (els.results) {
      const mount = readMountingPreferences();
      const mechanicalSummary = [
        `Acople ${raw.couplingType === 'direct' ? 'directo' : 'motorreductor'}`,
        raw.pipeDiameter_mm ? `tubería ${formatNum(raw.pipeDiameter_mm, 0)} mm` : null,
        mount.machineShaftDiameter_mm != null ? `eje ${formatNum(mount.machineShaftDiameter_mm, 0)} mm` : null,
      ]
        .filter(Boolean)
        .join(' · ');
      const instNote = raw.installationProActive
        ? ''
        : `<div class="metric"><div class="label">Instalación (Pro)</div><div class="value muted">Actíve Pro para succión, tubería y horario</div></div>`;
      els.results.innerHTML = `
    <div class="result-focus-grid">
      <div class="metric"><div class="label">Par requerido</div><div class="value">${formatNum(r.torqueWithService_Nm, 2)} N·m</div></div>
      <div class="metric"><div class="label">Factor de servicio</div><div class="value">${formatNum(r.serviceFactorUsed ?? 1, 3)}</div></div>
      <div class="metric metric--text"><div class="label">Tipo de montaje</div><div class="value">${formatMounting(mount)}</div></div>
      <div class="metric"><div class="label">Velocidad</div><div class="value">${formatNum(r.drumRpm, 2)} rpm</div></div>
      <div class="metric"><div class="label">Motor (kW)</div><div class="value">${formatNum(r.requiredMotorPower_kW, 3)} kW</div></div>
      <div class="metric metric--text"><div class="label">Detalles mecánicos</div><div class="value">${mechanicalSummary}</div></div>
    </div>
    <details class="motors-details result-focus-extra">
      <summary class="motors-details__summary">
        <span class="motors-details__summary-main">
          <span class="panel-icon">≡</span>
          <span class="motors-details__text">
            <span class="motors-details__title">Resultado completo</span>
            <span class="motors-details__hint">Hidráulica, correcciones y datos de proceso</span>
          </span>
        </span>
      </summary>
      <div class="motors-details__body">
        <div class="results-grid">
          <div class="metric"><div class="label">Potencia hidráulica P_h</div><div class="value">${formatNum(r.hydraulicPower_kW, 3)} kW</div></div>
          <div class="metric"><div class="label">Potencia eje bomba (sin SF)</div><div class="value">${formatNum(r.shaftPower_kW, 3)} kW</div></div>
          <div class="metric"><div class="label">Factor corrección ν / fluido</div><div class="value">${formatNum(r.viscosityFactor ?? 1, 3)}</div></div>
          <div class="metric"><div class="label">Caudal másico</div><div class="value">${formatNum(r.massFlow_kg_s, 3)} kg/s</div></div>
          <div class="metric"><div class="label">Par en eje (régimen)</div><div class="value">${formatNum(r.torqueAtDrum_Nm, 2)} N·m</div></div>
          ${instNote}
        </div>
      </div>
    </details>
  `;
    }

    if (els.engineeringReport) {
      try {
        els.engineeringReport.innerHTML = renderFullEngineeringAside(r, {
          shaftLabel: 'eje bomba',
          shaftOutLabel: 'Salida reductor / eje bomba',
          motorSubtitle:
            'Referencia motor ~4 polos a 50 Hz; si usa variador o otro polo, ajuste el régimen nominal del eje bomba en el formulario.',
        });
      } catch (err) {
        console.error(err);
        els.engineeringReport.innerHTML = `<div class="motor-error">Error informe: ${String(err.message || err)}</div>`;
      }
    }

    if (els.motorBlock) {
      try {
        els.motorBlock.innerHTML = renderBrandRecommendationCards(getDriveRequirements(), recoCopyPump);
      } catch (err) {
        console.error(err);
        els.motorBlock.innerHTML = `<div class="motor-error"><strong>Motorreductores:</strong> ${String(err.message || err)}</div>`;
      }
    }

    if (els.premiumPdfMount) {
      mountPremiumPdfExportBar(els.premiumPdfMount, {
        isPremium: isPremiumEffective(),
        getPayload: () => buildPumpPdfPayload(raw, r),
      });
    }

    if (els.assumptions) {
      els.assumptions.innerHTML = (r.assumptions || []).map((a) => `<li>${escHtml(a)}</li>`).join('');
    }

    if (els.premiumOpt) {
      if (isPremiumEffective() && FEATURES.safetyOptimization && raw.installationProActive) {
        els.premiumOpt.innerHTML = `
      <section class="panel premium-block">
        <h2><span class="panel-icon">★</span> Seguridad y servicio (Pro)</h2>
        <p class="muted" style="margin:0 0 0.5rem">
          Horas/día y succión alimentan avisos y el endurecimiento del SF. Para NPSH disponible detallado use el método del fabricante o norma aplicable.
        </p>
        <ul class="assumptions">
          <li>Presión succión introducida: <strong>${raw.suctionPressure_kPa_gauge != null ? `${raw.suctionPressure_kPa_gauge} kPa` : '—'}</strong></li>
          <li>Horario: <strong>${raw.dailyRunHours != null ? `${raw.dailyRunHours} h/día` : '—'}</strong></li>
        </ul>
      </section>
    `;
      } else {
        els.premiumOpt.innerHTML = '';
      }
    }
  } catch (err) {
    console.error(err);
    showRuntimeError(
      `Error al calcular: ${String(err.message || err)}. Use servidor local (npx serve) y revise la consola (F12).`,
    );
  }
}

pumpInputIds.forEach((id) => {
  const el = document.getElementById(id);
  if (el instanceof HTMLInputElement) {
    el.addEventListener('input', refresh);
    el.addEventListener('change', refresh);
  }
});

pumpSelectIds.forEach((id) => {
  const el = document.getElementById(id);
  if (el instanceof HTMLSelectElement) {
    el.addEventListener('change', () => {
      if (id === 'fluidType') applyFluidPresetFromSelect();
      if (id === 'pumpLoadDuty') syncLoadDutyUi();
      refresh();
    });
  }
});

try {
  initMotorVerification(document.getElementById('pumpVerifyPanel'), getDriveRequirements);
} catch (e) {
  console.error(e);
}

document.getElementById('btnPumpCalc')?.addEventListener('click', () => {
  refresh();
  openMotorsRecommendationsAndScroll('section-pump-motores');
});

injectMountingConfigSection();
MOUNTING_INPUT_IDS.forEach((id) => {
  document.getElementById(id)?.addEventListener('input', refresh);
  document.getElementById(id)?.addEventListener('change', refresh);
});

syncProInstallUi();
syncLoadDutyUi();
refresh();



