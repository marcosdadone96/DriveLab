/**
 * Panel lateral «Smart Dashboard»: presupuesto demo, insights Advisor, shopping list.
 */

import { resolveShoppingCart } from '../data/commerceCatalog.js';
import { getInStockOnly, setInStockOnly } from '../services/commerceStockFilter.js';
import { MDR_ENGINEERING_SNAPSHOT } from '../services/engineeringSnapshot.js';
import { buildAdvisorInsights } from '../services/iaAdvisor.js';
import { LAB_AFFILIATE } from '../config/labAffiliate.js';
import { amazonAffiliateLinkRel, buildAmazonSearchUrl } from '../lab/amazonAffiliateUrls.js';

const LS_COLLAPSE = 'mdr.smartDash.collapsed';

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function progressBar(label, valuePct, tone = 'teal') {
  const v = Math.max(0, Math.min(100, Number(valuePct) || 0));
  const bg =
    tone === 'amber'
      ? 'linear-gradient(90deg,#f59e0b,#d97706)'
      : tone === 'slate'
        ? 'linear-gradient(90deg,#64748b,#475569)'
        : 'linear-gradient(90deg,#14b8a6,#0d9488)';
  return `<div class="mdr-dash-meter">
    <div class="mdr-dash-meter__head"><span>${esc(label)}</span><span class="mdr-dash-meter__val">${v}%</span></div>
    <div class="mdr-dash-meter__track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v}">
      <div class="mdr-dash-meter__fill" style="width:${v}%;background:${bg}"></div>
    </div>
  </div>`;
}

/**
 * @param {object} [opts]
 * @param {string} [opts.pageHint]
 */
