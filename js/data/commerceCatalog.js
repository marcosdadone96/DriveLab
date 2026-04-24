/**
 * Catálogo comercial simulado — precios orientativos (EUR) y plazos de suministro.
 * Datos demo para presupuesto y filtro «solo en stock»; no sustituye API real.
 */

/** @typedef {'in_stock'|'48h'|'1w'} CommerceStock */

/**
 * @typedef {Object} CommerceItem
 * @property {string} id
 * @property {string} category
 * @property {string} label
 * @property {number} priceEUR
 * @property {CommerceStock} stock
 * @property {string} supplierUrl
 * @property {string} [amazonSearchQuery] - texto de busqueda Amazon (ES), inyectado desde mapa
 */

/** @type {CommerceItem[]} */
export const COMMERCE_ITEMS = [
  /* Correas V */
  { id: 'belt-v-SPZ', category: 'belt', label: 'Correa trapezoidal SPZ · tramo estándar', priceEUR: 12.5, stock: 'in_stock', supplierUrl: 'https://example-industrial.example/p/spz' },
  { id: 'belt-v-SPA', category: 'belt', label: 'Correa trapezoidal SPA · tramo estándar', priceEUR: 18.9, stock: '48h', supplierUrl: 'https://example-industrial.example/p/spa' },
  { id: 'belt-v-SPB', category: 'belt', label: 'Correa trapezoidal SPB · tramo estándar', priceEUR: 28.4, stock: 'in_stock', supplierUrl: 'https://example-industrial.example/p/spb' },
  { id: 'belt-v-SPC', category: 'belt', label: 'Correa trapezoidal SPC · tramo estándar', priceEUR: 42.0, stock: '1w', supplierUrl: 'https://example-industrial.example/p/spc' },
  { id: 'belt-v-XPZ', category: 'belt', label: 'Correa XPZ alta capacidad', priceEUR: 16.2, stock: '48h', supplierUrl: 'https://example-industrial.example/p/xpz' },
  { id: 'belt-v-XPA', category: 'belt', label: 'Correa XPA alta capacidad', priceEUR: 24.5, stock: 'in_stock', supplierUrl: 'https://example-industrial.example/p/xpa' },
  { id: 'belt-v-XPB', category: 'belt', label: 'Correa XPB alta capacidad', priceEUR: 36.0, stock: '48h', supplierUrl: 'https://example-industrial.example/p/xpb' },
  /* Síncronas */
  { id: 'belt-sync-3', category: 'belt', label: 'Correa síncrona · paso 3M · Lp ≈ 900 mm', priceEUR: 38.0, stock: 'in_stock', supplierUrl: 'https://example-industrial.example/p/sync-3m' },
  { id: 'belt-sync-5', category: 'belt', label: 'Correa síncrona · paso 5M · Lp ≈ 1200 mm', priceEUR: 52.0, stock: 'in_stock', supplierUrl: 'https://example-industrial.example/p/sync-5m' },
  { id: 'belt-sync-8', category: 'belt', label: 'Correa síncrona · paso 8M · Lp ≈ 1440 mm', priceEUR: 78.0, stock: '48h', supplierUrl: 'https://example-industrial.example/p/sync-8m' },
  { id: 'belt-sync-8_at', category: 'belt', label: 'Correa síncrona AT10 · Lp ≈ 1500 mm', priceEUR: 95.0, stock: '1w', supplierUrl: 'https://example-industrial.example/p/at10' },
  { id: 'belt-sync-14', category: 'belt', label: 'Correa síncrona 14M industrial', priceEUR: 210.0, stock: '1w', supplierUrl: 'https://example-industrial.example/p/14m' },
  { id: 'belt-sync-2.032', category: 'belt', label: 'Correa síncrona XL · paso 2,032 mm', priceEUR: 29.0, stock: '48h', supplierUrl: 'https://example-industrial.example/p/xl' },
  /* Plana / Poly-V genéricas */
  { id: 'belt-flat-std', category: 'belt', label: 'Correa plana neopreno · ancho estándar', priceEUR: 45.0, stock: '48h', supplierUrl: 'https://example-industrial.example/p/flat' },
  { id: 'belt-poly-PJ', category: 'belt', label: 'Correa Poly-V PJ', priceEUR: 34.0, stock: 'in_stock', supplierUrl: 'https://example-industrial.example/p/pj' },
  { id: 'belt-poly-PK', category: 'belt', label: 'Correa Poly-V PK', priceEUR: 48.0, stock: 'in_stock', supplierUrl: 'https://example-industrial.example/p/pk' },
  { id: 'belt-poly-PL', category: 'belt', label: 'Correa Poly-V PL', priceEUR: 72.0, stock: '48h', supplierUrl: 'https://example-industrial.example/p/pl' },
  { id: 'belt-poly-PM', category: 'belt', label: 'Correa Poly-V PM', priceEUR: 118.0, stock: '1w', supplierUrl: 'https://example-industrial.example/p/pm' },
  /* Cadenas ISO/ANSI */
  { id: 'chain-iso-04b-1', category: 'chain', label: 'Cadena 04B-1 + eslabón (kit)', priceEUR: 38.0, stock: '1w', supplierUrl: 'https://example-industrial.example/c/04b' },
  { id: 'chain-iso-05b-1', category: 'chain', label: 'Cadena 05B-1 + eslabón (kit)', priceEUR: 44.0, stock: '48h', supplierUrl: 'https://example-industrial.example/c/05b' },
  { id: 'chain-iso-06b-1', category: 'chain', label: 'Cadena 06B-1 + eslabón (kit)', priceEUR: 52.0, stock: 'in_stock', supplierUrl: 'https://example-industrial.example/c/06b' },
  { id: 'chain-iso-08b-1', category: 'chain', label: 'Cadena 08B-1 + eslabón (kit)', priceEUR: 68.0, stock: 'in_stock', supplierUrl: 'https://example-industrial.example/c/08b' },
  { id: 'chain-iso-10b-1', category: 'chain', label: 'Cadena 10B-1 + eslabón (kit)', priceEUR: 92.0, stock: '48h', supplierUrl: 'https://example-industrial.example/c/10b' },
  { id: 'chain-iso-12b-1', category: 'chain', label: 'Cadena 12B-1 + eslabón (kit)', priceEUR: 118.0, stock: 'in_stock', supplierUrl: 'https://example-industrial.example/c/12b' },
  { id: 'chain-iso-16b-1', category: 'chain', label: 'Cadena 16B-1 + eslabón (kit)', priceEUR: 165.0, stock: '48h', supplierUrl: 'https://example-industrial.example/c/16b' },
  { id: 'chain-iso-20b-1', category: 'chain', label: 'Cadena 20B-1 + eslabón (kit)', priceEUR: 228.0, stock: '1w', supplierUrl: 'https://example-industrial.example/c/20b' },
  { id: 'chain-iso-24b-1', category: 'chain', label: 'Cadena 24B-1 + eslabón (kit)', priceEUR: 310.0, stock: '1w', supplierUrl: 'https://example-industrial.example/c/24b' },
  { id: 'chain-ansi-35', category: 'chain', label: 'Cadena ANSI 35-1 (kit)', priceEUR: 55.0, stock: '48h', supplierUrl: 'https://example-industrial.example/c/a35' },
  { id: 'chain-ansi-40', category: 'chain', label: 'Cadena ANSI 40-1 (kit)', priceEUR: 62.0, stock: 'in_stock', supplierUrl: 'https://example-industrial.example/c/a40' },
  { id: 'chain-ansi-50', category: 'chain', label: 'Cadena ANSI 50-1 (kit)', priceEUR: 78.0, stock: 'in_stock', supplierUrl: 'https://example-industrial.example/c/a50' },
  { id: 'chain-ansi-60', category: 'chain', label: 'Cadena ANSI 60-1 (kit)', priceEUR: 96.0, stock: 'in_stock', supplierUrl: 'https://example-industrial.example/c/a60' },
  { id: 'chain-ansi-80', category: 'chain', label: 'Cadena ANSI 80-1 (kit)', priceEUR: 132.0, stock: '48h', supplierUrl: 'https://example-industrial.example/c/a80' },
  /* Rodamientos */
  { id: 'bearing-6205', category: 'bearing', label: 'Rodamiento 6205-2Z (C ≈ 14,8 kN · demo)', priceEUR: 8.9, stock: 'in_stock', supplierUrl: 'https://example-industrial.example/b/6205' },
  { id: 'bearing-6208', category: 'bearing', label: 'Rodamiento 6208-2RS (C ≈ 32 kN · demo)', priceEUR: 14.5, stock: 'in_stock', supplierUrl: 'https://example-industrial.example/b/6208' },
  { id: 'bearing-6210', category: 'bearing', label: 'Rodamiento 6210 (C ≈ 52 kN · demo)', priceEUR: 22.0, stock: '48h', supplierUrl: 'https://example-industrial.example/b/6210' },
  { id: 'bearing-nu208', category: 'bearing', label: 'Rodamiento NU208 cilíndrico (serie ligera · demo)', priceEUR: 48.0, stock: '48h', supplierUrl: 'https://example-industrial.example/b/nu208' },
  { id: 'bearing-30208', category: 'bearing', label: 'Rodamiento 30208 cónicos (kit)', priceEUR: 36.0, stock: '1w', supplierUrl: 'https://example-industrial.example/b/30208' },
  /* Engranajes / ejes / lienzo */
  { id: 'gear-pair-quote', category: 'gear', label: 'Par engranajes rectos a medida (cotización)', priceEUR: 280.0, stock: '1w', supplierUrl: 'https://example-industrial.example/g/custom' },
  { id: 'shaft-turned-quote', category: 'shaft', label: 'Eje mecanizado + tratamiento (orientativo)', priceEUR: 190.0, stock: '1w', supplierUrl: 'https://example-industrial.example/s/custom' },
  { id: 'pulley-stock-100', category: 'pulley', label: 'Polea fundición Ø100 · stock', priceEUR: 42.0, stock: 'in_stock', supplierUrl: 'https://example-industrial.example/p/p100' },
  { id: 'pulley-stock-160', category: 'pulley', label: 'Polea fundición Ø160 · stock', priceEUR: 58.0, stock: '48h', supplierUrl: 'https://example-industrial.example/p/p160' },
  { id: 'sprocket-kit-17', category: 'sprocket', label: 'Piñón cadena z=17 · acero', priceEUR: 28.0, stock: 'in_stock', supplierUrl: 'https://example-industrial.example/c/sp17' },
  /* Cables tracción ascensor / montacargas (precio por metro demo) */
  { id: 'wire-rope-8mm', category: 'wire_rope', label: 'Cable acero tracción Ø8 mm · 1770 (precio/m)', priceEUR: 11.5, stock: '48h', supplierUrl: 'https://example-industrial.example/w/8mm' },
  { id: 'wire-rope-9mm', category: 'wire_rope', label: 'Cable acero tracción Ø9 mm · 1770 (precio/m)', priceEUR: 14.2, stock: 'in_stock', supplierUrl: 'https://example-industrial.example/w/9mm' },
  { id: 'wire-rope-10mm', category: 'wire_rope', label: 'Cable acero tracción Ø10 mm · 1770 (precio/m)', priceEUR: 17.8, stock: 'in_stock', supplierUrl: 'https://example-industrial.example/w/10mm' },
  { id: 'wire-rope-11mm', category: 'wire_rope', label: 'Cable acero tracción Ø11 mm · 1770 (precio/m)', priceEUR: 22.0, stock: '48h', supplierUrl: 'https://example-industrial.example/w/11mm' },
  { id: 'wire-rope-12mm', category: 'wire_rope', label: 'Cable acero tracción Ø12 mm · 1770 (precio/m)', priceEUR: 27.5, stock: '48h', supplierUrl: 'https://example-industrial.example/w/12mm' },
  { id: 'wire-rope-13mm', category: 'wire_rope', label: 'Cable acero tracción Ø13 mm · 1770 (precio/m)', priceEUR: 33.0, stock: '1w', supplierUrl: 'https://example-industrial.example/w/13mm' },
  { id: 'wire-rope-14mm', category: 'wire_rope', label: 'Cable acero tracción Ø14 mm · 1770 (precio/m)', priceEUR: 39.5, stock: '1w', supplierUrl: 'https://example-industrial.example/w/14mm' },
  { id: 'traction-motor-7k5-brake', category: 'hoist', label: 'Motorreductor tracción 7,5 kW · freno (demo)', priceEUR: 2180.0, stock: '1w', supplierUrl: 'https://example-industrial.example/h/m7k5' },
  { id: 'traction-motor-11k-brake', category: 'hoist', label: 'Motorreductor tracción 11 kW · freno (demo)', priceEUR: 2760.0, stock: '48h', supplierUrl: 'https://example-industrial.example/h/m11' },
  { id: 'traction-motor-15k-brake', category: 'hoist', label: 'Motorreductor tracción 15 kW · freno (demo)', priceEUR: 3520.0, stock: '48h', supplierUrl: 'https://example-industrial.example/h/m15' },
  { id: 'traction-motor-22k-brake', category: 'hoist', label: 'Motorreductor tracción 22 kW · freno (demo)', priceEUR: 4890.0, stock: '1w', supplierUrl: 'https://example-industrial.example/h/m22' },
];

