/**
 * Estudio modular Pro: lienzo con arrastre, N poleas / N ruedas cadena / tren reconfigurable.
 */

import { renderStudioSchematic } from './studioSchematic.js';
import {
  cascadeSpeeds,
  beltMaxCenter_mm,
  normalizeBeltStage,
  clampBeltSpansInPlace,
  normalizeChainStage,
  clampChainSpansInPlace,
  addIntermediateBeltPulley,
  removeIntermediateBeltPulley,
  addIntermediateChainSprocket,
  removeIntermediateChainSprocket,
  addIntermediateGear,
  removeIntermediateGear,
  beltMinCenter_mm,
  chainSpanMin_mm,
} from '../lab/studioKinematics.js';

const DND_TYPE = 'application/x-mdt-studio';

/** @typedef {{ id: number; type: 'gear_train'; module_mm: number; gears: { z: number }[] }} GearTrainStage */
/** @typedef {{ id: number; type: 'belt'; d1?: number; d2?: number; center_mm?: number; pulleys?: { d: number }[]; spans_mm?: number[] }} BeltStage */
/** @typedef {{ id: number; type: 'chain'; z1?: number; z2?: number; pitch_mm: number; center_mm?: number; sprockets?: { z: number }[]; spans_mm?: number[] }} ChainStage */
/** @typedef {GearTrainStage | BeltStage | ChainStage} Stage */

/** @type {Stage[]} */
let stages = [];
let nextId = 1;
/** @type {number | null} */
let timelineDragFrom = null;

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function readN0() {
  const el = document.getElementById('stN0');
  const n = el instanceof HTMLInputElement ? parseFloat(el.value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 1455;
}

function labelForStage(s) {
  if (s.type === 'gear_train') {
    const zs = s.gears.map((g) => g.z).join(' · ');
    return `Tren m=${s.module_mm} mm · ${s.gears.length} ruedas · z: ${zs}`;
  }
  if (s.type === 'belt') {
    normalizeBeltStage(s);
    const ds = s.pulleys.map((p) => p.d.toFixed(0)).join(', ');
    const cs = s.spans_mm.map((c) => Number(c).toFixed(0)).join(', ');
    return `Correa ${s.pulleys.length} poleas · Ø mm: ${ds} · C mm: ${cs}`;
  }
  normalizeChainStage(s);
  const zs = s.sprockets.map((g) => g.z).join(', ');
  const cs = s.spans_mm.map((c) => Number(c).toFixed(0)).join(', ');
  return `Cadena ${s.sprockets.length} ruedas · z: ${zs} · C mm: ${cs}`;
}

function shortTimelineLabel(s) {
  if (s.type === 'gear_train') return 'Tren';
  if (s.type === 'belt') return 'Correa';
  return 'Cadena';
}

function addStageByType(t) {
  if (t === 'gear_train') {
    stages.push({
      id: nextId++,
      type: 'gear_train',
      module_mm: 2.5,
      gears: [{ z: 20 }, { z: 30 }, { z: 45 }],
    });
  } else if (t === 'belt') {
    const d1 = 125;
    const d2 = 250;
    const lo = beltMinCenter_mm(d1, d2);
    const c0 = Math.max(lo, 400);
    stages.push({
      id: nextId++,
      type: 'belt',
      pulleys: [{ d: d1 }, { d: d2 }],
      spans_mm: [c0],
      d1,
      d2,
      center_mm: c0,
    });
  } else if (t === 'chain') {
    const p = 19.05;
    const z1 = 17;
    const z2 = 25;
    stages.push({
      id: nextId++,
      type: 'chain',
      pitch_mm: p,
      sprockets: [{ z: z1 }, { z: z2 }],
      spans_mm: [400],
      z1,
      z2,
      center_mm: 400,
    });
    normalizeChainStage(stages[stages.length - 1]);
    clampChainSpansInPlace(stages[stages.length - 1]);
  }
}

function moveStage(from, to) {
  if (from === to) return;
  if (from < 0 || to < 0 || from >= stages.length || to >= stages.length) return;
  const [item] = stages.splice(from, 1);
  stages.splice(to, 0, item);
}

function updateDropZoneChrome() {
  const dz = document.getElementById('studioDropZone');
  if (!dz) return;
  const title = dz.querySelector('.studio-dropzone__title');
  const hint = dz.querySelector('.studio-dropzone__hint');
  if (stages.length) {
    dz.classList.add('studio-dropzone--has-stages');
    if (title) title.textContent = 'Suelte otra ficha para añadir al final';
    if (hint) hint.textContent = 'Reordene las etapas arrastrando las pastillas de la cinta inferior.';
  } else {
    dz.classList.remove('studio-dropzone--has-stages');
    if (title) title.textContent = 'Suelte aquí un componente';
    if (hint) hint.textContent = 'O haga clic en una ficha de la paleta (acceso rápido).';
  }
}

function renderTimeline() {
  const el = document.getElementById('studioTimeline');
  if (!el) return;
  if (!stages.length) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  el.hidden = false;
  const pills = stages
    .map(
      (s, i) => `
    <div class="studio-timeline__pill studio-timeline__pill--${s.type}" draggable="true" data-reorder-idx="${i}" role="listitem">
      <span class="studio-timeline__n">${i + 1}</span>
      <span class="studio-timeline__name">${esc(shortTimelineLabel(s))}</span>
    </div>`,
    )
    .join('<span class="studio-timeline__arrow" aria-hidden="true">→</span>');

  el.innerHTML = `
    <div class="studio-timeline__label">Secuencia cinemática</div>
    <div class="studio-timeline__track" role="list">${pills}</div>
  `;

  el.querySelectorAll('[data-reorder-idx]').forEach((pill) => {
    if (!(pill instanceof HTMLElement)) return;
    pill.addEventListener('dragstart', (ev) => {
      const idx = Number(pill.getAttribute('data-reorder-idx'));
      timelineDragFrom = idx;
      pill.classList.add('studio-timeline__pill--dragging');
      try {
        ev.dataTransfer?.setData('text/plain', String(idx));
        ev.dataTransfer.effectAllowed = 'move';
      } catch (_) {
        /* ignore */
      }
    });
    pill.addEventListener('dragend', () => {
      pill.classList.remove('studio-timeline__pill--dragging');
      timelineDragFrom = null;
    });
    pill.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      try {
        ev.dataTransfer.dropEffect = 'move';
      } catch (_) {
        /* ignore */
      }
    });
    pill.addEventListener('drop', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      let from = timelineDragFrom;
      if (from === null) {
        try {
          from = parseInt(ev.dataTransfer?.getData('text/plain') || '', 10);
        } catch (_) {
          from = NaN;
        }
      }
      const to = Number(pill.getAttribute('data-reorder-idx'));
      if (!Number.isFinite(from) || !Number.isFinite(to)) return;
      moveStage(from, to);
      render();
    });
  });
}

