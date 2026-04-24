/**
 * Cotas orientativas DIN 471 (exterior / eje) y DIN 472 (interior / agujero), forma A.
 * Tabulaciones de referencia tipo tablas publicas; verificar contra norma y fabricante.
 *
 * Exterior (471): d1 nominal eje, s, d3 fondo ranura, dFree diam. exterior libre, m anchura ranura.
 * Interior (472): d1 nominal agujero, s, odFree, b anchura anillo, dG fondo ranura, m anchura ranura.
 */

/** @typedef {{ d1: number; s: number; d3: number; dFree: number; m: number }} SeegerExternalRow */
/** @typedef {{ d1: number; s: number; odFree: number; b: number; dG: number; m: number }} SeegerInternalRow */

/** @type {SeegerExternalRow[]} */
export const DIN471_FORM_A = [
  { d1: 3, s: 0.4, d3: 2.7, dFree: 7.0, m: 0.5 },
  { d1: 4, s: 0.4, d3: 3.7, dFree: 8.6, m: 0.5 },
  { d1: 5, s: 0.6, d3: 4.7, dFree: 10.3, m: 0.7 },
  { d1: 6, s: 0.7, d3: 5.6, dFree: 11.7, m: 0.8 },
  { d1: 7, s: 0.8, d3: 6.5, dFree: 13.5, m: 0.9 },
  { d1: 8, s: 0.8, d3: 7.4, dFree: 14.7, m: 0.9 },
  { d1: 9, s: 1.0, d3: 8.4, dFree: 16.0, m: 1.1 },
  { d1: 10, s: 1.0, d3: 9.3, dFree: 17.0, m: 1.1 },
  { d1: 11, s: 1.0, d3: 10.2, dFree: 18.0, m: 1.1 },
  { d1: 12, s: 1.0, d3: 11.0, dFree: 19.0, m: 1.1 },
  { d1: 13, s: 1.0, d3: 11.9, dFree: 20.2, m: 1.1 },
  { d1: 14, s: 1.0, d3: 12.9, dFree: 21.4, m: 1.1 },
  { d1: 15, s: 1.0, d3: 13.8, dFree: 22.6, m: 1.1 },
  { d1: 16, s: 1.0, d3: 14.7, dFree: 23.8, m: 1.1 },
  { d1: 17, s: 1.0, d3: 15.7, dFree: 25.0, m: 1.1 },
  { d1: 18, s: 1.2, d3: 16.5, dFree: 26.2, m: 1.3 },
  { d1: 19, s: 1.2, d3: 17.5, dFree: 27.2, m: 1.3 },
  { d1: 20, s: 1.2, d3: 18.5, dFree: 28.4, m: 1.3 },
  { d1: 21, s: 1.2, d3: 19.5, dFree: 29.6, m: 1.3 },
  { d1: 22, s: 1.2, d3: 20.5, dFree: 30.8, m: 1.3 },
  { d1: 23, s: 1.2, d3: 21.5, dFree: 32.0, m: 1.3 },
  { d1: 24, s: 1.2, d3: 22.2, dFree: 33.2, m: 1.3 },
  { d1: 25, s: 1.2, d3: 23.2, dFree: 34.2, m: 1.3 },
  { d1: 26, s: 1.2, d3: 24.2, dFree: 35.5, m: 1.3 },
  { d1: 27, s: 1.2, d3: 24.9, dFree: 36.7, m: 1.3 },
  { d1: 28, s: 1.5, d3: 25.9, dFree: 37.9, m: 1.6 },
  { d1: 29, s: 1.5, d3: 26.9, dFree: 39.1, m: 1.6 },
  { d1: 30, s: 1.5, d3: 27.9, dFree: 40.5, m: 1.6 },
  { d1: 31, s: 1.5, d3: 28.6, dFree: 41.7, m: 1.6 },
  { d1: 32, s: 1.5, d3: 29.6, dFree: 43.0, m: 1.6 },
  { d1: 33, s: 1.5, d3: 30.5, dFree: 44.0, m: 1.6 },
  { d1: 34, s: 1.5, d3: 31.5, dFree: 45.4, m: 1.6 },
  { d1: 35, s: 1.5, d3: 32.2, dFree: 46.8, m: 1.6 },
  { d1: 36, s: 1.75, d3: 33.2, dFree: 47.8, m: 1.85 },
  { d1: 37, s: 1.75, d3: 34.2, dFree: 49.0, m: 1.85 },
  { d1: 38, s: 1.75, d3: 35.2, dFree: 50.2, m: 1.85 },
  { d1: 39, s: 1.75, d3: 36.0, dFree: 51.4, m: 1.85 },
  { d1: 40, s: 1.75, d3: 36.5, dFree: 52.6, m: 1.85 },
  { d1: 41, s: 1.75, d3: 37.5, dFree: 54.0, m: 1.85 },
  { d1: 42, s: 1.75, d3: 38.5, dFree: 55.7, m: 1.85 },
  { d1: 44, s: 1.75, d3: 40.5, dFree: 57.9, m: 1.85 },
  { d1: 45, s: 1.75, d3: 41.5, dFree: 59.1, m: 1.85 },
  { d1: 46, s: 1.75, d3: 42.5, dFree: 60.1, m: 1.85 },
  { d1: 47, s: 1.75, d3: 43.5, dFree: 61.3, m: 1.85 },
  { d1: 48, s: 1.75, d3: 44.5, dFree: 62.5, m: 1.85 },
  { d1: 50, s: 2.0, d3: 45.8, dFree: 64.5, m: 2.15 },
  { d1: 52, s: 2.0, d3: 47.8, dFree: 66.7, m: 2.15 },
  { d1: 54, s: 2.0, d3: 49.8, dFree: 69.0, m: 2.15 },
  { d1: 55, s: 2.0, d3: 50.8, dFree: 70.2, m: 2.15 },
  { d1: 56, s: 2.0, d3: 51.8, dFree: 71.6, m: 2.15 },
  { d1: 57, s: 2.0, d3: 52.8, dFree: 72.3, m: 2.15 },
  { d1: 58, s: 2.0, d3: 53.8, dFree: 73.6, m: 2.15 },
  { d1: 60, s: 2.0, d3: 55.8, dFree: 75.6, m: 2.15 },
  { d1: 62, s: 2.0, d3: 57.8, dFree: 77.8, m: 2.15 },
  { d1: 63, s: 2.0, d3: 58.8, dFree: 79.0, m: 2.15 },
  { d1: 65, s: 2.5, d3: 60.8, dFree: 81.4, m: 2.65 },
  { d1: 67, s: 2.5, d3: 62.5, dFree: 83.6, m: 2.65 },
  { d1: 68, s: 2.5, d3: 63.5, dFree: 84.4, m: 2.65 },
  { d1: 70, s: 2.5, d3: 65.5, dFree: 87.0, m: 2.65 },
  { d1: 72, s: 2.5, d3: 67.5, dFree: 89.2, m: 2.65 },
  { d1: 75, s: 2.5, d3: 70.5, dFree: 92.7, m: 2.65 },
  { d1: 77, s: 2.5, d3: 72.5, dFree: 94.9, m: 2.65 },
  { d1: 78, s: 2.5, d3: 73.5, dFree: 96.1, m: 2.65 },
  { d1: 80, s: 2.5, d3: 74.5, dFree: 98.1, m: 2.65 },
  { d1: 82, s: 2.5, d3: 76.5, dFree: 100.3, m: 2.65 },
  { d1: 85, s: 3.0, d3: 79.5, dFree: 103.3, m: 3.15 },
  { d1: 87, s: 3.0, d3: 81.5, dFree: 105.5, m: 3.15 },
  { d1: 88, s: 3.0, d3: 82.5, dFree: 106.5, m: 3.15 },
  { d1: 90, s: 3.0, d3: 84.5, dFree: 108.5, m: 3.15 },
  { d1: 92, s: 3.0, d3: 86.5, dFree: 110.9, m: 3.15 },
  { d1: 95, s: 3.0, d3: 89.5, dFree: 114.8, m: 3.15 },
  { d1: 97, s: 3.0, d3: 91.5, dFree: 116.7, m: 3.15 },
  { d1: 98, s: 3.0, d3: 91.5, dFree: 118.6, m: 3.15 },
  { d1: 100, s: 3.0, d3: 94.5, dFree: 120.2, m: 3.15 },
];

