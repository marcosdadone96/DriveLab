/**
 * Diagramas SVG detallados para calculadoras de catálogo (acoplamiento, chaveta, tornillo, rodamiento, línea motor).
 */

function uid() {
  return `dc${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Acoplamiento elástico en tres piezas: bridas, elemento elástico, flechas y par.
 * @param {SVGSVGElement | null} el
 */
export function renderCouplingAssemblyDiagram(el) {
  if (!(el instanceof SVGSVGElement)) return;
  const g = uid();
  el.setAttribute('viewBox', '0 0 720 356');
  el.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  el.setAttribute('role', 'img');
  el.innerHTML = `
    <defs>
      <linearGradient id="${g}bg" x1="0" y1="0" x2="720" y2="356">
        <stop offset="0%" stop-color="#f8fafc"/>
        <stop offset="100%" stop-color="#e2e8f0"/>
      </linearGradient>
      <linearGradient id="${g}shaft" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#94a3b8"/>
        <stop offset="100%" stop-color="#64748b"/>
      </linearGradient>
      <linearGradient id="${g}hub" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#334155"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <linearGradient id="${g}elast" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#99f6e4"/>
        <stop offset="100%" stop-color="#2dd4bf"/>
      </linearGradient>
      <filter id="${g}sh"><feDropShadow dx="0" dy="2" stdDeviation="2.2" flood-opacity="0.16"/></filter>
      <marker id="${g}arrFlow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
        <path d="M0,0 L9,4.5 L0,9 Z" fill="#2563eb"/>
      </marker>
      <marker id="${g}arrTorque" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#b45309"/>
      </marker>
    </defs>
    <rect width="720" height="356" fill="url(#${g}bg)"/>
    <text x="360" y="32" text-anchor="middle" font-size="15" font-weight="800" fill="#0f172a" font-family="Inter,system-ui,sans-serif">Acoplamiento flexible (tipo mandíbula + elastómero)</text>
    <text x="360" y="50" text-anchor="middle" font-size="10" fill="#475569" font-family="Inter,system-ui,sans-serif">Eje motor → cubo izq. → elastómero → cubo dcho. → eje conducido</text>

    <!-- Flujo de potencia superior (separado del arco de par) -->
    <path d="M 84 78 L 636 78" stroke="#2563eb" stroke-width="2.3" marker-end="url(#${g}arrFlow)"/>
    <text x="84" y="68" font-size="10" font-weight="700" fill="#1d4ed8" font-family="Inter,system-ui,sans-serif">Flujo de potencia</text>
    <text x="640" y="82" font-size="10" font-weight="700" fill="#1d4ed8" font-family="Inter,system-ui,sans-serif">Salida</text>

    <!-- Línea de eje -->
    <line x1="56" y1="188" x2="664" y2="188" stroke="#94a3b8" stroke-width="6" stroke-linecap="round"/>

    <!-- Eje motor -->
    <g transform="translate(66,188)" filter="url(#${g}sh)">
      <rect x="-24" y="-16" width="120" height="32" rx="4" fill="url(#${g}shaft)" stroke="#475569" stroke-width="1.6"/>
      <text x="36" y="5" text-anchor="middle" font-size="10" font-weight="700" fill="#f8fafc" font-family="Inter,system-ui,sans-serif">Eje motor</text>
    </g>

    <!-- Cubo izquierdo -->
    <g transform="translate(230,188)" filter="url(#${g}sh)">
      <rect x="-22" y="-54" width="44" height="108" rx="5" fill="url(#${g}hub)" stroke="#020617" stroke-width="1.8"/>
      <rect x="-9" y="-54" width="18" height="108" fill="#475569" opacity="0.42"/>
      <circle cx="0" cy="-26" r="4.4" fill="#0f172a"/>
      <circle cx="0" cy="0" r="4.4" fill="#0f172a"/>
      <circle cx="0" cy="26" r="4.4" fill="#0f172a"/>
    </g>

    <!-- Elastómero -->
    <g transform="translate(360,188)" filter="url(#${g}sh)">
      <rect x="-56" y="-48" width="112" height="96" rx="18" fill="url(#${g}elast)" stroke="#0f766e" stroke-width="2.2"/>
      <path d="M-40,-18 h18 l8,18 l-8,18 h-18 l-8,-18 z" fill="#ccfbf1" stroke="#0f766e" stroke-width="1.2"/>
      <path d="M16,-18 h18 l8,18 l-8,18 h-18 l-8,-18 z" fill="#ccfbf1" stroke="#0f766e" stroke-width="1.2"/>
      <text x="0" y="-58" text-anchor="middle" font-size="10" font-weight="800" fill="#0f766e" font-family="Inter,system-ui,sans-serif">Elemento elástico</text>
      <text x="0" y="62" text-anchor="middle" font-size="8.5" fill="#0f766e" font-family="Inter,system-ui,sans-serif">Amortigua vibración · desalineación leve</text>
    </g>

    <!-- Cubo derecho -->
    <g transform="translate(490,188)" filter="url(#${g}sh)">
      <rect x="-22" y="-54" width="44" height="108" rx="5" fill="url(#${g}hub)" stroke="#020617" stroke-width="1.8"/>
      <rect x="-9" y="-54" width="18" height="108" fill="#475569" opacity="0.42"/>
      <circle cx="0" cy="-26" r="4.4" fill="#0f172a"/>
      <circle cx="0" cy="0" r="4.4" fill="#0f172a"/>
      <circle cx="0" cy="26" r="4.4" fill="#0f172a"/>
    </g>

    <!-- Eje conducido -->
    <g transform="translate(554,188)" filter="url(#${g}sh)">
      <rect x="0" y="-16" width="120" height="32" rx="4" fill="url(#${g}shaft)" stroke="#475569" stroke-width="1.6"/>
      <text x="60" y="5" text-anchor="middle" font-size="10" font-weight="700" fill="#f8fafc" font-family="Inter,system-ui,sans-serif">Eje conducido</text>
    </g>

    <!-- Par (más alto que las leyendas de cubo para no solaparse) -->
    <path d="M 308 108 A 42 42 0 1 1 396 108" fill="none" stroke="#b45309" stroke-width="2.4" marker-end="url(#${g}arrTorque)"/>
    <text x="352" y="92" font-size="12" font-weight="800" fill="#b45309" text-anchor="middle" font-family="Inter,system-ui,sans-serif">Par T</text>
    <text x="408" y="100" font-size="9.5" fill="#64748b" font-family="Inter,system-ui,sans-serif">T = 9550 · P / n</text>

    <!-- Llamadas a cubos (debajo del arco de par) -->
    <line x1="230" y1="148" x2="230" y2="158" stroke="#334155" stroke-width="1.3"/>
    <text x="230" y="144" text-anchor="middle" font-size="9.5" font-weight="700" fill="#334155" font-family="Inter,system-ui,sans-serif">Cubo izquierdo</text>
    <line x1="490" y1="148" x2="490" y2="158" stroke="#334155" stroke-width="1.3"/>
    <text x="490" y="144" text-anchor="middle" font-size="9.5" font-weight="700" fill="#334155" font-family="Inter,system-ui,sans-serif">Cubo derecho</text>

    <!-- Caja de uso -->
    <rect x="24" y="258" width="320" height="62" rx="9" fill="#ffffff" stroke="#bfdbfe" stroke-width="1.3"/>
    <text x="36" y="278" font-size="10" font-weight="800" fill="#1d4ed8" font-family="Inter,system-ui,sans-serif">Qué revisar para elegir modelo</text>
    <text x="36" y="296" font-size="9.3" fill="#334155" font-family="Inter,system-ui,sans-serif">1) T_diseño = (9550·P/n)·K   2) T_diseño ≤ T_nom catálogo</text>
    <text x="36" y="312" font-size="9.3" fill="#334155" font-family="Inter,system-ui,sans-serif">3) Diámetro de eje admitido y nota de servicio</text>

    <!-- Mini leyenda -->
    <rect x="474" y="258" width="222" height="62" rx="9" fill="#ffffff" stroke="#d1d5db" stroke-width="1.2"/>
    <rect x="488" y="272" width="14" height="10" rx="2" fill="#111827"/>
    <text x="508" y="281" font-size="9.2" fill="#334155" font-family="Inter,system-ui,sans-serif">Cubo metálico</text>
    <rect x="488" y="290" width="14" height="10" rx="2" fill="#5eead4" stroke="#0f766e"/>
    <text x="508" y="299" font-size="9.2" fill="#334155" font-family="Inter,system-ui,sans-serif">Elastómero</text>
    <line x1="488" y1="309" x2="502" y2="309" stroke="#2563eb" stroke-width="2.2"/>
    <text x="508" y="312" font-size="9.2" fill="#334155" font-family="Inter,system-ui,sans-serif">Flujo potencia</text>

    <text x="360" y="342" text-anchor="middle" font-size="9" fill="#64748b" font-family="Inter,system-ui,sans-serif">Esquema didáctico (no a escala). Geometría según fabricante.</text>
  `;
}

/**
 * Chaveta paralela: vista en corte del eje + cota L.
 * @param {SVGSVGElement | null} el
 * @param {{ d: number; b: number; h: number; t1: number; t2: number; L: number }} p
 */
export function renderParallelKeyShaftDiagram(el, p) {
  if (!(el instanceof SVGSVGElement)) return;
  const g = uid();
  const { d, b, h, t1, t2, L } = p;
  const cx = 198;
  const cy = 202;
  const R = Math.min(82, Math.max(46, d * 1.28));
  const scale = R / (d / 2);
  const bw = (b / 2) * scale * 0.95;
  const keyH = h * scale * 0.9;
  const kwDepth = t1 * scale * 0.95;
  const sideW = Math.min(200, L * 2);
  const artRight = 408 + sideW;
  const artLeft = Math.min(cx - bw - 44, cx - R);
  const artShift = 320 - (artLeft + artRight) / 2;

  el.setAttribute('viewBox', '0 0 640 360');
  el.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  el.setAttribute('role', 'img');
  el.innerHTML = `
    <defs>
      <linearGradient id="${g}bg" x1="0" y1="0" x2="640" y2="360"><stop offset="0%" stop-color="#f8fafc"/><stop offset="100%" stop-color="#e2e8f0"/></linearGradient>
      <linearGradient id="${g}shaft" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#94a3b8"/><stop offset="100%" stop-color="#64748b"/></linearGradient>
      <filter id="${g}sh"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.15"/></filter>
    </defs>
    <rect width="640" height="360" fill="url(#${g}bg)"/>
    <text x="320" y="28" text-anchor="middle" font-size="15" font-weight="800" fill="#0f172a" font-family="Inter,system-ui,sans-serif">Chaveta paralela forma A · DIN 6885-1 (referencia)</text>
    <text x="320" y="44" text-anchor="middle" font-size="10" fill="#475569" font-family="Inter,system-ui,sans-serif">Corte: t₁ · h · b · longitud útil L</text>

    <g transform="translate(${artShift.toFixed(2)}, 0)">
    <!-- Eje circular -->
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${g}shaft)" stroke="#334155" stroke-width="2.5" filter="url(#${g}sh)"/>
    <!-- Ranura (wedge cut top) -->
    <path d="M ${cx - bw} ${cy - R} L ${cx + bw} ${cy - R} L ${cx + bw} ${cy - R + kwDepth} L ${cx} ${cy - R + kwDepth + 2} L ${cx - bw} ${cy - R + kwDepth} Z"
      fill="#1e293b" stroke="#0f172a" stroke-width="1.2" opacity="0.92"/>
    <!-- Chaveta -->
    <rect x="${cx - bw}" y="${cy - R - keyH}" width="${bw * 2}" height="${keyH}" fill="#fbbf24" stroke="#b45309" stroke-width="2" rx="1" filter="url(#${g}sh)"/>
    <!-- Cotas -->
    <line x1="${cx - bw - 35}" y1="${cy - R - keyH}" x2="${cx - bw - 35}" y2="${cy - R + kwDepth}" stroke="#0d9488" stroke-width="1.2"/>
    <line x1="${cx - bw - 40}" y1="${cy - R - keyH}" x2="${cx - bw - 30}" y2="${cy - R - keyH}" stroke="#0d9488"/>
    <line x1="${cx - bw - 40}" y1="${cy - R + kwDepth}" x2="${cx - bw - 30}" y2="${cy - R + kwDepth}" stroke="#0d9488"/>
    <text x="${cx - bw - 42}" y="${cy - R - keyH / 2 + kwDepth / 2}" text-anchor="end" font-size="11" font-weight="700" fill="#0f766e" font-family="Inter,system-ui,sans-serif">h</text>

    <line x1="${cx - bw}" y1="${cy - R - keyH - 28}" x2="${cx + bw}" y2="${cy - R - keyH - 28}" stroke="#0d9488" stroke-width="1.2"/>
    <line x1="${cx - bw}" y1="${cy - R - keyH - 32}" x2="${cx - bw}" y2="${cy - R - keyH - 22}" stroke="#0d9488"/>
    <line x1="${cx + bw}" y1="${cy - R - keyH - 32}" x2="${cx + bw}" y2="${cy - R - keyH - 22}" stroke="#0d9488"/>
    <text x="${cx}" y="${cy - R - keyH - 36}" text-anchor="middle" font-size="11" font-weight="700" fill="#0f766e" font-family="Inter,system-ui,sans-serif">b</text>

    <text x="${Math.min(cx + R + 14, 410)}" y="${cy - 8}" font-size="11" font-weight="800" fill="#334155" font-family="Inter,system-ui,sans-serif">Ø d = ${d.toFixed(1)} mm</text>
    <text x="${Math.min(cx + R + 14, 410)}" y="${cy + 10}" font-size="9.5" fill="#64748b" font-family="Inter,system-ui,sans-serif">t₁ = ${t1} mm · t₂ = ${t2} mm</text>

    <!-- Vista lateral longitud L (encajada a la derecha sin salir del viewBox) -->
    <g transform="translate(408, 148)" filter="url(#${g}sh)">
      <rect x="0" y="0" width="${Math.min(200, L * 2)}" height="34" rx="4" fill="#64748b" stroke="#334155" stroke-width="2"/>
      <rect x="18" y="-12" width="${Math.min(164, Math.max(40, L * 2 - 36))}" height="12" fill="#fbbf24" stroke="#b45309" stroke-width="1.5"/>
      <text x="${(Math.min(200, L * 2) / 2).toFixed(1)}" y="-20" text-anchor="middle" font-size="10" font-weight="700" fill="#b45309" font-family="Inter,system-ui,sans-serif">L ≈ ${L} mm</text>
      <text x="6" y="50" font-size="9" fill="#475569" font-family="Inter,system-ui,sans-serif">Vista lateral</text>
    </g>

    <text x="20" y="342" font-size="9" fill="#64748b" font-family="Inter,system-ui,sans-serif">Aplastamiento: σ ≈ 2|T| / (d · L · h/2); verificar norma y tolerancias.</text>
  `;
}

/**
 * Unión atornillada: platinas, tornillo, fuerza axial.
 * @param {SVGSVGElement | null} el
 * @param {number} d_mm
 */
export function renderBoltedJointDiagram(el, d_mm) {
  if (!(el instanceof SVGSVGElement)) return;
  const g = uid();
  const sh = Math.max(14, Math.min(36, d_mm * 1.4));
  const head = sh * 1.15;

  el.setAttribute('viewBox', '0 0 720 340');
  el.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  el.setAttribute('role', 'img');
  el.innerHTML = `
    <defs>
      <linearGradient id="${g}bg" x1="0" y1="0" x2="720" y2="340"><stop offset="0%" stop-color="#fefce8"/><stop offset="100%" stop-color="#e7e5e4"/></linearGradient>
      <linearGradient id="${g}bolt" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#d6d3d1"/><stop offset="100%" stop-color="#78716c"/></linearGradient>
      <filter id="${g}sh"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.14"/></filter>
    </defs>
    <rect width="720" height="340" fill="url(#${g}bg)"/>
    <text x="360" y="30" text-anchor="middle" font-size="15" font-weight="800" fill="#0f172a" font-family="Inter,system-ui,sans-serif">Unión pretensada · tornillo métrico ISO</text>
    <text x="360" y="48" text-anchor="middle" font-size="10" fill="#475569" font-family="Inter,system-ui,sans-serif">Platinas · precarga F_V · tracción F · rosca a resistencia</text>

    <!-- Platinas -->
    <g transform="translate(340, 188)" filter="url(#${g}sh)">
      <rect x="-140" y="-55" width="280" height="28" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
      <rect x="-140" y="27" width="280" height="28" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
      <!-- Tornillo -->
      <rect x="${-sh / 2}" y="${-55 - head}" width="${sh}" height="${head}" fill="#a8a29e" stroke="#44403c" stroke-width="1.5" rx="2"/>
      <polygon points="0,${-55 - head - 2} ${sh * 0.35},${-55 - head * 0.55} ${-sh * 0.35},${-55 - head * 0.55}" fill="#d6d3d1" stroke="#57534e"/>
      <rect x="${-sh * 0.35}" y="-55" width="${sh * 0.7}" height="110" fill="url(#${g}bolt)" stroke="#44403c" stroke-width="1.8"/>
      <!-- Rosca indicada -->
      <line x1="${sh * 0.35}" y1="-20" x2="${sh * 0.35}" y2="40" stroke="#292524" stroke-width="0.8" stroke-dasharray="2 2"/>
      <line x1="${-sh * 0.35}" y1="-20" x2="${-sh * 0.35}" y2="40" stroke="#292524" stroke-width="0.8" stroke-dasharray="2 2"/>
    </g>

    <!-- Fuerza F (separada del vástago para lectura clara) -->
    <g transform="translate(498, 188)">
      <line x1="0" y1="-40" x2="0" y2="40" stroke="#dc2626" stroke-width="3" marker-start="url(#${g}ar1)" marker-end="url(#${g}ar2)"/>
      <defs>
        <marker id="${g}ar1" markerWidth="7" markerHeight="7" refX="1" refY="3.5" orient="auto"><path d="M7,0 L0,3.5 L7,7 Z" fill="#dc2626"/></marker>
        <marker id="${g}ar2" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#dc2626"/></marker>
      </defs>
      <text x="12" y="5" font-size="11" font-weight="800" fill="#dc2626" font-family="Inter,system-ui,sans-serif">F</text>
    </g>

    <rect x="24" y="248" width="240" height="56" rx="8" fill="#fff" stroke="#fca5a5" stroke-width="1.2"/>
    <text x="34" y="268" font-size="9.5" font-weight="700" fill="#991b1b" font-family="Inter,system-ui,sans-serif">M${d_mm} · A_s · Rp (grado)</text>
    <text x="34" y="288" font-size="9" fill="#475569" font-family="Inter,system-ui,sans-serif">T apriete ≈ K · F_V · d (K ≈ 0,20)</text>

    <text x="360" y="322" text-anchor="middle" font-size="9" fill="#64748b" font-family="Inter,system-ui,sans-serif">Sin fatiga de rosca detallada; ver EN 1993-1-8 / montaje.</text>
  `;
}

/**
 * Rodamiento rígido de bolas a escala d,D,B.
 * @param {SVGSVGElement | null} el
 * @param {{ d: number; D: number; B: number; designation: string }} p
 */
export function renderCatalogDeepGrooveSection(el, p) {
  if (!(el instanceof SVGSVGElement)) return;
  const g = uid();
  const { d, D, B, designation } = p;
  const cx = 280;
  const cy = 168;
  const k = 118 / D;
  const ri = (d / 2) * k;
  const ro = (D / 2) * k;
  const halfB = (B / 2) * k * 0.85;
  const nBalls = 7;
  const rm = (ri + ro) / 2;
  const rb = Math.max(4, (ro - ri) * 0.32);

  el.setAttribute('viewBox', '0 0 560 300');
  el.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  el.setAttribute('role', 'img');
  let balls = '';
  for (let i = 0; i < nBalls; i++) {
    const ang = (i / nBalls) * Math.PI * 2 - Math.PI / 2;
    const bx = cx + rm * Math.cos(ang);
    const by = cy + (rm * Math.sin(ang) * 0.42);
    balls += `<ellipse cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" rx="${rb}" ry="${rb * 0.42}" fill="#e2e8f0" stroke="#475569" stroke-width="1.1"/>`;
  }

  el.innerHTML = `
    <defs>
      <linearGradient id="${g}bg" x1="0" y1="0" x2="560" y2="300"><stop offset="0%" stop-color="#f1f5f9"/><stop offset="100%" stop-color="#e2e8f0"/></linearGradient>
      <linearGradient id="${g}steel" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#e2e8f0"/><stop offset="50%" stop-color="#94a3b8"/><stop offset="100%" stop-color="#64748b"/></linearGradient>
      <filter id="${g}sh"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-opacity="0.16"/></filter>
    </defs>
    <rect width="560" height="300" fill="url(#${g}bg)"/>
    <text x="20" y="30" font-size="15" font-weight="800" fill="#0f172a" font-family="Inter,system-ui,sans-serif">Rodamiento rígido de bolas · ${designation}</text>
    <text x="20" y="46" font-size="10" fill="#475569" font-family="Inter,system-ui,sans-serif">Sección esquemática · d × D × B · bolas en surco</text>

    <g filter="url(#${g}sh)">
      <path d="M ${cx - ro},${cy - halfB} L ${cx + ro},${cy - halfB} L ${cx + ro + 8},${cy} L ${cx + ro},${cy + halfB} L ${cx - ro},${cy + halfB} L ${cx - ro - 8},${cy} Z"
        fill="url(#${g}steel)" stroke="#334155" stroke-width="2"/>
      <path d="M ${cx - ri + 4},${cy - halfB * 0.88} L ${cx + ri - 4},${cy - halfB * 0.88} L ${cx + ri + 2},${cy} L ${cx + ri - 4},${cy + halfB * 0.88} L ${cx - ri + 4},${cy + halfB * 0.88} L ${cx - ri - 2},${cy} Z"
        fill="url(#${g}steel)" stroke="#1e293b" stroke-width="1.8"/>
      ${balls}
      <ellipse cx="${cx}" cy="${cy}" rx="${(ri + ro) / 2 + 2}" ry="${((ri + ro) / 2) * 0.38}" fill="none" stroke="#0d9488" stroke-width="1.3" stroke-dasharray="5 4"/>
    </g>

    <text x="24" y="92" font-size="10" fill="#334155" font-family="Inter,system-ui,sans-serif">d = ${d} mm</text>
    <text x="24" y="108" font-size="10" fill="#334155" font-family="Inter,system-ui,sans-serif">D = ${D} mm</text>
    <text x="24" y="124" font-size="10" fill="#334155" font-family="Inter,system-ui,sans-serif">B = ${B} mm</text>
    <text x="24" y="142" font-size="9.5" fill="#64748b" font-family="Inter,system-ui,sans-serif">C dinámica y L₁₀ con P, n en el formulario</text>

    <text x="280" y="286" text-anchor="middle" font-size="9" fill="#64748b" font-family="Inter,system-ui,sans-serif">Ilustración didáctica; geometría según catálogo SKF/FAG.</text>
  `;
}

