import { mountTierStatusBar } from './paywallMount.js';
import {
  computeIsoFit,
  HOLE_LETTERS_SUPPORTED,
  IT_GRADE_KEYS,
  SHAFT_LETTERS_SUPPORTED,
} from '../lab/iso286Compute.js';
import { ISO286_FIT_RECOMMENDATIONS } from '../lab/iso286FitRecommendations.js';
import { renderIso286FitDiagram } from '../lab/diagramIso286Fit.js';
import { mountCompactLabFieldHelp } from './labHelpCompact.js';
import { injectLabUnitConverterIfNeeded, mountLabUnitConverter } from '../lab/labUnitConvert.js';
import { debounce, labAlert, metricHtml, renderResultHero, runCalcWithIndustrialFeedback } from './labCalcUx.js';
import { emitEngineeringSnapshot } from '../services/engineeringSnapshot.js';
import { bootSmartDashboardIfEnabled } from './smartDashboardBoot.js';

mountTierStatusBar();
bootSmartDashboardIfEnabled('ISO 286 � ajustes');
injectLabUnitConverterIfNeeded();
mountLabUnitConverter();
mountCompactLabFieldHelp();

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function readNum(id, fallback) {
  const el = document.getElementById(id);
  if (!el || !(el instanceof HTMLInputElement)) return fallback;
  const n = parseFloat(String(el.value).replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

function readSelect(id, fallback) {
  const el = document.getElementById(id);
  if (!el || !(el instanceof HTMLSelectElement)) return fallback;
  const v = String(el.value || '').trim();
  return v || fallback;
}

function fillSelect(id, options, selected) {
  const el = document.getElementById(id);
  if (!el || !(el instanceof HTMLSelectElement)) return;
  el.innerHTML = options
    .map((o) => `<option value="${o}"${o === selected ? ' selected' : ''}>${o}</option>`)
    .join('');
}

function setSelectValue(id, value) {
  const el = document.getElementById(id);
  if (el instanceof HTMLSelectElement) el.value = value;
}

fillSelect('isoHoleLetter', HOLE_LETTERS_SUPPORTED, 'H');
fillSelect('isoHoleIt', IT_GRADE_KEYS, 'IT7');
fillSelect('isoShaftLetter', SHAFT_LETTERS_SUPPORTED, 'g');
fillSelect('isoShaftIt', IT_GRADE_KEYS, 'IT6');

function mountAppPresetSelect() {
  const presetSel = document.getElementById('isoAppPreset');
  if (!presetSel || !(presetSel instanceof HTMLSelectElement)) return;
  presetSel.innerHTML = [
    '<option value="">Elija una aplicacion (manual o tabla)</option>',
    ...ISO286_FIT_RECOMMENDATIONS.map(
      (r) => `<option value="${escapeHtml(r.id)}">${escapeHtml(r.label)}</option>`,
    ),
  ].join('');
}

function renderRecommendationTable() {
  const tbody = document.querySelector('#isoRecTable tbody');
  if (!tbody) return;
  tbody.innerHTML = ISO286_FIT_RECOMMENDATIONS.map(
    (r) => `
    <tr>
      <td class="lab-iso-rec-table__col-fit">
        <strong class="lab-iso-rec-table__code">${escapeHtml(r.fitCode)}</strong>
        <span class="lab-iso-rec-table__meta">${escapeHtml(r.category)} &#183; &#216;${r.dNomSuggestion}</span>
      </td>
      <td class="lab-iso-rec-table__col-use">
        <span class="lab-iso-rec-table__title">${escapeHtml(r.label)}</span>
        <span class="lab-iso-rec-table__example"><span class="lab-iso-rec-table__example-prefix">Ej. real:</span> ${escapeHtml(r.examples)}</span>
        <span class="lab-iso-rec-table__note">${escapeHtml(r.comment)}</span>
      </td>
      <td class="lab-iso-rec-table__col-act">
        <button type="button" class="lab-btn lab-iso-rec-table__btn" data-iso-preset="${escapeHtml(
          r.id,
        )}" aria-label="Aplicar: ${escapeHtml(r.label)}">&#8594;</button>
      </td>
    </tr>`,
  ).join('');
}

function findMatchingRecommendationId() {
  const hL = readSelect('isoHoleLetter', '');
  const hI = readSelect('isoHoleIt', '');
  const sL = readSelect('isoShaftLetter', '');
  const sI = readSelect('isoShaftIt', '');
  const row = ISO286_FIT_RECOMMENDATIONS.find(
    (r) => r.holeLetter === hL && r.holeIt === hI && r.shaftLetter === sL && r.shaftIt === sI,
  );
  return row ? row.id : '';
}

function syncAppPresetSelect() {
  const presetSel = document.getElementById('isoAppPreset');
  if (!presetSel || !(presetSel instanceof HTMLSelectElement)) return;
  const id = findMatchingRecommendationId();
  presetSel.value = id;
}

/** @param {string} id */
function applyRecommendationById(id) {
  if (!id) return;
  const row = ISO286_FIT_RECOMMENDATIONS.find((r) => r.id === id);
  if (!row) return;
  const dEl = document.getElementById('isoD');
  if (dEl instanceof HTMLInputElement) dEl.value = String(row.dNomSuggestion);
  setSelectValue('isoHoleLetter', row.holeLetter);
  setSelectValue('isoHoleIt', row.holeIt);
  setSelectValue('isoShaftLetter', row.shaftLetter);
  setSelectValue('isoShaftIt', row.shaftIt);
  const presetSel = document.getElementById('isoAppPreset');
  if (presetSel instanceof HTMLSelectElement) presetSel.value = id;
}

mountAppPresetSelect();
renderRecommendationTable();

function fitVerdictAlert(kind) {
  if (kind === 'clearance') {
    return labAlert('ok', '<strong>Ajuste con juego</strong> (clearance). J<sub>min</sub> &ge; 0.');
  }
  if (kind === 'interference') {
    return labAlert('info', '<strong>Ajuste con apriete</strong> (interference). J<sub>max</sub> &le; 0.');
  }
  return labAlert('warn', '<strong>Ajuste de transicion</strong> (transition). J<sub>max</sub> &gt; 0 y J<sub>min</sub> &lt; 0.');
}

function refreshCore() {
  const dNom = readNum('isoD', 25);
  const holeLetter = readSelect('isoHoleLetter', 'H');
  const holeIt = readSelect('isoHoleIt', 'IT7');
  const shaftLetter = readSelect('isoShaftLetter', 'g');
  const shaftIt = readSelect('isoShaftIt', 'IT6');

  const r = computeIsoFit(dNom, holeLetter, holeIt, shaftLetter, shaftIt);

  const heroEl = document.getElementById('isoHero');
  const verdictEl = document.getElementById('isoVerdict');
  const box = document.getElementById('isoResults');

  syncAppPresetSelect();

  if (!r.ok) {
    if (heroEl) heroEl.innerHTML = '';
    if (verdictEl) verdictEl.innerHTML = labAlert('danger', r.err || 'Error de calculo');
    if (box) box.innerHTML = '';
    renderIso286FitDiagram(document.getElementById('isoDiagram'), null);
    return;
  }

  const jMax = r.clearanceMax_um;
  const jMin = r.clearanceMin_um;
  const jMaxLabel = jMax >= 0 ? 'Juego max.' : 'Interferencia max. (|Jmax|)';
  const jMinLabel = jMin >= 0 ? 'Juego min.' : 'Interferencia min. (|Jmin|)';

  if (heroEl) {
    heroEl.innerHTML = renderResultHero([
      {
        label: jMaxLabel,
        display: `${jMax.toFixed(1)} um`,
        hint: 'Dmax - dmin (positivo = holgura; negativo = interferencia).',
      },
      {
        label: jMinLabel,
        display: `${jMin.toFixed(1)} um`,
        hint: 'Dmin - dmax.',
      },
      {
        label: 'Tipo de ajuste',
        display: r.fitLabelEs,
        hint: r.fitLabelEn,
      },
    ]);
  }

  if (verdictEl) verdictEl.innerHTML = fitVerdictAlert(r.fitKind);

  if (box) {
    const iStr = r.i_microns.toFixed(2);
    const dMStr = r.dGeo_mm.toFixed(3);
    box.innerHTML = [
      metricHtml('Unidad i (tabla)', `${iStr} um`, `i = 0.45 * cbrt(D_M) + 0.001*D_M; D_M = ${dMStr} mm (media geometrica del tramo).`),
      metricHtml('IT agujero', `${r.IT_hole_microns} um`, `Tolerancia ${r.hole.it}.`),
      metricHtml('IT eje', `${r.IT_shaft_microns} um`, `Tolerancia ${r.shaft.it}.`),
      metricHtml('Agujero EI / ES', `${r.hole.EI_um} / ${r.hole.ES_um} um`, 'Desviaciones fundamentales + IT (micras).'),
      metricHtml('Eje ei / es', `${r.shaft.ei_um} / ${r.shaft.es_um} um`, 'Desviaciones fundamentales + IT (micras).'),
      metricHtml('D max / D min', `${r.hole.dMax.toFixed(6)} / ${r.hole.dMin.toFixed(6)} mm`, 'Limites del agujero.'),
      metricHtml('d max / d min', `${r.shaft.dMax.toFixed(6)} / ${r.shaft.dMin.toFixed(6)} mm`, 'Limites del eje.'),
    ].join('');
  }

  renderIso286FitDiagram(document.getElementById('isoDiagram'), r);

  emitEngineeringSnapshot({
    page: 'calc-iso-fit',
    moduleLabel: 'ISO 286 ajustes',
    advisorContext: { fitKind: r.fitKind, nominal_mm: r.dNom },
    shoppingLines: [
      {
        commerceId: 'machining-tolerance-quote',
        qty: 1,
        note: `${r.hole.letter}${r.hole.it} / ${r.shaft.letter}${r.shaft.it} � � ${r.dNom} mm � ${r.fitLabelEs}`,
      },
    ],
    metrics: { energyEfficiencyPct: null, materialUtilizationPct: null },
  });
}

const wrap = document.getElementById('isoResultsWrap');
const debounced = debounce(() => runCalcWithIndustrialFeedback(wrap, refreshCore), 55);

document.getElementById('isoAppPreset')?.addEventListener('change', () => {
  const sel = document.getElementById('isoAppPreset');
  const id = sel instanceof HTMLSelectElement ? sel.value : '';
  if (id) applyRecommendationById(id);
  runCalcWithIndustrialFeedback(wrap, refreshCore);
});

document.getElementById('isoRecTable')?.addEventListener('click', (ev) => {
  const t = ev.target;
  if (!(t instanceof HTMLElement)) return;
  const btn = t.closest('[data-iso-preset]');
  if (!(btn instanceof HTMLElement)) return;
  const id = btn.getAttribute('data-iso-preset') || '';
  if (!id) return;
  applyRecommendationById(id);
  runCalcWithIndustrialFeedback(wrap, refreshCore);
});

['isoD', 'isoHoleLetter', 'isoHoleIt', 'isoShaftLetter', 'isoShaftIt'].forEach((id) => {
  document.getElementById(id)?.addEventListener('input', debounced);
  document.getElementById(id)?.addEventListener('change', debounced);
});

runCalcWithIndustrialFeedback(wrap, refreshCore);
