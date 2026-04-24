/**
 * Página transportador de tornillo helicoidal.
 */

import { isPremiumEffective } from '../services/accessTier.js';
import { computeScrewConveyor, diameterToMeters, pitchToMeters } from '../modules/screwConveyor.js';
import { LOAD_DUTY_OPTIONS, LOAD_DUTY_OPTIONS_EN } from '../modules/serviceFactorByDuty.js';
import {
  renderBrandRecommendationCards,
  initMotorVerification,
  refreshMotorVerificationManual,
} from './driveSelection.js';
import { renderFullEngineeringAside } from './engineeringReport.js';
import { renderScrewConveyorDiagram } from './diagramScrew.js';
import { mountPremiumPdfExportBar, buildScrewPdfPayload } from '../services/reportPdfExport.js';
import { readMountingPreferences } from '../modules/mountingPreferences.js';
import { injectMountingConfigSection } from './mountingConfigSection.js';
import { SCREW_LANG_EVENT } from './screwConveyorStaticI18n.js';
import { openMotorsRecommendationsAndScroll } from './motorsCollapsible.js';
import { applyMachinePremiumGates } from './machinePremiumGates.js';
import { foldAllMachineDetailsOncePerPageLoad } from './machineDetailsFold.js';
import { initInfoChipPopovers } from './infoChipPopover.js';
import { getI18nLabels } from '../config/i18nLabels.js';
import { getCurrentLang } from '../config/locales.js';

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
    lang: getCurrentLang(),
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

/** Option text aligned with screwConveyorStaticI18n.applySelectOptions (SF shorthand). */
const SCREW_LOAD_DUTY_OPTION_COPY = Object.freeze({
  uniform: { es: 'Carga uniforme \u2014 SF \u2248 1,15', en: 'Uniform load \u2014 SF \u2248 1.15' },
  moderate: { es: 'Choque moderado \u2014 SF \u2248 1,35', en: 'Moderate shock \u2014 SF \u2248 1.35' },
  heavy: { es: 'Choque pesado \u2014 SF \u2248 1,75', en: 'Heavy shock \u2014 SF \u2248 1.75' },
  custom: { es: 'Personalizado', en: 'Custom' },
});