/**
 * Línea de transmisión: motor J_m · carga J_ext.
 * @param {SVGSVGElement | null} el
 */
export function renderInertiaTransmissionLine(el) {
  if (!(el instanceof SVGSVGElement)) return;
  const g = uid();
  el.setAttribute('viewBox', '0 0 560 172');
  el.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  el.setAttribute('role', 'img');
  el.innerHTML = `
    <defs>
      <linearGradient id="${g}bg" x1="0" y1="0" x2="560" y2="172"><stop offset="0%" stop-color="#ecfdf5"/><stop offset="100%" stop-color="#e0e7ff"/></linearGradient>
      <filter id="${g}sh"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.12"/></filter>
      <marker id="${g}a" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#64748b"/></marker>
    </defs>
    <rect width="560" height="172" fill="url(#${g}bg)"/>
    <text x="280" y="24" text-anchor="middle" font-size="13" font-weight="800" fill="#0f172a" font-family="Inter,system-ui,sans-serif">Cadena de inercias (eje motor)</text>
    <text x="280" y="40" text-anchor="middle" font-size="9" fill="#475569" font-family="Inter,system-ui,sans-serif">J_ext / J_mot &lt; límite típ. (10…15) con variador</text>

    <g transform="translate(72, 102)" filter="url(#${g}sh)">
      <rect x="-44" y="-30" width="88" height="60" rx="6" fill="#0d9488" stroke="#0f766e" stroke-width="2"/>
      <text x="0" y="5" text-anchor="middle" font-size="10" font-weight="800" fill="#fff" font-family="Inter,system-ui,sans-serif">Motor</text>
      <text x="0" y="20" text-anchor="middle" font-size="8.5" fill="#ccfbf1" font-family="Inter,system-ui,sans-serif">J_mot</text>
    </g>
    <line x1="120" y1="102" x2="188" y2="102" stroke="#64748b" stroke-width="2" marker-end="url(#${g}a)"/>
    <text x="148" y="92" font-size="8.5" fill="#64748b" font-family="Inter,system-ui,sans-serif">eje</text>

    <g transform="translate(232, 102)" filter="url(#${g}sh)">
      <rect x="-36" y="-24" width="72" height="48" rx="4" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
      <text x="0" y="5" text-anchor="middle" font-size="9.5" font-weight="700" fill="#fff" font-family="Inter,system-ui,sans-serif">Acople</text>
    </g>

    <line x1="272" y1="102" x2="332" y2="102" stroke="#64748b" stroke-width="2" marker-end="url(#${g}a)"/>

    <g transform="translate(404, 102)" filter="url(#${g}sh)">
      <circle cx="0" cy="0" r="40" fill="#cbd5e1" stroke="#475569" stroke-width="2.2"/>
      <circle cx="0" cy="0" r="15" fill="#64748b" stroke="#334155"/>
      <text x="0" y="-50" text-anchor="middle" font-size="9.5" font-weight="800" fill="#334155" font-family="Inter,system-ui,sans-serif">Carga</text>
      <text x="0" y="52" text-anchor="middle" font-size="8.5" fill="#475569" font-family="Inter,system-ui,sans-serif">J_ext reflejada</text>
    </g>

    <text x="280" y="162" text-anchor="middle" font-size="8.5" fill="#64748b" font-family="Inter,system-ui,sans-serif">Abajo: par motor vs par resistente a régimen.</text>
  `;
}
