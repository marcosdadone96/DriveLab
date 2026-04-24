/**
 * Muelle helicoidal compresion - modelo docente alineado con DIN/EN (orientativo).
 * Servicio (s_op / F_op), pandeo docente, bloqueo, fatiga Goodman simplificada (proyecto).
 */
import { mountCompactLabFieldHelp } from './labHelpCompact.js';
import { readLabNumber } from '../utils/labInputParse.js';
import { mountLabFluidPdfExportBar } from '../services/fluidLabPdfExport.js';
import { formatDateTimeLocale, getCurrentLang } from '../config/locales.js';
import { bindLabUnitSelectors, formatLength, getLabUnitPrefs } from '../lab/labUnitPrefs.js';
import { injectLabUnitConverterIfNeeded, mountLabUnitConverter } from '../lab/labUnitConvert.js';
import {
  debounce,
  labAlert,
  metricHtml,
  renderResultHero,
  runCalcWithIndustrialFeedback,
} from './labCalcUx.js';
import { setLabPurchaseSuggestions } from './labPurchaseSuggestions.js';

/** @type {object | null} */
let springPdfSnapshot = null;

const MATERIALS = {
  f1430: {
    label: 'Acero muelles F-1430 / 50CrV4 tip.',
    G: 81500,
    tauAllow: 720,
    source: 'G y tau_adm orden de catalogo; confirmar con hoja de compra / tratamiento.',
  },
  aisi302: {
    label: 'Inox AISI 302',
    G: 71000,
    tauAllow: 420,
    source: 'Valores medios; inox depende fuerte del endurecimiento.',
  },
  piano: {
    label: 'Cuerda de piano',
    G: 81500,
    tauAllow: 880,
    source: 'Muy aproximado; muelles reales usan aleaciones especificas.',
  },
};

function wahlK(C) {
  if (!Number.isFinite(C) || C <= 1) return NaN;
  return (4 * C - 1) / (4 * C - 4) + 0.615 / C;
}

function solidLengthMm(n, d, ends) {
  const kExt = ends === 'open' ? 0.5 : ends === 'closed' ? 1.5 : 2;
  return (n + kExt) * d;
}

/** Tension cortante en MPa (Wahl) para fuerza F (N); d, Dm en mm. */
function tauFromForce(F, K, Dm, d) {
  if (!Number.isFinite(F) || F < 0 || !Number.isFinite(K)) return NaN;
  return (K * 8 * F * Dm) / (Math.PI * d ** 3);
}

/**
 * Deflexion critica de pandeo (mm) - modelo docente a partir de L0/Dm y apoyo en extremos.
 * Conservador frente a diagramas tipo EN 13906; no sustituye abaco de norma.
 */
function bucklingDocente(L0, Dm, ends) {
  const w = L0 / Math.max(Dm, 1e-6);
  const anchors = [
    [1.5, 0.52], [2, 0.45], [2.5, 0.38], [3, 0.32], [3.5, 0.26],
    [4, 0.21], [4.5, 0.17], [5, 0.14], [6, 0.11], [8, 0.07], [10, 0.05],
  ];
  let sCrL0;
  if (w < 1.1) sCrL0 = 0.55;
  else if (w <= anchors[0][0]) {
    sCrL0 = 0.5 + ((w - 1.1) / (anchors[0][0] - 1.1)) * (anchors[0][1] - 0.5);
  } else {
    sCrL0 = anchors[anchors.length - 1][1];
    for (let i = 0; i < anchors.length - 1; i += 1) {
      const [w0, s0] = anchors[i];
      const [w1, s1] = anchors[i + 1];
      if (w >= w0 && w <= w1) {
        sCrL0 = s0 + ((s1 - s0) * (w - w0)) / (w1 - w0);
        break;
      }
    }
  }
  const endFac = ends === 'open' ? 0.55 : ends === 'closed' ? 0.75 : 1;
  sCrL0 = Math.max(0.04, Math.min(0.92, sCrL0 * endFac));
  const sCrMm = sCrL0 * L0;
  return { w, sCrL0, sCrMm };
}

function goodmanShearDocente(tauMin, tauMax, tauW, tauAdmStatic) {
  const tauA = (tauMax - tauMin) / 2;
  const tauM = (tauMax + tauMin) / 2;
  if (!Number.isFinite(tauW) || tauW <= 0 || !Number.isFinite(tauAdmStatic) || tauAdmStatic <= 0) {
    return { U: NaN, tauA, tauM };
  }
  const U = tauA / tauW + tauM / tauAdmStatic;
  return { U, tauA, tauM };
}

