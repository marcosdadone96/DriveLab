/**
 * Esquema didactico: anillo Seeger en ranura.
 * @typedef {import('./seegerDinTables.js').SeegerExternalRow} SeegerExternalRow
 * @typedef {import('./seegerDinTables.js').SeegerInternalRow} SeegerInternalRow
 */

function uid() {
  return `sg${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * @param {SVGSVGElement | null} el
 * @param {{ kind: 'shaft'; row: SeegerExternalRow } | { kind: 'bore'; row: SeegerInternalRow }} spec
 */
export function renderSeegerDiagram(el, spec) {
  if (!el) return;
  const id = uid();
  const vbW = 560;
  const vbH = 300;
  const cx = vbW / 2;
  const yShaft = 168;

  if (spec.kind === 'shaft') {
    const r = spec.row;
    const scale = 3.2;
    const Rshaft = (r.d1 / 2) * scale;
    const Rgroove = (r.d3 / 2) * scale;
    const mPx = r.m * scale;
    const halfSpan = Math.max(Rshaft + 55, 120);

    el.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
    el.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    el.setAttribute('role', 'img');
    el.innerHTML = `
    <defs>
      <linearGradient id="${id}bg" x1="0" y1="0" x2="${vbW}" y2="${vbH}" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#f8fafc"/>
        <stop offset="100%" stop-color="#e2e8f0"/>
      </linearGradient>
      <linearGradient id="${id}metal" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#cbd5e1"/>
        <stop offset="100%" stop-color="#64748b"/>
      </linearGradient>
      <filter id="${id}sh"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.14"/></filter>
    </defs>
    <rect width="${vbW}" height="${vbH}" fill="url(#${id}bg)"/>
    <text x="${cx}" y="30" text-anchor="middle" font-size="14" font-weight="800" fill="#0f172a" font-family="Inter,system-ui,sans-serif">DIN 471 - Anillo exterior (eje)</text>
    <text x="${cx}" y="48" text-anchor="middle" font-size="9.5" fill="#475569" font-family="Inter,system-ui,sans-serif">Secci\u00f3n esquem\u00e1tica, forma A (cotas mm)</text>

    <g transform="translate(${cx}, ${yShaft})" filter="url(#${id}sh)">
      <rect x="${-halfSpan}" y="0" width="${halfSpan * 2}" height="${Rshaft + 6}" fill="url(#${id}metal)" stroke="#334155" stroke-width="2"/>
      <rect x="${-mPx / 2}" y="${-Rgroove + Rshaft}" width="${mPx}" height="${Rshaft - Rgroove + 4}" fill="#1e293b" stroke="#0f172a" stroke-width="1.2"/>
      <path d="M ${-mPx / 2 - 1} ${-Rgroove + Rshaft - 2} L ${-mPx / 2 - 6} ${-Rgroove + Rshaft - 8} L ${mPx / 2 + 6} ${-Rgroove + Rshaft - 8} L ${mPx / 2 + 1} ${-Rgroove + Rshaft - 2} Z"
        fill="#94a3b8" stroke="#475569" stroke-width="1.3" opacity="0.95"/>
      <line x1="${-mPx / 2}" y1="${-Rgroove + Rshaft - 10}" x2="${mPx / 2}" y2="${-Rgroove + Rshaft - 10}" stroke="#0f766e" stroke-width="2"/>
    </g>

    <line x1="${cx + halfSpan + 8}" y1="${yShaft}" x2="${cx + halfSpan + 8}" y2="${yShaft + Rshaft}" stroke="#0d9488" stroke-width="1.2"/>
    <line x1="${cx + halfSpan + 4}" y1="${yShaft}" x2="${cx + halfSpan + 12}" y2="${yShaft}" stroke="#0d9488"/>
    <line x1="${cx + halfSpan + 4}" y1="${yShaft + Rshaft}" x2="${cx + halfSpan + 12}" y2="${yShaft + Rshaft}" stroke="#0d9488"/>
    <text x="${cx + halfSpan + 16}" y="${yShaft + Rshaft / 2 + 4}" font-size="10" font-weight="700" fill="#0f766e" font-family="Inter,system-ui,sans-serif">d1 = ${r.d1}</text>

    <line x1="${cx - halfSpan - 8}" y1="${yShaft - Rgroove + Rshaft}" x2="${cx - halfSpan - 8}" y2="${yShaft + Rshaft}" stroke="#b45309" stroke-width="1.2"/>
    <line x1="${cx - halfSpan - 12}" y1="${yShaft - Rgroove + Rshaft}" x2="${cx - halfSpan - 4}" y2="${yShaft - Rgroove + Rshaft}" stroke="#b45309"/>
    <line x1="${cx - halfSpan - 12}" y1="${yShaft + Rshaft}" x2="${cx - halfSpan - 4}" y2="${yShaft + Rshaft}" stroke="#b45309"/>
    <text x="${cx - halfSpan - 14}" y="${yShaft + Rshaft - (Rshaft - Rgroove) / 2}" text-anchor="end" font-size="9.5" font-weight="700" fill="#b45309" font-family="Inter,system-ui,sans-serif">d3 ${r.d3}</text>

    <line x1="${cx - mPx / 2}" y1="${yShaft - 28}" x2="${cx + mPx / 2}" y2="${yShaft - 28}" stroke="#6366f1" stroke-width="1.2"/>
    <line x1="${cx - mPx / 2}" y1="${yShaft - 32}" x2="${cx - mPx / 2}" y2="${yShaft - 24}" stroke="#6366f1"/>
    <line x1="${cx + mPx / 2}" y1="${yShaft - 32}" x2="${cx + mPx / 2}" y2="${yShaft - 24}" stroke="#6366f1"/>
    <text x="${cx}" y="${yShaft - 34}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#4338ca" font-family="Inter,system-ui,sans-serif">m = ${r.m}</text>

    <text x="${cx}" y="${vbH - 36}" text-anchor="middle" font-size="9.5" fill="#334155" font-family="Inter,system-ui,sans-serif">s = ${r.s} mm; diam. exterior libre aprox. ${r.dFree} mm</text>
    <text x="${cx}" y="${vbH - 18}" text-anchor="middle" font-size="8.5" fill="#64748b" font-family="Inter,system-ui,sans-serif">Ranura en eje DIN 471; tolerancias seg\u00fan norma o fabricante.</text>
    `;
    return;
  }

  const r = spec.row;
  const scale = 3.35;
  const Rb = (r.d1 / 2) * scale;
  const Rg = (r.dG / 2) * scale;
  const cy = 158;

  el.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
  el.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  el.setAttribute('role', 'img');
  el.innerHTML = `
    <defs>
      <linearGradient id="${id}bg" x1="0" y1="0" x2="${vbW}" y2="${vbH}" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#f8fafc"/>
        <stop offset="100%" stop-color="#e2e8f0"/>
      </linearGradient>
      <filter id="${id}sh"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.14"/></filter>
    </defs>
    <rect width="${vbW}" height="${vbH}" fill="url(#${id}bg)"/>
    <text x="${cx}" y="30" text-anchor="middle" font-size="14" font-weight="800" fill="#0f172a" font-family="Inter,system-ui,sans-serif">DIN 472 - Anillo interior (agujero)</text>
    <text x="${cx}" y="48" text-anchor="middle" font-size="9.5" fill="#475569" font-family="Inter,system-ui,sans-serif">Vista axial (cotas mm)</text>

    <g transform="translate(${cx}, ${cy})" filter="url(#${id}sh)">
      <circle cx="0" cy="0" r="${Rb + 38}" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
      <circle cx="0" cy="0" r="${Rb}" fill="#f8fafc" stroke="#0d9488" stroke-width="2.2" stroke-dasharray="5 4"/>
      <path d="M ${-Rg * 0.08} ${-Rg}
        A ${Rg} ${Rg} 0 0 1 ${Rg * 0.08} ${-Rg}
        L ${Rb * 0.12} ${-Rb}
        A ${Rb} ${Rb} 0 0 0 ${-Rb * 0.12} ${-Rb}
        Z" fill="#94a3b8" stroke="#334155" stroke-width="1.4"/>
    </g>

    <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - Rb - 52}" stroke="#0d9488" stroke-width="1.2"/>
    <line x1="${cx - 4}" y1="${cy - Rb}" x2="${cx + 4}" y2="${cy - Rb}" stroke="#0d9488"/>
    <line x1="${cx - 4}" y1="${cy - Rb - 48}" x2="${cx + 4}" y2="${cy - Rb - 48}" stroke="#0d9488"/>
    <text x="${cx + 8}" y="${cy - Rb - 22}" font-size="10" font-weight="700" fill="#0f766e" font-family="Inter,system-ui,sans-serif">d1 -> diam. ${r.d1} mm</text>

    <line x1="${cx + Rg + 24}" y1="${cy}" x2="${cx + Rg + 24}" y2="${cy - Rg}" stroke="#b45309" stroke-width="1.2"/>
    <line x1="${cx + Rg + 20}" y1="${cy - Rg}" x2="${cx + Rg + 28}" y2="${cy - Rg}" stroke="#b45309"/>
    <text x="${cx + Rg + 30}" y="${cy - Rg / 2 + 4}" font-size="9.5" font-weight="700" fill="#b45309" font-family="Inter,system-ui,sans-serif">dG -> ${r.dG} mm (fondo ranura)</text>

    <text x="${cx}" y="${vbH - 36}" text-anchor="middle" font-size="9.5" fill="#334155" font-family="Inter,system-ui,sans-serif">s = ${r.s} mm; diam. anillo libre ~ ${r.odFree} mm; b ~ ${r.b} mm; m = ${r.m} mm</text>
    <text x="${cx}" y="${vbH - 18}" text-anchor="middle" font-size="8.5" fill="#64748b" font-family="Inter,system-ui,sans-serif">Esquema did\u00e1ctico DIN 472; verificar mecanizado con fabricante.</text>
  `;
}
