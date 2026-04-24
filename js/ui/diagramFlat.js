/**
 * Cinta plana — esquema técnico: métricas en chips compactos sobre el dibujo (sin líneas guía).
 */

import { clamp } from '../utils/calculations.js';
import { getCurrentLang } from '../config/locales.js';

function fmt(n, d = 2) {
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(d);
}

/**
 * @param {SVGSVGElement} svg
 * @param {object} p
 */
export function renderFlatConveyorDiagram(svg, p) {
  if (!svg) return;

  const lang = p.lang ?? getCurrentLang();
  const en = lang === 'en';

  const L = clamp(p.beltLength_m || 10, 2, 80);
  const Dmm = clamp(p.rollerDiameter_mm || 400, 50, 2000);
  const v = Math.max(0, p.beltSpeed_m_s || 0);
  const F = Math.max(0, p.frictionForce_N || 0);
  const m = Math.max(0, p.loadMass_kg || 0);
  const mu = Math.max(0, p.frictionCoeff ?? 0);
  const Nf = Math.max(0, p.normalForce_N || 0);
  const Pd = Math.max(0, p.powerAtDrum_W || 0);
  const Td = Math.max(0, p.torqueAtDrum_Nm || 0);

  const d = p.detail || {};
  const Fsteady = Number.isFinite(d.F_steady_N) ? d.F_steady_N : F;
  const Fstart = Number.isFinite(d.F_total_start_N) ? d.F_total_start_N : Fsteady;
  const Trun = Number.isFinite(p.torqueRun_Nm) ? p.torqueRun_Nm : Td;
  const Tstart = Number.isFinite(p.torqueStart_Nm) ? p.torqueStart_Nm : Trun;
  const Tdesign = Number.isFinite(p.torqueDesign_Nm) ? p.torqueDesign_Nm : Trun * (p.serviceFactor ?? 1);
  const PdrumRun = Number.isFinite(p.powerDrumRun_W) ? p.powerDrumRun_W : Pd;
  const PdrumStart = Number.isFinite(p.powerDrumStart_W) ? p.powerDrumStart_W : Fstart * v;
  const PmotorW = Number.isFinite(p.powerMotorDesign_W) ? p.powerMotorDesign_W : NaN;
  const PmotorkW = Number.isFinite(PmotorW) ? PmotorW / 1000 : NaN;

  const sf = Number.isFinite(p.serviceFactor) ? p.serviceFactor : 1;
  const etaPct = Number.isFinite(p.efficiency_pct) ? p.efficiency_pct : 88;
  const omega = Number.isFinite(p.omega_rad_s)
    ? p.omega_rad_s
    : Number.isFinite(d.omega_rad_s)
      ? d.omega_rad_s
      : Dmm > 0 && v >= 0
        ? v / (Dmm / 2000)
        : 0;

  const HEADER_H = 50;
  const HEADER_BOTTOM = HEADER_H + 8;

  const cxL = 142;
  const cxR = 642;
  const cy = 342;
  const r = clamp(28 + (Dmm / 1000) * 42, 26, 48);
  const yTop = cy - r;
  const yBot = cy + r + 22;
  const xRunL = cxL + r;
  const xRunR = cxR - r;

  const loadW = clamp(52 + m * 0.05, 50, 92);
  const loadH = 40;
  const loadCx = (xRunL + xRunR) / 2;
  const loadCy = yTop - loadH / 2 - 4;
  const loadLeft = loadCx - loadW / 2;
  const loadRight = loadCx + loadW / 2;
  const loadBottom = loadCy + loadH / 2;

  const dimBandD_Y = Math.max(HEADER_BOTTOM + 40, yTop - 128);
  const dimBandL_Y = dimBandD_Y + 42;

  /* Flechas gruesas; chips de datos anclados encima / junto a cada elemento */
  const vStrandY = yTop - 42;
  const fStrandY = yTop + 2;
  const vx0 = xRunL + 28;
  const vGapLoad = 58;
  const vx1 = Math.max(vx0 + 68, loadLeft - vGapLoad);
  const vMidStrand = (vx0 + vx1) / 2;
  const lDimMidX = (xRunL + xRunR) / 2;

  const rollers = [];
  for (let x = xRunL + 24; x < xRunR - 16; x += 48) rollers.push(x);

  const carrySlide = p.carrySurface === 'slide_plate';
  const ramaPortanteLabel = carrySlide
    ? en
      ? 'Carrying strand · slide plate'
      : 'Rama portante · plancha'
    : en
      ? 'Carrying strand · rollers'
      : 'Rama portante · rodillos';
  const normalContactHint = carrySlide
    ? en
      ? 'normal on slide plate'
      : 'normal sobre plancha'
    : en
      ? 'normal on rollers'
      : 'normal sobre rodillos';
  const headerSubRight = carrySlide
    ? en
      ? 'v & F \u2192 drive drum · P = F\u00b7v · \u03bc belt\u2013slide'
      : 'v y F \u2192 tambor motriz · P = F\u00b7v \u00b7 \u03bc banda\u2013placha'
    : en
      ? 'v & F \u2192 drive drum · P = F\u00b7v'
      : 'v y F \u2192 tambor motriz · P = F\u00b7v';
  const carryBedSvg = carrySlide
    ? `
    <rect x="${xRunL - 8}" y="${yTop + 2}" width="${xRunR - xRunL + 16}" height="32" rx="4" fill="#e2e8f0" stroke="#64748b" stroke-width="1.15" />
    <line x1="${xRunL - 2}" y1="${yTop + 13}" x2="${xRunR + 2}" y2="${yTop + 13}" stroke="#cbd5e1" stroke-width="1" />
    <line x1="${xRunL - 2}" y1="${yTop + 23}" x2="${xRunR + 2}" y2="${yTop + 23}" stroke="#cbd5e1" stroke-width="1" />
    `
    : rollers
        .map(
          (rx) => `
    <line x1="${rx}" y1="${yTop + 8}" x2="${rx}" y2="${yTop + 26}" stroke="#6b7280" stroke-width="2" stroke-linecap="round" />
    <circle cx="${rx}" cy="${yTop + 30}" r="6" fill="#f3f4f6" stroke="#6b7280" stroke-width="1.4" />`,
        )
        .join('');

  const Fref = 5000;
  const arrF = clamp(40 + (F / Fref) * 70, 36, 110);

  const wLoadX = loadCx;
  const weightArrowStartGap = 5;
  const weightArrowLen = 48;
  const wLoadY0 = loadBottom + weightArrowStartGap;
  const wLoadY1 = wLoadY0 + weightArrowLen;

  const motrizEdgeX = cxR - r;

  let fX0 = Math.max(loadRight + 16, vx1 + 32);
  let fX1 = Math.min(motrizEdgeX - 52, xRunR - 14);
  if (fX1 < fX0 + 44) {
    fX0 = Math.max(xRunL + 68, fX1 - 92);
  }
  const fSpan = Math.max(24, fX1 - fX0);
  const fDrawLen = Math.min(arrF, fSpan);
  const fLineX0 = fX1 - fDrawLen;
  const fLineX1 = fX1;
  const fAnchorX = (fLineX0 + fLineX1) / 2;

  /* Chips compactos (evitar solapes: capas separadas en Y entre D y L) */
  const vChipW = 116;
  const vChipH = 22;
  let vChipX = vMidStrand - vChipW / 2;
  vChipX = clamp(vChipX, 12, xRunR - vChipW - 16);
  const vChipY = vStrandY - vChipH - 5;

  const lChipW = 88;
  const lChipH = 20;
  const lChipX = lDimMidX - lChipW / 2;
  const lChipY = dimBandL_Y - lChipH - 5;

  const dChipW = 94;
  const dChipH = 20;
  /* Centrado en el eje del tambor motriz (coincide con la pauta de cota D) */
  let dChipX = cxR - dChipW / 2;
  const motorIconsLeft = cxR + r + 22;
  const dChipMaxX = motorIconsLeft - dChipW - 8;
  dChipX = clamp(dChipX, 14, dChipMaxX);
  const dChipY = dimBandD_Y - dChipH - 3;

  const fChipW = 118;
  const fChipH = 26;
  let fChipX = fAnchorX - fChipW / 2;
  fChipX = clamp(fChipX, 14, xRunR - fChipW - 8);
  /* Debajo de la banda (yTop+8) para no tapar la flecha F sobre la rama */
  const fChipY = yTop + 14;

  const nChipW = 108;
  const nChipH = 32;
  let nChipX = loadRight + 8;
  if (nChipX + nChipW > fChipX - 4) nChipX = Math.max(loadRight + 6, fChipX - nChipW - 10);
  nChipX = Math.min(nChipX, xRunR - nChipW - 6);
  nChipX = Math.max(12, nChipX);
  const nChipY = loadCy - nChipH / 2;

  const muChipW = 112;
  const muChipH = 20;
  const muChipX = 18;
  const muChipY = HEADER_BOTTOM + 2;

  const motorBlockRight = cxR + r + 22 + 108;
  const VB_W = Math.max(
    780,
    motorBlockRight + 24,
    nChipX + nChipW + 20,
    fChipX + fChipW + 20,
    vChipX + vChipW + 16,
  );

  const hasDetail = Boolean(p.detail && Object.keys(p.detail).length);

  const legendX = 20;
  const legendY = Math.max(yBot + 44, dimBandL_Y + 56, loadBottom + 72, fChipY + fChipH + 28);
  const legendW = 312;
  const legendH = 78;

  const summaryH = hasDetail ? 136 : 128;
  const summaryY = legendY + legendH + 14;
  const VB_H = summaryY + summaryH + 18;

  const colGap = 14;
  const colW = (VB_W - 40 - colGap) / 2;

  const svgTitle = en
    ? 'Flat belt schematic \u2014 carrying strand, dimensions, legend'
    : 'Esquema cinta plana \u2014 rama portante, cotas y leyenda';
  const headMain = en ? 'Horizontal flat belt' : 'Cinta horizontal';
  const floorLbl = en ? 'Floor / foundation' : 'Suelo / cimentaci\u00f3n';
  const retLbl = en ? 'Belt \u00b7 return' : 'Banda \u00b7 retorno';
  const lblTensor = en ? 'Take-up' : 'Tensor';
  const lblCola = en ? 'Tail' : 'Cola';
  const lblMotriz = en ? 'Drive' : 'Motriz';
  const lblMotor = 'Motor';
  const lblRed = en ? 'GB.' : 'Red.';
  const lblHopper = en ? 'Hopper (schematic)' : 'Tolva (esquema)';
  const fChipSub = en ? 'steady' : 'r\u00e9gimen';
  const legTitle = en ? 'LEGEND' : 'LEYENDA';
  const legV = en ? 'Run (v) \u2014 above the belt' : 'Marcha (v) \u2014 encima de la banda';
  const legF = en
    ? 'F steady \u2014 on carrying strand, same direction (no SF)'
    : 'F r\u00e9gimen \u2014 sobre la rama portante, mismo sentido (sin SF)';
  const sumLeftTitle = en ? 'Steady state (no SF)' : 'R\u00e9gimen (sin SF)';
  const pDrumLine = en
    ? `P drum ${PdrumRun.toFixed(2)} W \u00b7 peak ${PdrumStart.toFixed(2)} W`
    : `P tambor ${PdrumRun.toFixed(2)} W \u00b7 pico ${PdrumStart.toFixed(2)} W`;
  const accelLine = en
    ? `t accel. ${fmt(d.accelTime_s)} s \u00b7 k ${fmt(d.inertiaStartingFactor)}`
    : `t acel. ${fmt(d.accelTime_s)} s \u00b7 k ${fmt(d.inertiaStartingFactor)}`;
  const sumRightTitle = en ? 'Motor design' : 'Dise\u00f1o motor';
  const alignHint = en ? 'Aligned with app results' : 'Alineado con resultados de la app';

  svg.setAttribute('viewBox', `0 0 ${VB_W} ${VB_H}`);
  svg.setAttribute('role', 'img');
  svg.innerHTML = `
    <title>${svgTitle}</title>
    <defs>
      <marker id="mkV" markerWidth="11" markerHeight="11" refX="10" refY="5.5" orient="auto">
        <path d="M0,0 L11,5.5 L0,11 Z" fill="#15803d" />
      </marker>
      <marker id="mkW" markerWidth="11" markerHeight="11" refX="10" refY="5.5" orient="auto">
        <path d="M0,0 L11,5.5 L0,11 Z" fill="#475569" />
      </marker>
      <marker id="mkF" markerWidth="11" markerHeight="11" refX="10" refY="5.5" orient="auto">
        <path d="M0,0 L11,5.5 L0,11 Z" fill="#334155" />
      </marker>
      <filter id="cardSh" x="-8%" y="-8%" width="116%" height="116%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="2.2" flood-opacity="0.14" />
      </filter>
      <linearGradient id="beltRef" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#6b7280" />
        <stop offset="100%" stop-color="#374151" />
      </linearGradient>
    </defs>

    <rect x="0" y="0" width="${VB_W}" height="${VB_H}" fill="#f8fafc" />

    <!-- Cabecera compacta -->
    <rect x="0" y="0" width="${VB_W}" height="${HEADER_H}" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="0" />
    <line x1="0" y1="${HEADER_H}" x2="${VB_W}" y2="${HEADER_H}" stroke="#cbd5e1" stroke-width="1" />
    <text x="20" y="33" font-size="17" font-weight="800" fill="#1e293b" font-family="Inter, Segoe UI, sans-serif">${headMain}</text>
    <text x="${VB_W - 20}" y="33" text-anchor="end" font-size="11.5" fill="#64748b" font-family="Inter, Segoe UI, sans-serif">${headerSubRight}</text>

    <g class="diagram-metric" data-diagram-metric="mu" pointer-events="bounding-box">
      <g filter="url(#cardSh)">
        <rect x="${muChipX}" y="${muChipY}" width="${muChipW}" height="${muChipH}" rx="6" fill="#ffffff" stroke="#fdba74" stroke-width="1" />
      </g>
      <text x="${muChipX + 6}" y="${muChipY + 14}" font-size="9.5" font-weight="800" fill="#c2410c" font-family="Inter, Segoe UI, sans-serif">μ Coulomb</text>
    </g>

    <!-- Cotas D / L -->
    <g class="diagram-metric" data-diagram-metric="D" pointer-events="bounding-box">
      <line x1="${cxR}" y1="${yTop - 4}" x2="${cxR}" y2="${dimBandD_Y + 8}" stroke="#64748b" stroke-width="1.2" stroke-dasharray="5 4" />
      <line x1="${cxR - r}" y1="${dimBandD_Y}" x2="${cxR + r}" y2="${dimBandD_Y}" stroke="#64748b" stroke-width="1.5" />
      <line x1="${cxR - r}" y1="${dimBandD_Y - 5}" x2="${cxR - r}" y2="${dimBandD_Y + 5}" stroke="#64748b" />
      <line x1="${cxR + r}" y1="${dimBandD_Y - 5}" x2="${cxR + r}" y2="${dimBandD_Y + 5}" stroke="#64748b" />
    </g>

    <g class="diagram-metric" data-diagram-metric="L" pointer-events="bounding-box">
      <line x1="${xRunL}" y1="${dimBandL_Y - 4}" x2="${xRunL}" y2="${dimBandL_Y + 8}" stroke="#059669" stroke-width="1.8" />
      <line x1="${xRunR}" y1="${dimBandL_Y - 4}" x2="${xRunR}" y2="${dimBandL_Y + 8}" stroke="#059669" stroke-width="1.8" />
      <line x1="${xRunL}" y1="${dimBandL_Y}" x2="${xRunR}" y2="${dimBandL_Y}" stroke="#059669" stroke-width="2" />
    </g>

    <g class="diagram-metric diagram-metric--v" data-diagram-metric="v" pointer-events="bounding-box">
      <line x1="${vx0}" y1="${vStrandY}" x2="${vx1}" y2="${vStrandY}" stroke="#16a34a" stroke-width="3.5" marker-end="url(#mkV)" />
    </g>

    <!-- Suelo -->
    <line x1="64" y1="${yBot + 44}" x2="${VB_W - 64}" y2="${yBot + 44}" stroke="#475569" stroke-width="2.2" />
    <text x="${(xRunL + xRunR) / 2}" y="${yBot + 60}" text-anchor="middle" font-size="11" fill="#64748b" font-family="Inter, Segoe UI, sans-serif">${floorLbl}</text>

    <!-- Retorno -->
    <path d="M ${xRunL - 6} ${yBot} Q ${cxL - r * 1.2} ${(yTop + yBot) / 2} ${xRunL} ${yTop + 6}" fill="none" stroke="#9ca3af" stroke-width="8" stroke-linecap="round" opacity="0.45" />
    <path d="M ${xRunR} ${yTop + 6} Q ${cxR + r * 1.15} ${(yTop + yBot) / 2} ${xRunR + 6} ${yBot}" fill="none" stroke="#9ca3af" stroke-width="8" stroke-linecap="round" opacity="0.45" />
    <line x1="${xRunL}" y1="${yBot}" x2="${xRunR}" y2="${yBot}" stroke="#9ca3af" stroke-width="8" stroke-linecap="round" />
    <line x1="${xRunL}" y1="${yBot - 5}" x2="${xRunR}" y2="${yBot - 5}" stroke="#d1d5db" stroke-width="2.5" stroke-dasharray="10 8" stroke-linecap="round" />
    <line x1="${xRunL}" y1="${yBot + 5}" x2="${xRunR}" y2="${yBot + 5}" stroke="#d1d5db" stroke-width="2.5" stroke-dasharray="10 8" stroke-linecap="round" opacity="0.85" />
    <text x="${(xRunL + xRunR) / 2 - 58}" y="${yBot + 20}" font-size="11" font-weight="700" fill="#6b7280" font-family="Inter, Segoe UI, sans-serif">${retLbl}</text>

    <!-- Pórtico -->
    <rect x="${xRunL - 18}" y="${yTop + 28}" width="10" height="${yBot - yTop - 8}" rx="2" fill="#d1d5db" stroke="#9ca3af" />
    <rect x="${(xRunL + xRunR) / 2 - 5}" y="${yTop + 28}" width="10" height="${yBot - yTop - 26}" rx="2" fill="#d1d5db" stroke="#9ca3af" opacity="0.95" />
    <rect x="${xRunR + 8}" y="${yTop + 28}" width="10" height="${yBot - yTop - 8}" rx="2" fill="#d1d5db" stroke="#9ca3af" />
    <rect x="${xRunL - 24}" y="${yTop + 22}" width="${xRunR - xRunL + 48}" height="6" rx="2" fill="#9ca3af" />

    ${carryBedSvg}

    <rect x="${xRunL}" y="${yTop - 6}" width="${xRunR - xRunL}" height="14" rx="3" fill="url(#beltRef)" stroke="#111827" stroke-width="1.2" filter="url(#cardSh)" />
    <text x="${xRunR - 10}" y="${yTop - 78}" text-anchor="end" font-size="9.5" font-weight="800" fill="#111827" font-family="Inter, Segoe UI, sans-serif">${ramaPortanteLabel}</text>

    <circle cx="${cxL}" cy="${cy}" r="${r}" fill="#e5e7eb" stroke="#374151" stroke-width="2.8" filter="url(#cardSh)" />
    <circle cx="${cxL - r - 14}" cy="${yTop + 4}" r="9" fill="#f9fafb" stroke="#6b7280" stroke-width="1.6" />
    <text x="${cxL - r - 38}" y="${yTop + 8}" font-size="9.5" font-weight="700" fill="#6b7280" font-family="Inter, Segoe UI, sans-serif">${lblTensor}</text>
    <text x="${cxL - 24}" y="${cy + 6}" font-size="12.5" font-weight="800" fill="#374151" font-family="Inter, Segoe UI, sans-serif">${lblCola}</text>

    <circle cx="${cxR}" cy="${cy}" r="${r}" fill="#bbf7d0" stroke="#15803d" stroke-width="2.8" filter="url(#cardSh)" />
    <text x="${cxR - 34}" y="${cy + 6}" font-size="12.5" font-weight="800" fill="#166534" font-family="Inter, Segoe UI, sans-serif">${lblMotriz}</text>

    <g transform="translate(${cxR + r + 22}, ${cy - 4})">
      <rect x="0" y="-42" width="56" height="38" rx="6" fill="#dbeafe" stroke="#2563eb" stroke-width="1.2" filter="url(#cardSh)" />
      <text x="9" y="-17" font-size="11" font-weight="700" fill="#1d4ed8" font-family="Inter, Segoe UI, sans-serif">Motor</text>
      <rect x="66" y="-36" width="42" height="26" rx="5" fill="#d1fae5" stroke="#059669" stroke-width="1.1" filter="url(#cardSh)" />
      <text x="73" y="-18" font-size="10" font-weight="700" fill="#047857" font-family="Inter, Segoe UI, sans-serif">Red.</text>
    </g>

    <line x1="${loadCx}" y1="${loadCy - loadH / 2 - 24}" x2="${loadCx}" y2="${loadCy - loadH / 2 - 6}" stroke="#9ca3af" stroke-width="1.3" stroke-dasharray="4 3" />
    <text x="${loadCx - 54}" y="${loadCy - loadH / 2 - 26}" font-size="9.5" fill="#6b7280" font-family="Inter, Segoe UI, sans-serif">${lblHopper}</text>

    <g filter="url(#cardSh)">
      <rect x="${loadCx - loadW / 2}" y="${loadCy - loadH / 2}" width="${loadW}" height="${loadH}" rx="7" fill="#5eead4" stroke="#0f766e" stroke-width="2" />
      <text x="${loadCx - 22}" y="${loadCy + 7}" font-size="14" font-weight="800" fill="#134e4a" font-family="Inter, Segoe UI, sans-serif">m</text>
    </g>

    <!-- Peso: flecha en el esquema -->
    <line x1="${wLoadX}" y1="${wLoadY0}" x2="${wLoadX}" y2="${wLoadY1}" stroke="#475569" stroke-width="2.8" marker-end="url(#mkW)" />

    <g class="diagram-metric diagram-metric--F" data-diagram-metric="F" pointer-events="bounding-box">
      <line x1="${fLineX0}" y1="${fStrandY}" x2="${fLineX1}" y2="${fStrandY}" stroke="#334155" stroke-width="3.5" marker-end="url(#mkF)" />
    </g>

    <g class="diagram-metric diagram-metric--v" data-diagram-metric="v" pointer-events="bounding-box">
      <g filter="url(#cardSh)">
        <rect x="${vChipX}" y="${vChipY}" width="${vChipW}" height="${vChipH}" rx="6" fill="#ffffff" stroke="#86efac" stroke-width="1" />
      </g>
      <text x="${vChipX + 6}" y="${vChipY + 15}" font-size="10" font-weight="800" fill="#15803d" font-family="Inter, Segoe UI, sans-serif">v ${v.toFixed(2)} m/s</text>
    </g>
    <g class="diagram-metric" data-diagram-metric="L" pointer-events="bounding-box">
      <g filter="url(#cardSh)">
        <rect x="${lChipX}" y="${lChipY}" width="${lChipW}" height="${lChipH}" rx="6" fill="#ffffff" stroke="#6ee7b7" stroke-width="1" />
      </g>
      <text x="${lChipX + 6}" y="${lChipY + 14}" font-size="10" font-weight="800" fill="#047857" font-family="Inter, Segoe UI, sans-serif">L ${fmt(L)} m</text>
    </g>
    <g class="diagram-metric" data-diagram-metric="D" pointer-events="bounding-box">
      <g filter="url(#cardSh)">
        <rect x="${dChipX}" y="${dChipY}" width="${dChipW}" height="${dChipH}" rx="6" fill="#ffffff" stroke="#94a3b8" stroke-width="1" />
      </g>
      <text x="${dChipX + 5}" y="${dChipY + 14}" font-size="9.5" font-weight="800" fill="#334155" font-family="Inter, Segoe UI, sans-serif">D ${fmt(Dmm)} mm</text>
    </g>
    <g filter="url(#cardSh)">
      <rect x="${nChipX}" y="${nChipY}" width="${nChipW}" height="${nChipH}" rx="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
    </g>
    <text x="${nChipX + 5}" y="${nChipY + 13}" font-size="9" font-weight="800" fill="#334155" font-family="Inter, Segoe UI, sans-serif">N≈${Nf.toFixed(2)} N</text>
    <text x="${nChipX + 5}" y="${nChipY + 26}" font-size="7.5" fill="#64748b" font-family="Inter, Segoe UI, sans-serif">${normalContactHint}</text>
    <g class="diagram-metric diagram-metric--F" data-diagram-metric="F" pointer-events="bounding-box">
      <g filter="url(#cardSh)">
        <rect x="${fChipX}" y="${fChipY}" width="${fChipW}" height="${fChipH}" rx="6" fill="#ffffff" stroke="#94a3b8" stroke-width="1" />
      </g>
      <text x="${fChipX + 5}" y="${fChipY + 12}" font-size="9" font-weight="800" fill="#111827" font-family="Inter, Segoe UI, sans-serif">F ${Fsteady.toFixed(2)} N</text>
      <text x="${fChipX + 5}" y="${fChipY + 23}" font-size="7.5" fill="#64748b" font-family="Inter, Segoe UI, sans-serif">${fChipSub}</text>
    </g>

    <!-- LEYENDA (estilo referencia) -->
    <g transform="translate(${legendX}, ${legendY})" filter="url(#cardSh)">
      <rect x="0" y="0" width="${legendW}" height="${legendH}" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
      <text x="14" y="22" font-size="11" font-weight="800" fill="#64748b" font-family="Inter, Segoe UI, sans-serif" letter-spacing="0.12em">${legTitle}</text>
      <line x1="14" y1="44" x2="44" y2="44" stroke="#16a34a" stroke-width="3" marker-end="url(#mkV)" />
      <text x="52" y="48" font-size="11" font-weight="600" fill="#374151" font-family="Inter, Segoe UI, sans-serif">${legV}</text>
      <line x1="14" y1="64" x2="44" y2="64" stroke="#334155" stroke-width="3" marker-end="url(#mkF)" />
      <text x="52" y="68" font-size="11" font-weight="600" fill="#374151" font-family="Inter, Segoe UI, sans-serif">${legF}</text>
    </g>

    <g transform="translate(20, ${summaryY})">
      <rect x="0" y="0" width="${colW}" height="${summaryH}" rx="10" fill="#ffffff" stroke="#94a3b8" stroke-width="1" filter="url(#cardSh)" />
      <text x="14" y="24" font-size="12" font-weight="800" fill="#0f172a" font-family="Inter, Segoe UI, sans-serif">${sumLeftTitle}</text>
      <text x="14" y="42" font-size="10.5" fill="#475569" font-family="Inter, Segoe UI, sans-serif">F ${Fsteady.toFixed(2)} / ${Fstart.toFixed(2)} N · T ${Trun.toFixed(2)} / ${Tstart.toFixed(2)} N·m</text>
      <text x="14" y="60" font-size="10.5" fill="#475569" font-family="Inter, Segoe UI, sans-serif">${pDrumLine}</text>
      <text x="14" y="80" font-size="10.5" font-weight="700" fill="#047857" font-family="Inter, Segoe UI, sans-serif">μ ${mu.toFixed(2)} · ṁ ≈ ${fmt(p.massFlow_kg_s || 0)} kg/s</text>
      ${hasDetail ? `<text x="14" y="100" font-size="9.5" fill="#94a3b8" font-family="Inter, Segoe UI, sans-serif">${accelLine}</text>` : ''}
    </g>

    <g transform="translate(${20 + colW + colGap}, ${summaryY})">
      <rect x="0" y="0" width="${colW}" height="${summaryH}" rx="10" fill="#ffffff" stroke="#0d9488" stroke-width="1.5" filter="url(#cardSh)" />
      <text x="14" y="24" font-size="12" font-weight="800" fill="#0f172a" font-family="Inter, Segoe UI, sans-serif">${sumRightTitle}</text>
      <text x="14" y="42" font-size="10.5" fill="#475569" font-family="Inter, Segoe UI, sans-serif">SF ${fmt(sf)} · η ${fmt(etaPct)} % · T ${Tdesign.toFixed(2)} N·m</text>
      <text x="14" y="60" font-size="10.5" fill="#475569" font-family="Inter, Segoe UI, sans-serif">ω ≈ ${fmt(omega)} rad/s</text>
      <text x="14" y="82" font-size="11.5" font-weight="800" fill="#047857" font-family="Inter, Segoe UI, sans-serif">P motor ≈ ${fmt(PmotorkW)} kW</text>
      <text x="14" y="102" font-size="9.5" fill="#64748b" font-family="Inter, Segoe UI, sans-serif">${alignHint}</text>
    </g>
  `;
}
