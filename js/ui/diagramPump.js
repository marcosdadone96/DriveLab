/**
 * Bomba centrífuga — esquema de instalación (succión, bomba, impulsión y H manométrica).
 */

import { clamp } from '../utils/calculations.js';

const VB_W = 860;
const VB_H = 520;

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
 * @param {string} p.flowLabel — ej. "48 m³/h"
 * @param {number} p.head_m
 * @param {number} p.pumpSpeed_rpm
 * @param {number} p.hydraulicPower_kW
 * @param {number} p.shaftPower_kW
 * @param {number} p.etaPump_pct
 * @param {'direct'|'gearmotor'} [p.couplingType]
 * @param {string} [p.fluidShort] — ej. "Agua · 1000 kg/m³"
 */
export function renderCentrifugalPumpDiagram(svg, p) {
  if (!svg) return;

  const H = clamp(Number(p.head_m) || 10, 0.5, 250);
  const n = clamp(Number(p.pumpSpeed_rpm) || 1450, 100, 6000);
  const Ph = Number(p.hydraulicPower_kW);
  const Ps = Number(p.shaftPower_kW);
  const eta = clamp(Number(p.etaPump_pct) || 75, 1, 99);
  const coupling = p.couplingType === 'direct' ? 'direct' : 'gearmotor';
  const flowLabel = esc(p.flowLabel || '—');
  const fluidShort = esc(p.fluidShort || '');

  /** Altura visual de la columna de impulsión (px), correlacionada suavemente con H */
  const rise = clamp(72 + Math.sqrt(H) * 10, 80, 220);
  const qArrow = clamp(56 + (flowLabel.length > 12 ? 8 : 0), 52, 120);

  const yGround = 420;
  const yLiquid = 388;
  const xTankL = 72;
  const xTankR = 228;
  const cxPump = 420;
  const cyPump = yGround - 38;
  const rVolute = 52;
  const xDisStart = cxPump + rVolute + 8;
  const yDisBottom = cyPump - 12;
  const xDisCorner = xDisStart + 140;
  const yDisTop = yDisBottom - rise;
  const xDisEnd = xDisCorner + 160;

  const motorW = coupling === 'gearmotor' ? 118 : 86;
  const motorH = 44;
  const xMotor = cxPump - rVolute - motorW - 36;
  const yMotor = cyPump - motorH / 2 - 4;

  svg.setAttribute('viewBox', `0 0 ${VB_W} ${VB_H}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute(
    'aria-label',
    `Esquema bomba centrífuga: caudal ${p.flowLabel || ''}, altura manométrica ${H} metros`,
  );

  svg.innerHTML = `
    <defs>
      <linearGradient id="bgPump" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ecfeff" />
        <stop offset="50%" stop-color="#f8fafc" />
        <stop offset="100%" stop-color="#e0f2fe" />
      </linearGradient>
      <linearGradient id="liquidPump" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#7dd3fc" />
        <stop offset="100%" stop-color="#0284c7" />
      </linearGradient>
      <linearGradient id="metalPump" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#94a3b8" />
        <stop offset="100%" stop-color="#475569" />
      </linearGradient>
      <marker id="mkQ" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
        <path d="M0,0 L9,4.5 L0,9 Z" fill="#0d9488" />
      </marker>
      <marker id="mkH" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
        <path d="M0,0 L9,4.5 L0,9 Z" fill="#b45309" />
      </marker>
      <filter id="pumpShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.14" />
      </filter>
    </defs>

    <rect width="${VB_W}" height="${VB_H}" fill="url(#bgPump)" />
    <rect x="14" y="14" width="${VB_W - 28}" height="52" rx="12" fill="#0f766e" fill-opacity="0.1" stroke="#0d9488" stroke-width="1.5" />
    <text x="28" y="38" font-size="17" font-weight="800" fill="#0f172a" font-family="Inter, system-ui, Segoe UI, sans-serif">Bomba centrifuga</text>
    <text x="28" y="56" font-size="11.5" fill="#475569" font-family="Inter, system-ui, sans-serif">Deposito · succion · bomba · impulsion · altura manometrica total</text>

    <!-- Suelo -->
    <line x1="40" y1="${yGround}" x2="${VB_W - 40}" y2="${yGround}" stroke="#64748b" stroke-width="2.5" />
    <text x="${VB_W - 210}" y="${yGround + 18}" font-size="10" fill="#94a3b8" font-family="Inter, system-ui, sans-serif">Referencia / soleo (esquema)</text>

    <!-- Depósito succión -->
    <rect x="${xTankL}" y="${yLiquid - 110}" width="${xTankR - xTankL}" height="122" rx="8" fill="#f1f5f9" stroke="#64748b" stroke-width="2" />
    <rect x="${xTankL + 4}" y="${yLiquid - 20}" width="${xTankR - xTankL - 8}" height="28" fill="url(#liquidPump)" opacity="0.85" />
    <path d="M ${xTankL + 6} ${yLiquid - 22} Q ${(xTankL + xTankR) / 2} ${yLiquid - 34} ${xTankR - 6} ${yLiquid - 22}" fill="none" stroke="#0ea5e9" stroke-width="2" opacity="0.7" />
    <text x="${(xTankL + xTankR) / 2 - 42}" y="${yLiquid - 88}" font-size="11" font-weight="700" fill="#334155" font-family="Inter, system-ui, sans-serif">Depósito / pozo</text>
    <text x="${(xTankL + xTankR) / 2 - 38}" y="${yLiquid + 8}" font-size="9.5" fill="#475569" font-family="Inter, system-ui, sans-serif">NPSH disponible: validar por separado</text>

    <!-- Tubería succión -->
    <path d="M ${xTankR - 4} ${yLiquid - 6} L ${cxPump - rVolute - 6} ${yLiquid - 6} L ${cxPump - rVolute - 6} ${cyPump + 8}" fill="none" stroke="#334155" stroke-width="14" stroke-linejoin="round" />
    <path d="M ${xTankR - 4} ${yLiquid - 6} L ${cxPump - rVolute - 6} ${yLiquid - 6} L ${cxPump - rVolute - 6} ${cyPump + 8}" fill="none" stroke="#0ea5e9" stroke-width="5" stroke-linejoin="round" opacity="0.55" />

    <!-- Flecha caudal Q (succión) -->
    <line x1="${xTankR + 30}" y1="${yLiquid - 6}" x2="${xTankR + 30 + qArrow}" y2="${yLiquid - 6}" stroke="#0d9488" stroke-width="2.8" marker-end="url(#mkQ)" />
    <text x="${xTankR + 24}" y="${yLiquid - 18}" font-size="11" font-weight="800" fill="#0f766e" font-family="Inter, system-ui, sans-serif">Q = ${flowLabel}</text>

    <!-- Motor / reductor -->
    <g filter="url(#pumpShadow)">
      <rect x="${xMotor}" y="${yMotor}" width="${motorW}" height="${motorH}" rx="8" fill="#1e293b" stroke="#0f172a" stroke-width="1.5" />
      <text x="${xMotor + motorW / 2}" y="${yMotor + motorH / 2 + 4}" text-anchor="middle" font-size="10" font-weight="800" fill="#f8fafc" font-family="Inter, system-ui, sans-serif">${
        coupling === 'gearmotor' ? 'Motor + reductor' : 'Motor'
      }</text>
    </g>
    <line x1="${xMotor + motorW}" y1="${cyPump}" x2="${cxPump - rVolute}" y2="${cyPump}" stroke="#334155" stroke-width="6" stroke-linecap="round" />
    <circle cx="${cxPump - rVolute - 10}" cy="${cyPump}" r="5" fill="#64748b" stroke="#334155" />

    <!-- Voluta / bomba -->
    <g filter="url(#pumpShadow)">
      <ellipse cx="${cxPump}" cy="${cyPump}" rx="${rVolute + 18}" ry="${rVolute}" fill="url(#metalPump)" stroke="#334155" stroke-width="2" />
      <path d="M ${cxPump - 8} ${cyPump - rVolute * 0.2} A ${rVolute * 0.55} ${rVolute * 0.55} 0 1 1 ${cxPump + 10} ${cyPump + rVolute * 0.35}" fill="none" stroke="#1e293b" stroke-width="3" opacity="0.45" />
      <circle cx="${cxPump - 4}" cy="${cyPump}" r="${rVolute * 0.38}" fill="#0ea5e9" fill-opacity="0.25" stroke="#0369a1" stroke-width="2" />
      <text x="${cxPump - 6}" y="${cyPump + rVolute + 22}" text-anchor="middle" font-size="11" font-weight="800" fill="#0f172a" font-family="Inter, system-ui, sans-serif">Bomba</text>
      <text x="${cxPump - 6}" y="${cyPump + rVolute + 38}" text-anchor="middle" font-size="9.5" fill="#64748b" font-family="Inter, system-ui, sans-serif">n = ${n.toFixed(0)} rpm</text>
    </g>

    <!-- Impulsión -->
    <path d="M ${xDisStart} ${yDisBottom} L ${xDisCorner} ${yDisBottom} L ${xDisCorner} ${yDisTop} L ${xDisEnd} ${yDisTop}" fill="none" stroke="#334155" stroke-width="14" stroke-linejoin="round" />
    <path d="M ${xDisStart} ${yDisBottom} L ${xDisCorner} ${yDisBottom} L ${xDisCorner} ${yDisTop} L ${xDisEnd} ${yDisTop}" fill="none" stroke="#0ea5e9" stroke-width="5" stroke-linejoin="round" opacity="0.5" />

    <!-- Flecha Q impulsión -->
    <line x1="${xDisCorner + 20}" y1="${yDisTop}" x2="${xDisCorner + 20 + qArrow * 0.85}" y2="${yDisTop}" stroke="#0d9488" stroke-width="2.5" marker-end="url(#mkQ)" />

    <!-- Doble flecha H -->
    <line x1="${xDisEnd + 48}" y1="${yDisBottom}" x2="${xDisEnd + 48}" y2="${yDisTop}" stroke="#b45309" stroke-width="2.2" marker-start="url(#mkH)" marker-end="url(#mkH)" />
    <text x="${xDisEnd + 58}" y="${(yDisBottom + yDisTop) / 2}" font-size="12" font-weight="800" fill="#9a3412" font-family="Inter, system-ui, sans-serif">H = ${H.toFixed(1)} m</text>

    <!-- Caja datos -->
    <rect x="56" y="${yGround - 168}" width="286" height="108" rx="12" fill="#ffffff" fill-opacity="0.94" stroke="#cbd5e1" stroke-width="1.5" />
    <text x="72" y="${yGround - 142}" font-size="10" font-weight="800" fill="#0f172a" font-family="Inter, system-ui, sans-serif">Punto de trabajo (modelo)</text>
    <text x="72" y="${yGround - 122}" font-size="9.5" fill="#475569" font-family="Inter, system-ui, sans-serif">P_h ≈ ${Number.isFinite(Ph) ? Ph.toFixed(3) : '—'} kW · P eje ≈ ${Number.isFinite(Ps) ? Ps.toFixed(3) : '—'} kW</text>
    <text x="72" y="${yGround - 104}" font-size="9.5" fill="#475569" font-family="Inter, system-ui, sans-serif">Eficiencia declarada ≈ ${eta.toFixed(0)} %</text>
    ${
      fluidShort
        ? `<text x="72" y="${yGround - 86}" font-size="9.5" fill="#475569" font-family="Inter, system-ui, sans-serif">${fluidShort}</text>`
        : ''
    }
  `;
}
