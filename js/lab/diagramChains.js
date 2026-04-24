/**
 * SVG: cadena de rodillos — escala automática; cotas separadas del trazado de rodillos.
 */

import { computeRollerChain } from './chains.js';
import { svgOpenBeltTangents, svgOpenBeltLoopPath } from './diagramGeometry.js';

function uid() {
  return `c${Math.random().toString(36).slice(2, 10)}`;
}

function sprocketPolygon(cx, cy, Router, Rvalley, z) {
  const step = (2 * Math.PI) / z;
  const parts = [];
  for (let i = 0; i < z; i++) {
    const ta = i * step - Math.PI / 2;
    const tm = ta + step * 0.5;
    const xo = cx + Router * Math.cos(ta);
    const yo = cy + Router * Math.sin(ta);
    const xi = cx + Rvalley * Math.cos(tm);
    const yi = cy + Rvalley * Math.sin(tm);
    parts.push(`${i === 0 ? 'M' : 'L'} ${xo.toFixed(2)} ${yo.toFixed(2)} L ${xi.toFixed(2)} ${yi.toFixed(2)}`);
  }
  return `${parts.join(' ')} Z`;
}

function rollersOnSegment(x0, y0, x1, y1, pitchPx, rollerR) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.floor(len / pitchPx));
  const ux = (x1 - x0) / len;
  const uy = (y1 - y0) / len;
  const g = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * len;
    const x = x0 + ux * t;
    const y = y0 + uy * t;
    g.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rollerR}" fill="#334155" stroke="#0f172a" stroke-width="0.9" />`);
  }
  return g.join('');
}

/**
 * @param {SVGSVGElement | null} el
 * @param {Parameters<typeof computeRollerChain>[0]} params
 */