function syncSchematic() {
  const svg = document.getElementById('studioSchematic');
  renderStudioSchematic(svg instanceof SVGSVGElement ? svg : null, {
    stages,
    onStudioSpanChange: (id, kind, spanIdx, spanMm) => {
      const st = stages.find((x) => x.id === id);
      if (!st) return;
      const hi = beltMaxCenter_mm();
      if (kind === 'belt' && st.type === 'belt') {
        normalizeBeltStage(st);
        const lo = beltMinCenter_mm(st.pulleys[spanIdx].d, st.pulleys[spanIdx + 1].d);
        st.spans_mm[spanIdx] = Math.min(hi, Math.max(lo, spanMm));
        clampBeltSpansInPlace(st);
      } else if (kind === 'chain' && st.type === 'chain') {
        normalizeChainStage(st);
        const p = Math.max(4, st.pitch_mm ?? 19.05);
        const zL = Math.max(6, st.sprockets[spanIdx].z);
        const zR = Math.max(6, st.sprockets[spanIdx + 1].z);
        const lo = chainSpanMin_mm(p, zL, zR);
        st.spans_mm[spanIdx] = Math.min(hi, Math.max(lo, spanMm));
        clampChainSpansInPlace(st);
      }
      updateSummary();
      syncSchematic();
    },
  });
}

