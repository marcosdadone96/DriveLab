/**
 * Panel "Opciones de compra" bajo resultados del laboratorio (busqueda Amazon).
 */
import { LAB_AFFILIATE } from '../config/labAffiliate.js';
import { amazonAffiliateLinkRel, buildAmazonSearchUrl } from '../lab/amazonAffiliateUrls.js';
import { purchaseSuggestionRowsFromShoppingLines } from '../data/commerceCatalog.js';

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {HTMLElement | null} mountEl
 * @param {object} opts
 * @param {string} [opts.title]
 * @param {Array<{ label: string, searchQuery: string }>} [opts.rows]
 */
export function setLabPurchaseSuggestions(mountEl, opts = {}) {
  if (!(mountEl instanceof HTMLElement)) return;

  if (!LAB_AFFILIATE.enabled) {
    mountEl.innerHTML = '';
    mountEl.hidden = true;
    return;
  }

  const rows = Array.isArray(opts.rows) ? opts.rows.filter((r) => r && String(r.searchQuery || '').trim()) : [];
  if (!rows.length) {
    mountEl.innerHTML = '';
    mountEl.hidden = true;
    return;
  }

  mountEl.hidden = false;

  const title = opts.title || 'Opciones de compra (orientativas)';
  const hasTag = Boolean(LAB_AFFILIATE.amazonAssociateTag?.trim());
  const disclosure = hasTag
    ? 'MechAssist participa en el Programa de Afiliados de Amazon EU: enlaces que pueden generar una comision para el sitio sin coste adicional para usted. Verifique siempre referencia y vendedor.'
    : 'Enlaces de busqueda a Amazon a titulo informativo. Puede configurar un ID de afiliado en la configuracion del sitio.';

  const list = rows
    .map((r) => {
      const href = buildAmazonSearchUrl(r.searchQuery);
      const rel = amazonAffiliateLinkRel();
      return `<li class="lab-purchase-suggestions__item">
        <span class="lab-purchase-suggestions__label">${esc(r.label)}</span>
        <a class="lab-purchase-suggestions__link" href="${esc(href)}" target="_blank" rel="${esc(rel)}">Buscar en Amazon</a>
      </li>`;
    })
    .join('');

  mountEl.className = 'lab-purchase-suggestions';
  mountEl.innerHTML = `
    <div class="lab-purchase-suggestions__head">
      <span class="lab-purchase-suggestions__title">${esc(title)}</span>
    </div>
    <ul class="lab-purchase-suggestions__list">${list}</ul>
    <p class="lab-purchase-suggestions__disclosure">${esc(disclosure)}</p>
  `;
}

/**
 * @param {HTMLElement | null} mountEl
 * @param {Array<{ commerceId: string, qty?: number, note?: string }>} shoppingLines
 * @param {Array<{ label: string, searchQuery: string }>} [extraRows]
 */
export function setLabPurchaseFromShoppingLines(mountEl, shoppingLines, extraRows = []) {
  const base = purchaseSuggestionRowsFromShoppingLines(shoppingLines);
  setLabPurchaseSuggestions(mountEl, { rows: [...base, ...(extraRows || [])] });
}
