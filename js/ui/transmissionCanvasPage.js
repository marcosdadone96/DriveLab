/**
 * Lienzo técnico Pro — pestañas, vista filtrada, zoom/pan, arrastre con umbral en modo correa/cadena.
 */

import {
  createInitialState,
  addNode,
  removeNode,
  setMotor,
  snapGearToPeer,
  getNodeD_mm,
  outerTangentSegment,
  innerTangentSegment,
  propagateKinematics,
  computeVerdicts,
  buildOpenBeltPath2D,
  buildOrderedBeltPath2D,
  nearestCommercialVBeltLength,
  VERDICT,
} from '../lab/transmissionCanvasEngine.js';
import { CHAIN_CATALOG, chainAssemblyHints, getChainById } from '../lab/chainCatalog.js';
import { filterChainCatalogRows } from '../data/commerceCatalog.js';

/** @type {'gears'|'belts'|'chains'} */
let activeTab = 'gears';
/** @type {import('../lab/transmissionCanvasEngine.js').TxState} */
let state = createInitialState();
let mode = /** @type {'none'|'belt'|'chain'} */ ('none');
let drag = /** @type {{ id: number; ox: number; oy: number; px: number; py: number } | null} */ (null); // ox,oy en coords SVG
/** Clic corto vs arrastre: hasta DRAG_PX no se inicia drag */
let pending = /** @type {{ id: number; px: number; py: number; sx: number; sy: number } | null} */ (null);
const DRAG_PX = 10;
let manualBeltTrace = false;
let manualHoverPulleyId = null;
let manualCursor = { x: 0, y: 0 };
/** @type {Array<-1|1>} */
let manualEdgeSigns = [];

const BASE_W = 2400;
const BASE_H = 1400;
let viewPanZoom = { cx: BASE_W / 2, cy: BASE_H / 2, zoom: 1 };
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 5;

let lastT = performance.now();
let propsDirty = true;
const crossedPulleyIds = new Set();
let openContextMenu = null;

const svg = document.getElementById('txSvg');
const svgWrap = document.getElementById('txSvgWrap');
const hudFormulas = document.getElementById('txFormulas');
const hudVerdict = document.getElementById('txVerdict');
const hudInputChecks = document.getElementById('txInputChecks');
const hudElements = document.getElementById('txElementResults');
const hudRuns = document.getElementById('txRunResults');
const hudPick = document.getElementById('txPickHint');
const hudPickChain = document.getElementById('txPickHintChain');
const inpN = document.getElementById('txN0');
const inpT = document.getElementById('txT0');
const beltModeBtn = document.getElementById('txBeltMode');
const chainModeBtn = document.getElementById('txChainMode');
const finishBeltBtn = document.getElementById('txFinishBelt');
const finishChainBtn = document.getElementById('txFinishChain');
const finishSyncBtn = document.getElementById('txFinishSync');
const motorBtn = document.getElementById('txMarkMotor');
const propsPanel = document.getElementById('txProps');
const zoomLabel = document.getElementById('txZoomLabel');

function closeContextMenu() {
  if (openContextMenu && openContextMenu.parentElement) openContextMenu.remove();
  openContextMenu = null;
}

function outerTangentsPair(a, ra, b, rb) {
  const tPos = outerTangentSegment(a, ra, b, rb, +1);
  const tNeg = outerTangentSegment(a, ra, b, rb, -1);
  return [tPos, tNeg].filter(Boolean);
}

