/**
 * SVG: eje con llaveta y torsión (esquema).
 */

function uid() {
  return `s${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * @param {SVGSVGElement | null} el
 * @param {{ diameter_mm?: number }} [opts]
 */
export function renderShaftTorsionDiagram(el, opts) {
  if (!el) return;
  const d = Number(opts?.diameter_mm) || 45;
  const id = uid();
  const dm = d / 1000;
  el.setAttribute('viewBox', '0 0 560 288');
  el.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  el.setAttribute('role', 'img');
  el.innerHTML = `
    <defs>
      <linearGradient id="${id}Bg" x1="0" y1="0" x2="560" y2="288" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#f1f5f9" />
        <stop offset="100%" stop-color="#e8eef4" />
      </linearGradient>
      <linearGradient id="${id}Shaft" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#94a3b8" />
        <stop offset="45%" stop-color="#e2e8f0" />
        <stop offset="100%" stop-color="#64748b" />
      </linearGradient>
      <marker id="${id}Arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#c2410c"/></marker>
      <filter id="${id}Sh" x="-4%" y="-10%" width="108%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.12" />
      </filter>
    </defs>
    <rect width="560" height="288" fill="url(#${id}Bg)" />
    <text x="280" y="30" text-anchor="middle" font-size="15" font-weight="800" fill="#0f172a" font-family="Inter, system-ui, sans-serif">Eje macizo · torsión</text>
    <text x="280" y="48" text-anchor="middle" font-size="10" fill="#475569" font-family="Inter, system-ui, sans-serif">τ = 16T / (πd³) · sin concentración ni fatiga detallada</text>

    <g transform="translate(72, 154)" filter="url(#${id}Sh)">
      <rect x="0" y="-26" width="416" height="52" rx="8" fill="url(#${id}Shaft)" stroke="#334155" stroke-width="2" />
      <rect x="104" y="-26" width="14" height="9" fill="#1e293b" />
      <line x1="0" y1="-38" x2="0" y2="44" stroke="#0d9488" stroke-width="2.2" />
      <line x1="416" y1="-38" x2="416" y2="44" stroke="#0d9488" stroke-width="2.2" />
      <path d="M -28,-10 L 0,0 L -28,10" fill="none" stroke="#c2410c" stroke-width="3" marker-end="url(#${id}Arr)" />
      <text x="200" y="-44" font-size="11" font-weight="700" fill="#9a3412" font-family="Inter, system-ui, sans-serif">T</text>
    </g>
    <text x="280" y="238" text-anchor="middle" font-size="11" font-weight="700" fill="#0f172a" font-family="Inter, system-ui, sans-serif">Ø mín. ≈ ${dm.toFixed(5)} m (${d.toFixed(2)} mm)</text>
    <text x="280" y="268" text-anchor="middle" font-size="9" fill="#64748b" font-family="Inter, system-ui, sans-serif">Medida comercial; valide deflexión, crítico y acople.</text>
  `;
}
