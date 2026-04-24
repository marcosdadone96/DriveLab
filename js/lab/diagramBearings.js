/**
 * SVG: sección de rodamiento rígido de bolas o de rodillos.
 */

function uid() {
  return `r${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * @param {SVGSVGElement | null} el
 * @param {{ type?: 'ball'|'roller' }} [opts]
 */
export function renderBearingSectionDiagram(el, opts) {
  if (!el) return;
  const type = opts?.type === 'roller' ? 'roller' : 'ball';
  const id = uid();
  const roller = type === 'roller';
  el.setAttribute('viewBox', '0 0 560 300');
  el.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  el.setAttribute('role', 'img');
  el.innerHTML = `
    <defs>
      <linearGradient id="${id}Bg" x1="0" y1="0" x2="560" y2="300" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#f1f5f9" />
        <stop offset="100%" stop-color="#e8eef4" />
      </linearGradient>
      <linearGradient id="${id}Steel" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#e2e8f0" />
        <stop offset="50%" stop-color="#94a3b8" />
        <stop offset="100%" stop-color="#64748b" />
      </linearGradient>
      <filter id="${id}Sh" x="-8%" y="-8%" width="116%" height="116%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-opacity="0.16" />
      </filter>
    </defs>
    <rect width="560" height="300" fill="url(#${id}Bg)" />
    <text x="280" y="30" text-anchor="middle" font-size="15" font-weight="800" fill="#0f172a" font-family="Inter, system-ui, sans-serif">Rodamiento ${roller ? 'de rodillos' : 'rígido de bolas'} · sección</text>
    <text x="280" y="46" text-anchor="middle" font-size="10" fill="#475569" font-family="Inter, system-ui, sans-serif">Aros interior/exterior · ${roller ? 'rodillos' : 'bolas'} · jaula (simplificada)</text>

    <g transform="translate(280, 168)" filter="url(#${id}Sh)">
      <path d="M -150,-38 L 150,-38 L 162,0 L 150,38 L -150,38 L -162,0 Z" fill="url(#${id}Steel)" stroke="#334155" stroke-width="2.2" />
      <path d="M -92,-24 L 92,-24 L 100,0 L 92,24 L -92,24 L -100,0 Z" fill="url(#${id}Steel)" stroke="#1e293b" stroke-width="2" />
      ${
        roller
          ? `<g fill="#cbd5e1" stroke="#475569" stroke-width="1">
          ${[-52, -26, 0, 26, 52]
            .map((x) => `<rect x="${x - 5}" y="-15" width="10" height="30" rx="2" />`)
            .join('')}
        </g>`
          : `<g fill="#e2e8f0" stroke="#475569" stroke-width="1.2">
          ${[-58, -35, -12, 12, 35, 58]
            .map((x) => `<circle cx="${x}" cy="0" r="12" />`)
            .join('')}
        </g>`
      }
      <ellipse cx="0" cy="0" rx="124" ry="30" fill="none" stroke="#0d9488" stroke-width="1.2" stroke-dasharray="5 4" opacity="0.75" />
    </g>
    <text x="280" y="286" text-anchor="middle" font-size="9" fill="#64748b" font-family="Inter, system-ui, sans-serif">C y L₁₀ según ISO 281 y catálogo; sin factores térmicos ni fiabilidad ≠ 90%.</text>
  `;
}
