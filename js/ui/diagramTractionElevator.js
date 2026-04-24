/**
 * Vista lateral esquemática del hueco: polea tractora, cabina, contrapeso, guías, arrollamiento.
 */

/**
 * @param {SVGSVGElement | null} svg
 * @param {object} p
 * @param {number} p.travelHeight_m
 * @param {'1_1'|'2_1'} p.reeving
 */
export function renderTractionElevatorDiagram(svg, p) {
  if (!svg) return;
  const H = Math.max(2, Number(p.travelHeight_m) || 12);
  const reeving = p.reeving === '2_1' ? '2_1' : '1_1';
  const scale = 9.8;
  const vbW = 340;
  const headY = 72;
  const shaftTop = 96;
  const shaftBottom = shaftTop + Math.max(220, Math.min(380, H * scale + 120));
  const shaftH = shaftBottom - shaftTop;
  const vbH = shaftBottom + 60;
  const shaftX = 44;
  const shaftW = 232;
  const xCabin = 117;
  const xCounter = 161;
  const guideOff = 18;
  const sheaveR = 22;
  const sheaveX = 164;
  const carW = 56;
  const carH = Math.min(86, Math.max(54, 48 + H * 0.6));
  const cwW = 44;
  const cwH = Math.round(carH * 0.85);
  const yTravelTop = shaftTop + 20;
  const yTravelBottom = shaftBottom - 12;
  const yCab = yTravelBottom - carH;
  const yCw = yTravelTop + 14;
  const yMid = (shaftTop + shaftBottom) / 2;
  const ropeXL = sheaveX - sheaveR + 3;
  const ropeXR = sheaveX + sheaveR - 3;
  const ropeTopY = headY - sheaveR * 0.55;
  const ropeWrapY = headY + sheaveR * 0.7;
  const carPulleyR = 8;
  const carPulleyCx = xCabin + carW / 2;
  const carPulleyCy = yCab - 12;
  const rope2L = carPulleyCx - carPulleyR;
  const rope2R = carPulleyCx + carPulleyR;
  const ropeSvg =
    reeving === '2_1'
      ? `
    <line x1="${rope2L}" y1="${ropeTopY}" x2="${rope2L}" y2="${carPulleyCy}" stroke="#334155" stroke-width="2"/>
    <path d="M ${rope2L} ${carPulleyCy} A ${carPulleyR} ${carPulleyR} 0 0 0 ${rope2R} ${carPulleyCy}" fill="none" stroke="#334155" stroke-width="2"/>
    <line x1="${rope2R}" y1="${carPulleyCy}" x2="${rope2R}" y2="${ropeTopY}" stroke="#334155" stroke-width="2"/>
    <path d="M ${rope2R} ${ropeTopY} L ${ropeXL} ${ropeTopY}" fill="none" stroke="#334155" stroke-width="2"/>
    <path d="M ${ropeXL} ${ropeTopY} A ${sheaveR - 3} ${sheaveR - 3} 0 0 1 ${ropeXR} ${ropeTopY}" fill="none" stroke="#1e3a8a" stroke-width="2"/>
    <line x1="${ropeXR}" y1="${ropeTopY}" x2="${ropeXR}" y2="${yCw + 4}" stroke="#64748b" stroke-width="2"/>
    <circle cx="${carPulleyCx}" cy="${carPulleyCy}" r="${carPulleyR}" fill="#e5e7eb" stroke="#64748b" stroke-width="1.6"/>
    <circle cx="${carPulleyCx}" cy="${carPulleyCy}" r="${carPulleyR * 0.42}" fill="none" stroke="#64748b" stroke-width="1.1"/>
    <rect x="${carPulleyCx - 23}" y="${carPulleyCy - 22}" width="46" height="12" rx="3" fill="#ffffff" stroke="#cbd5e1"/>
    <text x="${carPulleyCx}" y="${carPulleyCy - 13}" text-anchor="middle" font-size="6.3" fill="#475569" font-family="Inter,system-ui,sans-serif">Polea móvil</text>
    <rect x="${sheaveX + 24}" y="${ropeWrapY + 2}" width="26" height="12" rx="3" fill="#ffffff" stroke="#cbd5e1"/>
    <text x="${sheaveX + 37}" y="${ropeWrapY + 10}" text-anchor="middle" font-size="7.1" fill="#475569" font-family="Inter,system-ui,sans-serif">2:1</text>`
      : `
    <line x1="${ropeXL}" y1="${ropeTopY}" x2="${ropeXL}" y2="${yCab + 4}" stroke="#334155" stroke-width="2"/>
    <line x1="${ropeXR}" y1="${ropeTopY}" x2="${ropeXR}" y2="${yCw + 4}" stroke="#64748b" stroke-width="2"/>
    <path d="M ${ropeXL} ${ropeTopY} A ${sheaveR - 3} ${sheaveR - 3} 0 0 1 ${ropeXR} ${ropeTopY}" fill="none" stroke="#1e3a8a" stroke-width="2"/>
    <rect x="${sheaveX + 24}" y="${ropeWrapY + 2}" width="26" height="12" rx="3" fill="#ffffff" stroke="#cbd5e1"/>
    <text x="${sheaveX + 37}" y="${ropeWrapY + 10}" text-anchor="middle" font-size="7.1" fill="#475569" font-family="Inter,system-ui,sans-serif">1:1</text>`;

  svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
  svg.innerHTML = `
    <defs>
      <linearGradient id="teShaft" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#eef2f7"/><stop offset="100%" stop-color="#dbe3ed"/>
      </linearGradient>
      <linearGradient id="teCabin" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#d1fae5"/><stop offset="100%" stop-color="#99f6e4"/>
      </linearGradient>
      <linearGradient id="teCounterW" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#fef3c7"/><stop offset="100%" stop-color="#fde68a"/>
      </linearGradient>
      <marker id="teArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#0f766e" />
      </marker>
    </defs>
    <rect width="100%" height="100%" fill="#f8fafc"/>
    <rect x="10" y="10" width="228" height="34" rx="8" fill="#ffffff" stroke="#dbe3ed"/>
    <text x="24" y="24" font-size="10.2" font-weight="800" fill="#0f172a" font-family="Inter,system-ui,sans-serif">Ascensor de tracción</text>
    <text x="24" y="36" font-size="7.2" fill="#64748b" font-family="Inter,system-ui,sans-serif">H ${H.toFixed(1)} m · Arrollamiento ${reeving === '2_1' ? '2:1' : '1:1'}</text>

    <rect x="${shaftX}" y="${shaftTop}" width="${shaftW}" height="${shaftH}" rx="6" fill="url(#teShaft)" stroke="#94a3b8" stroke-width="1.7"/>
    <line x1="${xCabin - guideOff}" y1="${shaftTop + 10}" x2="${xCabin - guideOff}" y2="${shaftBottom}" stroke="#cbd5e1" stroke-width="2.1"/>
    <line x1="${xCounter + cwW + guideOff}" y1="${shaftTop + 10}" x2="${xCounter + cwW + guideOff}" y2="${shaftBottom}" stroke="#cbd5e1" stroke-width="2.1"/>
    <text x="${xCabin - 32}" y="${yMid}" font-size="6.6" fill="#94a3b8" font-family="Inter,system-ui,sans-serif" transform="rotate(-90 ${xCabin - 32} ${yMid})">Guía cabina</text>
    <text x="${xCounter + cwW + 32}" y="${yMid}" font-size="6.6" fill="#94a3b8" font-family="Inter,system-ui,sans-serif" transform="rotate(-90 ${xCounter + cwW + 32} ${yMid})">Guía contrapeso</text>

    <circle cx="${sheaveX}" cy="${headY}" r="${sheaveR}" fill="#e0f2fe" stroke="#0369a1" stroke-width="2.7"/>
    <circle cx="${sheaveX}" cy="${headY}" r="${sheaveR * 0.45}" fill="none" stroke="#0369a1" stroke-width="1.5"/>
    <line x1="${sheaveX + sheaveR * 0.75}" y1="${headY - sheaveR * 0.35}" x2="${sheaveX + 64}" y2="${headY - 18}" stroke="#0c4a6e" stroke-width="1"/>
    <rect x="${sheaveX + 60}" y="${headY - 26}" width="66" height="14" rx="3" fill="#ffffff" stroke="#bfdbfe"/>
    <text x="${sheaveX + 93}" y="${headY - 16}" text-anchor="middle" font-size="6.6" font-weight="700" fill="#0c4a6e" font-family="Inter,system-ui,sans-serif">Polea tractora</text>

    ${ropeSvg}

    <rect x="${xCabin}" y="${yCab}" width="${carW}" height="${carH}" rx="4" fill="url(#teCabin)" stroke="#0f766e" stroke-width="2"/>
    <rect x="${xCabin + 6}" y="${yCab + 8}" width="${carW - 12}" height="${Math.max(12, carH - 18)}" rx="2" fill="#ffffff" opacity="0.45"/>
    <text x="${xCabin + carW / 2}" y="${yCab + carH / 2 + 4}" text-anchor="middle" font-size="8" font-weight="700" fill="#134e4a" font-family="Inter,system-ui,sans-serif">Cabina</text>

    <rect x="${xCounter}" y="${yCw}" width="${cwW}" height="${cwH}" rx="4" fill="url(#teCounterW)" stroke="#b45309" stroke-width="2"/>
    <line x1="${xCounter + 6}" y1="${yCw + 10}" x2="${xCounter + cwW - 6}" y2="${yCw + 10}" stroke="#d97706" stroke-width="1.2"/>
    <line x1="${xCounter + 6}" y1="${yCw + 22}" x2="${xCounter + cwW - 6}" y2="${yCw + 22}" stroke="#d97706" stroke-width="1.2"/>
    <text x="${xCounter + cwW / 2}" y="${yCw + cwH / 2 + 4}" text-anchor="middle" font-size="8" font-weight="700" fill="#78350f" font-family="Inter,system-ui,sans-serif">Contrapeso</text>

    <line x1="${xCabin - 16}" y1="${yCab + carH * 0.6}" x2="${xCabin - 16}" y2="${yCab - 28}" stroke="#0f766e" stroke-width="1.8" marker-end="url(#teArrow)"/>
    <line x1="${xCounter + cwW + 16}" y1="${yCw + cwH * 0.4}" x2="${xCounter + cwW + 16}" y2="${yCw + cwH + 28}" stroke="#b45309" stroke-width="1.8" marker-end="url(#teArrow)"/>
    <rect x="${xCabin - 48}" y="${yCab - 42}" width="34" height="12" rx="3" fill="#ffffff" stroke="#99f6e4"/>
    <rect x="${xCounter + cwW + 4}" y="${yCw + cwH + 30}" width="24" height="12" rx="3" fill="#ffffff" stroke="#fcd34d"/>
    <text x="${xCabin - 31}" y="${yCab - 33}" text-anchor="middle" font-size="6.3" fill="#0f766e" font-family="Inter,system-ui,sans-serif">Cabina ↑</text>
    <text x="${xCounter + cwW + 16}" y="${yCw + cwH + 39}" text-anchor="middle" font-size="6.3" fill="#b45309" font-family="Inter,system-ui,sans-serif">CP ↓</text>

    <line x1="${shaftX - 14}" y1="${shaftTop}" x2="${shaftX - 14}" y2="${shaftBottom}" stroke="#94a3b8" stroke-width="1.3"/>
    <line x1="${shaftX - 18}" y1="${shaftTop}" x2="${shaftX - 10}" y2="${shaftTop}" stroke="#94a3b8" stroke-width="1.3"/>
    <line x1="${shaftX - 18}" y1="${shaftBottom}" x2="${shaftX - 10}" y2="${shaftBottom}" stroke="#94a3b8" stroke-width="1.3"/>
    <text x="${shaftX - 28}" y="${yMid + 8}" font-size="7" fill="#64748b" transform="rotate(-90 ${shaftX - 28} ${yMid + 8})" font-family="Inter,system-ui,sans-serif">Recorrido H</text>

    <line x1="${shaftX - 2}" y1="${shaftBottom}" x2="${shaftX + shaftW + 2}" y2="${shaftBottom}" stroke="#475569" stroke-width="2.3"/>
    <rect x="${shaftX + shaftW + 8}" y="${shaftTop + 14}" width="34" height="20" rx="4" fill="#dbeafe" stroke="#2563eb"/>
    <text x="${shaftX + shaftW + 25}" y="${shaftTop + 28}" text-anchor="middle" font-size="6.8" fill="#1d4ed8" font-family="Inter,system-ui,sans-serif">Máquina</text>

    <rect x="${vbW - 156}" y="${vbH - 42}" width="146" height="22" rx="6" fill="#ffffff" stroke="#dbe3ed"/>
    <text x="${vbW - 83}" y="${vbH - 28}" text-anchor="middle" font-size="6.7" fill="#64748b" font-family="Inter,system-ui,sans-serif">Funcionamiento: cabina sube / CP baja</text>
    <text x="${vbW / 2}" y="${vbH - 8}" text-anchor="middle" font-size="7" fill="#64748b" font-family="Inter,system-ui,sans-serif">Foso / planta baja (esquema visual)</text>
  `;
}