function chooseSignBetweenPulleys(aNode, bNode, cursorPt) {
  const ra = getNodeD_mm(aNode) / 2;
  const rb = getNodeD_mm(bNode) / 2;
  const cands = [
    { sign: 1, t: outerTangentSegment({ x: aNode.x, y: aNode.y }, ra, { x: bNode.x, y: bNode.y }, rb, +1) },
    { sign: -1, t: outerTangentSegment({ x: aNode.x, y: aNode.y }, ra, { x: bNode.x, y: bNode.y }, rb, -1) },
  ].filter((x) => x.t);
  if (!cands.length) return 1;
  let best = cands[0];
  let bd = Infinity;
  for (const c of cands) {
    const mx = (c.t.p0.x + c.t.p1.x) / 2;
    const my = (c.t.p0.y + c.t.p1.y) / 2;
    const d = Math.hypot(cursorPt.x - mx, cursorPt.y - my);
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  return best.sign;
}

function manualTangentGuide() {
  if (activeTab !== 'belts' || !manualBeltTrace) return null;
  const picks = state.beltPickOrder || [];
  if (!picks.length || !manualHoverPulleyId) return null;
  const lastId = picks[picks.length - 1];
  if (lastId === manualHoverPulleyId) return null;
  const a = state.nodes.find((n) => n.id === lastId && n.kind === 'pulley');
  const b = state.nodes.find((n) => n.id === manualHoverPulleyId && n.kind === 'pulley');
  if (!a || !b) return null;
  const ra = getNodeD_mm(a) / 2;
  const rb = getNodeD_mm(b) / 2;
  const cands = outerTangentsPair({ x: a.x, y: a.y }, ra, { x: b.x, y: b.y }, rb);
  if (!cands.length) return null;
  let best = cands[0];
  let bd = Infinity;
  for (const c of cands) {
    const mx = (c.p0.x + c.p1.x) / 2;
    const my = (c.p0.y + c.p1.y) / 2;
    const d = Math.hypot(manualCursor.x - mx, manualCursor.y - my);
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  return { a, b, best, cands };
}

function showNodeContextMenu(node, clientX, clientY) {
  closeContextMenu();
  const menu = document.createElement('div');
  menu.className = 'tx-node-menu';
  menu.style.left = `${clientX}px`;
  menu.style.top = `${clientY}px`;
  menu.innerHTML = `
    <button type="button" class="tx-node-menu__btn" data-tx-menu="motor" title="Marcar como motriz">⚙</button>
    <button type="button" class="tx-node-menu__btn" data-tx-menu="idler" title="Convertir en tensora">◎</button>
    <button type="button" class="tx-node-menu__btn tx-node-menu__btn--danger" data-tx-menu="delete" title="Eliminar">🗑</button>
  `;
  document.body.appendChild(menu);
  openContextMenu = menu;
  menu.querySelector('[data-tx-menu="motor"]')?.addEventListener('click', () => {
    setMotor(state, node.id);
    propsDirty = true;
    closeContextMenu();
  });
  menu.querySelector('[data-tx-menu="idler"]')?.addEventListener('click', () => {
    if (node.kind === 'pulley') {
      node.pulleyRole = 'idler';
      node.isExternal = true;
      node.idlerWrapSide = 'outside';
      propsDirty = true;
    }
    closeContextMenu();
  });
  menu.querySelector('[data-tx-menu="delete"]')?.addEventListener('click', () => {
    removeNode(state, node.id);
    propsDirty = true;
    closeContextMenu();
  });
}

function readMotorInputs() {
  const n = inpN instanceof HTMLInputElement ? parseFloat(inpN.value) : 1455;
  const T = inpT instanceof HTMLInputElement ? parseFloat(inpT.value) : 25;
  return {
    n: Number.isFinite(n) && n > 0 ? n : 1455,
    T: Number.isFinite(T) && T > 0 ? T : 25,
  };
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function num(v, d = 2) {
  return Number.isFinite(v) ? Number(v).toFixed(d) : '--';
}

function helpTip(text) {
  return `<span class="lab-help-hover lab-help-hover--field">
    <button type="button" class="lab-help-hover__btn" aria-label="Ayuda">?</button>
    <span class="lab-help-hover__tip">${esc(text)}</span>
  </span>`;
}

function renderInputChecks(kin) {
  if (!hudInputChecks) return;
  const { n, T } = readMotorInputs();
  /** @type {Array<{level:'ok'|'warn'|'err', text:string}>} */
  const issues = [];
  if (!(Number.isFinite(n) && n > 0)) issues.push({ level: 'err', text: 'n motor inválida: use un valor mayor que 0 rpm.' });
  if (!(Number.isFinite(T) && T > 0)) issues.push({ level: 'err', text: 'T motor inválido: use un valor mayor que 0 N*m.' });
  if (!state.nodes.length) issues.push({ level: 'warn', text: 'No hay elementos en el lienzo.' });
  if (state.nodes.length > 0 && !state.nodes.some((x) => x.isMotor)) issues.push({ level: 'warn', text: 'Marque un elemento como motor para propagar resultados.' });
  if (state.nodes.length > 0 && !Object.keys(kin.byId || {}).length) issues.push({ level: 'err', text: 'No se puede resolver la cinemática: revise conexiones y datos.' });
  if (!issues.length) issues.push({ level: 'ok', text: 'Entradas coherentes. Modelo calculado correctamente.' });
  hudInputChecks.innerHTML = issues.map((x) => `<div class="tx-check tx-check--${x.level}">${esc(x.text)}</div>`).join('');
}

function renderElementColumns(kin) {
  if (!hudElements) return;
  const vis = state.nodes
    .filter((n) => kindVisibleInTab(n.kind))
    .sort((a, b) => (a.isMotor === b.isMotor ? a.id - b.id : a.isMotor ? -1 : 1));
  if (!vis.length) {
    hudElements.innerHTML = '<div class="tx-check tx-check--warn">Sin elementos para mostrar.</div>';
    return;
  }
  const kindLabel = { gear: 'Rueda', pulley: 'Polea', sprocket: 'Piñón' };
  const motorN = readMotorInputs().n;
  hudElements.innerHTML = vis
    .map((n, idx) => {
      const k = kin.byId?.[n.id] ?? kin.byId?.[String(n.id)];
      const hasKin = !!k && Number.isFinite(k.n_rpm) && Number.isFinite(k.T_Nm);
      const rpm = hasKin ? Math.abs(k.n_rpm).toFixed(1) : '--';
      const torque = hasKin ? k.T_Nm.toFixed(2) : '--';
      const ratio =
        hasKin && Math.abs(k.n_rpm) > 1e-9 && Number.isFinite(motorN) && motorN > 0
          ? (Math.abs(motorN / k.n_rpm)).toFixed(3)
          : '--';
      const dim =
        n.kind === 'pulley'
          ? `${Math.round(getNodeD_mm(n))} mm${
              n.pulleyRole === 'idler' ? ' · tensora' : n.pulleyRole === 'drive' ? ' · motriz' : ''
            }`
          : `z${n.z ?? '--'}`;
      return `<article class="tx-element-card ${n.isMotor ? 'tx-element-card--motor' : ''} ${hasKin ? '' : 'tx-element-card--muted'}">
        <div class="tx-element-card__title">${kindLabel[n.kind]} ${idx + 1}${n.isMotor ? '<span class="tx-element-card__badge">Motor</span>' : ''}</div>
        <dl class="tx-element-card__kv">
          <dt>Elemento</dt><dd>${dim}</dd>
          <dt>rpm</dt><dd>${rpm}</dd>
          <dt>T (N*m)</dt><dd>${torque}</dd>
          <dt>i total</dt><dd>${ratio}</dd>
        </dl>
      </article>`;
    })
    .join('');
}

function renderRunResults() {
  if (!hudRuns) return;
  crossedPulleyIds.clear();
  if (activeTab === 'belts') {
    if (!state.beltRuns.length) {
      hudRuns.innerHTML = '<div class="tx-check tx-check--warn">Sin correas cerradas. Use "Cerrar correa".</div>';
      return;
    }
    hudRuns.innerHTML = state.beltRuns
      .map((br) => {
        const s = computeBeltRunSummary(br);
        if (!s.geo.reliable || !s.geo.pathD) br.nodeIds.forEach((id) => crossedPulleyIds.add(id));
        const txtKind = br.kind === 'sync' ? 'sincrona' : 'V';
        const idlerTxt = s.idlerCount > 0 ? ` · tensoras: ${s.idlerCount}` : '';
        const wrapModes = br.nodeIds
          .map((id) => state.nodes.find((n) => n.id === id))
          .filter((n) => n?.kind === 'pulley' && n.pulleyRole === 'idler')
          .map((n) => `${n.id}: ${n.idlerWrapSide === 'inside' ? 'interior' : 'exterior'}`);
        const comm = br.kind === 'v' && s.comm ? `${s.comm.L_nom.toFixed(0)} mm (${s.comm.ok ? 'OK' : `Δ ${s.comm.delta_mm.toFixed(1)} mm`})` : 'n/a';
        return `<div class="tx-check tx-check--ok">
          <strong>Correa ${esc(br.id)}</strong> (${txtKind}${idlerTxt})<br/>
          L geom: <strong>${s.geo.length_mm.toFixed(1)} mm</strong> · L efectiva: <strong>${s.Leff.toFixed(1)} mm</strong><br/>
          ${wrapModes.length ? `Tensora contacto: <strong>${esc(wrapModes.join(' · '))}</strong><br/>` : ''}
          Comercial demo: <strong>${comm}</strong>
        </div>`;
      })
      .join('');
    return;
  }
  if (activeTab === 'chains') {
    if (!state.chainRuns.length) {
      hudRuns.innerHTML = '<div class="tx-check tx-check--warn">Sin cadenas cerradas. Use "Cerrar cadena".</div>';
      return;
    }
    hudRuns.innerHTML = state.chainRuns
      .map((cr) => {
        const s = computeChainRunSummary(cr);
        return `<div class="tx-check tx-check--ok">
          <strong>Cadena ${esc(cr.id)}</strong><br/>
          Longitud total: <strong>${s.geo.length_mm.toFixed(1)} mm</strong> · pasos: <strong>${s.Lp.toFixed(2)}</strong><br/>
          Cierre recomendado: <strong>${s.hints.Lp_round_up}</strong> pasos
        </div>`;
      })
      .join('');
    return;
  }
  hudRuns.innerHTML = '<div class="tx-check tx-check--warn">Cambie a Poleas/correas o Piñones/cadenas para ver longitudes.</div>';
}

function pointInPolygon(pt, poly) {
  if (!poly || poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / ((yj - yi) || 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function closestPointOnSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const vv = vx * vx + vy * vy;
  if (vv < 1e-9) return { x: ax, y: ay, t: 0 };
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / vv));
  return { x: ax + t * vx, y: ay + t * vy, t };
}

function attachPulleyAsIdlerToRun(nodeId, runId) {
  const node = state.nodes.find((n) => n.id === nodeId && n.kind === 'pulley');
  const run = state.beltRuns.find((r) => r.id === runId);
  if (!node || !run) return;
  /* Mantener el lazo existente: no reordenar poleas ya conectadas. */
  const baseIds = run.nodeIds.filter((id) => id !== nodeId);
  if (baseIds.length < 2) {
    run.nodeIds = [...baseIds, nodeId];
    node.pulleyRole = 'idler';
    node.idlerWrapSide = 'outside';
    node.isExternal = true;
    return;
  }

  node.pulleyRole = 'idler';
  // Regla práctica: al aplicar como tensora, usar contacto dorsal (exterior) por defecto
  // para que solo empuje el tramo y no envuelva gran parte de la polea.
  node.idlerWrapSide = node.idlerWrapSide === 'inside' ? 'inside' : 'outside';
  node.isExternal = node.idlerWrapSide === 'outside';

  // Insertar en el tramo más cercano del lazo ACTUAL.
  let best = { idx: 0, d: Infinity };
  for (let i = 0; i < baseIds.length; i++) {
    const a = state.nodes.find((n) => n.id === baseIds[i]);
    const b = state.nodes.find((n) => n.id === baseIds[(i + 1) % baseIds.length]);
    if (!a || !b) continue;
    const foot = closestPointOnSegment(node.x, node.y, a.x, a.y, b.x, b.y);
    const d = Math.hypot(node.x - foot.x, node.y - foot.y);
    if (d < best.d) {
      best = { idx: i + 1, d };
    }
  }

  /* No mover poleas automáticamente: el usuario define posición.
     Solo insertar la tensora en el tramo más cercano para contacto tangencial del trazado. */
  const idsWithIdler = [...baseIds];
  idsWithIdler.splice(Math.max(0, Math.min(idsWithIdler.length, best.idx)), 0, nodeId);
  run.nodeIds = idsWithIdler;

  // Fijar tangencias locales para que la tensora solo "empuje" el tramo A-B original.
  const signMap = new Map();
  const oldSigns = Array.isArray(run.edgeSigns) ? run.edgeSigns : [];
  for (let i = 0; i < baseIds.length; i++) {
    const a = baseIds[i];
    const b = baseIds[(i + 1) % baseIds.length];
    const s = oldSigns[i];
    if (s === 1 || s === -1) signMap.set(`${a}>${b}`, s);
  }
  /** @type {Array<-1|1|null>} */
  const newSigns = Array.from({ length: idsWithIdler.length }, () => null);
  for (let i = 0; i < idsWithIdler.length; i++) {
    const a = idsWithIdler[i];
    const b = idsWithIdler[(i + 1) % idsWithIdler.length];
    const key = `${a}>${b}`;
    if (signMap.has(key)) newSigns[i] = signMap.get(key) || null;
  }

  const idxI = idsWithIdler.indexOf(nodeId);
  const idA = idsWithIdler[(idxI - 1 + idsWithIdler.length) % idsWithIdler.length];
  const idB = idsWithIdler[(idxI + 1) % idsWithIdler.length];
  const nA = state.nodes.find((n) => n.id === idA && n.kind === 'pulley');
  const nI = state.nodes.find((n) => n.id === nodeId && n.kind === 'pulley');
  const nB = state.nodes.find((n) => n.id === idB && n.kind === 'pulley');
  if (nA && nI && nB) {
    const centers = idsWithIdler
      .map((id) => state.nodes.find((n) => n.id === id))
      .filter(Boolean)
      .map((n) => ({ x: n.x, y: n.y }));
    const centroid = centers.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    centroid.x /= Math.max(1, centers.length);
    centroid.y /= Math.max(1, centers.length);
    const toCentroid = { x: centroid.x - nI.x, y: centroid.y - nI.y };

    const rA = getNodeD_mm(nA) / 2;
    const rI = getNodeD_mm(nI) / 2;
    const rB = getNodeD_mm(nB) / 2;
    const isExt = (n) => n?.kind === 'pulley' && n.pulleyRole === 'idler' && (n.isExternal === true || n.idlerWrapSide === 'outside');
    const tanFnAI = isExt(nA) !== isExt(nI) ? innerTangentSegment : outerTangentSegment;
    const tanFnIB = isExt(nI) !== isExt(nB) ? innerTangentSegment : outerTangentSegment;

    let bestPair = { s1: 1, s2: 1, score: -Infinity };
    for (const s1 of [1, -1]) {
      for (const s2 of [1, -1]) {
        const tAI = tanFnAI({ x: nA.x, y: nA.y }, rA, { x: nI.x, y: nI.y }, rI, s1);
        const tIB = tanFnIB({ x: nI.x, y: nI.y }, rI, { x: nB.x, y: nB.y }, rB, s2);
        if (!tAI || !tIB) continue;
        const vIn = { x: tAI.p1.x - nI.x, y: tAI.p1.y - nI.y };
        const vOut = { x: tIB.p0.x - nI.x, y: tIB.p0.y - nI.y };
        const score = vIn.x * toCentroid.x + vIn.y * toCentroid.y + vOut.x * toCentroid.x + vOut.y * toCentroid.y;
        if (score > bestPair.score) bestPair = { s1, s2, score };
      }
    }
    newSigns[(idxI - 1 + idsWithIdler.length) % idsWithIdler.length] = /** @type {-1|1} */ (bestPair.s1);
    newSigns[idxI] = /** @type {-1|1} */ (bestPair.s2);
  }
  run.edgeSigns = newSigns;

  // Tensora dorsal: debe apoyar sobre la correa base (sin rehacer el lazo).
  if (node.idlerWrapSide === 'outside') {
    let bestSeg = null;
    let bestD = Infinity;
    for (let i = 0; i < baseIds.length; i++) {
      const a = state.nodes.find((n) => n.id === baseIds[i] && n.kind === 'pulley');
      const b = state.nodes.find((n) => n.id === baseIds[(i + 1) % baseIds.length] && n.kind === 'pulley');
      if (!a || !b) continue;
      const foot = closestPointOnSegment(node.x, node.y, a.x, a.y, b.x, b.y);
      const d = Math.hypot(node.x - foot.x, node.y - foot.y);
      if (d < bestD) {
        bestD = d;
        bestSeg = { a, b, foot };
      }
    }
    if (bestSeg) {
      const dx = bestSeg.b.x - bestSeg.a.x;
      const dy = bestSeg.b.y - bestSeg.a.y;
      const L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L;
      const ny = dx / L;
      const baseCenters = centersForNodeIds(baseIds) || [];
      const centroid = baseCenters.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
      centroid.x /= Math.max(1, baseCenters.length);
      centroid.y /= Math.max(1, baseCenters.length);
      const toCenterX = centroid.x - bestSeg.foot.x;
      const toCenterY = centroid.y - bestSeg.foot.y;
      const side = nx * toCenterX + ny * toCenterY > 0 ? 1 : -1;
      const r = getNodeD_mm(node) / 2;
      node.x = bestSeg.foot.x + nx * side * r;
      node.y = bestSeg.foot.y + ny * side * r;
    }
  }
}

function kindVisibleInTab(kind) {
  if (activeTab === 'gears') return kind === 'gear';
  if (activeTab === 'belts') return kind === 'pulley';
  return kind === 'sprocket';
}

function selectedMatchesTab() {
  const node = state.nodes.find((n) => n.id === state.selectedId);
  if (!node) return false;
  return kindVisibleInTab(node.kind);
}

function clearGearsWorkspace() {
  const ids = state.nodes.filter((n) => n.kind === 'gear').map((n) => n.id);
  state.nodes = state.nodes.filter((n) => n.kind !== 'gear');
  state.meshes = [];
  if (state.selectedId != null && ids.includes(state.selectedId)) state.selectedId = null;
  propsDirty = true;
}

function clearBeltsWorkspace() {
  const ids = state.nodes.filter((n) => n.kind === 'pulley').map((n) => n.id);
  state.nodes = state.nodes.filter((n) => n.kind !== 'pulley');
  state.beltRuns = [];
  mode = 'none';
  beltModeBtn?.classList.remove('tx-btn--active');
  if (state.selectedId != null && ids.includes(state.selectedId)) state.selectedId = null;
  propsDirty = true;
}

function clearChainsWorkspace() {
  const ids = state.nodes.filter((n) => n.kind === 'sprocket').map((n) => n.id);
  state.nodes = state.nodes.filter((n) => n.kind !== 'sprocket');
  state.chainRuns = [];
  mode = 'none';
  chainModeBtn?.classList.remove('tx-btn--active');
  if (state.selectedId != null && ids.includes(state.selectedId)) state.selectedId = null;
  propsDirty = true;
}

function spawnXY(kind) {
  const same = state.nodes.filter((n) => n.kind === kind).length;
  const col = same % 6;
  const row = Math.floor(same / 6);
  return {
    x: viewPanZoom.cx + col * 90 - 200,
    y: viewPanZoom.cy + row * 100 - 80,
  };
}

/** Coordenadas en espacio del lienzo (unidades SVG) — coherente con viewBox y zoom. */
function clientToSvg(ev) {
  if (!(svg instanceof SVGSVGElement)) return { x: 0, y: 0 };
  const r = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  const rw = Math.max(1e-6, r.width);
  const rh = Math.max(1e-6, r.height);
  return {
    x: vb.x + ((ev.clientX - r.left) / rw) * vb.width,
    y: vb.y + ((ev.clientY - r.top) / rh) * vb.height,
  };
}

function updateZoomLabel() {
  if (zoomLabel) zoomLabel.textContent = `${Math.round(viewPanZoom.zoom * 100)}%`;
}

function clampViewCenter() {
  const m = 200;
  viewPanZoom.cx = Math.min(BASE_W - m, Math.max(m, viewPanZoom.cx));
  viewPanZoom.cy = Math.min(BASE_H - m, Math.max(m, viewPanZoom.cy));
}

function fitViewToContent() {
  const vis = state.nodes.filter((n) => kindVisibleInTab(n.kind));
  if (!vis.length) {
    viewPanZoom = { cx: BASE_W / 2, cy: BASE_H / 2, zoom: 1 };
    updateZoomLabel();
    return;
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of vis) {
    const r = getNodeD_mm(n) / 2 + 40;
    minX = Math.min(minX, n.x - r);
    maxX = Math.max(maxX, n.x + r);
    minY = Math.min(minY, n.y - r);
    maxY = Math.max(maxY, n.y + r);
  }
  const pad = 120;
  const w = maxX - minX + pad * 2;
  const h = maxY - minY + pad * 2;
  viewPanZoom.cx = (minX + maxX) / 2;
  viewPanZoom.cy = (minY + maxY) / 2;
  viewPanZoom.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.min(BASE_W / w, BASE_H / h)));
  clampViewCenter();
  updateZoomLabel();
}

function updateHud(kin, verdict) {
  if (hudFormulas) {
    hudFormulas.innerHTML = kin.formulas.length
      ? `<ul class="tx-formula-list">${kin.formulas.map((f) => `<li>${esc(f).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>`).join('')}</ul>`
      : '<p class="tx-muted">Sin fórmulas hasta definir motor y enlaces.</p>';
  }

  if (hudVerdict) {
    const cls =
      verdict.worst === VERDICT.ERR ? 'tx-verdict-strip--err' : verdict.worst === VERDICT.WARN ? 'tx-verdict-strip--warn' : 'tx-verdict-strip--ok';
    hudVerdict.className = `tx-verdict-strip ${cls}`;
    const hasCross = verdict.items.some((it) => /correa|cruce|tangenc|trazado/i.test(it.text));
    hudVerdict.innerHTML = `
      <div class="tx-badge-row">
        ${verdict.items
          .map((it) => `<span class="tx-state-badge tx-state-badge--${it.level}">${esc(it.level.toUpperCase())}</span>`)
          .join('')}
      </div>
      ${hasCross ? '<button type="button" class="lab-btn tx-btn--secondary" data-tx-auto-correct="1">Auto-corregir tangentes</button>' : ''}
      ${verdict.items.map((it) => `<p class="tx-verdict-line">${esc(it.text)}</p>`).join('')}
    `;
    hudVerdict.querySelector('[data-tx-auto-correct="1"]')?.addEventListener('click', () => {
      autoCorrectTangents();
    });
  }

  if (hudPick) {
    if (activeTab === 'belts' && mode === 'belt') {
      const man = manualBeltTrace ? ' · manual tangente ON' : '';
      hudPick.textContent = `Orden de correa: [${state.beltPickOrder.join(', ')}]${man} — cierre con V o síncrona. Clic corto = añadir; arrastre = mover.`;
    } else if (activeTab === 'belts') {
      hudPick.textContent = 'Pulse «Elegir orden correa» y haga clic corto en cada polea en secuencia.';
    } else {
      hudPick.textContent = '';
    }
  }
  if (hudPickChain) {
    if (activeTab === 'chains' && mode === 'chain') {
      hudPickChain.textContent = `Orden de cadena: [${state.chainPickOrder.join(', ')}] — pulse «Cerrar cadena».`;
    } else if (activeTab === 'chains') {
      hudPickChain.textContent = 'Pulse «Elegir orden cadena» para encadenar piñones con clics cortos.';
    } else {
      hudPickChain.textContent = '';
    }
  }
  renderInputChecks(kin);
  renderElementColumns(kin);
  renderRunResults();
}

/** Geometría de lazo abierto (correa o cadena sobre primitivos). */
function pathGeometryForIds(nodeIds) {
  return pathGeometryForIdsWithOverride(nodeIds, 0);
}

function beltPathForRun(br) {
  const ids = (br.nodeIds || []).slice();
  const hasInsideIdler = ids.some((id) => {
    const n = state.nodes.find((x) => x.id === id);
    return n?.kind === 'pulley' && n.pulleyRole === 'idler' && n.idlerWrapSide === 'inside';
  });
  const effectiveIds = hasInsideIdler
    ? ids
    : ids.filter((id) => {
        const n = state.nodes.find((x) => x.id === id);
        return !(n?.kind === 'pulley' && n.pulleyRole === 'idler' && (n.isExternal === true || n.idlerWrapSide === 'outside'));
      });
  const centers = centersForNodeIds(effectiveIds, br.centerOverride_mm ?? 0);
  if (!centers) return { pathD: '', length_mm: 0, reliable: false, note: 'Falta un nodo en la ruta.' };
  const radii = [];
  for (const id of effectiveIds) {
    const n = state.nodes.find((x) => x.id === id);
    if (!n) return { pathD: '', length_mm: 0, reliable: false, note: 'Falta un nodo en la ruta.' };
    radii.push(getNodeD_mm(n) / 2);
  }
  const hasIdler = effectiveIds.some((id) => state.nodes.find((x) => x.id === id)?.pulleyRole === 'idler');
  const meta = effectiveIds.map((id) => {
    const n = state.nodes.find((x) => x.id === id);
    const isIdler = n?.pulleyRole === 'idler';
    const isExt = isIdler && (n?.isExternal === true || n?.idlerWrapSide === 'outside');
    return { role: n?.pulleyRole, wrapSide: n?.idlerWrapSide, isExternal: isExt, contacto: isExt ? 'exterior' : 'interior' };
  });
  if (!hasIdler) return buildOpenBeltPath2D(centers, radii);
  /* Con tensora, mantener orden del lazo actual y contacto tangencial (inside/outside por meta). */
  return buildOrderedBeltPath2D(centers, radii, meta, br.edgeSigns || []);
}

function centersForNodeIds(nodeIds, centerOverrideMm = 0) {
  const centers = [];
  for (const id of nodeIds) {
    const n = state.nodes.find((x) => x.id === id);
    if (!n) return null;
    centers.push({ x: n.x, y: n.y });
  }
  if (!(centerOverrideMm > 0) || centers.length < 2) return centers;
  const a = centers[0];
  const b = centers[1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  const ux = d > 1e-9 ? dx / d : 1;
  const uy = d > 1e-9 ? dy / d : 0;
  const bx = a.x + ux * centerOverrideMm;
  const by = a.y + uy * centerOverrideMm;
  const tx = bx - b.x;
  const ty = by - b.y;
  for (let i = 1; i < centers.length; i++) {
    centers[i] = { x: centers[i].x + tx, y: centers[i].y + ty };
  }
  return centers;
}

function pathGeometryForIdsWithOverride(nodeIds, centerOverrideMm = 0) {
  const centers = centersForNodeIds(nodeIds, centerOverrideMm);
  if (!centers) return { pathD: '', length_mm: 0, reliable: false, note: 'Falta un nodo en la ruta.' };
  const radii = [];
  for (const id of nodeIds) {
    const n = state.nodes.find((x) => x.id === id);
    if (!n) return { pathD: '', length_mm: 0, reliable: false, note: 'Falta un nodo en la ruta.' };
    radii.push(getNodeD_mm(n) / 2);
  }
  return buildOpenBeltPath2D(centers, radii);
}

function centerDistanceMark(a, b, label, tone = 'belt', offsetPx = 26) {
  if (!a || !b) return '';
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy);
  if (!(L > 1e-6)) return '';
  const nx = -dy / L;
  const ny = dx / L;
  const off = offsetPx;
  const ax = a.x + nx * off;
  const ay = a.y + ny * off;
  const bx = b.x + nx * off;
  const by = b.y + ny * off;
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const mm = L.toFixed(0);
  const c = tone === 'chain' ? '#334155' : '#92400e';
  const bg = tone === 'chain' ? '#f1f5f9' : '#fffbeb';
  const stroke = tone === 'chain' ? '#cbd5e1' : '#fde68a';
  return `
    <g class="tx-center-dim">
      <line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="${c}" stroke-width="1.6" stroke-dasharray="6 4" opacity="0.95"/>
      <line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${ax.toFixed(1)}" y2="${ay.toFixed(1)}" stroke="${c}" stroke-width="1.1" opacity="0.55"/>
      <line x1="${b.x.toFixed(1)}" y1="${b.y.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="${c}" stroke-width="1.1" opacity="0.55"/>
      <rect x="${(mx - 43).toFixed(1)}" y="${(my - 10).toFixed(1)}" width="86" height="18" rx="4" fill="${bg}" stroke="${stroke}" />
      <text x="${mx.toFixed(1)}" y="${(my + 2.5).toFixed(1)}" text-anchor="middle" font-size="9.5" font-weight="800" fill="${c}" font-family="Inter,system-ui,sans-serif">${esc(label)} = ${mm} mm</text>
    </g>`;
}

function centerDistanceMarkBelow(a, b, label, tone = 'chain', dropPx = 58) {
  if (!a || !b) return '';
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy);
  if (!(L > 1e-6)) return '';
  const yDim = Math.max(a.y, b.y) + dropPx;
  const c = tone === 'chain' ? '#334155' : '#92400e';
  const bg = tone === 'chain' ? '#f1f5f9' : '#fffbeb';
  const stroke = tone === 'chain' ? '#cbd5e1' : '#fde68a';
  const mx = (a.x + b.x) / 2;
  const mm = L.toFixed(0);
  return `
    <g class="tx-center-dim">
      <line x1="${a.x.toFixed(1)}" y1="${yDim.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${yDim.toFixed(1)}" stroke="${c}" stroke-width="1.6" stroke-dasharray="6 4" opacity="0.95"/>
      <line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${a.x.toFixed(1)}" y2="${yDim.toFixed(1)}" stroke="${c}" stroke-width="1.1" opacity="0.55"/>
      <line x1="${b.x.toFixed(1)}" y1="${b.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${yDim.toFixed(1)}" stroke="${c}" stroke-width="1.1" opacity="0.55"/>
      <rect x="${(mx - 43).toFixed(1)}" y="${(yDim - 10).toFixed(1)}" width="86" height="18" rx="4" fill="${bg}" stroke="${stroke}" />
      <text x="${mx.toFixed(1)}" y="${(yDim + 2.5).toFixed(1)}" text-anchor="middle" font-size="9.5" font-weight="800" fill="${c}" font-family="Inter,system-ui,sans-serif">${esc(label)} = ${mm} mm</text>
    </g>`;
}

function centerDistanceMarksForRun(nodeIds, tone) {
  return centerDistanceMarksForRunWithOverride(nodeIds, tone, 0);
}

function centerDistanceMarksForRunWithOverride(nodeIds, tone, centerOverrideMm = 0) {
  const centers = centersForNodeIds(nodeIds, centerOverrideMm);
  if (!centers) return '';
  let html = '';
  for (let i = 1; i < centers.length; i++) {
    html += centerDistanceMark(centers[i - 1], centers[i], `C${i}`, tone);
  }
  return html;
}

function computeBeltRunSummary(br) {
  const ids = (br.nodeIds || []).slice();
  const hasInsideIdler = ids.some((id) => {
    const n = state.nodes.find((x) => x.id === id);
    return n?.kind === 'pulley' && n.pulleyRole === 'idler' && n.idlerWrapSide === 'inside';
  });
  const effectiveIds = hasInsideIdler
    ? ids
    : ids.filter((id) => {
        const n = state.nodes.find((x) => x.id === id);
        return !(n?.kind === 'pulley' && n.pulleyRole === 'idler' && (n.isExternal === true || n.idlerWrapSide === 'outside'));
      });
  const centers = centersForNodeIds(effectiveIds, br.centerOverride_mm ?? 0);
  const radii = effectiveIds.map((id) => {
    const n = state.nodes.find((x) => x.id === id);
    return n ? getNodeD_mm(n) / 2 : 0;
  });
  const hasIdler = effectiveIds.some((id) => state.nodes.find((x) => x.id === id)?.pulleyRole === 'idler');
  const meta = effectiveIds.map((id) => {
    const n = state.nodes.find((x) => x.id === id);
    const isIdler = n?.pulleyRole === 'idler';
    const isExt = isIdler && (n?.isExternal === true || n?.idlerWrapSide === 'outside');
    return { role: n?.pulleyRole, wrapSide: n?.idlerWrapSide, isExternal: isExt, contacto: isExt ? 'exterior' : 'interior' };
  });
  const geo =
    centers && centers.length === radii.length
      ? !hasIdler
        ? buildOpenBeltPath2D(centers, radii)
        : buildOrderedBeltPath2D(centers, radii, meta, br.edgeSigns || [])
      : pathGeometryForIdsWithOverride(effectiveIds, br.centerOverride_mm ?? 0);
  const Leff = br.kind === 'sync' ? geo.length_mm : geo.length_mm * (1 + (br.slip ?? 0.015));
  const comm = br.kind === 'v' ? nearestCommercialVBeltLength(Leff) : null;
  const c1 = centersForNodeIds(ids, br.centerOverride_mm ?? 0);
  const cDist = c1 && c1.length >= 2 ? Math.hypot(c1[1].x - c1[0].x, c1[1].y - c1[0].y) : null;
  const idlerCount = ids.reduce((acc, id) => {
    const n = state.nodes.find((x) => x.id === id);
    return acc + (n?.kind === 'pulley' && n.pulleyRole === 'idler' ? 1 : 0);
  }, 0);
  return { geo, Leff, comm, cDist, idlerCount };
}

function computeChainRunSummary(cr) {
  const geo = pathGeometryForIdsWithOverride(cr.nodeIds, cr.centerOverride_mm ?? 0);
  const first = state.nodes.find((n) => n.id === cr.nodeIds[0]);
  const p = first?.pitch_mm ?? getChainById(cr.chainRefId)?.pitch_mm ?? 12.7;
  const Lp = geo.length_mm / Math.max(1e-9, p);
  const hints = chainAssemblyHints(Lp);
  const c1 = centersForNodeIds(cr.nodeIds, cr.centerOverride_mm ?? 0);
  const cDist = c1 && c1.length >= 2 ? Math.hypot(c1[1].x - c1[0].x, c1[1].y - c1[0].y) : null;
  return { geo, p, Lp, hints, cDist };
}

/**
 * Orden para vista previa: modo «elegir orden» si hay 2+ clics; si no, poleas fuera de correas cerradas;
 * si no hay ninguna correa cerrada, todas las poleas por orden de creación (id).
 */
function getBeltPreviewNodeIds() {
  const pulleys = state.nodes.filter((n) => n.kind === 'pulley').sort((a, b) => a.id - b.id);
  const inAnyRun = new Set(state.beltRuns.flatMap((r) => r.nodeIds));
  if (state.beltPickOrder.length >= 2) {
    const ids = [...new Set(state.beltPickOrder)].filter((id) => pulleys.some((p) => p.id === id));
    if (ids.length >= 2) return ids;
  }
  const outside = pulleys.filter((p) => !inAnyRun.has(p.id));
  if (outside.length >= 2) return outside.map((p) => p.id);
  if (state.beltRuns.length === 0 && pulleys.length >= 2) return pulleys.map((p) => p.id);
  return null;
}

function getChainPreviewNodeIds() {
  const spr = state.nodes.filter((n) => n.kind === 'sprocket').sort((a, b) => a.id - b.id);
  const inAnyRun = new Set(state.chainRuns.flatMap((r) => r.nodeIds));
  if (state.chainPickOrder.length >= 2) {
    const ids = [...new Set(state.chainPickOrder)].filter((id) => spr.some((p) => p.id === id));
    if (ids.length >= 2) return ids;
  }
  const outside = spr.filter((p) => !inAnyRun.has(p.id));
  if (outside.length >= 2) return outside.map((p) => p.id);
  if (state.chainRuns.length === 0 && spr.length >= 2) return spr.map((p) => p.id);
  return null;
}

function drawSvg(kin) {
  if (!(svg instanceof SVGSVGElement)) return;
  const vbW = BASE_W / viewPanZoom.zoom;
  const vbH = BASE_H / viewPanZoom.zoom;
  const vx = viewPanZoom.cx - vbW / 2;
  const vy = viewPanZoom.cy - vbH / 2;
  svg.setAttribute('viewBox', `${vx} ${vy} ${vbW} ${vbH}`);

  const defs = `
  <defs>
    <pattern id="txGrid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e2e8f0" stroke-width="0.6"/>
    </pattern>
  </defs>
  <rect x="0" y="0" width="${BASE_W}" height="${BASE_H}" fill="url(#txGrid)" />
  <rect x="0" y="0" width="${BASE_W}" height="${BASE_H}" fill="none" stroke="#cbd5e1" stroke-width="2" />
  `;

  const showGears = activeTab === 'gears';
  const showBelts = activeTab === 'belts';
  const showChains = activeTab === 'chains';

  let beltsHtml = '';
  let beltDimsHtml = '';
  let manualGuideHtml = '';
  if (showBelts) {
    const previewIds = getBeltPreviewNodeIds();
    if (previewIds) {
      const geo = pathGeometryForIds(previewIds);
      if (geo.pathD) {
        beltsHtml += `<path class="tx-path-preview" d="${geo.pathD}" fill="none" stroke="#d97706" stroke-width="4" stroke-dasharray="14 8" stroke-linejoin="round" opacity="0.75" />`;
        beltDimsHtml += centerDistanceMarksForRunWithOverride(previewIds, 'belt', 0);
      }
    }
    for (const br of state.beltRuns) {
      const geo = beltPathForRun(br);
      const Leff = br.kind === 'sync' ? geo.length_mm : geo.length_mm * (1 + (br.slip ?? 0.015));
      const comm = br.kind === 'v' && geo.reliable ? nearestCommercialVBeltLength(Leff) : { ok: true };
      const stroke = comm && !comm.ok ? '#ea580c' : br.kind === 'sync' ? '#0369a1' : '#a16207';
      const dash = br.kind === 'sync' ? '6 3' : 'none';
      if (geo.pathD) {
        beltsHtml += `<path d="${geo.pathD}" fill="none" stroke="${stroke}" stroke-width="5" stroke-dasharray="${dash}" stroke-linejoin="round" opacity="0.92" />`;
        beltDimsHtml += centerDistanceMarksForRunWithOverride(br.nodeIds, 'belt', br.centerOverride_mm ?? 0);
      }
    }
    const guide = manualTangentGuide();
    if (guide) {
      const { a, b, best, cands } = guide;
      const candDots = cands
        .map(
          (c) =>
            `<circle cx="${c.p0.x.toFixed(2)}" cy="${c.p0.y.toFixed(2)}" r="3.4" fill="#60a5fa" />
             <circle cx="${c.p1.x.toFixed(2)}" cy="${c.p1.y.toFixed(2)}" r="3.4" fill="#60a5fa" />`,
        )
        .join('');
      manualGuideHtml = `
        <line x1="${best.p0.x.toFixed(2)}" y1="${best.p0.y.toFixed(2)}" x2="${best.p1.x.toFixed(2)}" y2="${best.p1.y.toFixed(2)}"
          stroke="#2563eb" stroke-width="4" stroke-dasharray="8 5" opacity="0.95" />
        <circle cx="${best.p0.x.toFixed(2)}" cy="${best.p0.y.toFixed(2)}" r="5" fill="#1d4ed8" />
        <circle cx="${best.p1.x.toFixed(2)}" cy="${best.p1.y.toFixed(2)}" r="5" fill="#1d4ed8" />
        ${candDots}
        <text x="${((a.x + b.x) / 2).toFixed(2)}" y="${(((a.y + b.y) / 2) - 12).toFixed(2)}" text-anchor="middle"
          fill="#1d4ed8" font-size="10" font-weight="800" font-family="Inter,system-ui,sans-serif">Tangencia detectada</text>
      `;
    }
  }

  let chainsHtml = '';
  let chainDimsHtml = '';
  if (showChains) {
    const previewCIds = getChainPreviewNodeIds();
    if (previewCIds) {
      const geo = pathGeometryForIds(previewCIds);
      if (geo.pathD) {
        chainsHtml += `<path class="tx-path-preview" d="${geo.pathD}" fill="none" stroke="#475569" stroke-width="4" stroke-dasharray="12 7" stroke-linejoin="round" opacity="0.72" />`;
        chainDimsHtml += centerDistanceMarksForRunWithOverride(previewCIds, 'chain', 0);
      }
    }
    for (const cr of state.chainRuns) {
      const geo = pathGeometryForIdsWithOverride(cr.nodeIds, cr.centerOverride_mm ?? 0);
      if (geo.pathD) {
        chainsHtml += `<path d="${geo.pathD}" fill="none" stroke="#1e293b" stroke-width="5" stroke-linejoin="round" opacity="0.9" />`;
        chainDimsHtml += centerDistanceMarksForRunWithOverride(cr.nodeIds, 'chain', cr.centerOverride_mm ?? 0);
      }
    }
  }

  let meshHtml = '';
  if (showGears) {
    for (const e of state.meshes) {
      const a = state.nodes.find((n) => n.id === e.a);
      const b = state.nodes.find((n) => n.id === e.b);
      if (!a || !b) continue;
      meshHtml += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 4" opacity="0.85" />`;
      /* Cota de engranes siempre abajo del par para evitar solape con etiquetas superiores. */
      meshHtml += centerDistanceMarkBelow(a, b, 'a', 'chain', 62);
    }
  }

  let nodesHtml = '';
  const visibleNodes = state.nodes.filter((n) => kindVisibleInTab(n.kind));
  const hasCloseNeighbor = (node) =>
    visibleNodes.some((other) => {
      if (other.id === node.id) return false;
      const d = Math.hypot(other.x - node.x, other.y - node.y);
      return d < 175;
    });

  for (const node of state.nodes) {
    if (!kindVisibleInTab(node.kind)) continue;

    const sel = state.selectedId === node.id;
    const D = getNodeD_mm(node);
    const r = D / 2;
    const k = node.kind;
    const fill = k === 'gear' ? '#ccfbf1' : k === 'pulley' ? '#fef3c7' : '#e2e8f0';
    const pulleyRole = node.kind === 'pulley' ? node.pulleyRole || 'driven' : '';
    const isIdler = pulleyRole === 'idler';
    const hasCrossIssue = node.kind === 'pulley' && crossedPulleyIds.has(node.id);
    const stroke = sel
      ? '#0d9488'
      : k === 'gear'
        ? '#0f766e'
        : k === 'pulley'
          ? isIdler
            ? '#2563eb'
            : '#b45309'
          : '#475569';
    const sw = sel ? 4 : 2.5;
    const ph = node.phase_rad ?? 0;
    const rotDeg = (ph * 180) / Math.PI;
    const motorRing = node.isMotor ? `<circle cx="${node.x}" cy="${node.y}" r="${r + 12}" fill="none" stroke="#059669" stroke-width="3" stroke-dasharray="6 4" />` : '';
    const crossRing = hasCrossIssue ? `<circle cx="${node.x}" cy="${node.y}" r="${r + 16}" fill="none" stroke="#ef4444" stroke-width="3" opacity="0.75" class="tx-cross-glow" />` : '';

    let symbol = '';
    if (k === 'gear') {
      const teeth = 14;
      for (let i = 0; i < teeth; i++) {
        const t = (i / teeth) * Math.PI * 2;
        const x1 = node.x + (r - 2) * Math.cos(t);
        const y1 = node.y + (r - 2) * Math.sin(t);
        const x2 = node.x + (r + 6) * Math.cos(t);
        const y2 = node.y + (r + 6) * Math.sin(t);
        symbol += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#0f766e" stroke-width="2" />`;
      }
    } else if (k === 'pulley') {
      symbol += `<circle cx="${node.x}" cy="${node.y}" r="${r * 0.35}" fill="none" stroke="#92400e" stroke-width="2" />`;
      if (isIdler) {
        symbol += `<circle cx="${node.x}" cy="${node.y}" r="${Math.max(8, r * 0.72)}" fill="none" stroke="#2563eb" stroke-width="2" stroke-dasharray="6 4" />`;
      }
    } else {
      const z = Math.max(6, node.z ?? 17);
      for (let i = 0; i < Math.min(z, 24); i++) {
        const t = (i / z) * Math.PI * 2;
        const x2 = node.x + r * Math.cos(t);
        const y2 = node.y + r * Math.sin(t);
        symbol += `<circle cx="${x2}" cy="${y2}" r="3" fill="#334155" />`;
      }
    }

    const kn = kin.byId[node.id];
    const zLabel = k === 'pulley' ? `Ø${Math.round(D)}` : `z${node.z ?? '--'}`;
    const tag = kn ? `${zLabel} · ${Math.abs(kn.n_rpm).toFixed(0)} rpm · ${kn.T_Nm.toFixed(1)} N*m` : `${k} #${node.id}`;
    const mini = kn
      ? `n ${num(Math.abs(kn.n_rpm), 0)} rpm · T ${num(kn.T_Nm, 1)} N*m`
      : `${zLabel} · sin propagación`;
    const showMini = sel || !hasCloseNeighbor(node);

    nodesHtml += `<g class="tx-node" data-id="${node.id}" style="cursor:grab">
      ${motorRing}
      ${crossRing}
      <g transform="rotate(${rotDeg.toFixed(2)} ${node.x} ${node.y})">
        <circle cx="${node.x}" cy="${node.y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" />
        ${symbol}
      </g>
      ${
        showMini
          ? `<rect x="${(node.x - 70).toFixed(1)}" y="${(node.y + r + 8).toFixed(1)}" width="140" height="18" rx="4" fill="#ffffff" stroke="#cbd5e1" opacity="0.96" />
      <text x="${node.x}" y="${(node.y + r + 20).toFixed(1)}" text-anchor="middle" font-size="9.2" font-weight="700" fill="#334155" font-family="Inter,system-ui,sans-serif">${esc(
              mini,
            )}</text>`
          : ''
      }
      ${
        sel
          ? `<rect x="${node.x - 84}" y="${node.y - r - 44}" width="168" height="34" rx="5" fill="#0f172a" opacity="0.93" />
      <text x="${node.x}" y="${node.y - r - 24}" text-anchor="middle" font-size="10" font-weight="700" fill="#f8fafc" font-family="Inter,system-ui,sans-serif">${esc(tag)}</text>`
          : ''
      }
    </g>`;
  }

  svg.innerHTML = defs + beltsHtml + chainsHtml + beltDimsHtml + chainDimsHtml + meshHtml + manualGuideHtml + nodesHtml;

  svg.querySelectorAll('.tx-node').forEach((g) => {
    g.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      const id = Number(g.getAttribute('data-id'));
      if (!Number.isFinite(id)) return;
      const n = state.nodes.find((x) => x.id === id);
      if (!n) return;
      state.selectedId = id;
      propsDirty = true;
      showNodeContextMenu(n, ev.clientX, ev.clientY);
    });
    g.addEventListener('pointerdown', (ev) => {
      closeContextMenu();
      const id = Number(g.getAttribute('data-id'));
      if (!Number.isFinite(id)) return;
      const n = state.nodes.find((x) => x.id === id);
      if (!n) return;

      const beltPick = activeTab === 'belts' && mode === 'belt' && n.kind === 'pulley';
      const chainPick = activeTab === 'chains' && mode === 'chain' && n.kind === 'sprocket';

      if (beltPick || chainPick) {
        pending = { id, px: n.x, py: n.y, sx: ev.clientX, sy: ev.clientY };
      } else {
        state.selectedId = id;
        const p = clientToSvg(ev);
        drag = { id, ox: p.x, oy: p.y, px: n.x, py: n.y };
        pending = null;
      }
      ev.preventDefault();
      propsDirty = true;
      const { n: n0, T: t0 } = readMotorInputs();
      const kkin = propagateKinematics(state, n0, t0);
      const verdict = computeVerdicts(state, kkin);
      updateHud(kkin, verdict);
      drawSvg(kkin);
    });
  });
}

