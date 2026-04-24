import { mountTierStatusBar } from './paywallMount.js';
import { computeRollerChain } from '../lab/chains.js';
import { CHAIN_CATALOG } from '../lab/chainCatalog.js';
import { renderChainDriveDiagram } from '../lab/diagramChains.js';
import {
  bindLabUnitSelectors,
  formatLength,
  formatLinearSpeed,
  formatRotation,
  getLabUnitPrefs,
} from '../lab/labUnitPrefs.js';
import { mountCompactLabFieldHelp } from './labHelpCompact.js';
import { injectLabUnitConverterIfNeeded, mountLabUnitConverter } from '../lab/labUnitConvert.js';
import { debounce, labAlert, labHelpTooltipMarkup, metricHtml, renderResultHero, runCalcWithIndustrialFeedback } from './labCalcUx.js';
import { commerceIdForChainRef } from '../data/commerceCatalog.js';
import { emitEngineeringSnapshot } from '../services/engineeringSnapshot.js';
import { setLabPurchaseFromShoppingLines } from './labPurchaseSuggestions.js';
import { bindCommerceFilteredSelect } from './commerceSelectBind.js';
import { bootSmartDashboardIfEnabled } from './smartDashboardBoot.js';

mountTierStatusBar();
bootSmartDashboardIfEnabled('Cadenas · laboratorio');
injectLabUnitConverterIfNeeded();
mountLabUnitConverter();