function fmt(n, d = 2) {
  return Number.isFinite(n) ? n.toFixed(d) : '--';
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function elementCardHtml(title, rows) {
  const body = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  return `<article class="lab-element-card"><h4 class="lab-element-card__title">${esc(title)}</h4><dl class="lab-element-card__kv">${body}</dl></article>`;
}

function renderSpringDiagram(svg, p) {
  if (!(svg instanceof SVGSVGElement)) return;
  const { d, Dm, L0, n, sSim, sMax } = p;
  const L = Math.max(d * 1.5, L0 - sSim);
  const margin = { t: 36, r: 28, b: 42, l: 36 };
  const plotW = 420;
  const plotH = 260;
  const w = plotW + margin.l + margin.r;
  const h = plotH + margin.t + margin.b;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

  const cx = margin.l + plotW / 2;
  const z0 = margin.t;
  const zScale = plotH / Math.max(L0, 1);
  const amp = Math.min((Dm / 2) * zScale * 0.9, plotW * 0.42);
  const steps = Math.max(64, Math.ceil(n * 28));
  const sw = Math.max(2.2, Math.min(8, d * zScale * 0.35));

  let dPath = '';
  for (let i = 0; i <= steps; i += 1) {
    const u = i / steps;
    const t = u * 2 * Math.PI * n;
    const z = z0 + u * L * zScale;
    const x = cx + amp * Math.cos(t);
    dPath += i === 0 ? `M ${fmt(x, 2)} ${fmt(z, 2)}` : ` L ${fmt(x, 2)} ${fmt(z, 2)}`;
  }

  const zEnd = z0 + L * zScale;
  const zFree = z0 + L0 * zScale;
  const xL = cx - amp - sw;
  const xR = cx + amp + sw;
  const dimDmY = z0 + (zEnd - z0) * 0.5;
  const dimLx = xR + 18;

  svg.innerHTML = `
    <defs>
      <marker id="spArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
        <path d="M0,0 L7,3.5 L0,7 Z" fill="#64748b"/>
      </marker>
    </defs>
    <rect width="${w}" height="${h}" fill="#f8fafc"/>
    <text x="${margin.l}" y="22" font-size="13" font-weight="800" fill="#0f172a" font-family="Inter,system-ui,sans-serif">Vista lateral - helice proyectada</text>
    <line x1="${dimLx}" y1="${z0}" x2="${dimLx}" y2="${zFree}" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="4 3"/>
    <line x1="${dimLx - 4}" y1="${z0}" x2="${dimLx + 4}" y2="${z0}" stroke="#64748b"/>
    <line x1="${dimLx - 4}" y1="${zFree}" x2="${dimLx + 4}" y2="${zFree}" stroke="#64748b"/>
    <text x="${dimLx + 8}" y="${(z0 + zFree) / 2 + 4}" font-size="11" fill="#475569" font-family="Inter,system-ui,sans-serif">L0 = ${fmt(L0, 1)} mm</text>
    <path d="${dPath}" fill="none" stroke="#334155" stroke-width="${fmt(sw, 2)}" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="${xL}" y1="${dimDmY}" x2="${xR}" y2="${dimDmY}" stroke="#0f766e" stroke-width="1.2" marker-start="url(#spArrow)" marker-end="url(#spArrow)"/>
    <text x="${cx - 28}" y="${dimDmY - 8}" font-size="10" font-weight="700" fill="#0f766e" font-family="Inter,system-ui,sans-serif">Dm = ${fmt(Dm, 1)}</text>
    <line x1="${cx + amp}" y1="${zEnd + 6}" x2="${cx + amp + d * zScale * 0.5}" y2="${zEnd + 6}" stroke="#b45309" stroke-width="1.2" marker-end="url(#spArrow)"/>
    <text x="${cx + amp + 2}" y="${zEnd + 22}" font-size="10" font-weight="700" fill="#b45309" font-family="Inter,system-ui,sans-serif">d</text>
    <text x="${margin.l}" y="${h - 10}" font-size="9.5" fill="#64748b" font-family="Inter,system-ui,sans-serif">
      Simulacion: s = ${fmt(sSim, 2)} mm | L = ${fmt(L, 1)} mm | smax = ${fmt(sMax, 2)} mm
    </text>
  `;
}

function renderFsChart(svg, sMax, Fn, k, sOp) {
  if (!(svg instanceof SVGSVGElement)) return;
  const W = 360;
  const H = 120;
  const pad = { l: 36, r: 12, t: 14, b: 28 };
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  if (!Number.isFinite(sMax) || sMax <= 0 || !Number.isFinite(Fn)) {
    svg.innerHTML = `<text x="12" y="60" font-size="11" fill="#64748b" font-family="Inter,sans-serif">Sin recorrido util (revisar L0 y Ls)</text>`;
    return;
  }
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;
  const sx = (s) => pad.l + (s / sMax) * pw;
  const fy = (F) => pad.t + ph - (F / Math.max(Fn, 1e-9)) * ph;
  const x0 = sx(0);
  const x1 = sx(sMax);
  const y0 = fy(0);
  const y1 = fy(Fn);
  const hasOp = Number.isFinite(sOp) && sOp > 0 && sOp <= sMax;
  const xOp = hasOp ? sx(sOp) : null;
  const yOp = hasOp ? fy(k * sOp) : null;
  svg.innerHTML = `
    <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff" rx="6"/>
    <text x="${pad.l}" y="11" font-size="9" font-weight="700" fill="#64748b" font-family="Inter,sans-serif">F (N)</text>
    <text x="${W - 52}" y="${H - 8}" font-size="9" font-weight="700" fill="#64748b" font-family="Inter,sans-serif">s (mm)</text>
    <line x1="${pad.l}" y1="${pad.t + ph}" x2="${W - pad.r}" y2="${pad.t + ph}" stroke="#cbd5e1" stroke-width="1"/>
    <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${pad.t + ph}" stroke="#cbd5e1" stroke-width="1"/>
    <line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#0f766e" stroke-width="2.5"/>
    ${hasOp && xOp != null && yOp != null ? `<line x1="${xOp}" y1="${pad.t + ph}" x2="${xOp}" y2="${yOp}" stroke="#b45309" stroke-width="1.5" stroke-dasharray="3 2"/>` : ''}
    ${hasOp && xOp != null && yOp != null ? `<circle cx="${xOp}" cy="${yOp}" r="3.2" fill="#b45309"/>` : ''}
    <circle cx="${x1}" cy="${y1}" r="3.5" fill="#0f766e"/>
    <text x="${x1 + 4}" y="${y1 - 6}" font-size="9" fill="#0f172a" font-family="Inter,sans-serif">Fn ~ ${fmt(Fn, 0)} N</text>
    ${hasOp && xOp != null ? `<text x="${Math.min(xOp + 4, W - 70)}" y="${(yOp ?? 0) - 8}" font-size="8" fill="#b45309" font-family="Inter,sans-serif">s_op</text>` : ''}
    <text x="${pad.l}" y="${H - 10}" font-size="8.5" fill="#94a3b8" font-family="Inter,sans-serif">k = ${fmt(k, 3)} N/mm</text>
  `;
}

let simOpen = false;
let lastValid = {
  d: 4, Dm: 28, De: 32, L0: 65, n: 8, Ls: 40, sMax: 25, k: 1, Fn: 1, tau: 1, C: 7, K: 1,
};

function syncSimSlider(sMax) {
  const sl = document.getElementById('springSimSlider');
  if (!(sl instanceof HTMLInputElement)) return;
  if (!Number.isFinite(sMax) || sMax <= 0) {
    sl.max = '0';
    sl.value = '0';
    sl.disabled = true;
    return;
  }
  sl.disabled = false;
  sl.max = String(sMax);
  const v = Math.min(parseFloat(sl.value) || 0, sMax);
  sl.value = String(v);
}

function syncSpringLabTierUi() {
  const tier = document.getElementById('springLabTier') instanceof HTMLSelectElement
    ? document.getElementById('springLabTier').value
    : 'basic';
  const panel = document.getElementById('springProjectPanel');
  if (panel instanceof HTMLElement) panel.hidden = tier !== 'project';
}

function syncSpringWorkInputsUi() {
  const mode = document.getElementById('springWorkDefine') instanceof HTMLSelectElement
    ? document.getElementById('springWorkDefine').value
    : 'deflection';
  const sw = document.getElementById('springSWorkWrap');
  const fw = document.getElementById('springFWorkWrap');
  if (sw instanceof HTMLElement) sw.hidden = mode !== 'deflection';
  if (fw instanceof HTMLElement) fw.hidden = mode !== 'force';
}

function updateSimDisplay() {
  const sl = document.getElementById('springSimSlider');
  const spanF = document.getElementById('springSimF');
  const spanL = document.getElementById('springSimL');
  if (!(sl instanceof HTMLInputElement) || !spanF || !spanL) return;
  const s = parseFloat(sl.value) || 0;
  const F = lastValid.k * s;
  const L = Math.max(0, lastValid.L0 - s);
  spanF.textContent = fmt(F, 1);
  spanL.textContent = fmt(L, 2);
  renderSpringDiagram(document.getElementById('springDiagram'), {
    ...lastValid,
    sSim: s,
    sMax: lastValid.sMax,
  });
}

function endsLabel(v) {
  if (v === 'open') return 'Abiertos';
  if (v === 'closed') return 'Cerrados';
  return 'Rectificados';
}

function computeCore() {
  const purchaseMount = document.getElementById('labPurchaseSuggestions');
  const u = getLabUnitPrefs();
  const heroEl = document.getElementById('springHero');
  const elementBox = document.getElementById('springElementResults');
  const resultsBox = document.getElementById('springResults');
  const advisor = document.getElementById('springAdvisor');
  const formulaBody = document.getElementById('springFormulaBody');
  const subEl = document.getElementById('springSubstitution');

  springPdfSnapshot = { valid: false };

  const errors = [];
  const need = (r) => {
    if (!r.ok) errors.push(r.error);
    return r.ok ? r.value : NaN;
  };

  const labTier = document.getElementById('springLabTier') instanceof HTMLSelectElement
    ? document.getElementById('springLabTier').value
    : 'basic';

  let assumptionNote = '';
  if (labTier === 'project') {
    const an = document.getElementById('springAssumptionNote');
    if (an instanceof HTMLInputElement) assumptionNote = String(an.value || '').trim().slice(0, 220);
  }

  const matId = document.getElementById('springMaterial') instanceof HTMLSelectElement
    ? document.getElementById('springMaterial').value
    : 'f1430';
  const mat = MATERIALS[matId] || MATERIALS.f1430;

  const workDefine = document.getElementById('springWorkDefine') instanceof HTMLSelectElement
    ? document.getElementById('springWorkDefine').value
    : 'deflection';

  const rawSWork = document.getElementById('springSWork') instanceof HTMLInputElement
    ? document.getElementById('springSWork').value.trim()
    : '';
  const rawFWork = document.getElementById('springFWork') instanceof HTMLInputElement
    ? document.getElementById('springFWork').value.trim()
    : '';

  const d = need(readLabNumber('springDWire', 0.2, 80, 'd (mm)'));
  const diaMode = document.getElementById('springDiaMode') instanceof HTMLSelectElement
    ? document.getElementById('springDiaMode').value
    : 'dm';
  const diaIn = need(readLabNumber('springDiaValue', 0.5, 500, 'Diametro (mm)'));
  const n = need(readLabNumber('springNActive', 1, 200, 'n'));
  const L0 = need(readLabNumber('springL0', 1, 2000, 'L0 (mm)'));
  const ends = document.getElementById('springEnds') instanceof HTMLSelectElement
    ? document.getElementById('springEnds').value
    : 'ground';

  let tauAllowEff = mat.tauAllow;
  if (labTier === 'project') {
    const rawTau = document.getElementById('springTauAdmMpa') instanceof HTMLInputElement
      ? document.getElementById('springTauAdmMpa').value.trim()
      : '';
    if (rawTau !== '') {
      const tR = readLabNumber('springTauAdmMpa', 50, 1400, 'tau admisible (MPa)');
      if (!tR.ok) errors.push(tR.error);
      else tauAllowEff = tR.value;
    }
  }

  let tauWEff = NaN;
  if (labTier === 'project') {
    const rawTauW = document.getElementById('springTauW') instanceof HTMLInputElement
      ? document.getElementById('springTauW').value.trim()
      : '';
    if (rawTauW !== '') {
      const twR = readLabNumber('springTauW', 10, 2000, 'tau_W (MPa)');
      if (!twR.ok) errors.push(twR.error);
      else tauWEff = twR.value;
    }
  }

  const fMinR = readLabNumber('springFMin', 0, 1e9, 'F_min (N)');
  const Fmin = need(fMinR);

  let Dm;
  let De;
  if (diaMode === 'de') {
    De = diaIn;
    Dm = De - d;
    if (Dm <= d) errors.push('De: debe cumplirse De > 2d para un diametro medio valido.');
  } else {
    Dm = diaIn;
    De = Dm + d;
    if (Dm <= d) errors.push('Dm debe ser claramente mayor que d.');
  }

  let sOp = null;
  let Fop = null;
  if (workDefine === 'deflection' && rawSWork !== '') {
    const sR = readLabNumber('springSWork', 0, 1e6, 's_op (mm)');
    if (!sR.ok) errors.push(sR.error);
    else sOp = sR.value;
  } else if (workDefine === 'force' && rawFWork !== '') {
    const fR = readLabNumber('springFWork', 0, 1e9, 'F_op (N)');
    if (!fR.ok) errors.push(fR.error);
    else Fop = fR.value;
  }

  if (errors.length) {
    if (heroEl) heroEl.innerHTML = '';
    if (elementBox) elementBox.innerHTML = '';
    if (resultsBox) {
      resultsBox.innerHTML = `<p class="lab-small-print">${esc(errors.join('; '))}</p>`;
    }
    if (advisor) {
      advisor.innerHTML = labAlert(
        'danger',
        `<strong>Entrada no valida.</strong> ${errors.map((e) => esc(e)).join(' ')}`,
      );
    }
    if (formulaBody instanceof HTMLElement) formulaBody.innerHTML = '';
    syncSimSlider(0);
    const slErr = document.getElementById('springSimSlider');
    if (slErr instanceof HTMLInputElement) slErr.value = '0';
    renderSpringDiagram(document.getElementById('springDiagram'), {
      d: 4, Dm: 24, De: 28, L0: 60, n: 6, sSim: 0, sMax: 0,
    });
    if (subEl) subEl.innerHTML = '';
    setLabPurchaseSuggestions(purchaseMount, { rows: [] });
    return;
  }

  const C = Dm / d;
  const K = wahlK(C);
  const Ls = solidLengthMm(n, d, ends);
  const sMax = L0 - Ls;
  const G = mat.G;
  const k = (G * d ** 4) / (8 * Dm ** 3 * n);
  const Fn = sMax > 0 ? k * sMax : 0;
  const tauBlock = tauFromForce(Fn, K, Dm, d);

  if (workDefine === 'force' && Fop != null) {
    sOp = Fop / Math.max(k, 1e-12);
  }
  if (sOp != null) {
    Fop = k * sOp;
  }

  if (sOp != null && sMax > 0 && sOp - sMax > 0.001) {
    errors.push(`s_op (${fmt(sOp, 3)} mm) no puede superar s_max (${fmt(sMax, 3)} mm) hasta solido.`);
  }
  if (Fop != null && Fmin - Fop > 0.001) {
    errors.push('F_min no puede ser mayor que F_op en el ciclo.');
  }

  if (errors.length) {
    if (heroEl) heroEl.innerHTML = '';
    if (elementBox) elementBox.innerHTML = '';
    if (resultsBox) resultsBox.innerHTML = `<p class="lab-small-print">${esc(errors.join('; '))}</p>`;
    if (advisor) {
      advisor.innerHTML = labAlert(
        'danger',
        `<strong>Entrada no valida.</strong> ${errors.map((e) => esc(e)).join(' ')}`,
      );
    }
    if (formulaBody instanceof HTMLElement) formulaBody.innerHTML = '';
    syncSimSlider(Math.max(0, sMax));
    const slMid = document.getElementById('springSimSlider');
    if (slMid instanceof HTMLInputElement) slMid.value = '0';
    renderSpringDiagram(document.getElementById('springDiagram'), {
      d: 4, Dm: 24, De: 28, L0: 60, n: 6, sSim: 0, sMax: Math.max(0, sMax),
    });
    if (subEl) subEl.innerHTML = '';
    setLabPurchaseSuggestions(purchaseMount, { rows: [] });
    return;
  }

  const tauOp = Fop != null ? tauFromForce(Fop, K, Dm, d) : null;
  const tauMinCycle = tauFromForce(Fmin, K, Dm, d);
  const tauMaxCycle = tauOp != null ? tauOp : tauBlock;
  const fat = goodmanShearDocente(tauMinCycle, tauMaxCycle, tauWEff, tauAllowEff);

  const buck = bucklingDocente(L0, Dm, ends);
  const marginBuckBlock = buck.sCrMm > 0 ? buck.sCrMm - Math.max(0, sMax) : NaN;
  const marginBuckOp = sOp != null && buck.sCrMm > 0 ? buck.sCrMm - sOp : NaN;
  const bucklingFailBlock = Number.isFinite(sMax) && sMax > 0 && buck.sCrMm > 0 && sMax > buck.sCrMm * 0.99;
  const bucklingFailOp = sOp != null && buck.sCrMm > 0 && sOp > buck.sCrMm * 0.99;

  lastValid = { d, Dm, De, L0, n, Ls, sMax, k, Fn, tau: tauBlock, C, K };

  const ratioBlock = tauBlock / tauAllowEff;
  const ratioOp = tauOp != null ? tauOp / tauAllowEff : null;
  const ratioGovern = ratioOp != null ? ratioOp : ratioBlock;

  const heroItems = [];
  heroItems.push({
    label: 'k - rigidez',
    display: `${fmt(k, 3)} N/mm`,
    hint: 'k = G*d^4 / (8*Dm^3*n). G en N/mm^2; d y Dm en mm.',
  });
  if (tauOp != null && Fop != null) {
    heroItems.push({
      label: 'Servicio: F_op y tau',
      display: `${fmt(Fop, 0)} N | ${fmt(tauOp, 1)} MPa`,
      hint: `s_op = ${fmt(sOp ?? 0, 2)} mm. Comparar tau/tau_adm = ${fmt(ratioOp ?? 0, 2)}.`,
    });
  } else {
    heroItems.push({
      label: 'Servicio (opc.)',
      display: 'Indique s_op o F_op',
      hint: 'Sin servicio solo se evalua bloqueo (Fn) y pandeo respecto a s_max.',
    });
  }
  heroItems.push({
    label: 'Bloqueo: Fn y tau',
    display: `${fmt(Fn, 0)} N | ${fmt(tauBlock, 1)} MPa`,
    hint: `s_max = ${fmt(Math.max(0, sMax), 2)} mm. tau/tau_adm = ${fmt(ratioBlock, 2)}.`,
  });
  if (heroEl) heroEl.innerHTML = renderResultHero(heroItems);

  const buckNote = bucklingFailBlock || bucklingFailOp
    ? 'REVISAR PANDEO'
    : buck.w > 3.5
      ? 'Esbeltez alta: vigilar con abaco de norma.'
      : 'Dentro de modelo docente.';

  if (elementBox) {
    elementBox.innerHTML = [
      elementCardHtml('Geometria y recorrido', [
        ['d (hilo)', formatLength(d, u.length)],
        ['Dm (medio)', formatLength(Dm, u.length)],
        ['De (exterior)', formatLength(De, u.length)],
        ['n (activas)', String(n)],
        ['L0 (libre)', formatLength(L0, u.length)],
        ['Ls (solido modelo)', formatLength(Ls, u.length)],
        ['s_max (hasta solido)', formatLength(Math.max(0, sMax), u.length)],
        ['Extremos', endsLabel(ends)],
      ]),
      elementCardHtml('Material (catalogo docente)', [
        ['Material', mat.label],
        ['G', `${G} N/mm^2`],
        ['tau_adm efectiva', `${fmt(tauAllowEff, 0)} MPa`],
        ['Nota datos', mat.source],
      ]),
      elementCardHtml('Pandeo y estabilidad (docente)', [
        ['L0/Dm (esbeltez)', fmt(buck.w, 2)],
        ['s_cr estimada', formatLength(buck.sCrMm, u.length)],
        ['s_cr / L0', fmt(buck.sCrL0, 3)],
        ['Margen s_cr - s_max', Number.isFinite(marginBuckBlock) ? formatLength(marginBuckBlock, u.length) : '—'],
        ...(sOp != null
          ? [['Margen s_cr - s_op', Number.isFinite(marginBuckOp) ? formatLength(marginBuckOp, u.length) : '—']]
          : []),
        ['Estado', buckNote],
      ]),
      elementCardHtml('Servicio y fatiga', [
        ...(sOp != null
          ? [
              ['s_op', formatLength(sOp, u.length)],
              ['F_op', `${fmt(Fop ?? 0, 1)} N`],
              ['tau en servicio', `${fmt(tauOp ?? 0, 1)} MPa`],
            ]
          : [['Servicio', 'No definido (solo bloqueo)']]),
        ['F_min ciclo', `${fmt(Fmin, 1)} N`],
        ['tau_min / tau_max ciclo', `${fmt(tauMinCycle, 1)} / ${fmt(tauMaxCycle, 1)} MPa`],
        ['tau_alt = (max-min)/2', `${fmt(fat.tauA, 1)} MPa`],
        ['tau_m = (max+min)/2', `${fmt(fat.tauM, 1)} MPa`],
        ...(Number.isFinite(fat.U)
          ? [[`Goodman docente U`, `${fmt(fat.U, 2)} (<=1 deseable)`]]
          : [['Goodman docente U', labTier === 'project' ? 'Defina tau_W en proyecto' : 'Modo proyecto: tau_W opcional']]),
      ]),
    ].join('');
  }

  if (resultsBox) {
    const chartHostId = 'springChartHost';
    const metrics = [
      metricHtml('Rigidez k', `${fmt(k, 3)} N/mm`, 'Zona lineal F = k s.'),
      metricHtml('Carga bloqueo Fn', `${fmt(Fn, 0)} N`, `s_max = L0 - Ls = ${fmt(Math.max(0, sMax), 2)} mm.`),
      metricHtml('Tau bloqueo (Wahl)', `${fmt(tauBlock, 1)} MPa`, `tau/tau_adm = ${fmt(ratioBlock, 2)}.`),
    ];
    if (tauOp != null) {
      metrics.push(
        metricHtml('Tau servicio', `${fmt(tauOp, 1)} MPa`, `F_op = ${fmt(Fop ?? 0, 1)} N; ratio ${fmt(ratioOp ?? 0, 2)}.`),
      );
    }
    metrics.push(
      metricHtml('Indice C', fmt(C, 2), 'Rango habitual aprox. 4-12.'),
      metricHtml('Pandeo s_cr (docente)', formatLength(buck.sCrMm, u.length), 'Modelo abaco simplificado; valide con EN 13906 / fabricante.'),
      metricHtml('Tau alternante (ciclo)', `${fmt(fat.tauA, 1)} MPa`, 'Para Goodman si hay fluctuacion de carga.'),
    );
    if (Number.isFinite(fat.U)) {
      metrics.push(
        metricHtml('Goodman shear (docente)', fmt(fat.U, 2), 'U = tau_alt/tau_W + tau_m/tau_adm; tau_adm como limite medio simplificado.'),
      );
    }
    resultsBox.innerHTML = metrics.join('');
    const wrap = document.createElement('div');
    wrap.className = 'spring-chart-embed';
    wrap.innerHTML = `<p class="spring-chart-embed__title">Caracteristica F-s (hasta bloqueo)</p><svg id="${chartHostId}" xmlns="http://www.w3.org/2000/svg" width="100%" height="140"></svg>`;
    resultsBox.appendChild(wrap);
    renderFsChart(document.getElementById(chartHostId), Math.max(0, sMax), Fn, k, sOp);
  }

  const alertParts = [];
  alertParts.push(
    labAlert(
      'info',
      '<strong>Fuente de datos:</strong> G y tau_adm del material son orientativos; en Proyecto puede fijar tau_adm y tau_W del fabricante. Pandeo: abaco docente, no sustituye norma.',
    ),
  );

  if (sOp == null) {
    alertParts.push(
      labAlert(
        'info',
        '<strong>Servicio no definido:</strong> el semaforo principal usa el bloqueo. Indique s_op o F_op para verificar tension y pandeo en condicion real.',
      ),
    );
  }

  if (C < 4) {
    alertParts.push(
      labAlert('warn', '<strong>Indice C bajo:</strong> C = Dm/d &lt; 4 aumenta concentracion y dificulta el bobinado.'),
    );
  }
  if (C > 16) {
    alertParts.push(
      labAlert('warn', '<strong>Indice C alto:</strong> C &gt; 16 suele requerir guia y revisar pandeo lateral.'),
    );
  }

  if (bucklingFailBlock || bucklingFailOp) {
    alertParts.push(
      labAlert(
        'danger',
        `<strong>PANDEO (modelo docente):</strong> deflexion ${bucklingFailOp ? 'de servicio' : ''}${bucklingFailBlock && bucklingFailOp ? ' o ' : ''}${bucklingFailBlock ? 'hasta bloqueo' : ''} supera s_cr ~ ${fmt(buck.sCrMm, 1)} mm. Use vastago guia, divida el muelle o consulte diagrama de norma.`,
      ),
    );
  } else if (
    buck.w > 4
    && Number.isFinite(marginBuckBlock)
    && Math.min(marginBuckBlock, Number.isFinite(marginBuckOp) ? marginBuckOp : marginBuckBlock) < Math.max(sMax * 0.15, 0.5)
  ) {
    alertParts.push(
      labAlert('warn', '<strong>Margen de pandeo reducido:</strong> compruebe con abaco completo y condiciones de apoyo reales.'),
    );
  }

  const bucklingBad = bucklingFailBlock || bucklingFailOp;
  const fatigueFailHard = labTier === 'project' && Number.isFinite(fat.U) && fat.U > 1.05;

  if (sMax <= 0) {
    alertParts.push(
      labAlert(
        'danger',
        '<strong>NO APTO</strong> - L0 &lt;= Ls (geometria inconsistente). Aumente L0 o reduzca espiras / cambie extremos.',
      ),
    );
  } else if (!Number.isFinite(Fn)) {
    alertParts.push(labAlert('danger', '<strong>NO APTO</strong> - no se pudo estimar Fn; revise entradas.'));
  } else if (!bucklingBad && fatigueFailHard) {
    alertParts.push(
      labAlert(
        'danger',
        `<strong>FATIGA (Goodman docente)</strong> - U = ${fmt(fat.U, 2)} &gt; 1. Ajuste tau_W, tau_adm o la variacion de carga antes de dar por valido el diseno.`,
      ),
    );
  } else if (!bucklingBad && ratioGovern > 0.85) {
    alertParts.push(
      labAlert(
        'danger',
        `<strong>RIESGO</strong> - tau ${tauOp != null ? 'en servicio' : 'en bloqueo'} cerca o sobre tau_adm (${fmt(tauAllowEff, 0)} MPa).`,
      ),
    );
  } else if (!bucklingBad && ratioGovern > 0.55) {
    alertParts.push(
      labAlert(
        'warn',
        '<strong>ATENCION</strong> - margen reducido; vigile tolerancias, golpes y fatiga.',
      ),
    );
  } else if (!bucklingBad) {
    alertParts.push(
      labAlert(
        'ok',
        '<strong>APTO (estatico simpl.)</strong> - tau/tau_adm con margen razonable en la condicion gobernante. Valide fatiga, pandeo y fabricacion.',
      ),
    );
  }

  if (tauOp != null && ratioBlock > 0.85 && ratioOp <= 0.55) {
    alertParts.push(
      labAlert(
        'warn',
        '<strong>Sobrecarga al solido:</strong> en bloqueo tau/tau_adm es alto aunque el servicio sea moderado; evite llegar a solido en servicio.',
      ),
    );
  }

  if (labTier === 'project' && Number.isFinite(fat.U) && fat.U > 0.85 && fat.U <= 1.05) {
    alertParts.push(
      labAlert('warn', `<strong>Fatiga:</strong> U = ${fmt(fat.U, 2)}; margen bajo respecto a tau_W y tau_adm simplificados.`),
    );
  }

  if (advisor) advisor.innerHTML = alertParts.join('');

  const formulaLines = [
    `C = Dm/d = ${fmt(C, 3)}; K (Wahl) = ${fmt(K, 4)}`,
    `k = G*d^4/(8*Dm^3*n); tau(F) = K*8*F*Dm/(pi*d^3) MPa`,
    `Fn = k*s_max; s_max = L0 - Ls; Ls modelo docente por extremos`,
    `Pandeo docente: s_cr/L0 = f(L0/Dm, apoyo); comparar con s_op y s_max`,
  ];
  if (tauOp != null) {
    formulaLines.push(`Servicio: F_op = k*s_op = ${fmt(Fop ?? 0, 1)} N; tau_op = ${fmt(tauOp, 1)} MPa`);
  }
  if (Number.isFinite(fat.U)) {
    formulaLines.push(`Goodman docente: U = tau_alt/tau_W + tau_m/tau_adm = ${fmt(fat.U, 3)}`);
  }
  if (labTier === 'project') {
    formulaLines.push('Proyecto: tau_adm y tau_W manuales opcionales; nota en PDF.');
  }

  if (formulaBody instanceof HTMLElement) {
    formulaBody.innerHTML = `
      <p class="lab-fluid-formulas__lead">${labTier === 'project' ? 'Modo proyecto: limites manuales y fatiga opcional.' : 'Modo aula: limites del catalogo docente del material.'}</p>
      ${assumptionNote ? `<p class="lab-fluid-formulas__sub"><strong>Nota:</strong> ${escHtml(assumptionNote)}</p>` : ''}
      <ol class="lab-fluid-formulas__list">${formulaLines.map((x) => `<li>${x}</li>`).join('')}</ol>
      <p class="lab-fluid-formulas__sub">De = Dm + d. Referencia conceptual DIN 2089 / EN 13906; no es certificacion.</p>
    `;
  }

  if (subEl && Number.isFinite(k) && k > 0) {
    const sEx = sOp ?? (Math.min(Math.max(0, sMax), Math.max(0.1, sMax)) || 1);
    const fEx = k * sEx;
    subEl.innerHTML = `
      <details class="calc-substitution">
        <summary class="calc-substitution__summary">
          <span class="calc-substitution__title">Sustitucion - ley lineal F = k s</span>
        </summary>
        <div class="calc-substitution__inner">
          <p class="calc-substitution__step">Con <strong>k = ${fmt(k, 3)} N/mm</strong>.</p>
          <p class="calc-substitution__step">${sOp != null ? `Servicio: <code>s_op = ${fmt(sOp, 2)} mm</code> &rArr; <code>F_op = ${fmt(k, 3)} &times; ${fmt(sOp, 2)} = ${fmt(Fop ?? 0, 1)} N</code>.` : `Ejemplo: <code>s = ${fmt(sEx, 2)} mm</code> &rArr; <code>F = ${fmt(fEx, 1)} N</code>.`}</p>
          <p class="calc-substitution__step">Bloqueo: <code>s_max &approx; ${fmt(Math.max(0, sMax), 2)} mm</code>, <code>F_n &approx; ${fmt(Fn, 0)} N</code>.</p>
        </div>
      </details>`;
  } else if (subEl) subEl.innerHTML = '';

  renderSpringDiagram(document.getElementById('springDiagram'), {
    ...lastValid,
    sSim: parseFloat(document.getElementById('springSimSlider')?.value) || 0,
    sMax: lastValid.sMax,
  });
  syncSimSlider(Math.max(0, sMax));
  updateSimDisplay();

  const langPdf = getCurrentLang();
  const ts = formatDateTimeLocale(new Date(), langPdf);
  let vTextShort = 'APTO';
  if (sMax <= 0 || !Number.isFinite(Fn)) vTextShort = 'NO APTO';
  else if (bucklingFailBlock || bucklingFailOp) vTextShort = 'PANDEO';
  else if (labTier === 'project' && Number.isFinite(fat.U) && fat.U > 1.05) vTextShort = 'FATIGA';
  else if (ratioGovern > 0.85) vTextShort = 'RIESGO';
  else if (ratioGovern > 0.55) vTextShort = 'ATENCION';

  const assumptions = [
    `Material: ${mat.label}, G = ${G} N/mm^2.`,
    `tau_adm efectiva = ${fmt(tauAllowEff, 0)} MPa (catalogo o manual).`,
    `Ls y s_cr: modelos docente; validar con norma y fabricante.`,
    `Pandeo: s_cr ~ ${fmt(buck.sCrMm, 1)} mm (L0/Dm = ${fmt(buck.w, 2)}).`,
  ];
  if (Number.isFinite(tauWEff)) assumptions.push(`tau_W (fatiga) = ${fmt(tauWEff, 0)} MPa.`);
  if (assumptionNote) assumptions.push(`Nota: ${assumptionNote}`);

  springPdfSnapshot = {
    valid: true,
    title: langPdf === 'en' ? 'Report - Helical compression spring' : 'Informe - Muelle helicoidal compresion',
    fileBase: `${langPdf === 'en' ? 'report-compression-spring' : 'informe-muelle-compresion'}-${new Date().toISOString().slice(0, 10)}`,
    timestamp: ts,
    tierLabel: labTier === 'project' ? (langPdf === 'en' ? 'Mode: Project' : 'Modo: Proyecto') : (langPdf === 'en' ? 'Mode: Classroom' : 'Modo: Aula'),
    kpis: [
      { title: 'k', value: `${fmt(k, 3)} N/mm`, subtitle: '' },
      { title: 'Fn', value: `${fmt(Fn, 0)} N`, subtitle: `s_max ${fmt(sMax, 2)} mm` },
      { title: tauOp != null ? 'F_op' : 'Servicio', value: tauOp != null ? `${fmt(Fop ?? 0, 0)} N` : 'N/A', subtitle: tauOp != null ? `${fmt(tauOp, 1)} MPa` : 'definir s_op' },
      { title: 'Veredicto', value: vTextShort, subtitle: bucklingFailBlock || bucklingFailOp ? 'pandeo' : 'simplif.' },
    ],
    inputRows: [
      { label: 'tier', value: labTier },
      { label: 'material', value: matId },
      { label: 'd', value: `${fmt(d, 2)} mm` },
      { label: 'Dm', value: `${fmt(Dm, 2)} mm` },
      { label: 'n', value: String(n) },
      { label: 'L0', value: `${fmt(L0, 1)} mm` },
      { label: 'ends', value: ends },
      { label: 's_op', value: sOp != null ? `${fmt(sOp, 2)} mm` : '-' },
      { label: 'F_min', value: `${fmt(Fmin, 1)} N` },
    ],
    resultRows: [
      { label: 'Ls', value: `${fmt(Ls, 2)} mm` },
      { label: 's_cr pandeo', value: `${fmt(buck.sCrMm, 2)} mm` },
      { label: 'tau bloqueo', value: `${fmt(tauBlock, 1)} MPa` },
      { label: 'tau/tau_adm (gov.)', value: fmt(ratioGovern, 2) },
      ...(Number.isFinite(fat.U) ? [{ label: 'Goodman U', value: fmt(fat.U, 2) }] : []),
    ],
    formulaLines,
    assumptions,
    verdict: vTextShort,
    disclaimer: langPdf === 'en'
      ? 'Educational models for geometry, buckling and fatigue; validate with EN/DIN and supplier.'
      : 'Modelos docente (geometria, pandeo, fatiga); validar con EN/DIN y fabricante.',
  };

  const wireQuery =
    matId === 'aisi302'
      ? 'alambre acero inoxidable resorte'
      : matId === 'piano'
        ? 'alambre piano music wire resorte'
        : 'alambre acero resortes CrSi';
  setLabPurchaseSuggestions(purchaseMount, {
    title: 'Compras orientativas (resorte)',
    rows: [
      {
        label: 'Resorte compresion (busqueda aproximada)',
        searchQuery: `muelle compresi—n resorte helicoidal alambre ${fmt(d, 1)} mm exterior ${fmt(De, 0)} mm`,
      },
      { label: 'Material hilo', searchQuery: wireQuery },
      { label: 'Instrumentos', searchQuery: 'medidor resorte compresion calibre muelle' },
    ],
  });
}

const resultsWrap = document.getElementById('springResultsWrap');
const debounced = debounce(() => runCalcWithIndustrialFeedback(resultsWrap, computeCore), 55);

injectLabUnitConverterIfNeeded();
mountLabUnitConverter();
mountCompactLabFieldHelp();
syncSpringLabTierUi();
syncSpringWorkInputsUi();
bindLabUnitSelectors(debounced);

const listenIds = [
  'springLabTier', 'springTauAdmMpa', 'springTauW', 'springAssumptionNote',
  'springMaterial', 'springDWire', 'springDiaMode', 'springDiaValue', 'springNActive', 'springL0', 'springEnds',
  'springWorkDefine', 'springSWork', 'springFWork', 'springFMin',
];

listenIds.forEach((id) => {
  document.getElementById(id)?.addEventListener('input', () => {
    if (id === 'springLabTier') syncSpringLabTierUi();
    if (id === 'springWorkDefine') syncSpringWorkInputsUi();
    debounced();
  });
  document.getElementById(id)?.addEventListener('change', () => {
    if (id === 'springLabTier') syncSpringLabTierUi();
    if (id === 'springWorkDefine') syncSpringWorkInputsUi();
    debounced();
  });
});

document.getElementById('springSimSlider')?.addEventListener('input', updateSimDisplay);

document.getElementById('springSimToggle')?.addEventListener('click', () => {
  simOpen = !simOpen;
  const body = document.getElementById('springSimBody');
  const btn = document.getElementById('springSimToggle');
  if (body instanceof HTMLElement) body.hidden = !simOpen;
  if (btn instanceof HTMLButtonElement) {
    btn.textContent = simOpen ? 'Cerrar simulacion' : 'Simular compresion';
    btn.setAttribute('aria-expanded', simOpen ? 'true' : 'false');
  }
  if (simOpen) updateSimDisplay();
});

runCalcWithIndustrialFeedback(resultsWrap, computeCore);

mountLabFluidPdfExportBar(document.getElementById('labFluidPdfMountSpring'), {
  getPayload: () => springPdfSnapshot,
  getDiagramElements: () => {
    const a = document.getElementById('springDiagram');
    const b = document.querySelector('#springChartHost');
    return [a, b].filter((el) => el instanceof SVGSVGElement);
  },
});