function tryPickShortClick(ev) {
  if (!pending) return;
  const dist = Math.hypot(ev.clientX - pending.sx, ev.clientY - pending.sy);
  if (dist > DRAG_PX) return;
  const n = state.nodes.find((x) => x.id === pending.id);
  if (!n) {
    pending = null;
    return;
  }
  if (activeTab === 'belts' && mode === 'belt' && n.kind === 'pulley') {
    if (manualBeltTrace) {
      const picks = state.beltPickOrder;
      if (!picks.length) {
        picks.push(n.id);
      } else {
        const lastId = picks[picks.length - 1];
        if (lastId !== n.id) {
          const a = state.nodes.find((x) => x.id === lastId && x.kind === 'pulley');
          const b = state.nodes.find((x) => x.id === n.id && x.kind === 'pulley');
          if (a && b) {
            const p = clientToSvg(ev);
            manualEdgeSigns.push(chooseSignBetweenPulleys(a, b, p));
          }
          picks.push(n.id);
        }
      }
    } else {
      state.beltPickOrder.push(n.id);
    }
    state.selectedId = n.id;
  } else if (activeTab === 'chains' && mode === 'chain' && n.kind === 'sprocket') {
    state.chainPickOrder.push(n.id);
    state.selectedId = n.id;
  }
  pending = null;
}

