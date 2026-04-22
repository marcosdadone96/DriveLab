/**
 * Página cinta inclinada — motor de cálculo detallado.
 */

import { FEATURES } from '../config/features.js';
import { isPremiumEffective } from '../services/accessTier.js';
import { computeInclinedConveyor } from '../modules/inclinedConveyor.js';
import { LOAD_DUTY_OPTIONS } from '../modules/serviceFactorByDuty.js';
import { buildInputPhaseAlerts, buildResultPhaseAlerts } from '../modules/conveyorDesignAlerts.js';
import { renderInclinedConveyorDiagram } from './diagramInclined.js';
import { renderBrandRecommendationCards, initMotorVerification } from './driveSelection.js';
import { renderFullEngineeringAside } from './engineeringReport.js';
import { mountPremiumPdfExportBar, buildInclinedPdfPayload } from '../services/reportPdfExport.js';
import { readMountingPreferences } from '../modules/mountingPreferences.js';
import { injectMountingConfigSection, MOUNTING_INPUT_IDS } from './mountingConfigSection.js';
import { openMotorsRecommendationsAndScroll } from './motorsCollapsible.js';

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
  };
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

function refresh() {
  const els = getEls();
  try {
    clearRuntimeError();
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
              text: 'No se puede calcular la potencia de motor: revise η (1–99 % en el cálculo).',
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
        `Pendiente ${formatNum(r.angle_deg, 1)}°`,
        `Tambor ${formatNum(raw.rollerDiameter_mm, 0)} mm`,
        mount.machineShaftDiameter_mm != null ? `eje ${formatNum(mount.machineShaftDiameter_mm, 0)} mm` : null,
      ]
        .filter(Boolean)
        .join(' · ');
      const normaRow =
        r.steadyStandardMultiplier > 1
          ? `<div class="metric"><div class="label">Margen normativo (régimen)</div><div class="value">×${formatNum(r.steadyStandardMultiplier, 2)} (${r.designStandard})</div></div>`
          : '';
      els.results.innerHTML = `
    <div class="result-focus-grid">
      <div class="metric"><div class="label">Par requerido</div><div class="value">${formatNum(r.torqueWithService_Nm, 2)} N·m</div></div>
      <div class="metric"><div class="label">Factor de servicio</div><div class="value">${formatNum(r.serviceFactorUsed ?? raw.serviceFactor, 2)}</div></div>
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
            <span class="motors-details__hint">Fuerzas, par parcial y descomposición de cálculo</span>
          </span>
        </span>
      </summary>
      <div class="motors-details__body">
        <div class="results-grid">
          ${normaRow}
          <div class="metric"><div class="label">Ángulo de pendiente</div><div class="value">${formatNum(r.angle_deg, 2)}°</div></div>
          <div class="metric"><div class="label">Fuerza régimen (tambor)</div><div class="value">${formatNum(d.F_steady_N, 0)} N</div></div>
          <div class="metric"><div class="label">Fuerza arranque (pico)</div><div class="value">${formatNum(d.F_total_start_N, 0)} N</div></div>
          <div class="metric"><div class="label">Peso en pendiente (carga+banda)</div><div class="value">${formatNum((d.F_g_load_N ?? 0) + (d.F_g_belt_N ?? 0), 0)} N</div></div>
          <div class="metric"><div class="label">Rozamiento (carga+banda)</div><div class="value">${formatNum((d.F_mu_load_N ?? 0) + (d.F_mu_belt_N ?? 0), 0)} N</div></div>
          <div class="metric"><div class="label">Par régimen / arranque</div><div class="value">${formatNum(r.torqueAtDrum_Nm, 1)} / ${formatNum(r.torqueStart_Nm, 1)} N·m</div></div>
          <div class="metric"><div class="label">Caudal másico</div><div class="value">${formatNum(r.massFlow_kg_s, 3)} kg/s</div></div>
          <div class="metric"><div class="label">Potencia motor régimen / pico</div><div class="value">${formatNum((d.powerMotorRun_W ?? 0) / 1000, 3)} / ${formatNum((d.powerMotorStart_W ?? 0) / 1000, 3)} kW</div></div>
        </div>
      </div>
    </details>
  `;
    }

    if (els.engineeringReport) {
      try {
        els.engineeringReport.innerHTML = renderFullEngineeringAside(r);
      } catch (err) {
        console.error(err);
        els.engineeringReport.innerHTML = `<div class="motor-error">Error informe: ${String(err.message || err)}</div>`;
      }
    }

    if (els.motorBlock) {
      try {
        els.motorBlock.innerHTML = renderBrandRecommendationCards(getDriveRequirements());
      } catch (err) {
        console.error(err);
        els.motorBlock.innerHTML = `<div class="motor-error">Motorreductores: ${String(err.message || err)}</div>`;
      }
    }

    if (els.premiumPdfMount) {
      mountPremiumPdfExportBar(els.premiumPdfMount, {
        isPremium: isPremiumEffective(),
        getPayload: () => buildInclinedPdfPayload(raw, r),
      });
    }

    if (els.assumptions) {
      els.assumptions.innerHTML = (r.assumptions || []).map((a) => `<li>${a}</li>`).join('');
    }

    if (els.premiumOpt) {
      if (isPremiumEffective() && FEATURES.safetyOptimization) {
        els.premiumOpt.innerHTML = `
      <section class="panel">
        <h2><span class="panel-icon">★</span> Optimización (premium)</h2>
        <p class="muted" style="margin:0">Freno / anti-retorno: reservado.</p>
      </section>
    `;
      } else {
        els.premiumOpt.innerHTML = '';
      }
    }
  } catch (err) {
    console.error(err);
    showRuntimeError(
      `Error al calcular: ${String(err.message || err)}. Use servidor HTTP si abre con file://. Consola F12 para más detalle.`,
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

syncIncLoadDutyUi();
refresh();