export function renderChainDriveDiagram(el, params) {
  if (!el) return;
  const r = computeRollerChain(params);
  const id = uid();
  const vbW = 668;
  const headerH = 68;
  let k = 0.38;
  const y = 244;
  let xL = 94;

  let RpL = (r.pitchDiameter2_mm / 2) * k;
  let RpR = (r.pitchDiameter1_mm / 2) * k;
  let pPx = r.pitch_mm * k;
  let Cpx = r.center_mm * k;
  let xR = xL + Cpx;

  let RouterL = RpL + pPx * 0.42;
  let guard = 0;
  while (xR + RpR + pPx * 0.5 > vbW - 48 && guard++ < 40) {
    k *= 0.92;
    RpL = (r.pitchDiameter2_mm / 2) * k;
    RpR = (r.pitchDiameter1_mm / 2) * k;
    pPx = r.pitch_mm * k;
    Cpx = r.center_mm * k;
    xL = Math.max(56, 92);
    xR = xL + Cpx;
    RouterL = RpL + pPx * 0.42;
  }

  const RvalL = RpL - pPx * 0.28;
  const RouterR = RpR + pPx * 0.42;
  const RvalR = RpR - pPx * 0.28;

  const beltPath = svgOpenBeltLoopPath(xL, y, RpL, xR, RpR);
  const tang = svgOpenBeltTangents(xL, y, RpL, xR, RpR);
  const rollerR = Math.max(2.2, pPx * 0.22);
  const rollersTop = rollersOnSegment(tang.UL.x, tang.UL.y, tang.UR.x, tang.UR.y, pPx, rollerR);
  const rollersBot = rollersOnSegment(tang.LR.x, tang.LR.y, tang.LL.x, tang.LL.y, pPx, rollerR);

  const pathL = sprocketPolygon(xL, y, RouterL, RvalL, Math.min(r.z2, 36));
  const pathR = sprocketPolygon(xR, y, RouterR, RvalR, Math.min(r.z1, 36));

  const bodyBottom = y + Math.max(RouterL, RouterR) + 16;
  const dimY = bodyBottom + 14;
  const tagY = dimY + 28;
  const vbH = tagY + 40;
  const geomLeft = xL - RouterL;
  const geomRight = xR + RouterR;
  const shiftX = vbW / 2 - (geomLeft + geomRight) / 2;

  el.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
  el.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  el.setAttribute('role', 'img');
  el.innerHTML = `
    <defs>
      <linearGradient id="${id}Bg" x1="0" y1="0" x2="${vbW}" y2="${vbH}" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#f8fafc" />
        <stop offset="100%" stop-color="#e2e8f0" />
      </linearGradient>
      <linearGradient id="${id}Met" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#cbd5e1" />
        <stop offset="100%" stop-color="#64748b" />
      </linearGradient>
      <filter id="${id}Sh" x="-6%" y="-6%" width="112%" height="112%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.15" />
      </filter>
      <marker id="${id}Ce" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#475569"/></marker>
      <marker id="${id}Cs" markerWidth="8" markerHeight="8" refX="0" refY="4" orient="auto"><path d="M8,0 L0,4 L8,8 Z" fill="#475569"/></marker>
    </defs>
    <rect width="${vbW}" height="${vbH}" fill="url(#${id}Bg)" />
    <rect x="0" y="0" width="${vbW}" height="${headerH - 8}" fill="#fff" opacity="0.55" />
    <text x="${vbW / 2}" y="28" text-anchor="middle" font-size="15" font-weight="800" fill="#0f172a" font-family="Inter, system-ui, sans-serif">Cadena de rodillos · primitivo</text>
    <text x="${vbW / 2}" y="46" text-anchor="middle" font-size="9.5" fill="#475569" font-family="Inter, system-ui, sans-serif">p = ${r.pitch_mm.toFixed(2)} mm · L ≈ ${r.chainLength_pitches.toFixed(2)} pasos (${r.chainLength_pitches_roundUp} al alza)</text>

    <g transform="translate(${shiftX.toFixed(2)}, 0)">
    <line x1="${xL}" y1="${y + RouterL + 4}" x2="${xL}" y2="${y + RouterL + 44}" stroke="#64748b" stroke-width="3.5" stroke-linecap="round" />
    <line x1="${xR}" y1="${y + RouterR + 4}" x2="${xR}" y2="${y + RouterR + 44}" stroke="#64748b" stroke-width="3.5" stroke-linecap="round" />

    <circle cx="${xL}" cy="${y}" r="${RpL}" fill="none" stroke="#0d9488" stroke-width="1.25" stroke-dasharray="5 4" opacity="0.88" />
    <circle cx="${xR}" cy="${y}" r="${RpR}" fill="none" stroke="#0d9488" stroke-width="1.25" stroke-dasharray="5 4" opacity="0.88" />

    <path d="${pathL}" fill="url(#${id}Met)" stroke="#1e293b" stroke-width="2" filter="url(#${id}Sh)" />
    <path d="${pathR}" fill="url(#${id}Met)" stroke="#1e293b" stroke-width="2" filter="url(#${id}Sh)" />
    <circle cx="${xL}" cy="${y}" r="${RpL * 0.22}" fill="#0f172a" />
    <circle cx="${xR}" cy="${y}" r="${RpR * 0.22}" fill="#0f172a" />

    <path d="${beltPath}" fill="none" stroke="#1e293b" stroke-width="4.5" stroke-linejoin="round" opacity="0.28" />
    ${rollersTop}
    ${rollersBot}

    <line x1="${xL}" y1="${dimY}" x2="${xR}" y2="${dimY}" stroke="#334155" stroke-width="1.2" marker-start="url(#${id}Cs)" marker-end="url(#${id}Ce)" />
    <text x="${(xL + xR) / 2}" y="${dimY - 6}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#0f172a" font-family="Inter, system-ui, sans-serif">C = ${r.center_mm.toFixed(2)} mm</text>

    <text x="${xL}" y="${tagY}" text-anchor="middle" font-size="10" font-weight="700" fill="#0f172a" font-family="Inter, system-ui, sans-serif">z₂ = ${r.z2}</text>
    <text x="${xR}" y="${tagY}" text-anchor="middle" font-size="10" font-weight="700" fill="#0f172a" font-family="Inter, system-ui, sans-serif">z₁ = ${r.z1}</text>
    </g>

    <text x="${vbW / 2}" y="${vbH - 10}" text-anchor="middle" font-size="9" fill="#64748b" font-family="Inter, system-ui, sans-serif">Rodillos en tramos rectos (esquema). ISO / DIN / fabricante.</text>
  `;
}