function onPointerMove(ev) {
  const pNow = clientToSvg(ev);
  manualCursor = pNow;
  if (activeTab === 'belts' && manualBeltTrace) {
    const pulleys = state.nodes.filter((n) => n.kind === 'pulley');
    let bestId = null;
    let bestD = Infinity;
    for (const n of pulleys) {
      const d = Math.hypot(pNow.x - n.x, pNow.y - n.y);
      const gate = getNodeD_mm(n) / 2 + 40;
      if (d <= gate && d < bestD) {
        bestD = d;
        bestId = n.id;
      }
    }
    manualHoverPulleyId = bestId;
  } else {
    manualHoverPulleyId = null;
  }
  if (pending && !drag) {
    const dist = Math.hypot(ev.clientX - pending.sx, ev.clientY - pending.sy);
    if (dist > DRAG_PX) {
      const p = clientToSvg(ev);
      drag = { id: pending.id, ox: p.x, oy: p.y, px: pending.px, py: pending.py };
      pending = null;
    }
  }
  if (!drag) return;
  const node = state.nodes.find((n) => n.id === drag.id);
  if (!node) return;
  const p = clientToSvg(ev);
  node.x = drag.px + (p.x - drag.ox);
  node.y = drag.py + (p.y - drag.oy);
  if (node.kind === 'gear') snapGearToPeer(state, node.id, 22);
  const { n: n0, T: t0 } = readMotorInputs();
  const kin = propagateKinematics(state, n0, t0);
  const verdict = computeVerdicts(state, kin);
  updateHud(kin, verdict);
  drawSvg(kin);
}