const BY_ID = new Map(COMMERCE_ITEMS.map((x) => [x.id, x]));

/** Busquedas sugeridas Amazon por id (orientativas; el usuario valida referencia). */
const AMAZON_QUERY_BY_ID = /** @type {Record<string, string>} */ ({
  'belt-v-SPZ': 'correa trapezoidal SPZ industrial',
  'belt-v-SPA': 'correa trapezoidal SPA',
  'belt-v-SPB': 'correa trapezoidal SPB',
  'belt-v-SPC': 'correa trapezoidal SPC',
  'belt-v-XPZ': 'correa trapecial estrecha XPZ',
  'belt-v-XPA': 'correa trapecial estrecha XPA',
  'belt-v-XPB': 'correa trapecial estrecha XPB',
  'belt-sync-3': 'correa dentada HTD 3M',
  'belt-sync-5': 'correa dentada HTD 5M',
  'belt-sync-8': 'correa dentada HTD 8M',
  'belt-sync-8_at': 'correa dentada AT10',
  'belt-sync-14': 'correa dentada 14M',
  'belt-sync-2.032': 'correa dentada paso XL',
  'belt-flat-std': 'correa plana transmision neopreno',
  'belt-poly-PJ': 'correa poly v PJ',
  'belt-poly-PK': 'correa poly v PK',
  'belt-poly-PL': 'correa poly v PL',
  'belt-poly-PM': 'correa poly v PM',
  'chain-iso-04b-1': 'cadena rodillos ISO 04B-1',
  'chain-iso-05b-1': 'cadena rodillos ISO 05B-1',
  'chain-iso-06b-1': 'cadena rodillos ISO 06B-1',
  'chain-iso-08b-1': 'cadena rodillos ISO 08B-1',
  'chain-iso-10b-1': 'cadena rodillos ISO 10B-1',
  'chain-iso-12b-1': 'cadena rodillos ISO 12B-1',
  'chain-iso-16b-1': 'cadena rodillos ISO 16B-1',
  'chain-iso-20b-1': 'cadena rodillos ISO 20B-1',
  'chain-iso-24b-1': 'cadena rodillos ISO 24B-1',
  'chain-ansi-35': 'cadena rodillos ANSI 35',
  'chain-ansi-40': 'cadena rodillos ANSI 40',
  'chain-ansi-50': 'cadena rodillos ANSI 50',
  'chain-ansi-60': 'cadena rodillos ANSI 60',
  'chain-ansi-80': 'cadena rodillos ANSI 80',
  'bearing-6205': 'rodamiento 6205 2RS',
  'bearing-6208': 'rodamiento 6208 2RS',
  'bearing-6210': 'rodamiento 6210',
  'bearing-nu208': 'rodamiento cilindrico NU208',
  'bearing-30208': 'rodamiento conico 30208',
  'gear-pair-quote': 'engranaje cilindrico recto acero modulo',
  'shaft-turned-quote': 'eje acero mecanizado torno',
  'pulley-stock-100': 'polea fundicion 100 mm',
  'pulley-stock-160': 'polea fundicion 160 mm',
  'sprocket-kit-17': 'piñon cadena rodillos 17 dientes',
  'wire-rope-8mm': 'cable acero 8mm elevacion',
  'wire-rope-9mm': 'cable acero 9mm elevacion',
  'wire-rope-10mm': 'cable acero 10mm elevacion',
  'wire-rope-11mm': 'cable acero 11mm elevacion',
  'wire-rope-12mm': 'cable acero 12mm elevacion',
  'wire-rope-13mm': 'cable acero 13mm elevacion',
  'wire-rope-14mm': 'cable acero 14mm elevacion',
  'traction-motor-7k5-brake': 'motorreductor traccion 7.5 kW freno',
  'traction-motor-11k-brake': 'motorreductor traccion 11 kW freno',
  'traction-motor-15k-brake': 'motorreductor traccion 15 kW freno',
  'traction-motor-22k-brake': 'motorreductor traccion 22 kW freno',
});

