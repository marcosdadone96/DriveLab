import { mountTierStatusBar } from './paywallMount.js';
import { computeSolidShaftTorsion } from '../lab/shaftTorsion.js';
import { renderShaftTorsionDiagram } from '../lab/diagramShaft.js';
import { bindLabUnitSelectors, formatLength, getLabUnitPrefs } from '../lab/labUnitPrefs.js';
import { mountCompactLabFieldHelp } from './labHelpCompact.js';
import { injectLabUnitConverterIfNeeded, mountLabUnitConverter } from '../lab/labUnitConvert.js';
import { debounce, metricHtml, renderResultHero, runCalcWithIndustrialFeedback } from './labCalcUx.js';
import { emitEngineeringSnapshot } from '../services/engineeringSnapshot.js';
import { setLabPurchaseFromShoppingLines } from './labPurchaseSuggestions.js';
import { metricsFromShaft } from '../services/iaAdvisor.js';
import { bootSmartDashboardIfEnabled } from './smartDashboardBoot.js';

mountTierStatusBar();
bootSmartDashboardIfEnabled('Eje · laboratorio');
injectLabUnitConverterIfNeeded();
mountLabUnitConverter();
mountCompactLabFieldHelp();

function read(id, fallback) {
  const el = document.getElementById(id);
  if (!el || !(el instanceof HTMLInputElement)) return fallback;
  const n = parseFloat(String(el.value).replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

function refreshCore() {
  const u = getLabUnitPrefs();
  const p = { torque_Nm: read('shT', 480), tauAllow_MPa: read('shTau', 40) };
  const r = computeSolidShaftTorsion(p);

  const heroEl = document.getElementById('shHero');
  if (heroEl) {
    heroEl.innerHTML = renderResultHero([
      {
        label: 'Diámetro mínimo (macizo)',
        display: formatLength(r.diameter_min_mm, u.length),
        hint: 'Torsión pura; valide chaveteros, fatiga y medida comercial.',
      },
      {
        label: 'Tensión a ese diámetro',
        display: `${r.tauAtMinDiameter_MPa.toFixed(2)} MPa`,
        hint: `Comparar con su τ adm = ${r.tauAllow_MPa.toFixed(2)} MPa.`,
      },
    ]);
  }

  const box = document.getElementById('shResults');
  if (box) {
    box.innerHTML = [
      metricHtml(
        'Diámetro mínimo',
        formatLength(r.diameter_min_mm, u.length),
        'A partir de τ = 16T/(πd³); sin muescas ni concentradores.',
      ),
      metricHtml(
        'Tensión tangencial calculada',
        `${r.tauAtMinDiameter_MPa.toFixed(2)} MPa`,
        'Debería igualar τ adm si el cierre analítico es coherente.',
      ),
      metricHtml(
        'Tensión admisible (entrada)',
        `${r.tauAllow_MPa.toFixed(2)} MPa`,
        'Criterio suyo según material y norma.',
      ),
    ].join('');
  }
  renderShaftTorsionDiagram(document.getElementById('shDiagram'), {
    diameter_mm: r.diameter_min_mm,
  });

  const shoppingLines = [
    {
      commerceId: 'shaft-turned-quote',
      qty: 1,
      note: `dₘᵢₙ macizo ≈ ${r.diameter_min_mm.toFixed(2)} mm · τ = ${r.tauAtMinDiameter_MPa.toFixed(1)} MPa`,
    },
  ];
  emitEngineeringSnapshot({
    page: 'calc-shaft',
    moduleLabel: 'Eje a torsión',
    advisorContext: {},
    shoppingLines,
    metrics: metricsFromShaft({
      tauAllow_MPa: r.tauAllow_MPa,
      tauAtMinDiameter_MPa: r.tauAtMinDiameter_MPa,
    }),
  });
  setLabPurchaseFromShoppingLines(document.getElementById('labPurchaseSuggestions'), shoppingLines, [
    {
      label: 'Barra acero torno',
      searchQuery: `barra redonda acero ${Math.ceil(r.diameter_min_mm)} mm`,
    },
  ]);
}

const wrap = document.getElementById('shResultsWrap');
const debounced = debounce(() => runCalcWithIndustrialFeedback(wrap, refreshCore), 55);
bindLabUnitSelectors(debounced);
['shT', 'shTau'].forEach((id) => {
  document.getElementById(id)?.addEventListener('input', debounced);
  document.getElementById(id)?.addEventListener('change', debounced);
});
runCalcWithIndustrialFeedback(wrap, refreshCore);