function onPointerUp(ev) {
  const hadCanvasInteraction = !!pending || !!drag;
  if (pending) tryPickShortClick(ev);
  if (drag) {
    const node = state.nodes.find((n) => n.id === drag.id);
    if (node?.kind === 'gear') snapGearToPeer(state, node.id, 22);
  }
  drag = null;
  pending = null;
  // Evita recargar el panel al soltar clic fuera del lienzo (p.ej. al abrir un <select>),
  // porque eso cerraba el desplegable ISO/ANSI antes de poder elegir una opción.
  if (hadCanvasInteraction) propsDirty = true;
  const { n: n0, T: t0 } = readMotorInputs();
  const kin = propagateKinematics(state, n0, t0);
  const verdict = computeVerdicts(state, kin);
  updateHud(kin, verdict);
  drawSvg(kin);
}

function frame(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;
  const { n: n0, T: t0 } = readMotorInputs();
  const kin = propagateKinematics(state, n0, t0);
  for (const node of state.nodes) {
    const k = kin.byId[node.id];
    if (!k) continue;
    node.phase_rad = (node.phase_rad ?? 0) + k.omega * dt;
  }
  const verdict = computeVerdicts(state, kin);
  updateHud(kin, verdict);
  if (propsDirty) {
    syncPropsPanel();
    propsDirty = false;
  }
  drawSvg(kin);
  requestAnimationFrame(frame);
}

