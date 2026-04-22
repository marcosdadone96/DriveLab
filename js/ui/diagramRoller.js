/**
 * Transportador de rodillos motorizado - esquema visual.
 */

import { clamp } from '../utils/calculations.js';

/**
 * @param {SVGSVGElement | null} svg
 * @param {object} p
 */
export function renderRollerConveyorDiagram(svg, p) {
  if (!svg) return;
  const L = clamp(Number(p.length_m) || 4, 1, 25);
  const D = clamp(Number(p.rollerDiameter_mm) || 89, 40, 180);
  const n = Number(p.drumRpm);
  const v = Number(p.speed_m_s) || 0;
  const m = Number(p.loadMass_kg) || 0;

  const vbW = 980;
  const vbH = 420;
  const x0 = 90;
  const y0 = 190;
  const lenPx = Math.min(720, L * 48);
  const depth = 84;
  const x1 = x0 + lenPx;
  const rollers = Math.max(10, Math.min(32, Math.round(L * 2.9)));
  const pitch = lenPx / rollers;

  svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
  svg.innerHTML = `
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f8fafc"/>
        <stop offset="100%" stop-color="#eef2f7"/>
      </linearGradient>
      <linearGradient id="steel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f1f5f9"/>
        <stop offset="100%" stop-color="#94a3b8"/>
      </linearGradient>
      <linearGradient id="blueBeam" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0ea5e9"/>
        <stop offset="100%" stop-color="#2563eb"/>
      </linearGradient>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#0f766e"/>
      </marker>
    </defs>

    <rect width="${vbW}" height="${vbH}" fill="url(#bg)"/>
    <rect x="20" y="16" width="${vbW - 40}" height="48" rx="12" fill="#0f766e" fill-opacity="0.08" stroke="#0d9488"/>
    <text x="34" y="39" font-size="16" font-weight="800" fill="#0f172a" font-family="Inter, system-ui, sans-serif">Transportador de rodillos motorizado</text>
    <text x="34" y="55" font-size="11" fill="#475569" font-family="Inter, system-ui, sans-serif">Vista de perfil para identificar claramente cada rodillo</text>

    <rect x="${x0 - 18}" y="${y0 - 28}" width="${lenPx + 36}" height="22" rx="8" fill="#475569"/>
    <rect x="${x0 - 18}" y="${y0 + 58}" width="${lenPx + 36}" height="20" rx="8" fill="url(#blueBeam)"/>

    ${Array.from({ length: rollers + 1 }, (_, i) => {
      const x = x0 + i * pitch;
      return `
        <circle cx="${x.toFixed(1)}" cy="${(y0 + 14).toFixed(1)}" r="12.5" fill="url(#steel)" stroke="#64748b" stroke-width="1.3"/>
        <circle cx="${x.toFixed(1)}" cy="${(y0 + 14).toFixed(1)}" r="4.1" fill="#94a3b8" stroke="#64748b" stroke-width="0.8"/>
      `;
    }).join('')}

    <rect x="${x0 - 34}" y="${y0 - 38}" width="20" height="124" rx="4" fill="#334155"/>
    <rect x="${x1 + 14}" y="${y0 - 38}" width="20" height="124" rx="4" fill="#334155"/>

    <rect x="${x0 + 70}" y="${y0 + 80}" width="18" height="90" rx="4" fill="#94a3b8"/>
    <rect x="${x0 + 130}" y="${y0 + 80}" width="18" height="90" rx="4" fill="#94a3b8"/>
    <rect x="${x1 - 150}" y="${y0 + 80}" width="18" height="90" rx="4" fill="#94a3b8"/>
    <rect x="${x1 - 90}" y="${y0 + 80}" width="18" height="90" rx="4" fill="#94a3b8"/>

    <rect x="${x0 + 52}" y="${y0 + 170}" width="${lenPx - 104}" height="8" rx="4" fill="#94a3b8"/>
    <rect x="${x0 + 30}" y="${y0 + 92}" width="70" height="24" rx="5" fill="url(#blueBeam)"/>

    <line x1="${x0 + 18}" y1="${y0 - 46}" x2="${x1 - 18}" y2="${y0 - 46}" stroke="#0f766e" stroke-width="2.5" marker-end="url(#arrow)"/>
    <text x="${x0 + 20}" y="${y0 - 32}" font-size="10.5" font-weight="700" fill="#0f766e" font-family="Inter, system-ui, sans-serif">Sentido de avance</text>

    <rect x="665" y="88" width="220" height="130" rx="12" fill="#ffffff" stroke="#cbd5e1"/>
    <text x="680" y="111" font-size="10" font-weight="800" fill="#0f172a" font-family="Inter, system-ui, sans-serif">Datos clave</text>
    <text x="680" y="129" font-size="9.5" fill="#475569" font-family="Inter, system-ui, sans-serif">Carga nominal: ${m.toFixed(0)} kg</text>
    <text x="680" y="146" font-size="9.5" fill="#475569" font-family="Inter, system-ui, sans-serif">Diam. rodillo: ${D.toFixed(0)} mm</text>
    <text x="680" y="163" font-size="9.5" fill="#475569" font-family="Inter, system-ui, sans-serif">Velocidad lineal: ${v.toFixed(2)} m/s</text>
    <text x="680" y="180" font-size="9.5" fill="#475569" font-family="Inter, system-ui, sans-serif">Velocidad giro: ${Number.isFinite(n) ? n.toFixed(1) : '--'} min^-1</text>
    <text x="680" y="197" font-size="9.5" fill="#475569" font-family="Inter, system-ui, sans-serif">Rodillos: ${rollers + 1}</text>
  `;
}