/**
 * @param {string} id
 * @returns {CommerceItem | undefined}
 */
export function getCommerceItem(id) {
  const base = BY_ID.get(id);
  if (!base) return undefined;
  const amazonSearchQuery = AMAZON_QUERY_BY_ID[id];
  if (amazonSearchQuery) return { ...base, amazonSearchQuery };
  return base;
}

/**
 * Filas para el panel de compra a partir de lineas de carrito del laboratorio.
 * @param {Array<{ commerceId: string, qty?: number, note?: string }>} lines
 * @returns {Array<{ label: string, searchQuery: string }>}
 */
export function purchaseSuggestionRowsFromShoppingLines(lines) {
  if (!Array.isArray(lines)) return [];
  const seen = new Set();
  /** @type {Array<{ label: string, searchQuery: string }>} */
  const rows = [];
  for (const L of lines) {
    const item = getCommerceItem(L.commerceId);
    if (!item?.amazonSearchQuery) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    rows.push({ label: item.label, searchQuery: item.amazonSearchQuery });
  }
  return rows;
}

/**
 * @param {CommerceStock} stock
 * @returns {string}
 */
export function stockLabelEs(stock) {
  if (stock === 'in_stock') return 'En stock';
  if (stock === '48h') return '48 h';
  return '1 semana';
}