function syncLoadDutyUi() {
  const dutyEl = document.getElementById('screwLoadDuty');
  const sfIn = document.getElementById('screwServiceFactor');
  const hint = document.getElementById('screwLoadDutyHint');
  if (!(dutyEl instanceof HTMLSelectElement) || !(sfIn instanceof HTMLInputElement)) return;
  const lang = getCurrentLang();
  const en = lang === 'en';
  const t = en ? 'en' : 'es';
  LOAD_DUTY_OPTIONS.forEach((optRow) => {
    const opt = dutyEl.querySelector(`option[value="${optRow.id}"]`);
    const copy = SCREW_LOAD_DUTY_OPTION_COPY[optRow.id];
    if (opt) opt.textContent = copy ? copy[t] : en ? LOAD_DUTY_OPTIONS_EN[optRow.id].label : optRow.label;
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

function clampNum(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

function bindScrewRangeSlider(rangeId, numId, lo, hi, step = null) {
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

function formatMounting(pref, lang = getCurrentLang()) {
  const en = lang === 'en';
  const typeMap = en
    ? { B3: 'B3 foot mount', B5: 'B5 flange', B14: 'B14 flange', hollowShaft: 'Hollow shaft' }
    : { B3: 'B3 patas', B5: 'B5 brida', B14: 'B14 brida', hollowShaft: 'Eje hueco' };
  const ori = pref.orientation === 'vertical' ? 'Vertical' : 'Horizontal';
  return `${typeMap[pref.mountingType] || pref.mountingType} \u00b7 ${ori}`;
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

function recoCopyForLang(en) {
  return en
    ? {
        torqueLabel: 'screw shaft torque',
        rpmLabel: 'screw rpm',
        rpmShortLabel: 'screw n',
        contextHtml: `Indicative selection from <strong>shaft power</strong>, <strong>design torque</strong> and <strong>screw speed</strong>.
        Confirm with the conveyor OEM (pitch, liner, max RPM).`,
      }
    : {
        torqueLabel: 'par en eje tornillo',
        rpmLabel: 'rpm del tornillo',
        rpmShortLabel: 'n tornillo',
        contextHtml: `Selección orientativa según <strong>potencia de eje</strong>, <strong>par de diseño</strong> y <strong>velocidad del tornillo</strong>.
        Confirme con el fabricante del transportador (pasos, revestimiento, RPM máx.).`,
      };
}

function renderRpmIndicator(el, r, lang) {
  if (!el) return;
  const risk = r.rpmRisk;
  const en = (lang ?? getCurrentLang()) === 'en';
  if (!risk) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  const mod = risk.level === 'high' ? 'high' : risk.level === 'caution' ? 'caution' : 'ok';
  const title =
    risk.level === 'high'
      ? en
        ? 'High RPM for this material'
        : 'RPM elevadas para el material'
      : risk.level === 'caution'
        ? en
          ? 'RPM in the high band'
          : 'RPM en zona alta'
        : en
          ? 'RPM regime — OK (indicative)'
          : 'Régimen RPM — OK (orientativo)';
  el.innerHTML = `
    <div class="screw-rpm-indicator__card screw-rpm-indicator__card--${mod}" role="status">
      <div class="screw-rpm-indicator__icon" aria-hidden="true">${risk.level === 'high' ? '⚠' : risk.level === 'caution' ? '◆' : '✓'}</div>
      <div>
        <strong class="screw-rpm-indicator__title">${escHtml(title)}</strong>
        <p class="screw-rpm-indicator__text">${escHtml(risk.label)}</p>
        <p class="screw-rpm-indicator__nums">n ≈ <strong>${formatNum(r.screwRpm, 2)}</strong> rpm · ${
          en ? 'indicative limit' : 'tope orientativo'
        } ≈ <strong>${formatNum(r.screwRpmMaxSuggested, 2)}</strong> rpm (ratio ≈ ${formatNum(
          risk.ratio,
          2,
        )})</p>
      </div>
    </div>`;
}

function refresh() {
  const LBL = getI18nLabels();
  const lang = getCurrentLang();
  const en = lang === 'en';
  const TX = en
    ? {
        torqueEyebrowSuffix: 'screw shaft',
        torqueHint: 'With service factor and material margins',
        motorPower: 'Motor power',
        motorPowerHint: 'Sized at the motor shaft',
        screwRegime: 'Screw speed',
        screwRegimeHint: 'Calculated n · validate with OEM',
        serviceFactor: 'Service factor',
        mountingType: 'Mounting type',
        speed: 'Speed',
        mechanicalDetails: 'Mechanical details',
        pitchWord: 'pitch',
        shaftWord: 'shaft',
        screwRpmLine: 'screw rpm',
        fullResult: 'Full result',
        fullResultHint: 'Forces, partial powers and extended metrics',
        hpDesign: 'Power (HP, design)',
        shaftPowerNoSf: `${LBL.shaftPower} (no SF margin)`,
        torqueSteady: 'Screw shaft torque (steady)',
        axialBulk: 'Bulk axial speed',
        capM3h: 'Capacity (m³/h)',
        reportError: 'Report error:',
        gearmotors: 'Gearmotors:',
        calcError: 'Calculation error:',
        machineDiagram: 'Machine diagram',
        steepAngle:
          'Steep inclinations: the simplified model may under- or over-predict; consult the screw OEM.',
      }
    : {
        torqueEyebrowSuffix: 'eje tornillo',
        torqueHint: 'Con factor de servicio y márgenes material',
        motorPower: 'Potencia motor',
        motorPowerHint: 'Dimensionamiento al eje del motor',
        screwRegime: 'Régimen tornillo',
        screwRegimeHint: 'n calculada · valide con fabricante',
        serviceFactor: 'Factor de servicio',
        mountingType: 'Tipo de montaje',
        speed: 'Velocidad',
        mechanicalDetails: 'Detalles mecánicos',
        pitchWord: 'paso',
        shaftWord: 'eje',
        screwRpmLine: 'rpm tornillo',
        fullResult: 'Resultado completo',
        fullResultHint: 'Fuerzas, potencias parciales y métricas extendidas',
        hpDesign: 'Potencia (HP, diseño)',
        shaftPowerNoSf: `${LBL.shaftPower} (sin margen SF)`,
        torqueSteady: 'Par en eje tornillo (régimen)',
        axialBulk: 'Velocidad axial bulk',
        capM3h: 'Capacidad (m³/h)',
        reportError: 'Error informe:',
        gearmotors: 'Motorreductores:',
        calcError: 'Error al calcular:',
        machineDiagram: 'Diagrama de la máquina',
        steepAngle:
          'Inclinaciones altas: el modelo simplificado puede subestimar o sobreestimar; consulte al fabricante del tornillo.',
      };
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
        lang,
        length_m: raw.length_m,
        diameter_mm: Dmm,
        pitch_mm: pitchMm,
        angle_deg: raw.angle_deg,
        screwRpm: r.screwRpm,
        capLabel: `${raw.capValue} ${capU}`,
        troughLabel: `${raw.troughLoadPct} %`,
      });
    }

    renderRpmIndicator(els.rpmIndicator, r, lang);

    if (els.designAlerts) {
      const alerts = [];
      if (raw.angle_deg > 45) {
        alerts.push({
          level: /** @type {const} */ ('warn'),
          text: TX.steepAngle,
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
        `Ø ${formatNum(Dmm, 2)} mm`,
        `${TX.pitchWord} ${formatNum(pitchMm, 2)} mm`,
        mount.machineShaftDiameter_mm != null
          ? `${TX.shaftWord} ${formatNum(mount.machineShaftDiameter_mm, 2)} mm`
          : null,
      ]
        .filter(Boolean)
        .join(' · ');
      const vLine = `${formatNum(r.screwRpm, 2)} ${TX.screwRpmLine}`;
      els.results.innerHTML = `
    <div class="flat-kpi-row" role="group" aria-label="${LBL.resultsMain}">
      <article class="flat-kpi flat-kpi--torque">
        <span class="flat-kpi__eyebrow">${LBL.designTorque} · ${TX.torqueEyebrowSuffix}</span>
        <p class="flat-kpi__value">${formatNum(r.torqueWithService_Nm, 2)}<span class="flat-kpi__unit">N·m</span></p>
        <p class="flat-kpi__hint">${TX.torqueHint}</p>
      </article>
      <article class="flat-kpi flat-kpi--power">
        <span class="flat-kpi__eyebrow">${TX.motorPower}</span>
        <p class="flat-kpi__value">${formatNum(r.requiredMotorPower_kW, 2)}<span class="flat-kpi__unit">kW</span></p>
        <p class="flat-kpi__hint">${TX.motorPowerHint}</p>
      </article>
      <article class="flat-kpi flat-kpi--speed">
        <span class="flat-kpi__eyebrow">${TX.screwRegime}</span>
        <p class="flat-kpi__value">${formatNum(r.screwRpm, 2)}<span class="flat-kpi__unit">rpm</span></p>
        <p class="flat-kpi__hint">${TX.screwRegimeHint}</p>
      </article>
    </div>
    <div class="result-focus-grid flat-kpi-secondary">
      <div class="metric"><div class="label">${TX.serviceFactor}</div><div class="value">${formatNum(r.serviceFactorUsed ?? 1, 2)}</div></div>
      <div class="metric metric--text"><div class="label">${TX.mountingType}</div><div class="value">${formatMounting(mount, lang)}</div></div>
      <div class="metric metric--text"><div class="label">${TX.speed}</div><div class="value">${vLine}</div></div>
      <div class="metric metric--text"><div class="label">${TX.mechanicalDetails}</div><div class="value">${mechanicalSummary}</div></div>
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
          <div class="metric"><div class="label">${TX.hpDesign}</div><div class="value">${formatNum(hp, 2)} HP</div></div>
          <div class="metric"><div class="label">${TX.shaftPowerNoSf}</div><div class="value">${formatNum(r.shaftPower_kW, 2)} kW</div></div>
          <div class="metric"><div class="label">${TX.torqueSteady}</div><div class="value">${formatNum(r.torqueAtDrum_Nm, 2)} N·m</div></div>
          <div class="metric"><div class="label">${TX.axialBulk}</div><div class="value">${formatNum((r.axialSpeed_m_s ?? 0) * 1000, 2)} mm/s</div></div>
          <div class="metric"><div class="label">${LBL.massFlow}</div><div class="value">${formatNum(r.massFlow_kg_s, 2)} kg/s</div></div>
          <div class="metric"><div class="label">${TX.capM3h}</div><div class="value">${formatNum(r.cap_m3h, 2)} m³/h</div></div>
        </div>
      </div>
    </details>
  `;
    }

    if (els.engineeringReport) {
      try {
        els.engineeringReport.innerHTML = renderFullEngineeringAside(r, {
          lang,
          shaftLabel: en ? 'screw shaft' : 'eje tornillo',
          shaftOutLabel: en ? 'Gearbox output / screw shaft' : 'Salida reductor / eje tornillo',
          motorSubtitle: en
            ? '~4-pole 50 Hz reference for gearbox ratio; screw speed comes from capacity and geometry.'
            : 'Referencia ~4 polos 50 Hz para relación de reductor; el régimen del tornillo es el calculado por capacidad y geometría.',
        });
      } catch (err) {
        console.error(err);
        els.engineeringReport.innerHTML = `<div class="motor-error">${TX.reportError} ${String(err.message || err)}</div>`;
      }
    }

    if (els.motorBlock) {
      try {
        els.motorBlock.innerHTML = renderBrandRecommendationCards(
          getDriveRequirements(),
          recoCopyForLang(en),
        );
      } catch (err) {
        console.error(err);
        els.motorBlock.innerHTML = `<div class="motor-error"><strong>${TX.gearmotors}</strong> ${String(err.message || err)}</div>`;
      }
    }

    if (els.premiumPdfMount) {
      mountPremiumPdfExportBar(els.premiumPdfMount, {
        isPremium: isPremiumEffective(),
        getPayload: () => buildScrewPdfPayload(raw, r),
        getDiagramElement: () => els.diagram,
        diagramTitle: TX.machineDiagram,
      });
    }

    if (els.assumptions) {
      els.assumptions.innerHTML = (r.assumptions || []).map((a) => `<li>${escHtml(a)}</li>`).join('');
    }
    applyMachinePremiumGates();
    foldAllMachineDetailsOncePerPageLoad();
  } catch (err) {
    console.error(err);
    showRuntimeError(`${TX.calcError} ${String(err.message || err)}`);
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

initInfoChipPopovers(document.body);

bindScrewRangeSlider('screwCapR', 'screwCap', 5, 250, 0.5);
bindScrewRangeSlider('screwDiamR', 'screwDiam', 80, 900, 1);
bindScrewRangeSlider('screwPitchR', 'screwPitch', 50, 800, 1);
bindScrewRangeSlider('screwLengthR', 'screwLength', 0.5, 50, 0.1);
bindScrewRangeSlider('screwAngleR', 'screwAngle', 0, 45, 0.5);
bindScrewRangeSlider('screwRhoR', 'screwRho', 200, 2200, 10);
bindScrewRangeSlider('screwMuR', 'screwMu', 0.1, 0.75, 0.01);

window.addEventListener(SCREW_LANG_EVENT, () => {
  syncLoadDutyUi();
  refreshMotorVerificationManual(document.getElementById('screwVerifyPanel'), getDriveRequirements);
  document.getElementById('screwVerifyBrand')?.dispatchEvent(new Event('change'));
  refresh();
});

syncLoadDutyUi();
refresh();



