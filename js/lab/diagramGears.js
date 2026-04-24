/**
 * SVG técnico: dos engranajes rectos en contacto — escala automática sin solapar título ni leyendas.
 */

import { computeSpurGearPair } from './gears.js';

function uid() {
  return `g${Math.random().toString(36).slice(2, 10)}`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toothPaths(cx, cy0, rPitch, rAdd, nTeeth, zFull) {
  const step = (2 * Math.PI) / zFull;
  const paths = [];
  for (let i = 0; i < nTeeth; i++) {
    const t0 = i * step;
    const t1 = t0 + step * 0.34;
    const t2 = t0 + step * 0.66;
    const x0 = cx + rPitch * Math.cos(t0);
    const y0 = cy0 + rPitch * Math.sin(t0);
    const x1 = cx + rAdd * Math.cos(t1);
    const y1 = cy0 + rAdd * Math.sin(t1);
    const x2 = cx + rPitch * Math.cos(t2);
    const y2 = cy0 + rPitch * Math.sin(t2);
    paths.push(`M ${x0.toFixed(2)} ${y0.toFixed(2)} L ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}`);
  }
  return paths;
}

/**
 * @param {SVGSVGElement | null} el
 * @param {Parameters<typeof computeSpurGearPair>[0]} params
 */
export function renderGearPairDiagram(el, params) {
  if (!el) return;
  const r = computeSpurGearPair(params);
  const id = uid();
  const vbW = 668;
  const marginX = 50;
  const headerH = 72;
  const dCenter = r.centerDistance_mm;

  let scale = 1.88;
  const fit = (s) => {
    const ra1 = (r.da1 / 2) * s;
    const ra2 = (r.da2 / 2) * s;
    const span = marginX + ra1 + dCenter * s + ra2 + marginX;
    return { ra1, ra2, rp1: (r.d1 / 2) * s, rp2: (r.d2 / 2) * s, span };
  };

  let L = fit(scale);
  let guard = 0;
  while (L.span > vbW - 20 && guard++ < 50) {
    scale *= 0.93;
    L = fit(scale);
  }

  const cx1 = marginX + L.ra1;
  const cy = headerH + Math.max(L.ra1, L.ra2) + 22;
  const cx2 = cx1 + dCenter * scale;

  const teeth1 = Math.min(r.z1, 52);
  const teeth2 = Math.min(r.z2, 60);
  const p1 = toothPaths(cx1, cy, L.rp1, L.ra1, teeth1, r.z1).join(' ');
  const p2 = toothPaths(cx2, cy, L.rp2, L.ra2, teeth2, r.z2).join(' ');

  const pitchBottom = cy + Math.max(L.ra1, L.ra2) + 16;
  const dimY = pitchBottom + 12;
  const tagY = dimY + 32;
  const vbH = tagY + 46;

  const am = r.centerDistance_mm / 1000;
  const midX = (cx1 + cx2) / 2;
  const geomLeft = cx1 - L.ra1;
  const geomRight = cx2 + L.ra2;
  const shiftX = vbW / 2 - (geomLeft + geomRight) / 2;

  el.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
  el.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  el.setAttribute('role', 'img');
  el.innerHTML = `
    <defs>
      <linearGradient id="${id}Bg" x1="0" y1="0" x2="${vbW}" y2="${vbH}" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#f8fafc" />
        <stop offset="100%" stop-color="#e8eef4" />
      </linearGradient>
      <linearGradient id="${id}Face" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#e2e8f0" />
        <stop offset="100%" stop-color="#64748b" />
      </linearGradient>
      <filter id="${id}Sh" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.2" flood-opacity="0.14" />
      </filter>
      <marker id="${id}ArrE" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#475569"/></marker>
      <marker id="${id}ArrS" markerWidth="8" markerHeight="8" refX="0" refY="4" orient="auto"><path d="M8,0 L0,4 L8,8 Z" fill="#475569"/></marker>
    </defs>
    <rect width="${vbW}" height="${vbH}" fill="url(#${id}Bg)" />
    <rect x="0" y="0" width="${vbW}" height="${headerH - 8}" fill="#fff" opacity="0.55" />
    <text x="${vbW / 2}" y="32" text-anchor="middle" font-size="15" font-weight="800" fill="#0f172a" font-family="Inter, system-ui, sans-serif">Engranajes cilíndricos rectos</text>
    <text x="${vbW / 2}" y="52" text-anchor="middle" font-size="9.5" fill="#475569" font-family="Inter, system-ui, sans-serif">m = ${r.module_mm.toFixed(2)} mm · α = ${r.pressureAngle_deg.toFixed(2)}° · a = ${am.toFixed(2)} m</text>

    <g transform="translate(${shiftX.toFixed(2)}, 0)">
    <line x1="${cx1}" y1="${pitchBottom}" x2="${cx2}" y2="${pitchBottom}" stroke="#94a3b8" stroke-width="1.3" stroke-dasharray="6 5" />
    <text x="${midX}" y="${pitchBottom - 6}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#64748b" font-family="Inter, system-ui, sans-serif">línea de centros</text>

    <g filter="url(#${id}Sh)">
      <circle cx="${cx1}" cy="${cy}" r="${L.ra1}" fill="url(#${id}Face)" stroke="#334155" stroke-width="2.2" />
      <circle cx="${cx1}" cy="${cy}" r="${L.rp1 * 0.38}" fill="#1e293b" stroke="#0f172a" stroke-width="1.4" />
      <path d="${p1}" fill="none" stroke="#1e293b" stroke-width="2" stroke-linejoin="round" />
      <circle cx="${cx1}" cy="${cy}" r="${L.rp1}" fill="none" stroke="#0d9488" stroke-width="1.35" stroke-dasharray="5 4" opacity="0.95" />
    </g>
    <g filter="url(#${id}Sh)">
      <circle cx="${cx2}" cy="${cy}" r="${L.ra2}" fill="url(#${id}Face)" stroke="#334155" stroke-width="2.2" />
      <circle cx="${cx2}" cy="${cy}" r="${L.rp2 * 0.38}" fill="#1e293b" stroke="#0f172a" stroke-width="1.4" />
      <path d="${p2}" fill="none" stroke="#1e293b" stroke-width="2" stroke-linejoin="round" />
      <circle cx="${cx2}" cy="${cy}" r="${L.rp2}" fill="none" stroke="#0d9488" stroke-width="1.35" stroke-dasharray="5 4" opacity="0.95" />
    </g>

    <circle cx="${midX}" cy="${cy}" r="4.5" fill="#0d9488" stroke="#0f766e" stroke-width="1.2" />

    <line x1="${cx1}" y1="${dimY}" x2="${cx2}" y2="${dimY}" stroke="#334155" stroke-width="1.2" marker-start="url(#${id}ArrS)" marker-end="url(#${id}ArrE)" />
    <text x="${midX}" y="${dimY - 7}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#0f172a" font-family="Inter, system-ui, sans-serif">a = ${r.centerDistance_mm.toFixed(2)} mm</text>

    <text x="${cx1}" y="${tagY}" text-anchor="middle" font-size="10" font-weight="700" fill="#0f172a" font-family="Inter, system-ui, sans-serif">z₁ = ${r.z1} · d₁ = ${r.d1.toFixed(2)} mm</text>
    <text x="${cx2}" y="${tagY}" text-anchor="middle" font-size="10" font-weight="700" fill="#0f172a" font-family="Inter, system-ui, sans-serif">z₂ = ${r.z2} · d₂ = ${r.d2.toFixed(2)} mm</text>
    </g>

    <text x="${vbW / 2}" y="${vbH - 12}" text-anchor="middle" font-size="9" fill="#64748b" font-family="Inter, system-ui, sans-serif">${esc('Discontinuo: primitivo. Perfil esquemático (no es plano de taller).')}</text>
  `;
}