/**
 * @param {CommerceStock} stock
 * @returns {boolean}
 */
export function isImmediateStock(stock) {
  return stock === 'in_stock';
}

/**
 * @param {import('../lab/chainCatalog.js').ChainCatalogRow[]} rows
 * @param {boolean} inStockOnly
 */
export function filterChainCatalogRows(rows, inStockOnly) {
  if (!inStockOnly) return rows;
  return rows.filter((r) => {
    const it = getCommerceItem(`chain-${r.id}`);
    if (!it) return true;
    return isImmediateStock(it.stock);
  });
}

/**
 * @param {string} chainRefId
 * @returns {string}
 */
export function commerceIdForChainRef(chainRefId) {
  return `chain-${chainRefId}`;
}

/**
 * Rendimiento típico por tipo de correa (η global orientativa, sin catálogo).
 * @param {import('../lab/beltDrives.js').BeltDriveType} beltType
 * @returns {number}
 */
export function typicalBeltEfficiency(beltType) {
  switch (beltType) {
    case 'synchronous':
      return 0.98;
    case 'poly_v':
      return 0.97;
    case 'v_trapezoidal':
      return 0.96;
    case 'flat':
    default:
      return 0.92;
  }
}

/**
 * @param {import('../lab/beltDrives.js').BeltDriveType} beltType
 * @param {object} ids
 * @param {string} [ids.vProfileId]
 * @param {string} [ids.polyProfileId]
 * @param {string} [ids.syncPitchId]
 * @returns {string}
 */
