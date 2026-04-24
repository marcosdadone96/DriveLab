/**
 * Transportador de tornillo — esquema lateral (canal, hélice, longitud e inclinación).
 */

import { clamp } from '../utils/calculations.js';
import { getCurrentLang } from '../config/locales.js';

const VB_W = 860;
const VB_H = 480;

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {SVGSVGElement | null} svg
 * @param {object} p
 */
export function renderScrewConveyorDiagram(svg, p) {
  if (!svg) return;

  const lang = p.lang ?? getCurrentLang();
  const en = lang === 'en';
  const T = {
    title: en ? 'Screw conveyor' : 'Transportador de tornillo helicoidal',
    sub: en
      ? 'Side view · bulk flow and screw rotation'
      : 'Vista lateral clara · flujo de material y giro del conjunto',
    materialFlow: en ? 'Bulk flow' : 'Flujo material',
    inlet: en ? 'Inlet' : 'Entrada',
    outlet: en ? 'Discharge' : 'Descarga',
    geomPanel: en ? 'Geometry (inputs)' : 'Geometría (entrada)',
    screwDia: en ? 'Screw OD ~' : 'Ø tornillo ≈',
    pitch: en ? 'Helix pitch ~' : 'Paso helicoidal ≈',
    troughLoad: en ? 'Trough fill:' : 'Carga canal:',
    cap: en ? 'Capacity:' : 'Capacidad:',
  };

  const Lm = clamp(Number(p.length_m) || 10, 1, 120);
  const Dmm = clamp(Number(p.diameter_mm) || 250, 80, 1500);
  const pitchMm = clamp(Number(p.pitch_mm) || 200, 50, 800);
  const deg = clamp(Number(p.angle_deg) || 0, 0, 90);
  const n = Number(p.screwRpm);
  const capLabel = esc(p.capLabel || '—');
  const λLabel = esc(p.troughLabel || '30 %');

  const scaleX = Math.min(600 / Lm, 48);
  const Lpx = Lm * scaleX;
  const y0 = 350;
  const x0 = 92;
  const troughH = clamp(Dmm * 0.32, 32, 66);
  const screwR = clamp(Dmm * 0.12, 12, 42);
  const θ = (deg * Math.PI) / 180;
  const dx = Math.cos(θ) * Lpx;
  const dy = Math.sin(θ) * Lpx;
  const x1 = x0 + dx;
  const y1 = y0 - dy;
  const midX = (x0 + x1) / 2;
  const midY = (y0 + y1) / 2;
  const helixTurns = Math.max(6, Math.min(18, Math.round(Lm * 0.8)));
  const sideOffset = troughH * 0.45;

  svg.setAttribute('viewBox', `0 0 ${VB_W} ${VB_H}`);
  svg.setAttribute('role', 'img');
  svg.innerHTML = `
    <defs>
      <linearGradient id="bgScrew" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#f0fdfa" />
        <stop offset="100%" stop-color="#e0f2fe" />
      </linearGradient>
      <linearGradient id="troughGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#cbd5e1" />
        <stop offset="100%" stop-color="#94a3b8" />
      </linearGradient>
      <marker id="arrArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#0f766e" />
      </marker>
    </defs>
    <rect width="${VB_W}" height="${VB_H}" fill="url(#bgScrew)" />
    <rect x="12" y="12" width="${VB_W - 24}" height="52" rx="12" fill="#0f766e" fill-opacity="0.1" stroke="#0d9488" stroke-width="1.5" />
    <text x="26" y="36" font-size="16" font-weight="800" fill="#0f172a" font-family="Inter, system-ui, sans-serif">${esc(T.title)}</text>
    <text x="26" y="53" font-size="11" fill="#475569" font-family="Inter, system-ui, sans-serif">${esc(T.sub)}</text>

    <line x1="38" y1="${y0 + troughH + 34}" x2="${VB_W - 40}" y2="${y0 + troughH + 34}" stroke="#64748b" stroke-width="2.5" />

    <!-- Canal -->
    <path d="M ${x0} ${y0} L ${x1} ${y1} L ${x1} ${y1 + troughH} L ${x0} ${y0 + troughH} Z" fill="url(#troughGrad)" stroke="#475569" stroke-width="2" opacity="0.92" />
    <path d="M ${x0} ${y0} L ${x1} ${y1}" stroke="#334155" stroke-width="3" stroke-linecap="round" />
    <path d="M ${x0} ${y0 + troughH} L ${x1} ${y1 + troughH}" stroke="#334155" stroke-width="3" stroke-linecap="round" />

    <!-- Eje + palas simplificadas -->
    <line x1="${x0}" y1="${y0 + troughH * 0.5}" x2="${x1}" y2="${y1 + troughH * 0.5}" stroke="#0f766e" stroke-width="5" stroke-linecap="round" />
    <g stroke="#0d9488" stroke-width="2.4" fill="none" opacity="0.95">
      ${Array.from({ length: helixTurns }, (_, i) => {
        const t = (i + 0.5) / helixTurns;
        const cx = x0 + t * dx;
        const cy = y0 + t * (y1 - y0) + troughH * 0.5;
        const rx = clamp(pitchMm * 0.04, 8, 22);
        const ry = clamp(troughH * 0.33, 10, 24);
        return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${-deg} ${cx} ${cy})" />`;
      }).join('')}
    </g>
    <circle cx="${x0}" cy="${y0 + troughH * 0.5}" r="${screwR}" fill="#134e4a" fill-opacity="0.25" stroke="#0f766e" stroke-width="2" />
    <circle cx="${x1}" cy="${y1 + troughH * 0.5}" r="${screwR}" fill="#134e4a" fill-opacity="0.25" stroke="#0f766e" stroke-width="2" />

    <!-- Flujo -->
    <line x1="${x0 + 10}" y1="${y0 + troughH * 0.17}" x2="${x1 - 16}" y2="${y1 + troughH * 0.17}" stroke="#0f766e" stroke-width="2.5" marker-end="url(#arrArrow)" />
    <text x="${midX - 24}" y="${midY - sideOffset}" font-size="10.5" font-weight="700" fill="#0f766e" font-family="Inter, system-ui, sans-serif">${esc(T.materialFlow)}</text>

    <!-- Etiquetas de proceso -->
    <text x="${x0 - 4}" y="${y0 - 12}" font-size="10.5" font-weight="700" fill="#334155" font-family="Inter, system-ui, sans-serif">${esc(T.inlet)}</text>
    <text x="${x1 - 10}" y="${y1 - 12}" font-size="10.5" font-weight="700" fill="#334155" text-anchor="end" font-family="Inter, system-ui, sans-serif">${esc(T.outlet)}</text>
    <text x="${x0 - 20}" y="${y0 + troughH + 50}" font-size="11" font-weight="700" fill="#334155" font-family="Inter, system-ui, sans-serif">L ≈ ${Lm.toFixed(1)} m</text>
    <text x="${x1 + 10}" y="${midY + 6}" font-size="11" font-weight="700" fill="#9a3412" font-family="Inter, system-ui, sans-serif">θ = ${deg.toFixed(0)}°</text>

    <!-- Panel de datos -->
    <rect x="510" y="90" width="312" height="134" rx="12" fill="#ffffff" fill-opacity="0.96" stroke="#cbd5e1" stroke-width="1.5" />
    <text x="536" y="114" font-size="10" font-weight="800" fill="#0f172a" font-family="Inter, system-ui, sans-serif">${esc(T.geomPanel)}</text>
    <text x="536" y="134" font-size="9.5" fill="#475569" font-family="Inter, system-ui, sans-serif">${esc(T.screwDia)} ${Dmm.toFixed(0)} mm</text>
    <text x="536" y="151" font-size="9.5" fill="#475569" font-family="Inter, system-ui, sans-serif">${esc(T.pitch)} ${pitchMm.toFixed(0)} mm</text>
    <text x="536" y="168" font-size="9.5" fill="#475569" font-family="Inter, system-ui, sans-serif">${esc(T.troughLoad)} ${λLabel}</text>
    <text x="536" y="185" font-size="9.5" fill="#475569" font-family="Inter, system-ui, sans-serif">${esc(T.cap)} ${capLabel}</text>
    <text x="536" y="202" font-size="9.5" fill="#475569" font-family="Inter, system-ui, sans-serif">${
      Number.isFinite(n) ? `n ≈ ${n.toFixed(1)} rpm` : 'n —'
    }</text>
  `;
}
