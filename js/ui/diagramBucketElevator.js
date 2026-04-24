/**
 * Esquema SVG vertical de elevador de cangilones — escala con altura de elevación.
 */

import { getCurrentLang } from '../config/locales.js';

/**
 * @param {SVGSVGElement | null} svg
 * @param {object} p
 * @param {number} p.liftHeight_m
 * @param {number} p.centerDistance_m
 * @param {number} p.headDrumDiameter_m
 * @param {number} p.bootDrumDiameter_m
 * @param {number} p.pitch_mm
 * @param {number} p.beltSpeed_m_s
 * @param {number} [p.animPhase] — 0..1 para desplazar cangilones
 * @param {'es'|'en'} [p.lang]
 */
export function renderBucketElevatorDiagram(svg, p) {
  if (!svg) return;
  const lang = p.lang ?? getCurrentLang();
  const en = lang === 'en';

  const H = Math.max(1, Number(p.liftHeight_m) || 10);
  const C = Math.max(H, Number(p.centerDistance_m) || H);
  const Dh = Math.max(0.25, Number(p.headDrumDiameter_m) || 0.65);
  const Db = Math.max(0.25, Number(p.bootDrumDiameter_m) || 0.55);
  const pitch_mm = Math.max(150, Number(p.pitch_mm) || 400);
  const v = Math.max(0.2, Number(p.beltSpeed_m_s) || 1.5);
  const phase = Number(p.animPhase) || 0;

  const scale = 9.5;
  const marginTop = 44;
  const marginBottom = 64;
  const railH = Math.min(360, Math.max(120, 24 + H * scale));
  const vbW = 250;
  const vbH = marginTop + railH + marginBottom;

  const yHeadC = marginTop + (Dh * scale) / 2;
  const yBootC = marginTop + railH - (Db * scale) / 2;
  const cx = 104;
  const gap = 26;
  const xLoad = cx - gap;
  const xReturn = cx + gap;

  const rHead = (Dh * scale) / 2;
  const rBoot = (Db * scale) / 2;

  const yTop = yHeadC - rHead;
  const yBot = yBootC + rBoot;
  const runLen = Math.max(40, yBot - yTop);
  const pitch_px = Math.max(18, (pitch_mm / 1000) * scale * 1.55);
  const nBuckets = Math.min(16, Math.max(4, Math.ceil(runLen / pitch_px) + 1));
  const yMid = (yTop + yBot) / 2;
  let headLabelY = Math.max(56, yHeadC - rHead - 10);
  let bootLabelY = Math.min(vbH - 18, yBootC + rBoot + 8);
  const minSep = 26;
  if (bootLabelY - headLabelY < minSep) {
    bootLabelY = Math.min(vbH - 18, headLabelY + minSep);
  }
  const rightTagX = vbW - 92;
  const rightTagW = 88;

  let bucketsSvg = '';
  for (let i = 0; i < nBuckets; i++) {
    const off = ((i * pitch_px) / runLen + phase) % 1;
    const y = yTop + off * runLen;
    const w = 11;
    const h = 8;
    const filled = off < 0.48;
    const fill = filled ? '#f59e0b' : '#fde68a';
    const stroke = filled ? '#b45309' : '#ca8a04';
    bucketsSvg += `<g transform="translate(${xLoad},${y.toFixed(1)})">
      <rect x="${-w / 2}" y="${-h}" width="${w}" height="${h}" rx="1.5" fill="${fill}" stroke="${stroke}" stroke-width="0.9"/>
    </g>`;
    const yR = yBot - off * runLen;
    bucketsSvg += `<g transform="translate(${xReturn},${yR.toFixed(1)})">
      <rect x="${-w / 2}" y="${-h}" width="${w}" height="${h}" rx="1.5" fill="#e2e8f0" stroke="#64748b" stroke-width="0.8" opacity="0.9"/>
    </g>`;
  }

  const titleMain = en ? 'Bucket elevator' : 'Elevador de cangilones';
  const lblHead = en ? 'Head' : 'Cabeza';
  const lblBoot = en ? 'Boot' : 'Pie';
  const lblLoadLeg = en ? 'Load leg' : 'Rama carga';

  svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
  svg.setAttribute('aria-label', en ? 'Bucket elevator schematic' : 'Esquema elevador de cangilones');
  svg.innerHTML = `
    <defs>
      <linearGradient id="beLeg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#bae6fd"/>
        <stop offset="100%" stop-color="#e0f2fe"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="#f8fafc"/>
    <rect x="${cx - 84}" y="10" width="168" height="30" rx="8" fill="#ffffff" stroke="#dbe3ed"/>
    <text x="${cx}" y="23" text-anchor="middle" font-size="9.2" font-family="Inter,system-ui,sans-serif" fill="#0f172a" font-weight="800">${titleMain}</text>
    <text x="${cx}" y="33" text-anchor="middle" font-size="7.1" font-family="Inter,system-ui,sans-serif" fill="#64748b">H ${H.toFixed(1)} m · C ${C.toFixed(1)} m · v ${v.toFixed(2)} m/s</text>
    <line x1="${xLoad}" y1="${yTop}" x2="${xLoad}" y2="${yBot}" stroke="#64748b" stroke-width="2.8" stroke-linecap="round"/>
    <line x1="${xReturn}" y1="${yTop}" x2="${xReturn}" y2="${yBot}" stroke="#94a3b8" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="4 3"/>
    ${bucketsSvg}
    <g>
      <circle cx="${cx}" cy="${yHeadC}" r="${rHead}" fill="url(#beLeg)" stroke="#0369a1" stroke-width="2.2"/>
      <circle cx="${cx}" cy="${yHeadC}" r="${Math.max(2.6, rHead * 0.24)}" fill="#e0f2fe" stroke="#0369a1" stroke-width="1.4"/>
      <line x1="${cx - rHead - 5}" y1="${yHeadC}" x2="${cx + rHead + 5}" y2="${yHeadC}" stroke="#0369a1" stroke-width="1.2" opacity="0.7"/>
    </g>
    <g>
      <circle cx="${cx}" cy="${yBootC}" r="${rBoot}" fill="#fef9c3" stroke="#a16207" stroke-width="2.2"/>
      <circle cx="${cx}" cy="${yBootC}" r="${Math.max(2.6, rBoot * 0.24)}" fill="#fff7ed" stroke="#a16207" stroke-width="1.4"/>
      <line x1="${cx - rBoot - 5}" y1="${yBootC}" x2="${cx + rBoot + 5}" y2="${yBootC}" stroke="#a16207" stroke-width="1.2" opacity="0.7"/>
    </g>
    <line x1="${cx + rHead * 0.68}" y1="${yHeadC - rHead * 0.2}" x2="${rightTagX}" y2="${headLabelY - 7}" stroke="#075985" stroke-width="1"/>
    <rect x="${rightTagX}" y="${headLabelY - 14}" width="${rightTagW}" height="14" rx="3" fill="#ffffff" stroke="#bfdbfe"/>
    <text x="${rightTagX + rightTagW / 2}" y="${headLabelY - 4}" text-anchor="middle" font-size="6.4" fill="#075985" font-family="Inter,system-ui,sans-serif" font-weight="700">${lblHead} \u00d8${(Dh * 1000).toFixed(0)} mm</text>
    <line x1="${cx + rBoot * 0.68}" y1="${yBootC + rBoot * 0.22}" x2="${rightTagX}" y2="${bootLabelY - 7}" stroke="#713f12" stroke-width="1"/>
    <rect x="${rightTagX}" y="${bootLabelY - 14}" width="${rightTagW}" height="14" rx="3" fill="#ffffff" stroke="#fcd34d"/>
    <text x="${rightTagX + rightTagW / 2}" y="${bootLabelY - 4}" text-anchor="middle" font-size="6.4" fill="#713f12" font-family="Inter,system-ui,sans-serif" font-weight="700">${lblBoot} \u00d8${(Db * 1000).toFixed(0)} mm</text>
    <rect x="${xLoad - 54}" y="${yMid - 8}" width="28" height="16" rx="3" fill="#ffffff" stroke="#cbd5e1"/>
    <text x="${xLoad - 40}" y="${yMid + 1.5}" text-anchor="middle" font-size="5.8" fill="#334155" font-family="Inter,system-ui,sans-serif" transform="rotate(-90,${xLoad - 40},${yMid + 1.5})">${lblLoadLeg}</text>
  `;
}
