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
  const rollerR = clamp(D * 0.1, 8, 12);
  const gap = rollerR * 0.7;
  const pitch = rollerR * 2 + gap;
  const rollers = Math.max(8, Math.floor((lenPx - rollerR * 2) / pitch));
  const trainWidth = rollers * pitch;
  const rollerStartX = x0 + (lenPx - trainWidth) / 2 + rollerR;
  const profileY = 112;
  const topViewY = 262;

  svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
  svg.innerHTML = `
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#0f172a"/>
      </marker>
    </defs>

    <rect width="${vbW}" height="${vbH}" fill="#f8fafc"/>
    <rect x="16" y="14" width="${vbW - 32}" height="52" rx="10" fill="#ffffff" stroke="#cbd5e1"/>
    <text x="34" y="39" font-size="16" font-weight="800" fill="#0f172a" font-family="Inter, system-ui, sans-serif">Transportador de rodillos motorizado</text>
    <text x="34" y="55" font-size="11" fill="#475569" font-family="Inter, system-ui, sans-serif">Perfil + planta tecnica (rodillos uniformes sin contacto)</text>

    <text x="34" y="${profileY - 16}" font-size="11" font-weight="700" fill="#334155" font-family="Inter, system-ui, sans-serif">Perfil lateral</text>
    <line x1="${x0 - 26}" y1="${profileY + 56}" x2="${x1 + 28}" y2="${profileY + 56}" stroke="#1f2937" stroke-width="2"/>
    <line x1="${x0 - 26}" y1="${profileY + 78}" x2="${x1 + 28}" y2="${profileY + 78}" stroke="#1f2937" stroke-width="2"/>

    ${Array.from({ length: rollers + 1 }, (_, i) => {
      const x = rollerStartX + i * pitch;
      return `
        <circle cx="${x.toFixed(1)}" cy="${(profileY + 67).toFixed(1)}" r="${rollerR.toFixed(1)}" fill="#e5e7eb" stroke="#111827" stroke-width="1.2"/>
        <circle cx="${x.toFixed(1)}" cy="${(profileY + 67).toFixed(1)}" r="${(rollerR * 0.33).toFixed(1)}" fill="#cbd5e1" stroke="#111827" stroke-width="0.7"/>
        <line x1="${x.toFixed(1)}" y1="${(profileY + 54).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(profileY + 80).toFixed(1)}" stroke="#9ca3af" stroke-width="0.7"/>
      `;
    }).join('')}

    <rect x="${x0 - 34}" y="${profileY + 48}" width="14" height="38" fill="#111827"/>
    <rect x="${x1 + 20}" y="${profileY + 48}" width="14" height="38" fill="#111827"/>

    <line x1="${x0 + 70}" y1="${profileY + 80}" x2="${x0 + 50}" y2="${profileY + 142}" stroke="#374151" stroke-width="3"/>
    <line x1="${x0 + 122}" y1="${profileY + 80}" x2="${x0 + 142}" y2="${profileY + 142}" stroke="#374151" stroke-width="3"/>
    <line x1="${x1 - 126}" y1="${profileY + 80}" x2="${x1 - 146}" y2="${profileY + 142}" stroke="#374151" stroke-width="3"/>
    <line x1="${x1 - 74}" y1="${profileY + 80}" x2="${x1 - 54}" y2="${profileY + 142}" stroke="#374151" stroke-width="3"/>
    <line x1="${x0 + 40}" y1="${profileY + 142}" x2="${x1 - 40}" y2="${profileY + 142}" stroke="#6b7280" stroke-width="3"/>

    <line x1="${x0 + 30}" y1="${profileY + 24}" x2="${x1 - 30}" y2="${profileY + 24}" stroke="#111827" stroke-width="1.5" marker-end="url(#arrow)"/>
    <text x="${x0 + 34}" y="${profileY + 15}" font-size="10.5" font-weight="700" fill="#111827" font-family="Inter, system-ui, sans-serif">Load / sentido de avance</text>

    <text x="34" y="${topViewY - 16}" font-size="11" font-weight="700" fill="#334155" font-family="Inter, system-ui, sans-serif">Vista superior (planta)</text>
    <rect x="${x0 - 26}" y="${topViewY + 6}" width="${lenPx + 52}" height="88" fill="#ffffff" stroke="#111827" stroke-width="1.2"/>
    <line x1="${x0 - 26}" y1="${topViewY + 18}" x2="${x1 + 26}" y2="${topViewY + 18}" stroke="#111827" stroke-width="1"/>
    <line x1="${x0 - 26}" y1="${topViewY + 82}" x2="${x1 + 26}" y2="${topViewY + 82}" stroke="#111827" stroke-width="1"/>

    ${Array.from({ length: rollers + 1 }, (_, i) => {
      const x = rollerStartX + i * pitch;
      return `
        <rect x="${(x - rollerR).toFixed(1)}" y="${(topViewY + 24).toFixed(1)}" width="${(rollerR * 2).toFixed(1)}" height="52" fill="#f3f4f6" stroke="#111827" stroke-width="0.9"/>
        <line x1="${x.toFixed(1)}" y1="${(topViewY + 24).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(topViewY + 76).toFixed(1)}" stroke="#9ca3af" stroke-width="0.7"/>
      `;
    }).join('')}

    <line x1="${x0 - 26}" y1="${topViewY + 106}" x2="${x1 + 26}" y2="${topViewY + 106}" stroke="#9ca3af" stroke-width="1"/>
    <line x1="${x0 - 26}" y1="${topViewY + 102}" x2="${x0 - 26}" y2="${topViewY + 110}" stroke="#9ca3af" stroke-width="1"/>
    <line x1="${x1 + 26}" y1="${topViewY + 102}" x2="${x1 + 26}" y2="${topViewY + 110}" stroke="#9ca3af" stroke-width="1"/>
    <text x="${x0 + lenPx / 2 - 24}" y="${topViewY + 120}" font-size="10" fill="#4b5563" font-family="Inter, system-ui, sans-serif">L = ${L.toFixed(1)} m</text>

    <rect x="702" y="86" width="176" height="148" rx="10" fill="#ffffff" stroke="#d1d5db"/>
    <text x="716" y="108" font-size="10" font-weight="800" fill="#111827" font-family="Inter, system-ui, sans-serif">Datos clave</text>
    <text x="716" y="126" font-size="9.5" fill="#374151" font-family="Inter, system-ui, sans-serif">Carga: ${m.toFixed(0)} kg</text>
    <text x="716" y="143" font-size="9.5" fill="#374151" font-family="Inter, system-ui, sans-serif">Diametro rodillo: ${D.toFixed(0)} mm</text>
    <text x="716" y="160" font-size="9.5" fill="#374151" font-family="Inter, system-ui, sans-serif">Pitch: ${pitch.toFixed(1)} px</text>
    <text x="716" y="177" font-size="9.5" fill="#374151" font-family="Inter, system-ui, sans-serif">Vel. lineal: ${v.toFixed(2)} m/s</text>
    <text x="716" y="194" font-size="9.5" fill="#374151" font-family="Inter, system-ui, sans-serif">Vel. giro: ${Number.isFinite(n) ? n.toFixed(1) : '--'} rpm</text>
    <text x="716" y="211" font-size="9.5" fill="#374151" font-family="Inter, system-ui, sans-serif">Rodillos: ${rollers + 1}</text>
  `;
}