function readInput(id, fallback) {
  const el = document.getElementById(id);
  if (!el || !(el instanceof HTMLInputElement)) return fallback;
  const n = parseFloat(String(el.value).replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function elementCardHtml(title, rows) {
  const body = rows
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
    .join('');
  return `<article class="lab-element-card"><h4 class="lab-element-card__title">${esc(title)}</h4><dl class="lab-element-card__kv">${body}</dl></article>`;
}

bindCommerceFilteredSelect(
  'cChainRef',
  CHAIN_CATALOG,
  'id',
  (row) => `${row.label} · ${row.norm} · p = ${row.pitch_mm} mm`,
  (row) => `chain-${row.id}`,
);
const sel = document.getElementById('cChainRef');
if (sel instanceof HTMLSelectElement) sel.value = 'iso-12b-1';

mountCompactLabFieldHelp();

const manualEl = document.getElementById('cManualPitch');
const pitchEl = document.getElementById('cPitch');
function syncPitchDisabled() {
  const manual = manualEl instanceof HTMLInputElement && manualEl.checked;
  if (pitchEl instanceof HTMLInputElement) pitchEl.disabled = !manual;
}
manualEl?.addEventListener('change', syncPitchDisabled);
syncPitchDisabled();

function refreshCore() {
  const u = getLabUnitPrefs();
  const useManual = manualEl instanceof HTMLInputElement && manualEl.checked;
  const chainRefId = sel instanceof HTMLSelectElement ? sel.value : '';
  const n1 = readInput('cN1', 0);
  const p = {
    chainRefId: useManual ? '' : chainRefId,
    useManualPitch: useManual,
    pitch_mm: readInput('cPitch', 19.05),
    z1: readInput('cZ1', 17),
    z2: readInput('cZ2', 25),
    center_mm: readInput('cCenter', 450),
    n1_rpm: n1 > 0 ? n1 : undefined,
  };
  const r = computeRollerChain(p);

  const heroEl = document.getElementById('cHero');
  if (heroEl) {
    heroEl.innerHTML = renderResultHero([
      {
        label: 'ω₂ — velocidad angular · piñón 2 (conducido, z₂)',
        display: r.n2_rpm != null ? formatRotation(r.n2_rpm, u.rotation) : '—',
        hint: 'En el primitivo, proporcional a z₁/z₂.',
      },
      {
        label: 'Velocidad de la cadena (primitivo · piñón 1)',
        display: formatLinearSpeed(r.linearSpeed_m_s, u.linear),
        hint: 'Media en el primitivo del piñón motor (piñón 1, z₁).',
      },
    ]);
  }

  const box = document.getElementById('cResults');
  const elementBox = document.getElementById('cElementResults');
  if (elementBox) {
    elementBox.innerHTML = [
      elementCardHtml('Piñón 1 · Motor', [
        ['Dientes (z1)', String(r.z1)],
        ['Diam. primitivo (D1)', formatLength(r.pitchDiameter1_mm, u.length)],
        ['Velocidad (n1)', formatRotation(r.n1_rpm, u.rotation)],
      ]),
      elementCardHtml('Piñón 2 · Conducido', [
        ['Dientes (z2)', String(r.z2)],
        ['Diam. primitivo (D2)', formatLength(r.pitchDiameter2_mm, u.length)],
        ['Velocidad (n2)', r.n2_rpm != null ? formatRotation(r.n2_rpm, u.rotation) : '—'],
      ]),
      elementCardHtml('Cadena · Tramo', [
        ['Paso (p)', formatLength(r.pitch_mm, u.length)],
        ['Longitud (L)', `${r.chainLength_pitches.toFixed(2)} pasos`],
        ['Velocidad lineal (v)', formatLinearSpeed(r.linearSpeed_m_s, u.linear)],
      ]),
    ].join('');
  }

  if (box) {
    const refLine = r.chainRefLabel ? `${r.chainRefLabel}` : 'Paso manual';
    const cells = [
      metricHtml(
        'Referencia de cadena',
        refLine,
        `${r.chainNorm || r.normsNote || ''} Paso de catálogo y norma definen carga admisible.`,
      ),
      metricHtml(
        'Relación de dientes (z₂/z₁)',
        r.ratio_teeth.toFixed(2),
        `En primitivos, D₂/D₁ = ${r.ratio_primitive.toFixed(2)} (ligero desvío por polígono).`,
      ),
      metricHtml(
        'Longitud (pasos de cadena)',
        `${r.chainLength_pitches.toFixed(2)} pasos`,
        `Redondeo práctico al alza: ${r.chainLength_pitches_roundUp} pasos.`,
      ),
      metricHtml(
        'Distancia entre ejes',
        formatLength(r.center_mm, u.length),
        `Equivale a ≈ ${r.center_pitches.toFixed(2)} pasos de paso p.`,
      ),
      metricHtml(
        'D₁ — diámetro primitivo · piñón 1 (motor, z₁)',
        formatLength(r.pitchDiameter1_mm, u.length),
        'Fórmula D = p / sin(π/z) en el piñón motriz.',
      ),
      metricHtml(
        'D₂ — diámetro primitivo · piñón 2 (conducido, z₂)',
        formatLength(r.pitchDiameter2_mm, u.length),
        'Primitivo del piñón conducido.',
      ),
      metricHtml(
        'ω₁ — velocidad angular · piñón 1 (motor)',
        formatRotation(r.n1_rpm, u.rotation),
        'Entrada del formulario en las unidades elegidas.',
      ),
      metricHtml(
        'ω₂ — velocidad angular · piñón 2 (conducido)',
        formatRotation(r.n2_rpm, u.rotation),
        'Salida cinemática en primitivo.',
      ),
      metricHtml(
        'Velocidad lineal de cadena',
        formatLinearSpeed(r.linearSpeed_m_s, u.linear),
        'Tramos rectos; guía lubricación y desgaste.',
      ),
      metricHtml(
        'Frecuencia de articulación · piñón 1 (motor)',
        r.articulationFrequency_Hz != null ? `${r.articulationFrequency_Hz.toFixed(2)} Hz` : '—',
        '≈ z₁ × ω₁/2π; más Hz suele exigir mejor lubricación.',
      ),
      metricHtml(
        'Lubricación sugerida',
        `${r.chainLubrication.class} — ${r.chainLubrication.label}`,
        `${r.chainLubrication.detail} Confirme con ISO 10823 y fabricante.`,
      ),
    ];
    box.innerHTML = cells.join('');
  }

  const alerts = document.getElementById('cAlerts');
  if (alerts) {
    const parts = [];
    if (r.polygonalEffect?.active) {
      parts.push(labAlert('warn', esc(r.polygonalEffect.text)));
    }
    if (parts.length === 0) {
      parts.push(
        labAlert(
          'info',
          `${esc(r.normsNote)} Articulación y lubricación son orientativas; confirme con ISO 10823 y fabricante.`,
        ),
      );
    } else {
      parts.push(labAlert('info', esc(r.normsNote)));
    }
    alerts.innerHTML = parts.join('');
  }

  const sub = document.getElementById('cSubstitution');
  if (sub && r.n1_rpm != null && r.omega2_rad_s != null) {
    const D1 = r.pitchDiameter1_mm;
    const D2 = r.pitchDiameter2_mm;
    const vDisp = formatLinearSpeed(r.linearSpeed_m_s, u.linear);
    sub.innerHTML = `
      <details class="calc-substitution">
        <summary class="calc-substitution__summary">
          <span class="calc-substitution__title">Sustitución — cinemática en primitivo</span>
        </summary>
        <div class="calc-substitution__inner">
          <p class="calc-substitution__step">
            Diámetros primitivos: <code>D = p / sin(π/z)</code> →
            <code>D₁ = ${D1.toFixed(2)} mm</code> (piñón 1), <code>D₂ = ${D2.toFixed(2)} mm</code> (piñón 2)
          </p>
          <p class="calc-substitution__step">
            Giro · piñón 2 (RPM): <code>n₂ = n₁ · D₁/D₂ = ${r.n1_rpm.toFixed(2)} × ${D1.toFixed(2)} / ${D2.toFixed(2)} = ${r.n2_rpm != null ? r.n2_rpm.toFixed(2) : '—'} RPM</code>
          </p>
          <p class="calc-substitution__step">
            Mismo resultado en sus unidades: <strong>${formatRotation(r.n2_rpm, u.rotation)}</strong>
          </p>
          <p class="calc-substitution__step">
            Velocidad media de cadena: <strong>${vDisp}</strong>
          </p>
          <p class="calc-substitution__step">
            Articulaciones por segundo · piñón 1: <strong>${r.articulationFrequency_Hz != null ? `${r.articulationFrequency_Hz.toFixed(2)} Hz` : '—'}</strong>
          </p>
        </div>
      </details>`;
  } else if (sub) {
    sub.innerHTML = '';
  }

  const assem = document.getElementById('cAssembly');
  if (assem && r.assembly) {
    const a = r.assembly;
    assem.innerHTML = `
      <div class="lab-metric lab-metric--wide">
        <div class="lab-metric__head">
          <span class="k">Montaje · eslabones de unión</span>
          ${labHelpTooltipMarkup(a.notes, 'Notas de montaje')}
        </div>
        <div class="v lab-metric__text">
          Eslabón de unión (conector con clip): típicamente <strong>${a.connectingLink_count_typical}</strong> unidad.
          Pasos al alza: <strong>${a.Lp_round_up}</strong> (${a.oddAfterRoundUp ? 'impar' : 'par'}).
          Alternativa par recomendada: <strong>${a.recommended_even_pitches}</strong> pasos.
          ${a.offsetLink_recommended ? '<br /><strong>Eslabón desplazado (½ paso):</strong> valorar si cierra en bucle con longitud impar en pasos.' : ''}
        </div>
      </div>
    `;
  }

  renderChainDriveDiagram(document.getElementById('cDiagram'), p);

  const cref = !useManual && chainRefId ? chainRefId : 'iso-12b-1';
  const shoppingLines = [
    {
      commerceId: commerceIdForChainRef(cref),
      qty: 1,
      note: useManual ? 'Paso manual · kit orientativo' : r.chainRefLabel || cref,
    },
  ];
  emitEngineeringSnapshot({
    page: 'calc-chains',
    moduleLabel: 'Cadenas',
    advisorContext: {},
    shoppingLines,
    metrics: { energyEfficiencyPct: 97, materialUtilizationPct: null },
  });
  setLabPurchaseFromShoppingLines(document.getElementById('labPurchaseSuggestions'), shoppingLines, [
    { label: 'Piñon cadena a juego', searchQuery: 'piñon cadena rodillos acero' },
  ]);
}

const wrap = document.getElementById('cResultsWrap');
const debounced = debounce(() => runCalcWithIndustrialFeedback(wrap, refreshCore), 55);
bindLabUnitSelectors(debounced);
['cPitch', 'cZ1', 'cZ2', 'cCenter', 'cN1', 'cChainRef', 'cManualPitch'].forEach((id) => {
  document.getElementById(id)?.addEventListener('input', debounced);
  document.getElementById(id)?.addEventListener('change', debounced);
});
manualEl?.addEventListener('change', debounced);
runCalcWithIndustrialFeedback(wrap, refreshCore);