function syncPropsPanel() {
  if (!propsPanel) return;
  if (!selectedMatchesTab()) {
    const hint =
      activeTab === 'gears'
        ? 'Seleccione un engranaje en el lienzo (pestaña Engranajes).'
        : activeTab === 'belts'
          ? 'Seleccione una polea (pestaña Poleas y correas).'
          : 'Seleccione un piñón (pestaña Piñones y cadenas).';
    propsPanel.innerHTML = `<p class="tx-muted">${hint}</p>`;
    return;
  }
  const node = state.nodes.find((n) => n.id === state.selectedId);
  if (!node) {
    propsPanel.innerHTML = '<p class="tx-muted">Seleccione un elemento en el lienzo.</p>';
    return;
  }
  if (node.kind === 'gear') {
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const alpha = Number.isFinite(node.alpha_deg) ? node.alpha_deg : 20;
    const beta = Number.isFinite(node.beta_deg) ? node.beta_deg : 0;
    const eff = Number.isFinite(node.meshEff_pct) ? node.meshEff_pct : 98.5;
    propsPanel.innerHTML = `
      <div class="tx-props-head">Configuracion: Engranaje #${node.id}</div>
      <div class="lab-grid lab-grid--2 tx-props-grid">
        <div class="lab-field"><label>z dientes ${helpTip('Numero de dientes del engranaje. Afecta relacion de transmision y diametro primitivo.')}</label><input type="number" min="6" data-tx-p="z" value="${node.z}" /></div>
        <div class="lab-field"><label>m (mm) ${helpTip('Modulo en mm. Para engranar, pares conectados deben compartir modulo.')}</label><input type="number" min="0.25" step="0.25" data-tx-p="m" value="${node.module_mm}" /></div>
        <div class="lab-field"><label>b (mm) ${helpTip('Ancho de cara. Se usa en los chequeos simplificados de flexion/contacto.')}</label><input type="number" min="4" data-tx-p="b" value="${node.faceWidth_mm}" /></div>
        <div class="lab-field"><label>alpha (deg) ${helpTip('Angulo de presion de referencia. Solo informativo en esta version visual.')}</label><input type="number" min="14.5" max="30" step="0.5" data-tx-p="alpha" value="${alpha}" /></div>
        <div class="lab-field"><label>beta (deg) ${helpTip('Angulo de helice. Si usa dientes rectos, deje 0.')}</label><input type="number" min="0" max="45" step="0.5" data-tx-p="beta" value="${beta}" /></div>
        <div class="lab-field"><label>eta malla (%) ${helpTip('Rendimiento por malla, para memoria de calculo. No altera aun la propagacion base.')}</label><input type="number" min="85" max="99.9" step="0.1" data-tx-p="eta" value="${eff}" /></div>
        <div class="lab-field"><label>X (mm) ${helpTip('Coordenada horizontal del centro en el lienzo tecnico.')}</label><input type="number" step="1" data-tx-p="x" value="${x.toFixed(0)}" /></div>
        <div class="lab-field"><label>Y (mm) ${helpTip('Coordenada vertical del centro en el lienzo tecnico.')}</label><input type="number" step="1" data-tx-p="y" value="${y.toFixed(0)}" /></div>
      </div>
      <button type="button" class="lab-btn" data-tx-p="del" style="margin-top:0.5rem">Eliminar elemento</button>`;
  } else if (node.kind === 'pulley') {
    const br = state.beltRuns.find((r) => r.nodeIds.includes(node.id));
    const bsum = br ? computeBeltRunSummary(br) : null;
    const cVal = bsum?.cDist ?? 0;
    const runOpts = state.beltRuns.map((r) => `<option value="${r.id}" ${br && r.id === br.id ? 'selected' : ''}>${esc(r.id)}</option>`).join('');
    const role = node.pulleyRole || 'driven';
    propsPanel.innerHTML = `
      <div class="tx-props-head">Configuracion: Polea #${node.id}</div>
      <div class="lab-grid lab-grid--2 tx-props-grid">
      <div class="lab-field"><label>Ø primitivo (mm) ${helpTip('Diametro de paso de la polea. Define relacion de velocidad con la polea enlazada.')}</label>
        <input type="number" min="10" data-tx-p="d" value="${node.d_mm}" />
        <input type="range" min="40" max="420" step="1" data-tx-p="dRange" value="${Math.max(40, Math.min(420, Number(node.d_mm) || 120))}" />
      </div>
      <div class="lab-field"><label>Tipo de polea ${helpTip('Motriz/conducida/tensora. La tensora afecta trazado y longitud, pero no cambia la relacion principal de transmision.')}</label>
        <div class="tx-segmented" data-tx-p="pulleyRoleSeg">
          <button type="button" data-role="driven" class="${role === 'driven' ? 'is-active' : ''}">Conducida</button>
          <button type="button" data-role="drive" class="${role === 'drive' ? 'is-active' : ''}">Motriz</button>
          <button type="button" data-role="idler" class="${role === 'idler' ? 'is-active' : ''}">Tensora</button>
        </div>
      </div>
      <div class="lab-field"><label>Contacto tensora ${helpTip('Solo para polea tensora. Exterior: contacto por fuera de la correa. Interior: contacto por dentro (retorno).')}</label>
        <select data-tx-p="idlerWrap" ${node.pulleyRole === 'idler' ? '' : 'disabled'}>
          <option value="outside" ${(node.idlerWrapSide || 'outside') === 'outside' ? 'selected' : ''}>Exterior</option>
          <option value="inside" ${(node.idlerWrapSide || 'outside') === 'inside' ? 'selected' : ''}>Interior</option>
        </select>
      </div>
      <div class="lab-field">
        <label>Contacto dorsal (exterior) ${helpTip('Si está activa, esta polea se trata como nodo de inflexión (back-side): usa tangentes internas contra poleas normales y arco corto local.')}</label>
        <label class="tx-switch">
          <input type="checkbox" data-tx-p="isExternal" ${node.isExternal ? 'checked' : ''} ${node.pulleyRole === 'idler' ? '' : 'disabled'} />
          <span class="tx-switch__track"></span>
        </label>
        <svg class="tx-mini-diagram" viewBox="0 0 120 42" aria-hidden="true">
          <circle cx="85" cy="21" r="12" fill="none" stroke="#0f766e" stroke-width="2"></circle>
          <path d="${node.isExternal ? 'M4 16 C 38 8, 58 34, 116 30' : 'M4 28 C 38 34, 58 8, 116 12'}" fill="none" stroke="#0ea5a4" stroke-width="3"></path>
        </svg>
      </div>
      <div class="lab-field lab-field--wide">
        <label>Correa activa ${helpTip('Seleccione una correa activa para unir esta polea como tensora.')}</label>
        <div class="tx-chip-row">${state.beltRuns
          .map((r) => `<button type="button" class="tx-chip ${br && r.id === br.id ? 'is-active' : ''}" data-tx-p="runChip" data-run-id="${r.id}">${esc(r.id)}</button>`)
          .join('')}</div>
        <div class="tx-toolbar__row">
          <select data-tx-p="idlerRun" ${state.beltRuns.length ? '' : 'disabled'}>${runOpts || '<option value="">Sin lazos</option>'}</select>
          <button type="button" class="lab-btn tx-btn--secondary" data-tx-p="applyIdler" ${state.beltRuns.length ? '' : 'disabled'}>Aplicar como tensora</button>
        </div>
      </div>
      <div class="lab-field"><label>X (mm) ${helpTip('Coordenada horizontal del centro de polea.')}</label><input type="number" step="1" data-tx-p="x" value="${(node.x ?? 0).toFixed(0)}" /></div>
      <div class="lab-field"><label>Y (mm) ${helpTip('Coordenada vertical del centro de polea.')}</label><input type="number" step="1" data-tx-p="y" value="${(node.y ?? 0).toFixed(0)}" /></div>
      ${
        br && bsum
          ? `<div class="lab-field"><label>C1 manual (mm) ${helpTip('Distancia entre centros del primer tramo de la correa. Ajusta geometria y longitud resultante.')}</label><input type="number" min="20" step="1" data-tx-p="beltC" value="${cVal.toFixed(0)}" /></div>
      <div class="lab-field"><label>Deslizamiento s (%) ${helpTip('Solo para correa V. Se usa para ajustar n2 = n1*(d1/d2)*(1-s).')}</label><input type="number" min="0" max="8" step="0.1" data-tx-p="slip" value="${(((br.slip ?? 0.018) * 100)).toFixed(2)}" ${br.kind === 'sync' ? 'disabled' : ''} /></div>
      <div class="lab-field lab-field--wide"><label>Tipo de correa ${helpTip('V: con deslizamiento. Sincrona: sin deslizamiento nominal.')}</label><input type="text" value="${
            br.kind === 'sync' ? 'Sincrona' : 'V'
          }" disabled /></div>
      <div class="tx-run-summary">
        <div><strong>Correa ${esc(br.id)}</strong> · ${br.kind === 'sync' ? 'Síncrona' : 'V'}</div>
        <div>Longitud geométrica: <strong>${bsum.geo.length_mm.toFixed(1)} mm</strong></div>
        <div>Longitud efectiva: <strong>${bsum.Leff.toFixed(1)} mm</strong></div>
        ${
          bsum.idlerCount > 0
            ? `<div><strong>Poleas tensoras:</strong> ${bsum.idlerCount}. Aumentan envolvente/longitud y guían el trazado; la relación principal se evalúa entre poleas no tensoras.</div>`
            : ''
        }
        ${
          br.kind === 'v' && bsum.comm
            ? `<div>Comercial demo: <strong>${bsum.comm.L_nom.toFixed(0)} mm</strong> (${bsum.comm.ok ? 'OK' : `Δ ${bsum.comm.delta_mm.toFixed(1)} mm`})</div>`
            : ''
        }
      </div>`
          : ''
      }
      </div>
      <button type="button" class="lab-btn" data-tx-p="del" style="margin-top:0.5rem">Eliminar elemento</button>`;
  } else {
    const rows = filterChainCatalogRows(CHAIN_CATALOG, false);
    const idSet = new Set(rows.map((r) => r.id));
    const optionsRows =
      node.chainRefId && !idSet.has(node.chainRefId)
        ? [CHAIN_CATALOG.find((c) => c.id === node.chainRefId), ...rows].filter(Boolean)
        : rows;
    const opts = optionsRows
      .map((c) => `<option value="${c.id}" ${c.id === node.chainRefId ? 'selected' : ''}>${esc(c.label)}</option>`)
      .join('');
    const cr = state.chainRuns.find((r) => r.nodeIds.includes(node.id));
    const csum = cr ? computeChainRunSummary(cr) : null;
    const cVal = csum?.cDist ?? 0;
    propsPanel.innerHTML = `
      <div class="tx-props-head">Configuracion: Piñon #${node.id}</div>
      <div class="lab-grid lab-grid--2 tx-props-grid">
      <div class="lab-field"><label>z dientes ${helpTip('Numero de dientes del pinon. Influye en velocidad, par y efecto poligonal.')}</label><input type="number" min="6" data-tx-p="z" value="${node.z}" /></div>
      <div class="lab-field lab-field--wide"><label>Cadena ISO/ANSI ${helpTip('Seleccione el paso de cadena comercial para longitud en pasos y verificacion de cierre.')}</label><select data-tx-p="chain">${opts}</select></div>
      <div class="lab-field"><label>X (mm) ${helpTip('Coordenada horizontal del centro del pinon.')}</label><input type="number" step="1" data-tx-p="x" value="${(node.x ?? 0).toFixed(0)}" /></div>
      <div class="lab-field"><label>Y (mm) ${helpTip('Coordenada vertical del centro del pinon.')}</label><input type="number" step="1" data-tx-p="y" value="${(node.y ?? 0).toFixed(0)}" /></div>
      ${
        cr && csum
          ? `<div class="lab-field lab-field--wide"><label>C1 manual (mm) ${helpTip('Distancia entre centros del primer tramo de cadena; ajusta longitud total y numero de pasos.')}</label><input type="number" min="20" step="1" data-tx-p="chainC" value="${cVal.toFixed(0)}" /></div>
      <div class="tx-run-summary">
        <div><strong>Cadena ${esc(cr.id)}</strong> · paso p = ${csum.p.toFixed(3)} mm</div>
        <div>Longitud total: <strong>${csum.geo.length_mm.toFixed(1)} mm</strong></div>
        <div>Longitud en pasos: <strong>${csum.Lp.toFixed(2)}</strong> → entero al alza: <strong>${csum.hints.Lp_round_up}</strong></div>
        <div>Eslabón de unión típico: <strong>${csum.hints.connectingLink_count_typical}</strong></div>
        <div>${csum.hints.offsetLink_recommended ? '<strong>Recomendado:</strong> eslabón desplazado (offset / 1/2 paso) o ajustar C.' : 'Cierre habitual sin offset (pasos pares al alza).'}</div>
      </div>`
          : ''
      }
      </div>
      <button type="button" class="lab-btn" data-tx-p="del" style="margin-top:0.5rem">Eliminar elemento</button>`;
  }

  propsPanel.querySelector('[data-tx-p="del"]')?.addEventListener('click', () => {
    const sid = state.selectedId;
    if (sid != null) removeNode(state, sid);
    propsDirty = true;
  });

  propsPanel.querySelector('[data-tx-p="applyIdler"]')?.addEventListener('click', () => {
    if (node.kind !== 'pulley') return;
    const sel = propsPanel.querySelector('[data-tx-p="idlerRun"]');
    const runId = sel instanceof HTMLSelectElement ? String(sel.value || '') : '';
    if (!runId) return;
    attachPulleyAsIdlerToRun(node.id, runId);
    propsDirty = true;
    const { n: n0, T: t0 } = readMotorInputs();
    const kin = propagateKinematics(state, n0, t0);
    const verdict = computeVerdicts(state, kin);
    updateHud(kin, verdict);
    drawSvg(kin);
    syncPropsPanel();
  });
  propsPanel.querySelectorAll('[data-tx-p="runChip"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const runId = btn.getAttribute('data-run-id');
      const sel = propsPanel.querySelector('[data-tx-p="idlerRun"]');
      if (runId && sel instanceof HTMLSelectElement) sel.value = runId;
      propsPanel.querySelectorAll('[data-tx-p="runChip"]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
    });
  });
  propsPanel.querySelectorAll('[data-tx-p="pulleyRoleSeg"] button[data-role]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const roleBtn = btn.getAttribute('data-role');
      if (!roleBtn || node.kind !== 'pulley') return;
      node.pulleyRole = roleBtn;
      if (node.pulleyRole !== 'idler') node.isExternal = false;
      propsDirty = true;
    });
  });

  propsPanel.querySelectorAll('input[data-tx-p],select[data-tx-p]').forEach((el) => {
    el.addEventListener('input', () => {
      const k = el.getAttribute('data-tx-p');
      if (k === 'z' && (node.kind === 'gear' || node.kind === 'sprocket')) {
        node.z = Math.max(6, Math.round(parseFloat(/** @type {HTMLInputElement} */ (el).value) || 6));
      }
      if (k === 'm' && node.kind === 'gear') {
        node.module_mm = Math.max(0.25, parseFloat(/** @type {HTMLInputElement} */ (el).value) || 2.5);
      }
      if (k === 'b' && node.kind === 'gear') {
        node.faceWidth_mm = Math.max(4, parseFloat(/** @type {HTMLInputElement} */ (el).value) || 18);
      }
      if (k === 'alpha' && node.kind === 'gear') {
        node.alpha_deg = Math.max(14.5, Math.min(30, parseFloat(/** @type {HTMLInputElement} */ (el).value) || 20));
      }
      if (k === 'beta' && node.kind === 'gear') {
        node.beta_deg = Math.max(0, Math.min(45, parseFloat(/** @type {HTMLInputElement} */ (el).value) || 0));
      }
      if (k === 'eta' && node.kind === 'gear') {
        node.meshEff_pct = Math.max(85, Math.min(99.9, parseFloat(/** @type {HTMLInputElement} */ (el).value) || 98.5));
      }
      if (k === 'd' && node.kind === 'pulley') {
        node.d_mm = Math.max(10, parseFloat(/** @type {HTMLInputElement} */ (el).value) || 100);
      }
      if (k === 'dRange' && node.kind === 'pulley') {
        node.d_mm = Math.max(10, parseFloat(/** @type {HTMLInputElement} */ (el).value) || 100);
        const dInput = propsPanel.querySelector('input[data-tx-p="d"]');
        if (dInput instanceof HTMLInputElement) dInput.value = `${Math.round(node.d_mm)}`;
      }
      if (k === 'pulleyRole' && node.kind === 'pulley' && el instanceof HTMLSelectElement) {
        if (el.value === 'drive' || el.value === 'driven' || el.value === 'idler') node.pulleyRole = el.value;
        if (node.pulleyRole !== 'idler') node.isExternal = false;
      }
      if (k === 'idlerWrap' && node.kind === 'pulley' && el instanceof HTMLSelectElement) {
        if (el.value === 'inside' || el.value === 'outside') node.idlerWrapSide = el.value;
        node.isExternal = node.pulleyRole === 'idler' && node.idlerWrapSide === 'outside';
      }
      if (k === 'isExternal' && node.kind === 'pulley' && el instanceof HTMLInputElement) {
        node.isExternal = node.pulleyRole === 'idler' ? !!el.checked : false;
        node.idlerWrapSide = node.isExternal ? 'outside' : 'inside';
      }
      if (k === 'x') {
        const v = parseFloat(/** @type {HTMLInputElement} */ (el).value);
        if (Number.isFinite(v)) node.x = v;
      }
      if (k === 'y') {
        const v = parseFloat(/** @type {HTMLInputElement} */ (el).value);
        if (Number.isFinite(v)) node.y = v;
      }
      if (k === 'chain' && node.kind === 'sprocket' && el instanceof HTMLSelectElement) {
        node.chainRefId = el.value;
        const row = CHAIN_CATALOG.find((c) => c.id === el.value);
        if (row) node.pitch_mm = row.pitch_mm;
      }
      if (k === 'beltC' && node.kind === 'pulley') {
        const run = state.beltRuns.find((r) => r.nodeIds.includes(node.id));
        const v = Math.max(20, parseFloat(/** @type {HTMLInputElement} */ (el).value) || 0);
        if (run) run.centerOverride_mm = Number.isFinite(v) ? v : 0;
      }
      if (k === 'slip' && node.kind === 'pulley') {
        const run = state.beltRuns.find((r) => r.nodeIds.includes(node.id));
        const pct = Math.max(0, Math.min(8, parseFloat(/** @type {HTMLInputElement} */ (el).value) || 0));
        if (run && run.kind === 'v') run.slip = pct / 100;
      }
      if (k === 'chainC' && node.kind === 'sprocket') {
        const run = state.chainRuns.find((r) => r.nodeIds.includes(node.id));
        const v = Math.max(20, parseFloat(/** @type {HTMLInputElement} */ (el).value) || 0);
        if (run) run.centerOverride_mm = Number.isFinite(v) ? v : 0;
      }
      const { n: n0, T: t0 } = readMotorInputs();
      const kin = propagateKinematics(state, n0, t0);
      const verdict = computeVerdicts(state, kin);
      updateHud(kin, verdict);
      drawSvg(kin);
    });
    el.addEventListener('change', () => {
      if (el instanceof HTMLSelectElement || (el instanceof HTMLInputElement && el.type === 'checkbox')) {
        const key = el.getAttribute('data-tx-p');
        if (key === 'chain' || key === 'pulleyRole' || key === 'idlerWrap' || key === 'isExternal') {
          el.dispatchEvent(new Event('input'));
        }
      }
    });
  });
}

