/**
 * Página transportador de tornillo helicoidal.
 */

import { isPremiumEffective } from '../services/accessTier.js';
import { computeScrewConveyor, diameterToMeters, pitchToMeters } from '../modules/screwConveyor.js';
import { LOAD_DUTY_OPTIONS } from '../modules/serviceFactorByDuty.js';
import { renderBrandRecommendationCards, initMotorVerification } from './driveSelection.js';
import { renderFullEngineeringAside } from './engineeringReport.js';
import { renderScrewConveyorDiagram } from './diagramScrew.js';
import { mountPremiumPdfExportBar, buildScrewPdfPayload } from '../services/reportPdfExport.js';
import { readMountingPreferences } from '../modules/mountingPreferences.js';
import { injectMountingConfigSection, MOUNTING_INPUT_IDS } from './mountingConfigSection.js';
import { openMotorsRecommendationsAndScroll } from './motorsCollapsible.js';

const inputIds = [
  'screwCap',
  'screwDiam',
  'screwPitch',
  'screwLength',
  'screwAngle',
  'screwRho',
  'screwMu',
  'screwBearingEta',
  'screwServiceFactor',
];

const selectIds = [
  'screwCapUnit',
  'screwDiamUnit',
  'screwPitchUnit',
  'screwTroughLoad',
  'screwAbrasive',
  'screwCorrosive',
  'screwLoadDuty',
];

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
    readSelect('screwLoadDuty', 'moderate')
  );
  return {
    capValue: readNum('screwCap', 45),
    capUnit: /** @type {'m3h'|'th'} */ (readSelect('screwCapUnit', 'm3h')),
    diamValue: readNum('screwDiam', 315),
    diamUnit: /** @type {'mm'|'in'} */ (readSelect('screwDiamUnit', 'mm')),
    pitchValue: readNum('screwPitch', 280),
    pitchUnit: /** @type {'mm'|'in'} */ (readSelect('screwPitchUnit', 'mm')),
    length_m: readNum('screwLength', 12),
    angle_deg: readNum('screwAngle', 0),
    rho_kg_m3: readNum('screwRho', 750),
    troughLoadPct: /** @type {'15'|'30'|'45'} */ (readSelect('screwTroughLoad', '30')),
    abrasive: /** @type {'low'|'medium'|'high'} */ (readSelect('screwAbrasive', 'low')),
    corrosive: /** @type {'low'|'medium'|'high'} */ (readSelect('screwCorrosive', 'low')),
    frictionCoeff: readNum('screwMu', 0.38),
    bearingMechanicalEff_pct: readNum('screwBearingEta', 92),
    loadDuty: duty,
    serviceFactor: readNum('screwServiceFactor', 1.35),
  };
}

function syncLoadDutyUi() {
  const dutyEl = document.getElementById('screwLoadDuty');
  const sfIn = document.getElementById('screwServiceFactor');
  const hint = document.getElementById('screwLoadDutyHint');
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
    diagram: /** @type {SVGSVGElement | null} */ (document.getElementById('diagramScrew')),
    results: document.getElementById('screwResultsGrid'),
    rpmIndicator: document.getElementById('screwRpmIndicator'),
    engineeringReport: document.getElementById('screwEngineeringReport'),
    motorBlock: document.getElementById('screwMotorBlock'),
    premiumPdfMount: document.getElementById('premiumPdfExportMount'),
    assumptions: document.getElementById('screwAssumptionsList'),
    runtimeError: document.getElementById('runtimeError'),
    designAlerts: document.getElementById('screwDesignAlerts'),
  };
}

