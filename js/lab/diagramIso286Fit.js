/**
 * Esquema 1D: zonas de tolerancia agujero vs eje (ISO 286, vista en diametro).
 */

function uid() {
  return `iso${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * @param {SVGSVGElement | null} el
 * @param {{ ok: true } & Record<string, unknown> | { ok: false } | null | undefined} result
 */
export function renderIso286FitDiagram(el, result) {
  if (!el) return;
  const id = uid();
  if (!result || !result.ok) {
    el.setAttribute('viewBox', '0 0 640 200');
    el.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    el.setAttribute('role', 'img');
    el.innerHTML = `
      <rect width="640" height="200" fill="#f1f5f9" />
      <text x="320" y="100" text-anchor="middle" font-size="13" fill="#64748b" font-family="Inter, system-ui, sans-serif">Introduzca cotas validas (1-500 mm) y letras IT soportadas</text>
    `;
    return;
  }

  const d0 = result.dNom;
  const dhMin = /** @type {number} */ (result.hole.EI_um);
  const dhMax = /** @type {number} */ (result.hole.ES_um);
  const dsMin = /** @type {number} */ (result.shaft.ei_um);
  const dsMax = /** @type {number} */ (result.shaft.es_um);

  const span = Math.max(dhMax - dhMin, dsMax - dsMin, 1);
  const pad = Math.max(span * 1.8, 8, result.IT_hole_microns, result.IT_shaft_microns);
  const vmin = Math.min(dhMin, dsMin, 0) - pad;
  const vmax = Math.max(dhMax, dsMax, 0) + pad;
  const range = Math.max(vmax - vmin, 1e-6);

  const W = 640;
  const H = 248;
  const left = 56;
  const right = W - 48;
  const inner = right - left;
  /** @param {number} deltaUm desviacion vs nominal (micras) */
  const xOf = (deltaUm) => left + ((deltaUm - vmin) / range) * inner;

  const yHole = 52;
  const yShaft = 132;
  const bandH = 36;

  const fmt = (u) => Number(u).toFixed(1);

  el.setAttribute('viewBox', `0 0 ${W} ${H}`);
  el.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  el.setAttribute('role', 'img');

  const x0 = xOf(0);
  const xh0 = xOf(dhMin);
  const xh1 = xOf(dhMax);
  const xs0 = xOf(dsMin);
  const xs1 = xOf(dsMax);

  const holeCode = `${result.hole.letter}${String(result.hole.it).replace(/^IT/i, '')}`;
  const shaftCode = `${result.shaft.letter}${String(result.shaft.it).replace(/^IT/i, '')}`;

  el.innerHTML = `
    <defs>
      <linearGradient id="${id}Bg" x1="0" y1="0" x2="${W}" y2="${H}" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#f8fafc" />
        <stop offset="100%" stop-color="#e2e8f0" />
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#${id}Bg)" />
    <text x="${W / 2}" y="26" text-anchor="middle" font-size="14" font-weight="800" fill="#0f172a" font-family="Inter, system-ui, sans-serif">Zonas de tolerancia (desviaciones)</text>
    <text x="${W / 2}" y="44" text-anchor="middle" font-size="10" fill="#475569" font-family="Inter, system-ui, sans-serif">${holeCode} / ${shaftCode} - nominal ${d0} mm</text>

    <line x1="${left}" y1="${H - 36}" x2="${right}" y2="${H - 36}" stroke="#94a3b8" stroke-width="1.2" />
    <text x="${left}" y="${H - 18}" font-size="9" fill="#64748b" font-family="Inter, system-ui, sans-serif">${fmt(vmin)} um</text>
    <text x="${right}" y="${H - 18}" text-anchor="end" font-size="9" fill="#64748b" font-family="Inter, system-ui, sans-serif">${fmt(vmax)} um</text>

    <line x1="${x0}" y1="34" x2="${x0}" y2="${H - 48}" stroke="#0f766e" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.85" />
    <text x="${x0 + 5}" y="64" font-size="9" font-weight="700" fill="#0f766e" font-family="Inter, system-ui, sans-serif">Linea cero</text>

    <text x="8" y="${yHole + 22}" font-size="11" font-weight="700" fill="#0f766e" font-family="Inter, system-ui, sans-serif">Agujero</text>
    <rect x="${Math.min(xh0, xh1)}" y="${yHole}" width="${Math.abs(xh1 - xh0)}" height="${bandH}" rx="4" fill="rgba(13,148,136,0.22)" stroke="#0f766e" stroke-width="1.6" />
    <text x="${(xh0 + xh1) / 2}" y="${yHole + bandH + 14}" text-anchor="middle" font-size="9" fill="#134e4a" font-family="Inter, system-ui, sans-serif">EI-ES: ${fmt(dhMin)} ... ${fmt(dhMax)} um</text>

    <text x="8" y="${yShaft + 22}" font-size="11" font-weight="700" fill="#c2410c" font-family="Inter, system-ui, sans-serif">Eje</text>
    <rect x="${Math.min(xs0, xs1)}" y="${yShaft}" width="${Math.abs(xs1 - xs0)}" height="${bandH}" rx="4" fill="rgba(234,88,12,0.2)" stroke="#c2410c" stroke-width="1.6" />
    <text x="${(xs0 + xs1) / 2}" y="${yShaft + bandH + 14}" text-anchor="middle" font-size="9" fill="#9a3412" font-family="Inter, system-ui, sans-serif">ei-es: ${fmt(dsMin)} ... ${fmt(dsMax)} um</text>

    <text x="${W / 2}" y="${H - 6}" text-anchor="middle" font-size="9" fill="#475569" font-family="Inter, system-ui, sans-serif">Micras respecto al diametro nominal (ISO 286, extracto)</text>
  `;
}
