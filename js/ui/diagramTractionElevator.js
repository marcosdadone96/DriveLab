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
  const scale = 5.2;
  const top = 46;
  const shaftH = 28 + H * scale;
  const vbW = 380;
  const vbH = top + shaftH + 58;
  const xC = 116;
  const xW = 268;
  const xP = 192;
  const yP = top + 12;
  const rP = 24;
  const yBot = top + shaftH - 20;
  const carH = Math.min(66, 24 + H * 0.4);
  const cwH = carH * 0.88;
  const yCar = yBot - carH;
  const yCw = yBot - cwH;
  const shaftX = 52;
  const shaftW = 276;

  const rope1 = reeving === '1_1'
    ? `<path d="M ${xP - 8} ${yP + rP} L ${xC + 24} ${yCar + 6}" fill="none" stroke="#334155" stroke-width="2"/>
       <path d="M ${xP + 8} ${yP + rP} L ${xW - 20} ${yCw + 6}" fill="none" stroke="#64748b" stroke-width="2"/>
       <text x="${xP + 46}" y="${(yP + rP + yCar) / 2}" font-size="7.2" fill="#475569" font-family="Inter,system-ui,sans-serif">1:1</text>`
    : `<path d="M ${xP - 10} ${yP + rP} Q ${xC + 6} ${yP + rP + 46} ${xC + 24} ${yCar + 8}" fill="none" stroke="#334155" stroke-width="1.9"/>
       <path d="M ${xP + 10} ${yP + rP} Q ${xW - 6} ${yP + rP + 46} ${xW - 20} ${yCw + 8}" fill="none" stroke="#64748b" stroke-width="1.9"/>
       <text x="${xP + 48}" y="${yP + rP + 60}" font-size="7.2" fill="#475569" font-family="Inter,system-ui,sans-serif">2:1</text>`;

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
    <text x="12" y="22" font-size="11" font-weight="800" fill="#0f172a" font-family="Inter,system-ui,sans-serif">Ascensor de tracción · vista de hueco</text>
    <text x="12" y="34" font-size="8" fill="#64748b" font-family="Inter,system-ui,sans-serif">H ≈ ${H.toFixed(1)} m · Arrollamiento ${reeving === '2_1' ? '2:1' : '1:1'} · cabina + contrapeso</text>
    <rect x="${shaftX}" y="${top}" width="${shaftW}" height="${shaftH}" rx="6" fill="url(#teShaft)" stroke="#94a3b8" stroke-width="1.7"/>
    <line x1="${xC - 34}" y1="${top + 8}" x2="${xC - 34}" y2="${yBot + 10}" stroke="#cbd5e1" stroke-width="2.1"/>
    <line x1="${xW + 34}" y1="${top + 8}" x2="${xW + 34}" y2="${yBot + 10}" stroke="#cbd5e1" stroke-width="2.1"/>
    <text x="${xC - 46}" y="${(top + yBot) / 2}" font-size="6.8" fill="#94a3b8" font-family="Inter,system-ui,sans-serif" transform="rotate(-90 ${xC - 46} ${(top + yBot) / 2})">Guía cabina</text>
    <text x="${xW + 46}" y="${(top + yBot) / 2}" font-size="6.8" fill="#94a3b8" font-family="Inter,system-ui,sans-serif" transform="rotate(-90 ${xW + 46} ${(top + yBot) / 2})">Guía contrapeso</text>
    <circle cx="${xP}" cy="${yP}" r="${rP}" fill="#e0f2fe" stroke="#0369a1" stroke-width="2.7"/>
    <circle cx="${xP}" cy="${yP}" r="${rP * 0.45}" fill="none" stroke="#0369a1" stroke-width="1.5"/>
    <text x="${xP}" y="${yP - rP - 8}" text-anchor="middle" font-size="7.2" font-weight="700" fill="#0c4a6e" font-family="Inter,system-ui,sans-serif">Polea tractora</text>
    ${rope1}
    <rect x="${xC - 32}" y="${yCar}" width="64" height="${carH}" rx="4" fill="url(#teCabin)" stroke="#0f766e" stroke-width="2"/>
    <rect x="${xC - 24}" y="${yCar + 8}" width="48" height="${Math.max(10, carH - 18)}" rx="2" fill="#ffffff" opacity="0.45"/>
    <text x="${xC}" y="${yCar + carH / 2 + 4}" text-anchor="middle" font-size="8" font-weight="700" fill="#134e4a" font-family="Inter,system-ui,sans-serif">Cabina</text>
    <rect x="${xW - 26}" y="${yCw}" width="52" height="${cwH}" rx="4" fill="url(#teCounterW)" stroke="#b45309" stroke-width="2"/>
    <line x1="${xW - 18}" y1="${yCw + 10}" x2="${xW + 18}" y2="${yCw + 10}" stroke="#d97706" stroke-width="1.2"/>
    <line x1="${xW - 18}" y1="${yCw + 22}" x2="${xW + 18}" y2="${yCw + 22}" stroke="#d97706" stroke-width="1.2"/>
    <text x="${xW}" y="${yCw + cwH / 2 + 4}" text-anchor="middle" font-size="8" font-weight="700" fill="#78350f" font-family="Inter,system-ui,sans-serif">Contrapeso</text>
    <line x1="${xC - 44}" y1="${yCar + carH * 0.45}" x2="${xC - 44}" y2="${yCar - 26}" stroke="#0f766e" stroke-width="1.8" marker-end="url(#teArrow)"/>
    <line x1="${xW + 44}" y1="${yCw + cwH * 0.55}" x2="${xW + 44}" y2="${yCw + cwH + 26}" stroke="#b45309" stroke-width="1.8" marker-end="url(#teArrow)"/>
    <text x="${xC - 67}" y="${yCar - 30}" font-size="6.8" fill="#0f766e" font-family="Inter,system-ui,sans-serif">Cabina ↑</text>
    <text x="${xW + 22}" y="${yCw + cwH + 35}" font-size="6.8" fill="#b45309" font-family="Inter,system-ui,sans-serif">CP ↓</text>
    <line x1="${shaftX - 14}" y1="${top}" x2="${shaftX - 14}" y2="${yBot + 10}" stroke="#94a3b8" stroke-width="1.3"/>
    <line x1="${shaftX - 18}" y1="${top}" x2="${shaftX - 10}" y2="${top}" stroke="#94a3b8" stroke-width="1.3"/>
    <line x1="${shaftX - 18}" y1="${yBot + 10}" x2="${shaftX - 10}" y2="${yBot + 10}" stroke="#94a3b8" stroke-width="1.3"/>
    <text x="${shaftX - 27}" y="${(top + yBot) / 2 + 8}" font-size="7" fill="#64748b" transform="rotate(-90 ${shaftX - 27} ${(top + yBot) / 2 + 8})" font-family="Inter,system-ui,sans-serif">Recorrido H</text>
    <line x1="${shaftX - 2}" y1="${yBot + 10}" x2="${shaftX + shaftW + 2}" y2="${yBot + 10}" stroke="#475569" stroke-width="2.3"/>
    <rect x="${shaftX + shaftW + 10}" y="${top + 18}" width="30" height="20" rx="4" fill="#dbeafe" stroke="#2563eb"/>
    <text x="${shaftX + shaftW + 25}" y="${top + 32}" text-anchor="middle" font-size="6.8" fill="#1d4ed8" font-family="Inter,system-ui,sans-serif">Máquina</text>
    <text x="${vbW / 2}" y="${vbH - 12}" text-anchor="middle" font-size="7" fill="#64748b" font-family="Inter,system-ui,sans-serif">Foso / planta baja (esquema visual)</text>
  `;
}