function updateSummary() {
  const cardsEl = document.getElementById('studioSummaryCards');
  const jsonEl = document.getElementById('studioJson');
  const n0 = readN0();

  for (const s of stages) {
    if (s.type === 'belt') {
      normalizeBeltStage(s);
      clampBeltSpansInPlace(s);
    }
    if (s.type === 'chain') {
      normalizeChainStage(s);
      clampChainSpansInPlace(s);
    }
  }

  const { rows, n_final, total_ratio } = cascadeSpeeds(n0, stages);

  /** @type {Array<{level:'ok'|'warn'|'err', text:string}>} */
  const checks = [];
  if (!(Number.isFinite(n0) && n0 > 0)) checks.push({ level: 'err', text: 'n entrada debe ser mayor que 0 rpm.' });
  if (!stages.length) checks.push({ level: 'warn', text: 'No hay etapas en el lienzo.' });
  for (const s of stages) {
    if (s.type === 'gear_train' && s.gears.some((g) => !Number.isFinite(g.z) || g.z < 6)) checks.push({ level: 'err', text: `Tren ${s.id}: dientes inválidos (z < 6).` });
    if (s.type === 'belt' && s.pulleys.some((p) => !Number.isFinite(p.d) || p.d <= 0)) checks.push({ level: 'err', text: `Correa ${s.id}: diámetros inválidos.` });
    if (s.type === 'chain' && s.sprockets.some((sp) => !Number.isFinite(sp.z) || sp.z < 6)) checks.push({ level: 'err', text: `Cadena ${s.id}: dientes inválidos (z < 6).` });
  }
  if (!checks.length) checks.push({ level: 'ok', text: 'Entradas coherentes. Cálculo resuelto.' });

  function stageElementsHtml(r) {
    const s = r.stage;
    if (s.type === 'gear_train') {
      let nCurrent = r.n_in;
      const els = s.gears.map((g, idx) => {
        if (idx > 0) {
          const zPrev = s.gears[idx - 1].z;
          nCurrent = -(nCurrent * zPrev) / g.z;
        }
        return `<div class="studio-stage-el"><div class="studio-stage-el__t">Rueda ${idx + 1}</div><div class="studio-stage-el__v">z=${g.z}<br>n=${nCurrent.toFixed(1)} rpm</div></div>`;
      });
      return `<div class="studio-stage-elements">${els.join('')}</div>`;
    }
    if (s.type === 'belt') {
      const d1 = s.pulleys[0]?.d || 1;
      const els = s.pulleys.map((p, idx) => {
        const nEl = r.n_in * (d1 / Math.max(1, p.d));
        return `<div class="studio-stage-el"><div class="studio-stage-el__t">Polea ${idx + 1}</div><div class="studio-stage-el__v">D=${p.d.toFixed(0)} mm<br>n=${nEl.toFixed(1)} rpm</div></div>`;
      });
      return `<div class="studio-stage-elements">${els.join('')}</div>`;
    }
    const z1 = s.sprockets[0]?.z || 1;
    const els = s.sprockets.map((sp, idx) => {
      const nEl = r.n_in * (z1 / Math.max(1, sp.z));
      return `<div class="studio-stage-el"><div class="studio-stage-el__t">Rueda ${idx + 1}</div><div class="studio-stage-el__v">z=${sp.z}<br>n=${nEl.toFixed(1)} rpm</div></div>`;
    });
    return `<div class="studio-stage-elements">${els.join('')}</div>`;
  }

  if (cardsEl) {
    if (!rows.length) {
      cardsEl.innerHTML =
        '<div class="studio-empty-results">Arrastre componentes al lienzo para ver velocidades, relaciones <em>i</em> y el producto cinemático.</div>';
    } else {
      const stageBlocks = rows
        .map(
          (r, i) => `
        <div class="studio-stage-result">
          <div class="studio-stage-result__head">
            <span class="studio-stage-result__idx">${i + 1}</span>
            <span class="studio-stage-result__title">${esc(labelForStage(r.stage))}</span>
          </div>
          <div class="studio-stage-result__body">
            <span class="studio-kv"><abbr title="Relación de transmisión">i</abbr> = <strong>${r.ratio.toFixed(4)}</strong></span>
            <span class="studio-kv"><var>n</var>: <strong>${r.n_in.toFixed(1)}</strong> → <strong>${r.n_out.toFixed(1)}</strong> rpm</span>
          </div>
          ${stageElementsHtml(r)}
        </div>`,
        )
        .join('');

      cardsEl.innerHTML = `
        <div class="studio-checks">
          ${checks.map((c) => `<div class="studio-check studio-check--${c.level}">${esc(c.text)}</div>`).join('')}
        </div>
        <div class="studio-metric-row">
          <div class="studio-metric-card studio-metric-card--in">
            <span class="studio-metric-card__label">Entrada</span>
            <span class="studio-metric-card__value">${n0.toFixed(1)}</span>
            <span class="studio-metric-card__unit">rpm</span>
          </div>
          <div class="studio-metric-card studio-metric-card--ratio">
            <span class="studio-metric-card__label">ω<sub>sal</sub>/ω<sub>ent</sub></span>
            <span class="studio-metric-card__value">${total_ratio.toFixed(4)}</span>
            <span class="studio-metric-card__unit">—</span>
          </div>
          <div class="studio-metric-card studio-metric-card--out">
            <span class="studio-metric-card__label">Salida</span>
            <span class="studio-metric-card__value">${n_final.toFixed(1)}</span>
            <span class="studio-metric-card__unit">rpm</span>
          </div>
        </div>
        <div class="studio-stage-flow">${stageBlocks}</div>
      `;
    }
  }

  const payload = {
    n_in: n0,
    n_out: n_final,
    total_speed_ratio: total_ratio,
    stages: rows.map((r) => ({
      label: labelForStage(r.stage),
      ratio: r.ratio,
      n_in: r.n_in,
      n_out: r.n_out,
    })),
    stage_params: stages.map((s) => {
      if (s.type === 'gear_train') {
        return { type: s.type, id: s.id, module_mm: s.module_mm, gears: s.gears.map((g) => ({ ...g })) };
      }
      if (s.type === 'belt') {
        normalizeBeltStage(s);
        return {
          type: s.type,
          id: s.id,
          pulleys: s.pulleys.map((p) => ({ ...p })),
          spans_mm: [...s.spans_mm],
        };
      }
      normalizeChainStage(s);
      return {
        type: s.type,
        id: s.id,
        pitch_mm: s.pitch_mm,
        sprockets: s.sprockets.map((g) => ({ ...g })),
        spans_mm: [...s.spans_mm],
      };
    }),
  };

  if (jsonEl) {
    jsonEl.textContent = JSON.stringify(payload, null, 2);
  }
}