function getDriveRequirements() {
  const r = computeScrewConveyor(readInputs());
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

const recoCopyScrew = {
  torqueLabel: 'par en eje tornillo',
  rpmLabel: 'rpm del tornillo',
  rpmShortLabel: 'n tornillo',
  contextHtml: `Selección orientativa según <strong>potencia de eje</strong>, <strong>par de diseño</strong> y <strong>velocidad del tornillo</strong>.
        Confirme con el fabricante del transportador (pasos, revestimiento, RPM máx.).`,
};

function renderRpmIndicator(el, r) {
  if (!el) return;
  const risk = r.rpmRisk;
  if (!risk) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  const mod = risk.level === 'high' ? 'high' : risk.level === 'caution' ? 'caution' : 'ok';
  const title =
    risk.level === 'high'
      ? 'RPM elevadas para el material'
      : risk.level === 'caution'
        ? 'RPM en zona alta'
        : 'Régimen RPM — OK (orientativo)';
  el.innerHTML = `
    <div class="screw-rpm-indicator__card screw-rpm-indicator__card--${mod}" role="status">
      <div class="screw-rpm-indicator__icon" aria-hidden="true">${risk.level === 'high' ? '⚠' : risk.level === 'caution' ? '◆' : '✓'}</div>
      <div>
        <strong class="screw-rpm-indicator__title">${escHtml(title)}</strong>
        <p class="screw-rpm-indicator__text">${escHtml(risk.label)}</p>
        <p class="screw-rpm-indicator__nums">n ≈ <strong>${formatNum(r.screwRpm, 1)}</strong> rpm · tope orientativo ≈ <strong>${formatNum(r.screwRpmMaxSuggested, 0)}</strong> rpm (ratio ≈ ${formatNum(risk.ratio, 2)})</p>
      </div>
    </div>`;
}

function refresh() {
  const els = getEls();
  try {
    clearRuntimeError();
    const raw = readInputs();
    const r = computeScrewConveyor(raw);
    const d = r.detail || {};
    const Dmm = (d.D_m ?? diameterToMeters(raw.diamValue, raw.diamUnit)) * 1000;
    const pitchMm = (d.pitch_m ?? pitchToMeters(raw.pitchValue, raw.pitchUnit)) * 1000;

    if (els.diagram) {
      const capU = raw.capUnit === 'th' ? 't/h' : 'm³/h';
      renderScrewConveyorDiagram(els.diagram, {
        length_m: raw.length_m,
        diameter_mm: Dmm,
        pitch_mm: pitchMm,
        angle_deg: raw.angle_deg,
        screwRpm: r.screwRpm,
        capLabel: `${raw.capValue} ${capU}`,
        troughLabel: `${raw.troughLoadPct} %`,
      });
    }

    renderRpmIndicator(els.rpmIndicator, r);

    if (els.designAlerts) {
      const alerts = [];
      if (raw.angle_deg > 45) {
        alerts.push({
          level: /** @type {const} */ ('warn'),
          text: 'Inclinaciones altas: el modelo simplificado puede subestimar o sobreestimar; consulte al fabricante del tornillo.',
        });
      }
      if (r.rpmRisk?.level === 'high') {
        alerts.push({ level: /** @type {const} */ ('error'), text: r.rpmRisk.label });
      } else if (r.rpmRisk?.level === 'caution') {
        alerts.push({ level: /** @type {const} */ ('warn'), text: r.rpmRisk.label });
      }
      els.designAlerts.innerHTML = alerts
        .map((a) => `<p class="design-alert design-alert--${a.level}">${escHtml(a.text)}</p>`)
        .join('');
    }

    const hp = r.requiredMotorPower_kW * 1.34102;
    if (els.results) {
      const mount = readMountingPreferences();
      const mechanicalSummary = [
        `Ø ${formatNum(Dmm, 0)} mm`,
        `paso ${formatNum(pitchMm, 0)} mm`,
        mount.machineShaftDiameter_mm != null ? `eje ${formatNum(mount.machineShaftDiameter_mm, 0)} mm` : null,
      ]
        .filter(Boolean)
        .join(' · ');
      els.results.innerHTML = `
    <div class="result-focus-grid">
      <div class="metric"><div class="label">Par requerido</div><div class="value">${formatNum(r.torqueWithService_Nm, 1)} N·m</div></div>
      <div class="metric"><div class="label">Factor de servicio</div><div class="value">${formatNum(r.serviceFactorUsed ?? 1, 3)}</div></div>
      <div class="metric metric--text"><div class="label">Tipo de montaje</div><div class="value">${formatMounting(mount)}</div></div>
      <div class="metric"><div class="label">Velocidad</div><div class="value">${formatNum(r.screwRpm, 1)} rpm</div></div>
      <div class="metric"><div class="label">Motor (kW)</div><div class="value">${formatNum(r.requiredMotorPower_kW, 3)} kW</div></div>
      <div class="metric metric--text"><div class="label">Detalles mecánicos</div><div class="value">${mechanicalSummary}</div></div>
    </div>
    <details class="motors-details result-focus-extra">
      <summary class="motors-details__summary">
        <span class="motors-details__summary-main">
          <span class="panel-icon">≡</span>
          <span class="motors-details__text">
            <span class="motors-details__title">Resultado completo</span>
            <span class="motors-details__hint">Potencias auxiliares, caudales y unidades extendidas</span>
          </span>
        </span>
      </summary>
      <div class="motors-details__body">
        <div class="results-grid">
          <div class="metric"><div class="label">Potencia (HP, diseño)</div><div class="value">${formatNum(hp, 3)} HP</div></div>
          <div class="metric"><div class="label">Potencia eje (sin margen SF)</div><div class="value">${formatNum(r.shaftPower_kW, 3)} kW</div></div>
          <div class="metric"><div class="label">Par en eje tornillo (régimen)</div><div class="value">${formatNum(r.torqueAtDrum_Nm, 1)} N·m</div></div>
          <div class="metric"><div class="label">Velocidad axial bulk</div><div class="value">${formatNum((r.axialSpeed_m_s ?? 0) * 1000, 1)} mm/s</div></div>
          <div class="metric"><div class="label">Caudal másico</div><div class="value">${formatNum(r.massFlow_kg_s, 3)} kg/s</div></div>
          <div class="metric"><div class="label">Capacidad (m³/h)</div><div class="value">${formatNum(r.cap_m3h, 2)} m³/h</div></div>
        </div>
      </div>
    </details>
  `;
    }

    if (els.engineeringReport) {
      try {
        els.engineeringReport.innerHTML = renderFullEngineeringAside(r, {
          shaftLabel: 'eje tornillo',
          shaftOutLabel: 'Salida reductor / eje tornillo',
          motorSubtitle:
            'Referencia ~4 polos 50 Hz para relación de reductor; el régimen del tornillo es el calculado por capacidad y geometría.',
        });
      } catch (err) {
        console.error(err);
        els.engineeringReport.innerHTML = `<div class="motor-error">Error informe: ${String(err.message || err)}</div>`;
      }
    }

    if (els.motorBlock) {
      try {
        els.motorBlock.innerHTML = renderBrandRecommendationCards(getDriveRequirements(), recoCopyScrew);
      } catch (err) {
        console.error(err);
        els.motorBlock.innerHTML = `<div class="motor-error"><strong>Motorreductores:</strong> ${String(err.message || err)}</div>`;
      }
    }

    if (els.premiumPdfMount) {
      mountPremiumPdfExportBar(els.premiumPdfMount, {
        isPremium: isPremiumEffective(),
        getPayload: () => buildScrewPdfPayload(raw, r),
      });
    }

    if (els.assumptions) {
      els.assumptions.innerHTML = (r.assumptions || []).map((a) => `<li>${escHtml(a)}</li>`).join('');
    }
  } catch (err) {
    console.error(err);
    showRuntimeError(`Error al calcular: ${String(err.message || err)}`);
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
      if (id === 'screwLoadDuty') syncLoadDutyUi();
      refresh();
    });
  }
});

try {
  initMotorVerification(document.getElementById('screwVerifyPanel'), getDriveRequirements);
} catch (e) {
  console.error(e);
}

document.getElementById('btnScrewCalc')?.addEventListener('click', () => {
  refresh();
  openMotorsRecommendationsAndScroll('section-screw-motores');
});

injectMountingConfigSection();
MOUNTING_INPUT_IDS.forEach((id) => {
  document.getElementById(id)?.addEventListener('input', refresh);
  document.getElementById(id)?.addEventListener('change', refresh);
});

syncLoadDutyUi();
refresh();



