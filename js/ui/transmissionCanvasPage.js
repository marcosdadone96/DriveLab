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
  propagateKinematics,
  computeVerdicts,
  buildOpenBeltPath2D,
  nearestCommercialVBeltLength,
  VERDICT,
} from '../lab/transmissionCanvasEngine.js';
import { CHAIN_CATALOG } from '../lab/chainCatalog.js';
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

const BASE_W = 2400;
const BASE_H = 1400;
let viewPanZoom = { cx: BASE_W / 2, cy: BASE_H / 2, zoom: 1 };
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 5;

let lastT = performance.now();
let propsDirty = true;

const svg = document.getElementById('txSvg');
const svgWrap = document.getElementById('txSvgWrap');
const hudFormulas = document.getElementById('txFormulas');
const hudVerdict = document.getElementById('txVerdict');
const hudInputChecks = document.getElementById('txInputChecks');
const hudElements = document.getElementById('txElementResults');
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
  const vis = state.nodes.filter((n) => kindVisibleInTab(n.kind));
  if (!vis.length) {
    hudElements.innerHTML = '<div class="tx-check tx-check--warn">Sin elementos para mostrar.</div>';
    return;
  }
  const kindLabel = { gear: 'Rueda', pulley: 'Polea', sprocket: 'Piñón' };
  hudElements.innerHTML = vis
    .map((n, idx) => {
      const k = kin.byId?.[n.id];
      const rpm = k ? Math.abs(k.n_rpm).toFixed(1) : '--';
      const torque = k ? k.T_Nm.toFixed(2) : '--';
      const ratio = k ? k.ratioFromMotor.toFixed(3) : '--';
      const dim = n.kind === 'pulley' ? `${Math.round(getNodeD_mm(n))} mm` : `z${n.z ?? '--'}`;
      return `<article class="tx-element-card">
        <div class="tx-element-card__title">${kindLabel[n.kind]} ${idx + 1}</div>
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
    hudVerdict.innerHTML = verdict.items.map((it) => `<p class="tx-verdict-line">${esc(it.text)}</p>`).join('');
  }

  if (hudPick) {
    if (activeTab === 'belts' && mode === 'belt') {
      hudPick.textContent = `Orden de correa: [${state.beltPickOrder.join(', ')}] — cierre con V o síncrona. Clic corto = añadir; arrastre = mover.`;
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
}

/** Geometría de lazo abierto (correa o cadena sobre primitivos). */
function pathGeometryForIds(nodeIds) {
  const centers = [];
  const radii = [];
  for (const id of nodeIds) {
    const n = state.nodes.find((x) => x.id === id);
    if (!n) {
      return { pathD: '', length_mm: 0, reliable: false, note: 'Falta un nodo en la ruta.' };
    }
    centers.push({ x: n.x, y: n.y });
    radii.push(getNodeD_mm(n) / 2);
  }
  return buildOpenBeltPath2D(centers, radii);
}

function beltPathForRun(br) {
  return pathGeometryForIds(br.nodeIds);
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
  if (showBelts) {
    const previewIds = getBeltPreviewNodeIds();
    if (previewIds) {
      const geo = pathGeometryForIds(previewIds);
      if (geo.pathD) {
        beltsHtml += `<path class="tx-path-preview" d="${geo.pathD}" fill="none" stroke="#d97706" stroke-width="4" stroke-dasharray="14 8" stroke-linejoin="round" opacity="0.75" />`;
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
      }
    }
  }

  let chainsHtml = '';
  if (showChains) {
    const previewCIds = getChainPreviewNodeIds();
    if (previewCIds) {
      const geo = pathGeometryForIds(previewCIds);
      if (geo.pathD) {
        chainsHtml += `<path class="tx-path-preview" d="${geo.pathD}" fill="none" stroke="#475569" stroke-width="4" stroke-dasharray="12 7" stroke-linejoin="round" opacity="0.72" />`;
      }
    }
    for (const cr of state.chainRuns) {
      const geo = pathGeometryForIds(cr.nodeIds);
      if (geo.pathD) {
        chainsHtml += `<path d="${geo.pathD}" fill="none" stroke="#1e293b" stroke-width="5" stroke-linejoin="round" opacity="0.9" />`;
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
    }
  }

  let nodesHtml = '';
  for (const node of state.nodes) {
    if (!kindVisibleInTab(node.kind)) continue;

    const sel = state.selectedId === node.id;
    const D = getNodeD_mm(node);
    const r = D / 2;
    const k = node.kind;
    const fill = k === 'gear' ? '#ccfbf1' : k === 'pulley' ? '#fef3c7' : '#e2e8f0';
    const stroke = sel ? '#0d9488' : k === 'gear' ? '#0f766e' : k === 'pulley' ? '#b45309' : '#475569';
    const sw = sel ? 4 : 2.5;
    const ph = node.phase_rad ?? 0;
    const rotDeg = (ph * 180) / Math.PI;
    const motorRing = node.isMotor ? `<circle cx="${node.x}" cy="${node.y}" r="${r + 12}" fill="none" stroke="#059669" stroke-width="3" stroke-dasharray="6 4" />` : '';

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
    const zLabel = k === 'pulley' ? `Ø${Math.round(D)}` : `z${node.z ?? '—'}`;
    const tag = kn ? `${zLabel} · ${Math.abs(kn.n_rpm).toFixed(0)} rpm · ${kn.T_Nm.toFixed(1)} N*m` : `${k} #${node.id}`;

    nodesHtml += `<g class="tx-node" data-id="${node.id}" style="cursor:grab">
      ${motorRing}
      <g transform="rotate(${rotDeg.toFixed(2)} ${node.x} ${node.y})">
        <circle cx="${node.x}" cy="${node.y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" />
        ${symbol}
      </g>
      ${
        sel
          ? `<rect x="${node.x - 84}" y="${node.y - r - 44}" width="168" height="34" rx="5" fill="#0f172a" opacity="0.93" />
      <text x="${node.x}" y="${node.y - r - 24}" text-anchor="middle" font-size="10" font-weight="700" fill="#f8fafc" font-family="Inter,system-ui,sans-serif">${esc(tag)}</text>`
          : ''
      }
    </g>`;
  }

  svg.innerHTML = defs + beltsHtml + chainsHtml + meshHtml + nodesHtml;

  svg.querySelectorAll('.tx-node').forEach((g) => {
    g.addEventListener('pointerdown', (ev) => {
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
    state.beltPickOrder.push(n.id);
    state.selectedId = n.id;
  } else if (activeTab === 'chains' && mode === 'chain' && n.kind === 'sprocket') {
    state.chainPickOrder.push(n.id);
    state.selectedId = n.id;
  }
  pending = null;
}

function onPointerMove(ev) {
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
  if (pending) tryPickShortClick(ev);
  if (drag) {
    const node = state.nodes.find((n) => n.id === drag.id);
    if (node?.kind === 'gear') snapGearToPeer(state, node.id, 22);
  }
  drag = null;
  pending = null;
  propsDirty = true;
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
    propsPanel.innerHTML = `
      <div class="lab-grid lab-grid--2">
        <div class="lab-field"><label>z</label><input type="number" min="6" data-tx-p="z" value="${node.z}" /></div>
        <div class="lab-field"><label>m (mm)</label><input type="number" min="0.25" step="0.25" data-tx-p="m" value="${node.module_mm}" /></div>
        <div class="lab-field lab-field--wide"><label>Ancho b (mm)</label><input type="number" min="4" data-tx-p="b" value="${node.faceWidth_mm}" /></div>
      </div>
      <button type="button" class="lab-btn" data-tx-p="del" style="margin-top:0.5rem">Eliminar elemento</button>`;
  } else if (node.kind === 'pulley') {
    propsPanel.innerHTML = `
      <div class="lab-field"><label>Ø primitivo (mm)</label><input type="number" min="10" data-tx-p="d" value="${node.d_mm}" /></div>
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
    propsPanel.innerHTML = `
      <div class="lab-field"><label>z dientes</label><input type="number" min="6" data-tx-p="z" value="${node.z}" /></div>
      <div class="lab-field lab-field--wide"><label>Cadena ISO/ANSI</label><select data-tx-p="chain">${opts}</select></div>
      <button type="button" class="lab-btn" data-tx-p="del" style="margin-top:0.5rem">Eliminar elemento</button>`;
  }

  propsPanel.querySelector('[data-tx-p="del"]')?.addEventListener('click', () => {
    const sid = state.selectedId;
    if (sid != null) removeNode(state, sid);
    propsDirty = true;
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
      if (k === 'd' && node.kind === 'pulley') {
        node.d_mm = Math.max(10, parseFloat(/** @type {HTMLInputElement} */ (el).value) || 100);
      }
      if (k === 'chain' && node.kind === 'sprocket' && el instanceof HTMLSelectElement) {
        node.chainRefId = el.value;
        const row = CHAIN_CATALOG.find((c) => c.id === el.value);
        if (row) node.pitch_mm = row.pitch_mm;
      }
      const { n: n0, T: t0 } = readMotorInputs();
      const kin = propagateKinematics(state, n0, t0);
      const verdict = computeVerdicts(state, kin);
      updateHud(kin, verdict);
      drawSvg(kin);
    });
    el.addEventListener('change', () => {
      if (el instanceof HTMLSelectElement && el.getAttribute('data-tx-p') === 'chain') {
        el.dispatchEvent(new Event('input'));
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
  beltModeBtn.classList.toggle('tx-btn--active', mode === 'belt');
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
  state.beltRuns.push({
    id: `${kind}-${Date.now()}`,
    nodeIds: uniq,
    kind,
    slip: kind === 'sync' ? 0 : 0.018,
  });
  state.beltPickOrder = [];
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

updateZoomLabel();
switchTab('gears');
fitViewToContent();
requestAnimationFrame(frame);