/** @type {SeegerInternalRow[]} */
export const DIN472_FORM_A = [
  { d1: 8, s: 0.8, odFree: 8.7, b: 3.0, dG: 8.4, m: 0.9 },
  { d1: 9, s: 0.8, odFree: 9.8, b: 3.7, dG: 9.4, m: 0.9 },
  { d1: 10, s: 1.0, odFree: 10.8, b: 3.3, dG: 10.4, m: 1.1 },
  { d1: 11, s: 1.0, odFree: 11.8, b: 4.1, dG: 11.4, m: 1.1 },
  { d1: 12, s: 1.0, odFree: 13.0, b: 4.9, dG: 12.5, m: 1.1 },
  { d1: 13, s: 1.0, odFree: 14.1, b: 5.4, dG: 13.6, m: 1.1 },
  { d1: 14, s: 1.0, odFree: 15.1, b: 6.2, dG: 14.6, m: 1.1 },
  { d1: 15, s: 1.0, odFree: 16.2, b: 7.2, dG: 15.7, m: 1.1 },
  { d1: 16, s: 1.0, odFree: 17.3, b: 8.0, dG: 16.8, m: 1.1 },
  { d1: 17, s: 1.0, odFree: 18.3, b: 8.8, dG: 17.8, m: 1.1 },
  { d1: 18, s: 1.0, odFree: 19.5, b: 9.4, dG: 19.0, m: 1.1 },
  { d1: 19, s: 1.0, odFree: 20.5, b: 10.4, dG: 20.0, m: 1.1 },
  { d1: 20, s: 1.0, odFree: 21.5, b: 11.2, dG: 21.0, m: 1.1 },
  { d1: 21, s: 1.0, odFree: 22.5, b: 12.2, dG: 22.0, m: 1.1 },
  { d1: 22, s: 1.0, odFree: 23.5, b: 13.2, dG: 23.0, m: 1.1 },
  { d1: 23, s: 1.2, odFree: 24.6, b: 14.2, dG: 24.1, m: 1.3 },
  { d1: 24, s: 1.2, odFree: 25.9, b: 14.8, dG: 25.2, m: 1.3 },
  { d1: 25, s: 1.2, odFree: 26.9, b: 15.5, dG: 26.2, m: 1.3 },
  { d1: 26, s: 1.2, odFree: 27.9, b: 16.1, dG: 27.2, m: 1.3 },
  { d1: 27, s: 1.2, odFree: 29.1, b: 17.1, dG: 28.4, m: 1.3 },
  { d1: 28, s: 1.2, odFree: 30.1, b: 17.9, dG: 29.4, m: 1.3 },
  { d1: 29, s: 1.2, odFree: 31.1, b: 18.9, dG: 30.4, m: 1.3 },
  { d1: 30, s: 1.2, odFree: 32.1, b: 19.9, dG: 31.4, m: 1.3 },
  { d1: 31, s: 1.2, odFree: 33.4, b: 20.0, dG: 32.7, m: 1.3 },
  { d1: 32, s: 1.2, odFree: 34.4, b: 20.6, dG: 33.7, m: 1.3 },
  { d1: 33, s: 1.2, odFree: 35.5, b: 21.6, dG: 34.7, m: 1.3 },
  { d1: 34, s: 1.5, odFree: 36.5, b: 22.6, dG: 35.7, m: 1.6 },
  { d1: 35, s: 1.5, odFree: 37.8, b: 23.6, dG: 37.0, m: 1.6 },
  { d1: 36, s: 1.5, odFree: 38.8, b: 24.6, dG: 38.0, m: 1.6 },
  { d1: 37, s: 1.5, odFree: 39.8, b: 25.4, dG: 39.0, m: 1.6 },
  { d1: 38, s: 1.5, odFree: 40.8, b: 26.4, dG: 40.0, m: 1.6 },
  { d1: 39, s: 1.5, odFree: 42.0, b: 27.3, dG: 41.0, m: 1.6 },
  { d1: 40, s: 1.75, odFree: 43.5, b: 27.8, dG: 42.5, m: 1.85 },
  { d1: 41, s: 1.75, odFree: 44.5, b: 28.6, dG: 43.5, m: 1.85 },
  { d1: 42, s: 1.75, odFree: 45.5, b: 29.6, dG: 44.5, m: 1.85 },
  { d1: 43, s: 1.75, odFree: 46.5, b: 30.6, dG: 45.5, m: 1.85 },
  { d1: 44, s: 1.75, odFree: 47.5, b: 31.4, dG: 46.5, m: 1.85 },
  { d1: 45, s: 1.75, odFree: 48.5, b: 32.0, dG: 47.5, m: 1.85 },
  { d1: 46, s: 1.75, odFree: 49.5, b: 32.8, dG: 48.5, m: 1.85 },
  { d1: 47, s: 1.75, odFree: 50.5, b: 33.5, dG: 49.5, m: 1.85 },
  { d1: 48, s: 2.0, odFree: 51.5, b: 34.5, dG: 50.5, m: 1.85 },
  { d1: 50, s: 2.0, odFree: 54.2, b: 36.3, dG: 53.0, m: 2.15 },
  { d1: 51, s: 2.0, odFree: 55.2, b: 37.3, dG: 54.0, m: 2.15 },
  { d1: 52, s: 2.0, odFree: 56.2, b: 37.9, dG: 55.0, m: 2.15 },
  { d1: 53, s: 2.0, odFree: 57.2, b: 39.0, dG: 56.0, m: 2.15 },
  { d1: 54, s: 2.0, odFree: 58.2, b: 40.0, dG: 57.0, m: 2.15 },
  { d1: 55, s: 2.0, odFree: 59.2, b: 40.7, dG: 58.0, m: 2.15 },
  { d1: 56, s: 2.0, odFree: 60.2, b: 41.7, dG: 59.0, m: 2.15 },
  { d1: 57, s: 2.0, odFree: 61.2, b: 42.7, dG: 60.0, m: 2.15 },
  { d1: 58, s: 2.0, odFree: 62.2, b: 43.5, dG: 61.0, m: 2.15 },
  { d1: 60, s: 2.0, odFree: 64.2, b: 44.7, dG: 63.0, m: 2.15 },
  { d1: 62, s: 2.0, odFree: 66.2, b: 46.7, dG: 65.0, m: 2.15 },
  { d1: 63, s: 2.0, odFree: 67.2, b: 47.7, dG: 66.0, m: 2.15 },
  { d1: 64, s: 2.0, odFree: 68.2, b: 48.7, dG: 67.0, m: 2.15 },
  { d1: 65, s: 2.5, odFree: 69.2, b: 49.0, dG: 68.0, m: 2.65 },
  { d1: 67, s: 2.5, odFree: 71.5, b: 50.8, dG: 70.0, m: 2.65 },
  { d1: 68, s: 2.5, odFree: 72.5, b: 51.6, dG: 71.0, m: 2.65 },
  { d1: 70, s: 2.5, odFree: 74.5, b: 53.6, dG: 73.0, m: 2.65 },
  { d1: 72, s: 2.5, odFree: 76.5, b: 55.6, dG: 75.0, m: 2.65 },
  { d1: 75, s: 2.5, odFree: 79.5, b: 58.6, dG: 78.0, m: 2.65 },
  { d1: 77, s: 2.5, odFree: 82.5, b: 59.2, dG: 80.0, m: 2.65 },
  { d1: 78, s: 2.5, odFree: 82.5, b: 60.1, dG: 81.0, m: 2.65 },
  { d1: 80, s: 2.5, odFree: 85.5, b: 62.1, dG: 83.5, m: 2.65 },
  { d1: 81, s: 2.5, odFree: 86.5, b: 62.2, dG: 84.5, m: 2.65 },
  { d1: 82, s: 2.5, odFree: 87.5, b: 64.1, dG: 85.5, m: 2.65 },
  { d1: 83, s: 2.5, odFree: 88.5, b: 65.2, dG: 86.5, m: 2.65 },
  { d1: 85, s: 3.0, odFree: 90.5, b: 66.9, dG: 88.5, m: 3.15 },
  { d1: 87, s: 3.0, odFree: 93.5, b: 69.0, dG: 90.5, m: 3.15 },
  { d1: 88, s: 3.0, odFree: 93.5, b: 69.9, dG: 91.5, m: 3.15 },
  { d1: 90, s: 3.0, odFree: 95.5, b: 71.9, dG: 93.5, m: 3.15 },
  { d1: 92, s: 3.0, odFree: 97.5, b: 73.7, dG: 95.5, m: 3.15 },
  { d1: 95, s: 3.0, odFree: 100.5, b: 76.5, dG: 98.5, m: 3.15 },
  { d1: 97, s: 3.0, odFree: 103.5, b: 78.1, dG: 100.5, m: 3.15 },
  { d1: 98, s: 3.0, odFree: 103.5, b: 79.0, dG: 101.5, m: 3.15 },
  { d1: 100, s: 3.0, odFree: 105.5, b: 80.6, dG: 103.5, m: 3.15 },
];

