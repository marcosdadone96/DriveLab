/**
 * Transportador de rodillos motorizado — esquema visual.
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

  const vbW = 920;
  const vbH = 420;
  const x0 = 90;
  const y0 = 205;
  const lenPx = Math.min(670, L * 42);
  const x1 = x0 + lenPx;
  const rollers = Math.max(7, Math.min(24, Math.round(L * 2.4)));
  const pitch = lenPx / rollers;
  const rr = clamp(D * 0.16, 8, 20);

  svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
  svg.innerHTML = `
    <defs>
      <linearGradient id="rollerBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#f8fafc"/>
        <stop offset="100%" stop-color="#eef2f7"/>
      </linearGradient>
      <linearGradient id="rollerRail" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#475569"/>
        <stop offset="50%" stop-color="#64748b"/>
        <stop offset="100%" stop-color="#334155"/>
      </linearGradient>
      <marker id="flowArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#0f766e" />
      </marker>
    </defs>
    <rect width="${vbW}" height="${vbH}" fill="url(#rollerBg)" />
    <rect x="20" y="16" width="${vbW - 40}" height="48" rx="12" fill="#0f766e" fill-opacity="0.1" stroke="#0d9488" />
    <text x="34" y="38" font-size="16" font-weight="800" fill="#0f172a" font-family="Inter, system-ui, sans-serif">Transportador de rodillos motorizado</text>
    <text x="34" y="54" font-size="11" fill="#475569" font-family="Inter, system-ui, sans-serif">Vista lateral simplificada para dimensionado de accionamiento</text>

    <rect x="${x0 - 20}" y="${y0 - 18}" width="${lenPx + 40}" height="16" rx="6" fill="url(#rollerRail)" />
    <rect x="${x0 - 20}" y="${y0 + 52}" width="${lenPx + 40}" height="16" rx="6" fill="url(#rollerRail)" />

    ${Array.from({ length: rollers + 1 }, (_, i) => {
      const x = x0 + i * pitch;
      return `<circle cx="${x.toFixed(1)}" cy="${y0 + 25}" r="${rr.toFixed(1)}" fill="#cbd5e1" stroke="#64748b" stroke-width="2"/>`;
    }).join('')}

    <rect x="${x0 - 32}" y="${y0 - 26}" width="20" height="102" rx="4" fill="#334155"/>
    <rect x="${x1 + 12}" y="${y0 - 26}" width="20" height="102" rx="4" fill="#334155"/>
    <rect x="${x0 + 40}" y="${y0 + 72}" width="18" height="64" rx="4" fill="#475569"/>
    <rect x="${x1 - 58}" y="${y0 + 72}" width="18" height="64" rx="4" fill="#475569"/>
    <line x1="${x0 + 49}" y1="${y0 + 136}" x2="${x1 - 49}" y2="${y0 + 136}" stroke="#94a3b8" stroke-width="5" />

    <line x1="${x0 + 20}" y1="${y0 - 40}" x2="${x1 - 20}" y2="${y0 - 40}" stroke="#0f766e" stroke-width="2.4" marker-end="url(#flowArrow)" />
    <text x="${x0 + 24}" y="${y0 - 48}" font-size="10.5" font-weight="700" fill="#0f766e" font-family="Inter, system-ui, sans-serif">Sentido de avance</text>
    <text x="${(x0 + x1) / 2 - 30}" y="${y0 + 18}" font-size="11" font-weight="700" fill="#334155" font-family="Inter, system-ui, sans-serif">L ? ${L.toFixed(1)} m</text>

    <rect x="606" y="86" width="280" height="134" rx="12" fill="#ffffff" stroke="#cbd5e1"/>
    <text x="622" y="110" font-size="10" font-weight="800" fill="#0f172a" font-family="Inter, system-ui, sans-serif">Datos clave</text>
    <text x="622" y="129" font-size="9.5" fill="#475569" font-family="Inter, system-ui, sans-serif">Carga nominal: ${m.toFixed(0)} kg</text>
    <text x="622" y="146" font-size="9.5" fill="#475569" font-family="Inter, system-ui, sans-serif">Ø rodillo motriz: ${D.toFixed(0)} mm</text>
    <text x="622" y="163" font-size="9.5" fill="#475569" font-family="Inter, system-ui, sans-serif">Velocidad lineal: ${v.toFixed(2)} m/s</text>
    <text x="622" y="180" font-size="9.5" fill="#475569" font-family="Inter, system-ui, sans-serif">Velocidad de giro: ${Number.isFinite(n) ? n.toFixed(1) : '—'} min?¹</text>
    <text x="622" y="197" font-size="9.5" fill="#475569" font-family="Inter, system-ui, sans-serif">Rodillos instalados: ${rollers + 1}</text>
  `;
}