export function mountSmartDashboard(opts = {}) {
  if (document.getElementById('mdrSmartDashboard')) return;

  let collapsed = false;
  try {
    collapsed = window.localStorage.getItem(LS_COLLAPSE) === '1';
  } catch {
    /* ignore */
  }

  const root = document.createElement('aside');
  root.id = 'mdrSmartDashboard';
  root.className = `mdr-smart-dash${collapsed ? ' mdr-smart-dash--collapsed' : ''}`;
  root.setAttribute('aria-label', 'Panel IA Advisor y coste estimado');
  root.innerHTML = `
    <div class="mdr-smart-dash__chrome">
      <button type="button" class="mdr-smart-dash__collapse" id="mdrDashCollapse" aria-expanded="${collapsed ? 'false' : 'true'}" title="Contraer o expandir panel">
        <span class="mdr-smart-dash__chev" aria-hidden="true">⟨⟩</span>
      </button>
      <div class="mdr-smart-dash__title-wrap">
        <h2 class="mdr-smart-dash__title">Control · IA Advisor</h2>
        <p class="mdr-smart-dash__sub">${esc(opts.pageHint || 'Vista en vivo')}</p>
      </div>
    </div>
    <div class="mdr-smart-dash__body">
      <div class="mdr-smart-dash__budget">
        <span class="mdr-smart-dash__budget-k">Coste estimado</span>
        <span class="mdr-smart-dash__budget-v" id="mdrDashBudget">0,00 €</span>
        <span class="mdr-smart-dash__budget-hint">Suministro simulado · IVA no incluido</span>
      </div>
      <label class="mdr-smart-dash__toggle">
        <input type="checkbox" id="mdrDashStockOnly" ${getInStockOnly() ? 'checked' : ''} />
        <span>Filtrar solo piezas en stock (entrega inmediata)</span>
      </label>
      <div class="mdr-smart-dash__meters" id="mdrDashMeters"></div>
      <section class="mdr-smart-dash__section">
        <h3>Insights</h3>
        <div id="mdrDashInsights" class="mdr-smart-dash__insights"></div>
      </section>
      <section class="mdr-smart-dash__section">
        <h3>Shopping list</h3>
        <div id="mdrDashShop" class="mdr-smart-dash__shop"></div>
      </section>
    </div>`;

  document.body.appendChild(root);
  document.body.classList.add('lab-body--mdr-dash');

  const collapseBtn = root.querySelector('#mdrDashCollapse');
  collapseBtn?.addEventListener('click', () => {
    collapsed = !collapsed;
    root.classList.toggle('mdr-smart-dash--collapsed', collapsed);
    collapseBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    document.body.classList.toggle('lab-body--mdr-dash--collapsed', collapsed);
    try {
      if (collapsed) window.localStorage.setItem(LS_COLLAPSE, '1');
      else window.localStorage.removeItem(LS_COLLAPSE);
    } catch {
      /* ignore */
    }
  });
  if (collapsed) document.body.classList.add('lab-body--mdr-dash--collapsed');

  const stockCb = root.querySelector('#mdrDashStockOnly');
  if (stockCb instanceof HTMLInputElement) {
    stockCb.addEventListener('change', () => setInStockOnly(stockCb.checked));
  }

  const budgetEl = root.querySelector('#mdrDashBudget');
  const metersEl = root.querySelector('#mdrDashMeters');
  const insEl = root.querySelector('#mdrDashInsights');
  const shopEl = root.querySelector('#mdrDashShop');

  /** @param {CustomEvent} ev */
  const onSnap = (ev) => {
    const d = /** @type {any} */ (ev).detail || {};
    const lines = Array.isArray(d.shoppingLines) ? d.shoppingLines : [];
    const cart = resolveShoppingCart(lines);
    if (budgetEl) {
      budgetEl.textContent = `${cart.totalEUR.toFixed(2).replace('.', ',')} €`;
    }

    const m = d.metrics || {};
    if (metersEl) {
      const parts = [];
      if (m.energyEfficiencyPct != null && Number.isFinite(m.energyEfficiencyPct)) {
        parts.push(progressBar('Eficiencia energética (orient.)', m.energyEfficiencyPct, 'teal'));
      }
      if (m.materialUtilizationPct != null && Number.isFinite(m.materialUtilizationPct)) {
        parts.push(progressBar('Aprovechamiento de material (orient.)', m.materialUtilizationPct, 'amber'));
      }
      metersEl.innerHTML = parts.length ? parts.join('') : `<p class="mdr-smart-dash__muted">Métricas al recalcular.</p>`;
    }

    const ctx = d.advisorContext || {};
    const insights = buildAdvisorInsights(ctx);
    if (insEl) {
      insEl.innerHTML = insights
        .map((it) => {
          const cls = it.tone === 'warn' ? 'mdr-insight--warn' : it.tone === 'tip' ? 'mdr-insight--tip' : 'mdr-insight--info';
          return `<article class="mdr-insight ${cls}">
            <h4>${esc(it.title)}</h4>
            <p>${esc(it.body)}</p>
            ${it.normRef ? `<p class="mdr-insight__norm">${esc(it.normRef)}</p>` : ''}
          </article>`;
        })
        .join('');
    }

    if (shopEl) {
      if (!cart.rows.length) {
        shopEl.innerHTML = '<p class="mdr-smart-dash__muted">Añada componentes para ver líneas de compra.</p>';
      } else {
        shopEl.innerHTML = `<table class="mdr-shop-table">
          <thead><tr><th>Artículo</th><th class="num">Ud.</th><th class="num">€</th><th>Enlaces</th></tr></thead>
          <tbody>
            ${cart.rows
              .map((r) => {
                const amz =
                  LAB_AFFILIATE.enabled && r.item.amazonSearchQuery
                    ? `<a class="mdr-shop-link mdr-shop-link--amazon" href="${esc(buildAmazonSearchUrl(r.item.amazonSearchQuery))}" target="_blank" rel="${esc(amazonAffiliateLinkRel())}">Amazon</a>`
                    : '';
                return `<tr>
              <td>${esc(r.item.label)}${r.note ? `<span class="mdr-shop-note">${esc(r.note)}</span>` : ''}</td>
              <td class="num">${r.qty}</td>
              <td class="num">${r.lineEUR.toFixed(2)}</td>
              <td class="mdr-shop-actions"><a class="mdr-shop-link" href="${esc(r.item.supplierUrl)}" target="_blank" rel="noopener">Proveedor demo</a>${amz ? ` ${amz}` : ''}</td>
            </tr>`;
              })
              .join('')}
          </tbody>
        </table>`;
      }
    }
  };

  window.addEventListener(MDR_ENGINEERING_SNAPSHOT, /** @type {EventListener} */ (onSnap));
}