function blockModifierClass(s) {
  if (s.type === 'gear_train') return 'studio-block--gears';
  if (s.type === 'belt') return 'studio-block--belt';
  return 'studio-block--chain';
}

function render() {
  const host = document.getElementById('studioBlocks');
  if (!host) return;

  for (const s of stages) {
    if (s.type === 'belt') {
      normalizeBeltStage(s);
      clampBeltSpansInPlace(s);
    }
    if (s.type === 'chain') {
      normalizeChainStage(s);
      clampChainSpansInPlace(s);
    }
  }

  updateDropZoneChrome();

  host.innerHTML = stages
    .map((s) => {
      const mod = blockModifierClass(s);
      if (s.type === 'gear_train') {
        const gearRows = s.gears
          .map(
            (g, idx) => `
          <div class="studio-gear-row lab-grid lab-grid--2" style="align-items:end;margin-bottom:0.35rem">
            <div class="lab-field"><label>z<sub>${idx + 1}</sub></label>
              <input type="number" min="6" data-k="gearZ" data-id="${s.id}" data-idx="${idx}" value="${g.z}" />
            </div>
            <div style="display:flex;align-items:flex-end">
              ${
                s.gears.length > 2
                  ? `<button type="button" class="studio-remove-gear" data-rm-gear="${s.id}" data-idx="${idx}" style="font-size:0.65rem;padding:0.25rem 0.5rem;border:1px solid #fca5a5;background:#fef2f2;color:#991b1b;border-radius:4px;cursor:pointer">Quitar</button>`
                  : '<span style="font-size:0.7rem;color:#94a3b8">Mín. 2 ruedas</span>'
              }
            </div>
          </div>`,
          )
          .join('');
        return `
        <div class="studio-block ${mod}" data-id="${s.id}">
          <h4>Tren de engranajes <button type="button" class="studio-remove" data-rm="${s.id}">Quitar</button></h4>
          <p style="margin:0 0 0.5rem;font-size:0.72rem;color:#64748b">Contacto en primitivos · intercale ruedas antes de la salida para tensar o cambiar sentido.</p>
          <div class="lab-field" style="max-width:160px;margin-bottom:0.5rem">
            <label>m (mm)</label>
            <input type="number" min="0.25" step="0.25" data-k="module_mm" data-id="${s.id}" value="${s.module_mm}" />
          </div>
          ${gearRows}
          <div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-top:0.35rem">
            <button type="button" class="studio-add-gear" data-add-gear="${s.id}" style="font-size:0.72rem;padding:0.35rem 0.6rem;border:1px solid #0d9488;background:#f0fdfa;border-radius:6px;cursor:pointer;font-weight:600;color:#0f766e">+ Rueda al final</button>
            <button type="button" data-gear-insert-mid="${s.id}" style="font-size:0.72rem;padding:0.35rem 0.6rem;border:1px solid #94a3b8;background:#f8fafc;border-radius:6px;cursor:pointer;font-weight:600;color:#334155">Intercalar antes de salida</button>
            <button type="button" data-gear-rm-mid="${s.id}" ${s.gears.length <= 2 ? 'disabled' : ''} style="font-size:0.72rem;padding:0.35rem 0.6rem;border:1px solid #fca5a5;background:#fef2f2;border-radius:6px;cursor:pointer;font-weight:600;color:#991b1b;opacity:${s.gears.length <= 2 ? 0.45 : 1}">Quitar intermedia</button>
          </div>
        </div>`;
      }
      if (s.type === 'belt') {
        normalizeBeltStage(s);
        const pulleyFields = s.pulleys
          .map(
            (p, i) => `
          <div class="lab-field"><label>Ø polea ${i + 1} (mm)</label>
            <input type="number" min="10" step="1" data-k="pulleyD" data-id="${s.id}" data-idx="${i}" value="${p.d}" /></div>`,
          )
          .join('');
        const spanFields = s.spans_mm
          .map(
            (c, i) => `
          <div class="lab-field"><label>C ${i + 1}→${i + 2} (mm)</label>
            <input type="number" min="1" step="1" data-k="span_mm" data-id="${s.id}" data-idx="${i}" value="${Math.round(Number(c))}" /></div>`,
          )
          .join('');
        return `
        <div class="studio-block ${mod}" data-id="${s.id}">
          <h4>Correa (${s.pulleys.length} poleas) <button type="button" class="studio-remove" data-rm="${s.id}">Quitar</button></h4>
          <p style="margin:0 0 0.5rem;font-size:0.72rem;color:#64748b">Serpentín en el esquema; relación global Ø motriz / Ø conducida. Arrastre en la última polea para el tramo final.</p>
          <div class="lab-grid lab-grid--2">${pulleyFields}${spanFields}</div>
          <div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-top:0.35rem">
            <button type="button" data-belt-add-mid="${s.id}" style="font-size:0.72rem;padding:0.35rem 0.6rem;border:1px solid #d97706;background:#fffbeb;border-radius:6px;cursor:pointer;font-weight:600;color:#92400e">+ Polea intermedia</button>
            <button type="button" data-belt-rm-mid="${s.id}" ${s.pulleys.length <= 2 ? 'disabled' : ''} style="font-size:0.72rem;padding:0.35rem 0.6rem;border:1px solid #fca5a5;background:#fef2f2;border-radius:6px;cursor:pointer;font-weight:600;color:#991b1b;opacity:${s.pulleys.length <= 2 ? 0.45 : 1}">Quitar polea intermedia</button>
          </div>
        </div>`;
      }
      normalizeChainStage(s);
      const sprFields = s.sprockets
        .map(
          (sp, i) => `
        <div class="lab-field"><label>z<sub>${i + 1}</sub></label>
          <input type="number" min="6" data-k="sprocketZ" data-id="${s.id}" data-idx="${i}" value="${sp.z}" /></div>`,
        )
        .join('');
      const cFields = s.spans_mm
        .map(
          (c, i) => `
        <div class="lab-field"><label>C ${i + 1}→${i + 2} (mm)</label>
          <input type="number" min="1" step="1" data-k="span_mm" data-id="${s.id}" data-idx="${i}" value="${Math.round(Number(c))}" /></div>`,
        )
        .join('');
      return `
        <div class="studio-block ${mod}" data-id="${s.id}">
          <h4>Cadena (${s.sprockets.length} ruedas) <button type="button" class="studio-remove" data-rm="${s.id}">Quitar</button></h4>
          <p style="margin:0 0 0.5rem;font-size:0.72rem;color:#64748b">Mismo paso en todas las ruedas; primitivos ISO en el dibujo.</p>
          <div class="lab-field" style="max-width:140px;margin-bottom:0.5rem">
            <label>Paso p (mm)</label>
            <input type="number" min="4" step="0.01" data-k="pitch_mm" data-id="${s.id}" value="${s.pitch_mm}" />
          </div>
          <div class="lab-grid lab-grid--2">${sprFields}${cFields}</div>
          <div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-top:0.35rem">
            <button type="button" data-chain-add-mid="${s.id}" style="font-size:0.72rem;padding:0.35rem 0.6rem;border:1px solid #475569;background:#f1f5f9;border-radius:6px;cursor:pointer;font-weight:600;color:#1e293b">+ Rueda intermedia</button>
            <button type="button" data-chain-rm-mid="${s.id}" ${s.sprockets.length <= 2 ? 'disabled' : ''} style="font-size:0.72rem;padding:0.35rem 0.6rem;border:1px solid #fca5a5;background:#fef2f2;border-radius:6px;cursor:pointer;font-weight:600;color:#991b1b;opacity:${s.sprockets.length <= 2 ? 0.45 : 1}">Quitar rueda intermedia</button>
          </div>
        </div>`;
    })
    .join('');

  host.querySelectorAll('.studio-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-rm'));
      stages = stages.filter((x) => x.id !== id);
      render();
    });
  });

  host.querySelectorAll('.studio-remove-gear').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-rm-gear'));
      const idx = Number(btn.getAttribute('data-idx'));
      const st = stages.find((x) => x.id === id && x.type === 'gear_train');
      if (!st || st.gears.length <= 2) return;
      st.gears.splice(idx, 1);
      render();
    });
  });

  host.querySelectorAll('.studio-add-gear').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-add-gear'));
      const st = stages.find((x) => x.id === id && x.type === 'gear_train');
      if (!st) return;
      const lastZ = st.gears[st.gears.length - 1]?.z ?? 24;
      st.gears.push({ z: Math.max(6, Math.round(lastZ * 0.85)) });
      render();
    });
  });

  host.querySelectorAll('[data-gear-insert-mid]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-gear-insert-mid'));
      const st = stages.find((x) => x.id === id && x.type === 'gear_train');
      if (!st) return;
      addIntermediateGear(st);
      render();
    });
  });

  host.querySelectorAll('[data-gear-rm-mid]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-gear-rm-mid'));
      const st = stages.find((x) => x.id === id && x.type === 'gear_train');
      if (!st) return;
      removeIntermediateGear(st);
      render();
    });
  });

  host.querySelectorAll('[data-belt-add-mid]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-belt-add-mid'));
      const st = stages.find((x) => x.id === id && x.type === 'belt');
      if (!st) return;
      addIntermediateBeltPulley(st);
      render();
    });
  });

  host.querySelectorAll('[data-belt-rm-mid]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-belt-rm-mid'));
      const st = stages.find((x) => x.id === id && x.type === 'belt');
      if (!st) return;
      removeIntermediateBeltPulley(st);
      render();
    });
  });

  host.querySelectorAll('[data-chain-add-mid]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-chain-add-mid'));
      const st = stages.find((x) => x.id === id && x.type === 'chain');
      if (!st) return;
      addIntermediateChainSprocket(st);
      render();
    });
  });

  host.querySelectorAll('[data-chain-rm-mid]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-chain-rm-mid'));
      const st = stages.find((x) => x.id === id && x.type === 'chain');
      if (!st) return;
      removeIntermediateChainSprocket(st);
      render();
    });
  });

  host.querySelectorAll('input[data-id]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const id = Number(inp.getAttribute('data-id'));
      const k = inp.getAttribute('data-k');
      const st = stages.find((x) => x.id === id);
      if (!st || !k) return;
      const n = parseFloat(inp.value);
      if (!Number.isFinite(n)) return;

      if (k === 'gearZ') {
        if (st.type !== 'gear_train') return;
        const idx = Number(inp.getAttribute('data-idx'));
        if (!Number.isFinite(idx) || !st.gears[idx]) return;
        st.gears[idx].z = Math.max(6, Math.round(n));
      } else if (k === 'module_mm' && st.type === 'gear_train') {
        st.module_mm = Math.max(0.25, n);
      } else if (k === 'pitch_mm' && st.type === 'chain') {
        st.pitch_mm = Math.max(4, n);
        normalizeChainStage(st);
        clampChainSpansInPlace(st);
      } else if (k === 'pulleyD' && st.type === 'belt') {
        normalizeBeltStage(st);
        const idx = Number(inp.getAttribute('data-idx'));
        if (!Number.isFinite(idx) || !st.pulleys[idx]) return;
        st.pulleys[idx].d = Math.max(10, n);
        clampBeltSpansInPlace(st);
      } else if (k === 'span_mm') {
        const idx = Number(inp.getAttribute('data-idx'));
        if (!Number.isFinite(idx)) return;
        if (st.type === 'belt') {
          normalizeBeltStage(st);
          st.spans_mm[idx] = n;
          clampBeltSpansInPlace(st);
        } else if (st.type === 'chain') {
          normalizeChainStage(st);
          st.spans_mm[idx] = n;
          clampChainSpansInPlace(st);
        }
      } else if (k === 'sprocketZ' && st.type === 'chain') {
        normalizeChainStage(st);
        const idx = Number(inp.getAttribute('data-idx'));
        if (!Number.isFinite(idx) || !st.sprockets[idx]) return;
        st.sprockets[idx].z = Math.max(6, Math.round(n));
        clampChainSpansInPlace(st);
      }

      updateSummary();
      syncSchematic();
      renderTimeline();
    });
  });

  renderTimeline();
  updateSummary();
  syncSchematic();
}

