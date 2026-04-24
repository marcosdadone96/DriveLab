import { mountTierStatusBar } from './paywallMount.js';
import { computeBearingL10 } from '../lab/bearings.js';
import { renderBearingSectionDiagram } from '../lab/diagramBearings.js';
import {
  bindLabUnitSelectors,
  formatBearingLifeDisplay,
  formatRotation,
  getLabUnitPrefs,
} from '../lab/labUnitPrefs.js';
import { mountCompactLabFieldHelp } from './labHelpCompact.js';
import { injectLabUnitConverterIfNeeded, mountLabUnitConverter } from '../lab/labUnitConvert.js';
import { debounce, labAlert, metricHtml, renderResultHero, runCalcWithIndustrialFeedback } from './labCalcUx.js';
import { commerceIdForBearingC } from '../data/commerceCatalog.js';
import { emitEngineeringSnapshot } from '../services/engineeringSnapshot.js';
import { bootSmartDashboardIfEnabled } from './smartDashboardBoot.js';
import { setLabPurchaseFromShoppingLines } from './labPurchaseSuggestions.js';

mountTierStatusBar();
bootSmartDashboardIfEnabled('Rodamientos · laboratorio');
injectLabUnitConverterIfNeeded();
mountLabUnitConverter();
mountCompactLabFieldHelp();

function read(id, fallback) {
  const el = document.getElementById(id);
  if (!el || !(el instanceof HTMLInputElement)) return fallback;
  const n = parseFloat(String(el.value).replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

function lifeMetricTitle(life) {
  if (life === 'Mrev') return 'Vida L₁₀ (millones de vueltas)';
  if (life === 'rev') return 'Vida L₁₀ (vueltas totales)';
  return 'Vida L₁₀ (horas de servicio)';
}

function refreshCore() {
  const u = getLabUnitPrefs();
  const lifePref = u.life ?? 'hours';
  const typeEl = document.getElementById('brgType');
  const type = typeEl instanceof HTMLSelectElement && typeEl.value === 'roller' ? 'roller' : 'ball';
  const p = {
    dynamicLoad_N: read('brgC', 32500),
    equivalentLoad_N: read('brgP', 8200),
    type,
    speed_rpm: read('brgN', 1455),
  };
  const r = computeBearingL10(p);

  const heroEl = document.getElementById('brgHero');
  if (heroEl) {
    heroEl.innerHTML = renderResultHero([
      {
        label: 'Vida básica L₁₀',
        display: formatBearingLifeDisplay(r, lifePref),
        hint:
          lifePref === 'hours' && r.nominalLife_hours == null
            ? 'Indique giro &gt; 0 para estimar horas a partir de las revoluciones.'
            : '90% de confiabilidad, ISO 281 simplificada (sin factores térmicos).',
      },
      {
        label: 'ω — velocidad angular del eje',
        display: formatRotation(r.speed_rpm, u.rotation),
        hint: 'Velocidad del eje que usa la conversión a horas.',
      },
    ]);
  }

  const box = document.getElementById('brgResults');
  if (box) {
    box.innerHTML = [
      metricHtml(
        lifeMetricTitle(lifePref),
        formatBearingLifeDisplay(r, lifePref),
        'Cambie “Vida L₁₀” en la barra superior para ver el mismo dato en horas, millones de vueltas o vueltas totales.',
      ),
      metricHtml(
        'Carga dinámica C (catálogo)',
        `${r.dynamicLoad_N.toFixed(2)} N`,
        'Capacidad de referencia del rodamiento elegido.',
      ),
      metricHtml(
        'Carga equivalente P',
        `${r.equivalentLoad_N.toFixed(2)} N`,
        'Caso de carga de su cálculo (simplificado).',
      ),
      metricHtml(
        'Exponente de vida p',
        type === 'roller' ? '10/3' : '3',
        'En L = (C/P)^p: rodillos ≠ bolas.',
      ),
      metricHtml(
        'ω — velocidad angular del eje',
        formatRotation(r.speed_rpm, u.rotation),
        'Misma entrada en las unidades elegidas arriba.',
      ),
    ].join('');
  }

  const resultsW = document.getElementById('brgResultsWrap');
  let noteEl = document.getElementById('brgNote');
  if (resultsW?.parentElement) {
    if (!noteEl) {
      noteEl = document.createElement('div');
      noteEl.id = 'brgNote';
      noteEl.className = 'lab-alerts';
      resultsW.after(noteEl);
    }
    if (r.nominalLife_hours == null) {
      noteEl.innerHTML = labAlert(
        'info',
        'Indique giro &gt; 0 para estimar la vida en horas (además puede ver millones o vueltas totales en el desplegable).',
      );
    } else if (r.nominalLife_hours < 2000) {
      noteEl.innerHTML = labAlert('warn', 'L₁₀ bajo en horas: revise P, tipo de rodamiento o elección de C.');
    } else if (r.nominalLife_hours > 50000) {
      noteEl.innerHTML = labAlert('ok', 'L₁₀ alto en horas con estos datos — confirme que P y n representan el caso de diseño.');
    } else {
      noteEl.innerHTML = labAlert('info', 'Compare L₁₀ con el objetivo de su aplicación (catálogo / OEM).');
    }
  }

  renderBearingSectionDiagram(document.getElementById('brgDiagram'), { type });

  const dutyEl = document.getElementById('brgDuty');
  let dutyHours = null;
  if (dutyEl instanceof HTMLInputElement && dutyEl.value.trim() !== '') {
    const d = parseFloat(String(dutyEl.value).replace(',', '.'));
    if (Number.isFinite(d) && d >= 0) dutyHours = d;
  }
  const shoppingLines = [
    { commerceId: commerceIdForBearingC(r.dynamicLoad_N), qty: 1, note: `C = ${r.dynamicLoad_N.toFixed(0)} N` },
  ];
  emitEngineeringSnapshot({
    page: 'calc-bearings',
    moduleLabel: 'Rodamientos L₁₀',
    advisorContext: {
      bearing: {
        L10_hours: r.nominalLife_hours ?? undefined,
        speed_rpm: r.speed_rpm,
      },
      machineDuty: { dutyHoursPerDay: dutyHours },
    },
    shoppingLines,
    metrics: { energyEfficiencyPct: null, materialUtilizationPct: null },
  });
  setLabPurchaseFromShoppingLines(document.getElementById('labPurchaseSuggestions'), shoppingLines);
}

const wrap = document.getElementById('brgResultsWrap');
const debounced = debounce(() => runCalcWithIndustrialFeedback(wrap, refreshCore), 55);
bindLabUnitSelectors(debounced, { life: true });
['brgC', 'brgP', 'brgN', 'brgType', 'brgDuty'].forEach((id) => {
  const el = document.getElementById(id);
  el?.addEventListener('input', debounced);
  el?.addEventListener('change', debounced);
});
runCalcWithIndustrialFeedback(wrap, refreshCore);