function switchTab(tab) {
  activeTab = tab;
  mode = 'none';
  pending = null;
  drag = null;
  beltModeBtn?.classList.remove('tx-btn--active');
  chainModeBtn?.classList.remove('tx-btn--active');
  document.querySelectorAll('[data-tx-tab]').forEach((btn) => {
    if (!(btn instanceof HTMLElement)) return;
    const t = btn.getAttribute('data-tx-tab');
    const on = t === tab;
    btn.classList.toggle('tx-tab--active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  const pg = document.getElementById('txPanelGears');
  const pb = document.getElementById('txPanelBelts');
  const pc = document.getElementById('txPanelChains');
  if (pg) pg.hidden = tab !== 'gears';
  if (pb) pb.hidden = tab !== 'belts';
  if (pc) pc.hidden = tab !== 'chains';
  if (!selectedMatchesTab()) state.selectedId = null;
  propsDirty = true;
}

function autoCorrectTangents() {
  for (const br of state.beltRuns) {
    const ids = [...(br.nodeIds || [])];
    for (const id of ids) {
      const n = state.nodes.find((x) => x.id === id);
      if (!n || n.kind !== 'pulley' || n.pulleyRole !== 'idler') continue;
      n.isExternal = n.idlerWrapSide !== 'inside';
      n.idlerWrapSide = n.isExternal ? 'outside' : 'inside';
    }
  }
  propsDirty = true;
}

document.querySelectorAll('[data-tx-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const t = btn.getAttribute('data-tx-tab');
    if (t === 'gears' || t === 'belts' || t === 'chains') switchTab(t);
  });
});

