ï»¿/**
 * Transportador de rodillos motorizado - esquema sin solapar etiquetas sobre el dibujo.
 * Texto del SVG en ASCII + escapes \u para evitar problemas de codificacion en Windows.
 */

import { clamp } from '../utils/calculations.js';
import { getCurrentLang } from '../config/locales.js';

function fmt(n, d = 2) {
  if (!Number.isFinite(n)) return '--';
  return n.toFixed(d);
}

/**
 * @param {SVGSVGElement | null} svg
 * @param {object} p
 */
export function renderRollerConveyorDiagram(svg, p) {
  if (!svg) return;

  const lang = p.lang ?? getCurrentLang();
  const en = lang === 'en';

  const L = clamp(Number(p.length_m) || 5, 0.5, 80);
  const D = clamp(Number(p.rollerDiameter_mm) || 89, 40, 400);
  const v = Math.max(0, Number(p.speed_m_s) || 0);
  const m = Math.max(0, Number(p.loadMass_kg) || 0);
  const rpm = Number(p.drumRpm);
  const crr = Math.max(0, Number(p.crr ?? p.rollingResistanceCoeff) || 0.03);
  const Fsteady = Math.max(0, Number(p.F_steady_N) || 0);
  const mdot = Number(p.massFlow_kg_s);
  const sf = Number.isFinite(Number(p.serviceFactor)) ? Number(p.serviceFactor) : 1;
  const stdLabel = p.designStandard === 'CEMA' ? (en ? 'CEMA +6% steady' : 'CEMA +6% reg.') : 'ISO 5048';

  const vbW = 1000;
  const vbH = 452;

  const leftPad = 158;
  const rightPad = 24;
  const drawZoneW = vbW - leftPad - rightPad;
  const profileY = 62;
  const topViewY = 198;
  const footerY = 312;
  const footerH = 102;

  const lenPx = clamp(200 + (L / 80) * 560, 200, Math.min(780, drawZoneW - 16));
  const x0 = leftPad + (drawZoneW - lenPx) / 2;
  const x1 = x0 + lenPx;

  const rollerR = clamp(5 + ((D - 40) / (400 - 40)) * 10, 5, 15);
  const pitchMmAssumed = 1.25 * D;
  const nLogical = Math.max(2, Math.floor((L * 1000) / pitchMmAssumed) + 1);

  /** Hueco minimo entre circunferencias (centros al menos 2R + gap). */
  const gapPx = Math.max(4.5, rollerR * 0.6);
  const minPitchPx = 2 * rollerR + gapPx;
  const nVisMax = Math.max(2, Math.floor((lenPx - 2 * rollerR) / minPitchPx) + 1);
  let nVis = Math.min(nLogical, nVisMax, 26);
  if (nVis < 2) nVis = 2;

  const pitchPx =
    nVis > 1 ? (lenPx - 2 * rollerR) / (nVis - 1) : Math.max(minPitchPx, lenPx - 2 * rollerR);
  const trainSpan = (nVis - 1) * pitchPx + 2 * rollerR;
  const rollerStartX = x0 + rollerR + (lenPx - trainSpan) / 2;

  const navy = '#1e3a5f';
  const frameStroke = '#334155';

  const chipW = 136;
  const chipH = 28;
  const chipX = 12;
  let chipY = 68;
  const chipGap = 6;
  const chip = () => {
    const y = chipY;
    chipY += chipH + chipGap;
    return y;
  };

  const yV = chip();
  const yL = chip();
  const yD = chip();
  const yCrr = chip();
  chipY += 4;
  const yF = chip();

  const simplifiedNote =
    nLogical > nVis
      ? en
        ? ` (view ${nVis}/${nLogical} rollers)`
        : ` (vista ${nVis}/${nLogical} rod.)`
      : '';

  const subLine = en
    ? `Side + plan view | illustr. pitch ~ ${fmt(pitchMmAssumed, 0)} mm | ${stdLabel}`
    : `Perfil + planta | paso ilustr. ~ ${fmt(pitchMmAssumed, 0)} mm | ${stdLabel}`;

  const titleMain = en ? 'Motorized roller conveyor' : 'Transportador de rodillos motorizado';
  const lblProfile = en ? 'Side profile' : 'Perfil lateral';
  const lblMotorGb = en ? 'Motor / GB.' : 'Motor / red.';
  const lblLoadDir = en ? 'Load, direction' : 'Carga, sentido';
  const lblTop = en ? 'Top view (plan)' : 'Vista superior (planta)';
  const fChipSub = en ? 'steady, no SF' : 'regimen, sin SF';
  const legTitle = en ? 'LEGEND' : 'LEYENDA';
  const legV = en ? 'Run (v)' : 'Marcha (v)';
  const legF = en ? 'F steady (traction)' : 'F regimen (traccion)';
  const legNote1 = en ? 'Green roller: drive. Rails: guards.' : 'Rodillo verde: motriz. Rieles: guardas.';
  const legNote2 = en ? 'Mouse over left chips or arrows.' : 'Rat\u00f3n sobre chips izq. o flechas.';
  const caseTitle = en ? 'Case data' : 'Datos del caso';
  const caseL1 = en ? 'Load:' : 'Carga:';
  const caseL2 = en ? 'Illustr. shaft pitch:' : 'Paso ejes ilustr.:';
  const caseL3 = en ? 'Drawing to scale with L and D; pitch = 1.25 * D (visual convention).' : 'Dibujo a escala con L y D; paso = 1,25 * D (convencion visual).';

  svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
  svg.innerHTML = `
    <defs>
      <marker id="rlArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#0f172a"/>
      </marker>
      <marker id="rlMkV" markerWidth="11" markerHeight="11" refX="10" refY="5.5" orient="auto">
        <path d="M0,0 L11,5.5 L0,11 Z" fill="#16a34a" />
      </marker>
      <marker id="rlMkF" markerWidth="11" markerHeight="11" refX="10" refY="5.5" orient="auto">
        <path d="M0,0 L11,5.5 L0,11 Z" fill="#334155" />
      </marker>
      <filter id="rlCardSh" x="-8%" y="-8%" width="116%" height="116%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="2.2" flood-opacity="0.14" />
      </filter>
    </defs>

    <rect width="${vbW}" height="${vbH}" fill="#f8fafc"/>
    <rect x="12" y="10" width="${vbW - 24}" height="48" rx="10" fill="#ffffff" stroke="#cbd5e1"/>
    <text x="28" y="32" font-size="15" font-weight="800" fill="#0f172a" font-family="Inter, system-ui, sans-serif">${titleMain}</text>
    <text x="28" y="48" font-size="10.5" fill="#475569" font-family="Inter, system-ui, sans-serif">${subLine}</text>

    <text x="${x0}" y="${profileY - 8}" font-size="10.5" font-weight="700" fill="#334155" font-family="Inter, system-ui, sans-serif">${lblProfile}</text>
    <line x1="${x0 - 18}" y1="${profileY + 48}" x2="${x1 + 18}" y2="${profileY + 48}" stroke="#1f2937" stroke-width="2"/>
    <line x1="${x0 - 18}" y1="${profileY + 70}" x2="${x1 + 18}" y2="${profileY + 70}" stroke="#1f2937" stroke-width="2"/>

    ${Array.from({ length: nVis }, (_, i) => {
      const x = rollerStartX + i * pitchPx;
      const isDrive = i === nVis - 1;
      const fill = isDrive ? '#bbf7d0' : '#e5e7eb';
      const stroke = isDrive ? '#15803d' : '#111827';
      return `
        <circle cx="${x.toFixed(1)}" cy="${(profileY + 59).toFixed(1)}" r="${rollerR.toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="${isDrive ? 1.6 : 1.2}"/>
        <circle cx="${x.toFixed(1)}" cy="${(profileY + 59).toFixed(1)}" r="${(rollerR * 0.33).toFixed(1)}" fill="#cbd5e1" stroke="#111827" stroke-width="0.7"/>
        <line x1="${x.toFixed(1)}" y1="${(profileY + 46).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(profileY + 72).toFixed(1)}" stroke="#9ca3af" stroke-width="0.7"/>
      `;
    }).join('')}

    <rect x="${x0 - 28}" y="${profileY + 40}" width="12" height="36" fill="#111827"/>
    <rect x="${x1 + 16}" y="${profileY + 40}" width="12" height="36" fill="#111827"/>

    <g opacity="0.88">
      <line x1="${x0 + 56}" y1="${profileY + 72}" x2="${x0 + 38}" y2="${profileY + 124}" stroke="#374151" stroke-width="2.6"/>
      <line x1="${x1 - 56}" y1="${profileY + 72}" x2="${x1 - 38}" y2="${profileY + 124}" stroke="#374151" stroke-width="2.6"/>
      <line x1="${x0 + 32}" y1="${profileY + 124}" x2="${x1 - 32}" y2="${profileY + 124}" stroke="#6b7280" stroke-width="2.8"/>
    </g>
    <rect x="${x0 + lenPx * 0.58}" y="${profileY + 128}" width="54" height="20" rx="4" fill="#94a3b8" stroke="#475569" stroke-width="0.85" filter="url(#rlCardSh)"/>
    <text x="${x0 + lenPx * 0.58 + 6}" y="${profileY + 141}" font-size="8" font-weight="700" fill="#f8fafc" font-family="Inter, system-ui, sans-serif">${lblMotorGb}</text>

    <line x1="${x0 + 22}" y1="${profileY + 16}" x2="${x1 - 22}" y2="${profileY + 16}" stroke="#111827" stroke-width="1.4" marker-end="url(#rlArrow)"/>
    <text x="${x0 + 26}" y="${profileY + 10}" font-size="10" font-weight="700" fill="#111827" font-family="Inter, system-ui, sans-serif">${lblLoadDir}</text>

    <g class="diagram-metric diagram-metric--v" data-diagram-metric="v" pointer-events="bounding-box">
      <line x1="${x0 + 34}" y1="${profileY + 16}" x2="${x0 + 108}" y2="${profileY + 16}" stroke="#16a34a" stroke-width="3" marker-end="url(#rlMkV)" />
    </g>

    <g class="diagram-metric diagram-metric--F" data-diagram-metric="F" pointer-events="bounding-box">
      <line x1="${x0 + 118}" y1="${profileY + 28}" x2="${x0 + 200}" y2="${profileY + 28}" stroke="#334155" stroke-width="2.8" marker-end="url(#rlMkF)" />
    </g>

    <g class="diagram-metric" data-diagram-metric="D" pointer-events="bounding-box">
      <line x1="${rollerStartX + (nVis - 1) * pitchPx}" y1="${profileY + 32}" x2="${rollerStartX + (nVis - 1) * pitchPx}" y2="${profileY + 82}" stroke="#64748b" stroke-width="1.1" stroke-dasharray="4 3"/>
    </g>

    <text x="${x0}" y="${topViewY - 10}" font-size="10.5" font-weight="700" fill="#334155" font-family="Inter, system-ui, sans-serif">${lblTop}</text>
    <rect x="${x0 - 18}" y="${topViewY + 2}" width="${lenPx + 36}" height="86" fill="#f1f5f9" stroke="${frameStroke}" stroke-width="1.1"/>
    <rect x="${x0 - 18}" y="${topViewY + 2}" width="9" height="86" fill="${navy}" opacity="0.92"/>
    <rect x="${x1 + 9}" y="${topViewY + 2}" width="9" height="86" fill="${navy}" opacity="0.92"/>
    <line x1="${x0 - 18}" y1="${topViewY + 14}" x2="${x1 + 18}" y2="${topViewY + 14}" stroke="#111827" stroke-width="0.85"/>
    <line x1="${x0 - 18}" y1="${topViewY + 76}" x2="${x1 + 18}" y2="${topViewY + 76}" stroke="#111827" stroke-width="0.85"/>

    ${Array.from({ length: nVis }, (_, i) => {
      const x = rollerStartX + i * pitchPx;
      const isDrive = i === nVis - 1;
      const fill = isDrive ? '#dcfce7' : '#f3f4f6';
      const stroke = isDrive ? '#166534' : '#111827';
      return `
        <rect x="${(x - rollerR).toFixed(1)}" y="${(topViewY + 20).toFixed(1)}" width="${(rollerR * 2).toFixed(1)}" height="44" fill="${fill}" stroke="${stroke}" stroke-width="0.9"/>
        <line x1="${x.toFixed(1)}" y1="${(topViewY + 20).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(topViewY + 64).toFixed(1)}" stroke="#9ca3af" stroke-width="0.65"/>
        ${isDrive ? `<line x1="${(x - rollerR).toFixed(1)}" y1="${(topViewY + 42).toFixed(1)}" x2="${(x + rollerR).toFixed(1)}" y2="${(topViewY + 42).toFixed(1)}" stroke="#22c55e" stroke-width="1.8"/>` : ''}
      `;
    }).join('')}

    <line x1="${x0 - 18}" y1="${topViewY + 94}" x2="${x1 + 18}" y2="${topViewY + 94}" stroke="#9ca3af" stroke-width="0.9"/>
    <text x="${x0 + lenPx / 2}" y="${topViewY + 108}" text-anchor="middle" font-size="9.5" fill="#4b5563" font-family="Inter, system-ui, sans-serif">L = ${fmt(L, 1)} m</text>

    <g class="diagram-metric" data-diagram-metric="L" pointer-events="bounding-box">
      <line x1="${x0}" y1="${topViewY + 90}" x2="${x1}" y2="${topViewY + 90}" stroke="#059669" stroke-width="2" stroke-dasharray="5 4"/>
    </g>

    <!-- Columna izquierda: chips fuera del dibujo (no solapan perfil/planta) -->
    <g class="diagram-metric diagram-metric--v" data-diagram-metric="v" pointer-events="bounding-box">
      <g filter="url(#rlCardSh)">
        <rect x="${chipX}" y="${yV}" width="${chipW}" height="${chipH}" rx="6" fill="#ffffff" stroke="#86efac" stroke-width="1"/>
      </g>
      <text x="${chipX + 6}" y="${yV + 19}" font-size="9.5" font-weight="800" fill="#15803d" font-family="Inter, system-ui, sans-serif">v ${fmt(v, 2)} m/s</text>
    </g>
    <g class="diagram-metric" data-diagram-metric="L" pointer-events="bounding-box">
      <g filter="url(#rlCardSh)">
        <rect x="${chipX}" y="${yL}" width="${chipW}" height="${chipH}" rx="6" fill="#ffffff" stroke="#6ee7b7" stroke-width="1"/>
      </g>
      <text x="${chipX + 6}" y="${yL + 19}" font-size="9.5" font-weight="800" fill="#047857" font-family="Inter, system-ui, sans-serif">L ${fmt(L, 1)} m</text>
    </g>
    <g class="diagram-metric" data-diagram-metric="D" pointer-events="bounding-box">
      <g filter="url(#rlCardSh)">
        <rect x="${chipX}" y="${yD}" width="${chipW}" height="${chipH}" rx="6" fill="#ffffff" stroke="#94a3b8" stroke-width="1"/>
      </g>
      <text x="${chipX + 5}" y="${yD + 19}" font-size="9.5" font-weight="800" fill="#334155" font-family="Inter, system-ui, sans-serif">D ${fmt(D, 0)} mm</text>
    </g>
    <g class="diagram-metric" data-diagram-metric="crr" pointer-events="bounding-box">
      <g filter="url(#rlCardSh)">
        <rect x="${chipX}" y="${yCrr}" width="${chipW}" height="${chipH}" rx="6" fill="#ffffff" stroke="#fdba74" stroke-width="1"/>
      </g>
      <text x="${chipX + 6}" y="${yCrr + 19}" font-size="9.5" font-weight="800" fill="#c2410c" font-family="Inter, system-ui, sans-serif">Crr ${fmt(crr, 3)}</text>
    </g>
    <g class="diagram-metric diagram-metric--F" data-diagram-metric="F" pointer-events="bounding-box">
      <g filter="url(#rlCardSh)">
        <rect x="${chipX}" y="${yF}" width="${chipW}" height="${chipH + 10}" rx="6" fill="#ffffff" stroke="#94a3b8" stroke-width="1"/>
      </g>
      <text x="${chipX + 5}" y="${yF + 16}" font-size="9" font-weight="800" fill="#111827" font-family="Inter, system-ui, sans-serif">F ${fmt(Fsteady, 1)} N</text>
      <text x="${chipX + 5}" y="${yF + 30}" font-size="7.5" fill="#64748b" font-family="Inter, system-ui, sans-serif">regimen, sin SF</text>
    </g>

    <!-- Pie: leyenda y datos por debajo de la planta -->
    <g transform="translate(12, ${footerY})" filter="url(#rlCardSh)">
      <rect x="0" y="0" width="288" height="${footerH}" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>
      <text x="12" y="22" font-size="10.5" font-weight="800" fill="#64748b" font-family="Inter, system-ui, sans-serif" letter-spacing="0.1em">${legTitle}</text>
      <line x1="12" y1="38" x2="40" y2="38" stroke="#16a34a" stroke-width="2.8" marker-end="url(#rlMkV)" />
      <text x="48" y="42" font-size="10" font-weight="600" fill="#374151" font-family="Inter, system-ui, sans-serif">${legV}</text>
      <line x1="12" y1="56" x2="40" y2="56" stroke="#334155" stroke-width="2.8" marker-end="url(#rlMkF)" />
      <text x="48" y="60" font-size="10" font-weight="600" fill="#374151" font-family="Inter, system-ui, sans-serif">${legF}</text>
      <text x="12" y="80" font-size="9.5" fill="#64748b" font-family="Inter, system-ui, sans-serif">${legNote1}</text>
      <text x="12" y="96" font-size="9.5" fill="#64748b" font-family="Inter, system-ui, sans-serif">${legNote2}</text>
    </g>

    <g transform="translate(312, ${footerY})" filter="url(#rlCardSh)">
      <rect x="0" y="0" width="${vbW - 324}" height="${footerH}" rx="10" fill="#ffffff" stroke="#94a3b8" stroke-width="1"/>
      <text x="12" y="22" font-size="11" font-weight="800" fill="#0f172a" font-family="Inter, system-ui, sans-serif">${caseTitle}</text>
      <text x="12" y="42" font-size="10" fill="#475569" font-family="Inter, system-ui, sans-serif">${caseL1} ${fmt(m, 0)} kg | ${en ? 'mdot ~' : 'Qm ~'} ${fmt(mdot, 2)} kg/s</text>
      <text x="12" y="60" font-size="10" fill="#475569" font-family="Inter, system-ui, sans-serif">${caseL2} ~ ${fmt(pitchMmAssumed, 0)} mm | ${en ? 'rollers ~' : 'rodillos ~'} ${nLogical}${simplifiedNote}</text>
      <text x="12" y="78" font-size="10" fill="#475569" font-family="Inter, system-ui, sans-serif">RPM: ${Number.isFinite(rpm) ? fmt(rpm, 2) : '--'} | SF ${fmt(sf, 2)}</text>
      <text x="12" y="96" font-size="9" fill="#94a3b8" font-family="Inter, system-ui, sans-serif">${caseL3}</text>
    </g>
  `;
}
