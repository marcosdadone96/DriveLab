import { LAB_AFFILIATE } from '../config/labAffiliate.js';

/**
 * URL de resultados de busqueda Amazon con etiqueta de afiliado opcional.
 * @param {string} searchQuery
 */
export function buildAmazonSearchUrl(searchQuery) {
  const q = String(searchQuery || '').trim();
  const domain = (LAB_AFFILIATE.amazonDomain || 'amazon.es').replace(/^www\./, '');
  const host = domain.includes('.') ? domain : `amazon.${domain}`;
  const tag = String(LAB_AFFILIATE.amazonAssociateTag || '').trim();
  let url = `https://www.${host}/s?k=${encodeURIComponent(q)}`;
  if (tag) url += `&tag=${encodeURIComponent(tag)}`;
  return url;
}

/** rel sugerido para enlaces con comision de afiliado. */
export function amazonAffiliateLinkRel() {
  return LAB_AFFILIATE.amazonAssociateTag?.trim()
    ? 'noopener noreferrer sponsored'
    : 'noopener noreferrer';
}