export function commerceIdForBeltSelection(beltType, ids = {}) {
  if (beltType === 'v_trapezoidal') {
    const id = ids.vProfileId || 'SPA';
    return `belt-v-${id}`;
  }
  if (beltType === 'poly_v') {
    const id = ids.polyProfileId || 'PK';
    return `belt-poly-${id}`;
  }
  if (beltType === 'synchronous') {
    const id = ids.syncPitchId || '5';
    return `belt-sync-${id}`;
  }
  return 'belt-flat-std';
}

/**
 * Rodamiento comercial aproximado por orden de magnitud de C (N) — demo.
 * @param {number} dynamicLoad_N
 * @returns {string}
 */
export function commerceIdForBearingC(dynamicLoad_N) {
  const C = Number(dynamicLoad_N) || 0;
  if (C < 18000) return 'bearing-6205';
  if (C < 38000) return 'bearing-6208';
  if (C < 55000) return 'bearing-6210';
  return 'bearing-nu208';
}

/**
 * Cable de tracción demo por diámetro nominal (mm).
 * @param {number} d_mm
 * @returns {string}
 */
export function commerceIdForWireRope(d_mm) {
  const d = Math.round(Number(d_mm) || 10);
  const clamped = Math.max(8, Math.min(14, d));
  return `wire-rope-${clamped}mm`;
}

/**
 * Motorreductor con freno — selección por potencia orientativa en polea (kW).
 * @param {number} power_kW
 * @returns {string}
 */
export function commerceIdForTractionMotor(power_kW) {
  const P = (Number(power_kW) || 0) * 1.25;
  if (P < 6) return 'traction-motor-7k5-brake';
  if (P < 10.5) return 'traction-motor-11k-brake';
  if (P < 16) return 'traction-motor-15k-brake';
  return 'traction-motor-22k-brake';
}

/**
 * @param {Array<{ commerceId: string, qty: number, note?: string }>} lines
 * @returns {{ totalEUR: number, rows: Array<{ item: CommerceItem, qty: number, lineEUR: number, note?: string }> }}
 */
export function resolveShoppingCart(lines) {
  const rows = [];
  let totalEUR = 0;
  for (const L of lines) {
    const item = getCommerceItem(L.commerceId);
    if (!item) continue;
    const qty = Math.max(1, Math.round(Number(L.qty) || 1));
    const lineEUR = item.priceEUR * qty;
    totalEUR += lineEUR;
    rows.push({ item, qty, lineEUR, note: L.note });
  }
  return { totalEUR, rows };
}