function wireCanvasDnD() {
  const dropZone = document.getElementById('studioDropZone');
  if (!dropZone) return;

  dropZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dropZone.classList.add('studio-dropzone--active');
  });
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    try {
      e.dataTransfer.dropEffect = 'copy';
    } catch (_) {
      /* ignore */
    }
  });
  dropZone.addEventListener('dragleave', (e) => {
    const next = e.relatedTarget;
    if (!next || !dropZone.contains(next)) {
      dropZone.classList.remove('studio-dropzone--active');
    }
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('studio-dropzone--active');
    let type = '';
    try {
      type = e.dataTransfer?.getData(DND_TYPE) || e.dataTransfer?.getData('text/plain') || '';
    } catch (_) {
      /* ignore */
    }
    type = String(type).trim();
    if (type === 'gear_train' || type === 'belt' || type === 'chain') {
      addStageByType(type);
      render();
    }
  });

  document.querySelectorAll('.studio-chip[data-studio-type]').forEach((chip) => {
    if (!(chip instanceof HTMLElement)) return;
    chip.addEventListener('dragstart', (ev) => {
      const t = chip.getAttribute('data-studio-type') || '';
      try {
        ev.dataTransfer?.setData(DND_TYPE, t);
        ev.dataTransfer?.setData('text/plain', t);
        ev.dataTransfer.effectAllowed = 'copy';
      } catch (_) {
        /* ignore */
      }
    });
    chip.addEventListener('click', () => {
      const t = chip.getAttribute('data-studio-type');
      if (t === 'gear_train' || t === 'belt' || t === 'chain') {
        addStageByType(t);
        render();
      }
    });
  });
}

document.querySelector('[data-clear]')?.addEventListener('click', () => {
  stages = [];
  render();
});

document.getElementById('stN0')?.addEventListener('input', () => {
  updateSummary();
});

document.getElementById('studioCopy')?.addEventListener('click', async () => {
  const pre = document.getElementById('studioJson');
  if (pre?.textContent) {
    try {
      await navigator.clipboard.writeText(pre.textContent);
    } catch (_) {
      /* ignore */
    }
  }
});

wireCanvasDnD();
render();
