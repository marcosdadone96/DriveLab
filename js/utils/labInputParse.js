/**
 * Parsing numerico para calculadoras del laboratorio (coma o punto decimal).
 */

export function parseLabFloat(raw) {
  if (raw === null || raw === undefined) return NaN;
  const s = String(raw).trim().replace(',', '.');
  if (s === '') return NaN;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * @param {string} id - id del input/select
 * @param {number} min
 * @param {number} [max]
 * @param {string} label - texto para mensaje de error (puede ser '')
 * @returns {{ ok: true, value: number } | { ok: false, error: string }}
 */
export function readLabNumber(id, min, max, label) {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) {
    return { ok: false, error: label ? `${label}: campo no encontrado.` : 'Campo no encontrado.' };
  }
  const n = parseLabFloat(el.value);
  const p = (msg) => (label ? `${label}: ${msg}` : msg);
  if (!Number.isFinite(n)) {
    return { ok: false, error: p('introduzca un numero valido.') };
  }
  if (n < min) {
    return { ok: false, error: p(`debe ser >= ${min}.`) };
  }
  if (max !== undefined && n > max) {
    return { ok: false, error: p(`debe ser <= ${max}.`) };
  }
  return { ok: true, value: n };
}