/**
 * @param {number} d
 * @param {'shaft'|'bore'} kind
 * @returns {{ exact: boolean; row: SeegerExternalRow | SeegerInternalRow | null; deltaMm: number; hint: string }}
 */
export function lookupSeeger(d, kind) {
  const x = Number(d);
  if (!Number.isFinite(x) || x <= 0) {
    return { exact: false, row: null, deltaMm: NaN, hint: 'Introduzca un di\u00e1metro positivo (mm).' };
  }

  if (kind === 'shaft') {
    const exact = DIN471_FORM_A.find((r) => Math.abs(r.d1 - x) < 0.001);
    if (exact) return { exact: true, row: exact, deltaMm: 0, hint: '' };
    let best = /** @type {SeegerExternalRow | null} */ (null);
    let bestDiff = Infinity;
    for (const r of DIN471_FORM_A) {
      const diff = Math.abs(r.d1 - x);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = r;
      }
    }
    if (!best) return { exact: false, row: null, deltaMm: NaN, hint: 'Sin datos.' };
    if (bestDiff > 4 && bestDiff > x * 0.08) {
      return {
        exact: false,
        row: null,
        deltaMm: bestDiff,
        hint: `Di\u00e1metro fuera del rango \u00fatil de esta demo (aprox. 3\u2013100 mm). Consulte DIN 471 o cat\u00e1logo.`,
      };
    }
    const hint =
      bestDiff < 0.05
        ? ''
        : `No hay talla exacta en la demo: nominal **${best.d1} mm** (delta ${bestDiff.toFixed(2)} mm). Confirme en cat\u00e1logo.`;
    return { exact: false, row: best, deltaMm: bestDiff, hint };
  }

  const exactI = DIN472_FORM_A.find((r) => Math.abs(r.d1 - x) < 0.001);
  if (exactI) return { exact: true, row: exactI, deltaMm: 0, hint: '' };
  let bestI = /** @type {SeegerInternalRow | null} */ (null);
  let bestDiffI = Infinity;
  for (const r of DIN472_FORM_A) {
    const diff = Math.abs(r.d1 - x);
    if (diff < bestDiffI) {
      bestDiffI = diff;
      bestI = r;
    }
  }
  if (!bestI) return { exact: false, row: null, deltaMm: NaN, hint: 'Sin datos.' };
  if (bestDiffI > 4 && bestDiffI > x * 0.08) {
    return {
      exact: false,
      row: null,
      deltaMm: bestDiffI,
      hint: `Di\u00e1metro fuera del rango \u00fatil de esta demo (aprox. 8\u2013100 mm). Consulte DIN 472 o cat\u00e1logo.`,
    };
  }
  const hint =
    bestDiffI < 0.05
      ? ''
      : `No hay talla exacta en la demo: nominal **${bestI.d1} mm** (delta ${bestDiffI.toFixed(2)} mm). Confirme en cat\u00e1logo.`;
  return { exact: false, row: bestI, deltaMm: bestDiffI, hint };
}
