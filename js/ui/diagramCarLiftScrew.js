/**
 * Diagrama: columna en sección con husillo vertical, tuerca de bronce (carga) y tuerca de seguridad,
 * y motor eléctrico (arriba o abajo).
 */

/**
 * @param {SVGSVGElement | null} svg
 * @param {object} p
 * @param {number} p.liftHeight_m
 * @param {number} p.pitch_mm
 * @param {number} p.screwDiameter_mm
 * @param {'top'|'base'} p.motorPosition
 */
export function renderCarLiftScrewDiagram(svg, p) {
  if (!svg) return;
  const H = Math.max(1.2, Number(p.liftHeight_m) || 1.8);
  const pitch = Math.max(1, Number(p.pitch_mm) || 8);
  const d = Math.max(12, Number(p.screwDiameter_mm) || 45);
  const motorPos = p.motorPosition === 'base' ? 'base' : 'top';

  const vbW = 420;
  const vbH = 360;
  svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);

  const floorY = 308;
  const postLeftX = 82;
  const postRightX = 306;
  const postW = 28;
  const postTop = 58;
  const postH = 238;
  const screwX = postLeftX + postW / 2;
  const screwTop = postTop + 16;
  const screwBot = postTop + postH - 18;
  const nutY = postTop + 128;
  const nutH = 26;
  const safeNutY = nutY + 40;
  const screwR = Math.max(6, Math.min(14, d * 0.14));
  const armY = nutY + 2;
  const deckY = 198;

  const pitchLabel = pitch >= 10 ? `${pitch.toFixed(0)} mm` : `${pitch.toFixed(1)} mm`;

  svg.innerHTML = `
    <defs>
      <linearGradient id="bgLift" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#f8fafc"/>
        <stop offset="100%" stop-color="#eef2f7"/>
      </linearGradient>
      <linearGradient id="steelPost" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#94a3b8"/>
        <stop offset="50%" stop-color="#cbd5e1"/>
        <stop offset="100%" stop-color="#64748b"/>
      </linearGradient>
      <marker id="liftArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#0f766e" />
      </marker>
      <pattern id="hazardStripe" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="8" height="8" fill="#f8fafc"/>
        <rect width="4" height="8" fill="#f59e0b"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#bgLift)"/>
    <text x="14" y="22" font-size="11" font-weight="800" fill="#0f172a" font-family="Inter,system-ui,sans-serif">
      Elevador 2 columnas · vista frontal simplificada
    </text>
    <text x="14" y="35" font-size="8" fill="#64748b" font-family="Inter,system-ui,sans-serif">
      H ≈ ${H.toFixed(2)} m · Husillo Ø${d.toFixed(0)} mm · paso ${pitchLabel}
    </text>

    <!-- Suelo -->
    <rect x="36" y="${floorY}" width="348" height="18" rx="6" fill="#cbd5e1" stroke="#94a3b8" />
    <line x1="36" y1="${floorY + 3}" x2="384" y2="${floorY + 3}" stroke="#e2e8f0" />

    <!-- Columnas -->
    <rect x="${postLeftX}" y="${postTop}" width="${postW}" height="${postH}" rx="6" fill="url(#steelPost)" stroke="#475569" stroke-width="1.6"/>
    <rect x="${postRightX}" y="${postTop}" width="${postW}" height="${postH}" rx="6" fill="url(#steelPost)" stroke="#475569" stroke-width="1.6"/>
    <rect x="${postLeftX + 8}" y="${postTop + 16}" width="${postW - 16}" height="${postH - 36}" rx="3" fill="#1e293b" opacity="0.25"/>
    <rect x="${postRightX + 8}" y="${postTop + 16}" width="${postW - 16}" height="${postH - 36}" rx="3" fill="#1e293b" opacity="0.25"/>

    <!-- Brazos -->
    <rect x="${postLeftX + postW}" y="${armY}" width="112" height="9" rx="4" fill="#64748b"/>
    <rect x="${postRightX - 112}" y="${armY}" width="112" height="9" rx="4" fill="#64748b"/>
    <line x1="${postLeftX + postW + 108}" y1="${armY + 4}" x2="${postRightX - 108}" y2="${armY + 4}" stroke="#94a3b8" stroke-dasharray="4 3"/>

    <!-- Plataforma/coche -->
    <rect x="146" y="${deckY}" width="128" height="44" rx="10" fill="#334155" stroke="#0f172a"/>
    <rect x="154" y="${deckY + 6}" width="112" height="18" rx="6" fill="#0f172a" opacity="0.35"/>
    <circle cx="166" cy="${deckY + 42}" r="7.5" fill="#111827"/>
    <circle cx="254" cy="${deckY + 42}" r="7.5" fill="#111827"/>
    <rect x="150" y="${deckY + 44}" width="120" height="6" rx="2" fill="url(#hazardStripe)" />

    <!-- Eje de sincronismo -->
    <line x1="${postLeftX + postW / 2}" y1="${postTop - 8}" x2="${postRightX + postW / 2}" y2="${postTop - 8}" stroke="#64748b" stroke-width="4.2" stroke-linecap="round"/>
    <circle cx="${postLeftX + postW / 2}" cy="${postTop - 8}" r="5.5" fill="#475569"/>
    <circle cx="${postRightX + postW / 2}" cy="${postTop - 8}" r="5.5" fill="#475569"/>
    <text x="${(postLeftX + postRightX) / 2 + 14}" y="${postTop - 13}" font-size="7.2" fill="#475569" font-family="Inter,system-ui,sans-serif">Sincronismo entre columnas</text>

    <!-- Husillo en columna izquierda -->
    <line x1="${screwX}" y1="${screwTop}" x2="${screwX}" y2="${screwBot}" stroke="#0f172a" stroke-width="${screwR * 2}" stroke-linecap="round"/>
    <line x1="${screwX}" y1="${screwTop}" x2="${screwX}" y2="${screwBot}" stroke="#94a3b8" stroke-width="${Math.max(2, screwR * 0.55)}" stroke-dasharray="4 4" stroke-linecap="round"/>

    <!-- Tuerca principal -->
    <rect x="${screwX - 28}" y="${nutY}" width="56" height="${nutH}" rx="6" fill="#fef3c7" stroke="#b45309" stroke-width="2"/>
    <text x="${screwX + 40}" y="${nutY + 11}" font-size="7.4" font-weight="800" fill="#78350f" font-family="Inter,system-ui,sans-serif">Tuerca de carga</text>

    <!-- Tuerca de seguridad -->
    <rect x="${screwX - 24}" y="${safeNutY}" width="48" height="20" rx="6" fill="#e0f2fe" stroke="#0369a1" stroke-width="2"/>
    <text x="${screwX + 40}" y="${safeNutY + 12}" font-size="7.2" font-weight="800" fill="#0c4a6e" font-family="Inter,system-ui,sans-serif">Seguridad</text>

    <!-- Flecha elevación -->
    <line x1="${postRightX + postW + 18}" y1="${nutY + 30}" x2="${postRightX + postW + 18}" y2="${postTop + 78}" stroke="#0f766e" stroke-width="2.3" marker-end="url(#liftArrow)"/>
    <text x="${postRightX + postW + 26}" y="${postTop + 90}" font-size="7.2" fill="#0f766e" font-family="Inter,system-ui,sans-serif">Movimiento elevación</text>
    <line x1="${postLeftX - 16}" y1="${postTop + postH}" x2="${postLeftX - 16}" y2="${postTop}" stroke="#94a3b8" stroke-width="1.3"/>
    <line x1="${postLeftX - 20}" y1="${postTop + postH}" x2="${postLeftX - 12}" y2="${postTop + postH}" stroke="#94a3b8" stroke-width="1.3"/>
    <line x1="${postLeftX - 20}" y1="${postTop}" x2="${postLeftX - 12}" y2="${postTop}" stroke="#94a3b8" stroke-width="1.3"/>
    <text x="${postLeftX - 31}" y="${postTop + postH / 2}" font-size="7" fill="#64748b" transform="rotate(-90 ${postLeftX - 31} ${postTop + postH / 2})" font-family="Inter,system-ui,sans-serif">Altura útil H</text>

    <!-- Motor -->
    ${
      motorPos === 'top'
        ? `<rect x="${screwX - 42}" y="${postTop - 24}" width="84" height="18" rx="6" fill="#e2e8f0" stroke="#475569" stroke-width="2"/>
           <text x="${screwX}" y="${postTop - 11}" text-anchor="middle" font-size="8" font-weight="800" fill="#334155"
            font-family="Inter,system-ui,sans-serif">Motor</text>
           <line x1="${screwX}" y1="${postTop - 6}" x2="${screwX}" y2="${screwTop}" stroke="#475569" stroke-width="2"/>`
        : `<rect x="${screwX - 42}" y="${postTop + postH + 6}" width="84" height="18" rx="6" fill="#e2e8f0" stroke="#475569" stroke-width="2"/>
           <text x="${screwX}" y="${postTop + postH + 19}" text-anchor="middle" font-size="8" font-weight="800" fill="#334155"
            font-family="Inter,system-ui,sans-serif">Motor</text>
           <line x1="${screwX}" y1="${screwBot}" x2="${screwX}" y2="${postTop + postH + 6}" stroke="#475569" stroke-width="2"/>`
    }

    <text x="${postLeftX}" y="${postTop + postH + 18}" font-size="7.2" fill="#64748b" font-family="Inter,system-ui,sans-serif">
      Columna izquierda: husillo con tuerca principal + seguridad
    </text>
  `;
}