document.getElementById('txAddGear')?.addEventListener('click', () => {
  const { x, y } = spawnXY('gear');
  addNode(state, 'gear', x, y);
  propsDirty = true;
});
document.getElementById('txAddPulley')?.addEventListener('click', () => {
  const { x, y } = spawnXY('pulley');
  addNode(state, 'pulley', x, y);
  propsDirty = true;
});
document.getElementById('txAddSprocket')?.addEventListener('click', () => {
  const { x, y } = spawnXY('sprocket');
  addNode(state, 'sprocket', x, y);
  propsDirty = true;
});

document.getElementById('txClearGears')?.addEventListener('click', () => {
  clearGearsWorkspace();
});
document.getElementById('txClearBelts')?.addEventListener('click', () => {
  clearBeltsWorkspace();
  manualHoverPulleyId = null;
  manualEdgeSigns = [];
});
document.getElementById('txClearChains')?.addEventListener('click', () => {
  clearChainsWorkspace();
});

motorBtn?.addEventListener('click', () => {
  if (state.selectedId != null) setMotor(state, state.selectedId);
  propsDirty = true;
});

beltModeBtn?.addEventListener('click', () => {
  mode = mode === 'belt' ? 'none' : 'belt';
  state.beltPickOrder = [];
  manualEdgeSigns = [];
  manualHoverPulleyId = null;
  beltModeBtn.classList.toggle('tx-btn--active', mode === 'belt');
});

document.getElementById('txBeltManual')?.addEventListener('click', () => {
  manualBeltTrace = !manualBeltTrace;
  const btn = document.getElementById('txBeltManual');
  btn?.classList.toggle('tx-btn--active', manualBeltTrace);
  if (!manualBeltTrace) {
    manualHoverPulleyId = null;
  }
});

chainModeBtn?.addEventListener('click', () => {
  mode = mode === 'chain' ? 'none' : 'chain';
  state.chainPickOrder = [];
  chainModeBtn.classList.toggle('tx-btn--active', mode === 'chain');
});

function finishBelt(kind) {
  const ids = [...state.beltPickOrder];
  const uniq = [...new Set(ids)].filter((id) => state.nodes.some((n) => n.id === id && n.kind === 'pulley'));
  if (uniq.length < 2) {
    alert('Seleccione al menos 2 poleas en orden (modo «Elegir orden», clic corto en cada una).');
    return;
  }
  /** @type {Array<-1|1>|undefined} */
  let edgeSigns;
  if (manualBeltTrace && uniq.length >= 2) {
    edgeSigns = [];
    for (let i = 0; i < uniq.length - 1; i++) {
      edgeSigns.push(manualEdgeSigns[i] === -1 ? -1 : 1);
    }
    const a = state.nodes.find((n) => n.id === uniq[uniq.length - 1] && n.kind === 'pulley');
    const b = state.nodes.find((n) => n.id === uniq[0] && n.kind === 'pulley');
    if (a && b) edgeSigns.push(chooseSignBetweenPulleys(a, b, manualCursor));
  }
  state.beltRuns.push({
    id: `${kind}-${Date.now()}`,
    nodeIds: uniq,
    kind,
    slip: kind === 'sync' ? 0 : 0.018,
    centerOverride_mm: 0,
    edgeSigns,
  });
  state.beltPickOrder = [];
  manualEdgeSigns = [];
  mode = 'none';
  beltModeBtn?.classList.remove('tx-btn--active');
  propsDirty = true;
}

finishBeltBtn?.addEventListener('click', () => finishBelt('v'));
finishSyncBtn?.addEventListener('click', () => finishBelt('sync'));

finishChainBtn?.addEventListener('click', () => {
  const ids = [...state.chainPickOrder];
  const uniq = [...new Set(ids)].filter((id) => state.nodes.some((n) => n.id === id && n.kind === 'sprocket'));
  if (uniq.length < 2) {
    alert('Seleccione al menos 2 piñones en orden.');
    return;
  }
  const first = state.nodes.find((n) => n.id === uniq[0]);
  state.chainRuns.push({
    id: `chain-${Date.now()}`,
    nodeIds: uniq,
    chainRefId: first?.chainRefId ?? 'iso-08b-1',
    centerOverride_mm: 0,
  });
  state.chainPickOrder = [];
  mode = 'none';
  chainModeBtn?.classList.remove('tx-btn--active');
  propsDirty = true;
});

inpN?.addEventListener('input', () => {
  propsDirty = true;
});
inpT?.addEventListener('input', () => {
  propsDirty = true;
});

function applyZoom(factor, centerOnView) {
  const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, viewPanZoom.zoom * factor));
  if (centerOnView && svg && svgWrap) {
    const rect = svg.getBoundingClientRect();
    const rw = rect.width;
    const rh = rect.height;
    const mx = (0.5 * rw) / rw;
    const my = (0.5 * rh) / rh;
    const oldW = BASE_W / viewPanZoom.zoom;
    const oldH = BASE_H / viewPanZoom.zoom;
    const vx = viewPanZoom.cx - oldW / 2;
    const vy = viewPanZoom.cy - oldH / 2;
    const worldX = vx + mx * oldW;
    const worldY = vy + my * oldH;
    viewPanZoom.zoom = next;
    const newW = BASE_W / viewPanZoom.zoom;
    const newH = BASE_H / viewPanZoom.zoom;
    viewPanZoom.cx = worldX - mx * newW + newW / 2;
    viewPanZoom.cy = worldY - my * newH + newH / 2;
  } else {
    viewPanZoom.zoom = next;
  }
  clampViewCenter();
  updateZoomLabel();
}

document.getElementById('txZoomIn')?.addEventListener('click', () => applyZoom(1.15, true));
document.getElementById('txZoomOut')?.addEventListener('click', () => applyZoom(1 / 1.15, true));
document.getElementById('txZoomFit')?.addEventListener('click', () => fitViewToContent());

svgWrap?.addEventListener(
  'wheel',
  (ev) => {
    ev.preventDefault();
    const dir = ev.deltaY > 0 ? 1 / 1.08 : 1.08;
    if (!(svg instanceof SVGSVGElement)) return;
    const rect = svg.getBoundingClientRect();
    const rw = Math.max(1, rect.width);
    const rh = Math.max(1, rect.height);
    const mx = (ev.clientX - rect.left) / rw;
    const my = (ev.clientY - rect.top) / rh;
    const oldW = BASE_W / viewPanZoom.zoom;
    const oldH = BASE_H / viewPanZoom.zoom;
    const vx = viewPanZoom.cx - oldW / 2;
    const vy = viewPanZoom.cy - oldH / 2;
    const worldX = vx + mx * oldW;
    const worldY = vy + my * oldH;
    viewPanZoom.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, viewPanZoom.zoom * dir));
    const newW = BASE_W / viewPanZoom.zoom;
    const newH = BASE_H / viewPanZoom.zoom;
    viewPanZoom.cx = worldX - mx * newW + newW / 2;
    viewPanZoom.cy = worldY - my * newH + newH / 2;
    clampViewCenter();
    updateZoomLabel();
  },
  { passive: false },
);

window.addEventListener('keydown', (ev) => {
  if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement || ev.target instanceof HTMLSelectElement) return;
  const step = 80 / viewPanZoom.zoom;
  if (ev.key === 'ArrowLeft') {
    viewPanZoom.cx -= step;
    clampViewCenter();
  } else if (ev.key === 'ArrowRight') {
    viewPanZoom.cx += step;
    clampViewCenter();
  } else if (ev.key === 'ArrowUp') {
    viewPanZoom.cy -= step;
    clampViewCenter();
  } else if (ev.key === 'ArrowDown') {
    viewPanZoom.cy += step;
    clampViewCenter();
  } else return;
  ev.preventDefault();
});

window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('pointercancel', onPointerUp);
window.addEventListener('click', () => closeContextMenu());
window.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') closeContextMenu();
});

updateZoomLabel();
switchTab('gears');
fitViewToContent();
requestAnimationFrame(frame);
