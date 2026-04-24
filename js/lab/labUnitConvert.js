/**
 * Conversor de unidades del laboratorio (por calculadora).
 * Categorias y textos se filtran con data-lab-convert-* en .lab-units-bar.
 */

/** @typedef {'length'|'rotation'|'linear'|'life'|'force'|'stiffness'|'pressure'|'torque'} LabConvertCategory */

const LENGTH_OPTS = [
  { id: 'mm', label: 'mm' },
  { id: 'cm', label: 'cm' },
  { id: 'm', label: 'm' },
];

const ROT_OPTS = [
  { id: 'rpm', label: 'RPM' },
  { id: 'rad_s', label: 'rad/s' },
];

const LIN_OPTS = [
  { id: 'm_s', label: 'm/s' },
  { id: 'mm_s', label: 'mm/s' },
  { id: 'km_h', label: 'km/h' },
];

const LIFE_OPTS = [
  { id: 'hours', label: 'horas (h)' },
  { id: 'Mrev', label: 'Mrev' },
  { id: 'rev', label: 'vueltas' },
];

const FORCE_OPTS = [
  { id: 'N', label: 'N' },
  { id: 'kN', label: 'kN' },
  { id: 'kgf', label: 'kgf (kp)' },
  { id: 'lbf', label: 'lbf' },
];

/** Rigidez; base interna N/mm */
const STIFF_OPTS = [
  { id: 'N_mm', label: 'N/mm' },
  { id: 'N_m', label: 'N/m' },
  { id: 'kN_m', label: 'kN/mm' },
];

/** Tension/presion; base MPa (= N/mm2) */
const PRESSURE_OPTS = [
  { id: 'MPa', label: 'MPa (= N/mm2)' },
  { id: 'bar', label: 'bar' },
  { id: 'kPa', label: 'kPa' },
];

const TORQUE_OPTS = [
  { id: 'Nm', label: 'N·m' },
  { id: 'kgf_m', label: 'kgf·m' },
  { id: 'lbf_ft', label: 'lbf·ft' },
];

const CAT_LABELS = /** @type {Record<LabConvertCategory, string>} */ ({
  length: 'Longitud / distancia',
  rotation: 'Velocidad angular',
  linear: 'Velocidad lineal',
  life: 'Vida L10 (horas, Mrev, vueltas)',
  force: 'Fuerza',
  stiffness: 'Rigidez de muelle',
  pressure: 'Tension / presion',
  torque: 'Par / momento',
});

const OPTS_BY_CAT = /** @type {Record<LabConvertCategory, { id: string, label: string }[]>} */ ({
  length: LENGTH_OPTS,
  rotation: ROT_OPTS,
  linear: LIN_OPTS,
  life: LIFE_OPTS,
  force: FORCE_OPTS,
  stiffness: STIFF_OPTS,
  pressure: PRESSURE_OPTS,
  torque: TORQUE_OPTS,
});

const VALID_CATEGORIES = /** @type {LabConvertCategory[]} */ (Object.keys(OPTS_BY_CAT));

const OUT_SUFFIX = /** @type {Record<string, string>} */ ({
  mm: 'mm',
  cm: 'cm',
  m: 'm',
  rpm: 'RPM',
  rad_s: 'rad/s',
  m_s: 'm/s',
  mm_s: 'mm/s',
  km_h: 'km/h',
  hours: 'h',
  Mrev: 'Mrev',
  rev: 'vueltas',
  N: 'N',
  kN: 'kN',
  kgf: 'kgf',
  lbf: 'lbf',
  N_mm: 'N/mm',
  N_m: 'N/m',
  kN_m: 'kN/mm',
  MPa: 'MPa',
  bar: 'bar',
  kPa: 'kPa',
  Nm: 'N·m',
  kgf_m: 'kgf·m',
  lbf_ft: 'lbf·ft',
});

function parseNum(s) {
  const n = parseFloat(String(s).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {string | null | undefined} raw
 * @returns {LabConvertCategory[]}
 */
export function parseLabConvertCategories(raw) {
  if (raw == null || String(raw).trim() === '') return [];
  const parts = String(raw)
    .split(/[,;\s]+/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  /** @type {LabConvertCategory[]} */
  const out = [];
  for (const p of parts) {
    if (VALID_CATEGORIES.includes(/** @type {LabConvertCategory} */ (p)) && !out.includes(/** @type {LabConvertCategory} */ (p))) {
      out.push(/** @type {LabConvertCategory} */ (p));
    }
  }
  return out;
}

function lengthToMm(value, unit) {
  if (unit === 'mm') return value;
  if (unit === 'cm') return value * 10;
  if (unit === 'm') return value * 1000;
  return null;
}

function mmToLength(mm, unit) {
  if (unit === 'mm') return mm;
  if (unit === 'cm') return mm / 10;
  if (unit === 'm') return mm / 1000;
  return null;
}

function rotationToRpm(value, unit) {
  if (unit === 'rpm') return value;
  if (unit === 'rad_s') return (value * 60) / (2 * Math.PI);
  return null;
}

function rpmToRotation(rpm, unit) {
  if (unit === 'rpm') return rpm;
  if (unit === 'rad_s') return (rpm * 2 * Math.PI) / 60;
  return null;
}

function linearToMs(value, unit) {
  if (unit === 'm_s') return value;
  if (unit === 'mm_s') return value / 1000;
  if (unit === 'km_h') return value / 3.6;
  return null;
}

function msToLinear(ms, unit) {
  if (unit === 'm_s') return ms;
  if (unit === 'mm_s') return ms * 1000;
  if (unit === 'km_h') return ms * 3.6;
  return null;
}

/**
 * @param {number} value
 * @param {'hours'|'Mrev'|'rev'} unit
 * @param {number | null} rpm
 */
function lifeToRev(value, unit, rpm) {
  if (unit === 'rev') return value;
  if (unit === 'Mrev') return value * 1e6;
  if (unit === 'hours') {
    if (!(rpm != null && rpm > 0 && Number.isFinite(rpm))) return null;
    return value * rpm * 60;
  }
  return null;
}

/**
 * @param {number} rev
 * @param {'hours'|'Mrev'|'rev'} unit
 * @param {number | null} rpm
 */
function revToLife(rev, unit, rpm) {
  if (unit === 'rev') return rev;
  if (unit === 'Mrev') return rev / 1e6;
  if (unit === 'hours') {
    if (!(rpm != null && rpm > 0 && Number.isFinite(rpm))) return null;
    return rev / (rpm * 60);
  }
  return null;
}

/** @param {number} v @param {string} unit */
function forceToN(v, unit) {
  if (unit === 'N') return v;
  if (unit === 'kN') return v * 1000;
  if (unit === 'kgf') return v * 9.80665;
  if (unit === 'lbf') return v * 4.4482216152605;
  return null;
}

/** @param {number} n @param {string} unit */
function nToForce(n, unit) {
  if (unit === 'N') return n;
  if (unit === 'kN') return n / 1000;
  if (unit === 'kgf') return n / 9.80665;
  if (unit === 'lbf') return n / 4.4482216152605;
  return null;
}

/** Rigidez en N/mm */
function stiffToNmm(v, unit) {
  if (unit === 'N_mm') return v;
  if (unit === 'N_m') return v / 1000;
  if (unit === 'kN_m') return v * 1000;
  return null;
}

function nmmToStiff(nmm, unit) {
  if (unit === 'N_mm') return nmm;
  if (unit === 'N_m') return nmm * 1000;
  if (unit === 'kN_m') return nmm / 1000;
  return null;
}

/** Presion en MPa */
function pressureToMpa(v, unit) {
  if (unit === 'MPa') return v;
  if (unit === 'bar') return v * 0.1;
  if (unit === 'kPa') return v / 1000;
  return null;
}

function mpaToPressure(mpa, unit) {
  if (unit === 'MPa') return mpa;
  if (unit === 'bar') return mpa / 0.1;
  if (unit === 'kPa') return mpa * 1000;
  return null;
}

/** Par en N·m */
function torqueToNm(v, unit) {
  if (unit === 'Nm') return v;
  if (unit === 'kgf_m') return v * 9.80665;
  if (unit === 'lbf_ft') return v * 1.3558179483314004;
  return null;
}

function nmToTorque(nm, unit) {
  if (unit === 'Nm') return nm;
  if (unit === 'kgf_m') return nm / 9.80665;
  if (unit === 'lbf_ft') return nm / 1.3558179483314004;
  return null;
}

/**
 * @param {LabConvertCategory} cat
 * @param {number} value
 * @param {string} fromId
 * @param {string} toId
 * @param {number | null} rpm
 */
export function convertLabUnits(cat, value, fromId, toId, rpm) {
  if (fromId === toId) return value;
  if (cat === 'length') {
    const mm = lengthToMm(value, fromId);
    if (mm == null) return null;
    return mmToLength(mm, toId);
  }
  if (cat === 'rotation') {
    const rpmI = rotationToRpm(value, fromId);
    if (rpmI == null) return null;
    return rpmToRotation(rpmI, toId);
  }
  if (cat === 'linear') {
    const ms = linearToMs(value, fromId);
    if (ms == null) return null;
    return msToLinear(ms, toId);
  }
  if (cat === 'life') {
    const rev = lifeToRev(value, /** @type {'hours'|'Mrev'|'rev'} */ (fromId), rpm);
    if (rev == null) return null;
    return revToLife(rev, /** @type {'hours'|'Mrev'|'rev'} */ (toId), rpm);
  }
  if (cat === 'force') {
    const n = forceToN(value, fromId);
    if (n == null) return null;
    return nToForce(n, toId);
  }
  if (cat === 'stiffness') {
    const nmm = stiffToNmm(value, fromId);
    if (nmm == null) return null;
    return nmmToStiff(nmm, toId);
  }
  if (cat === 'pressure') {
    const mpa = pressureToMpa(value, fromId);
    if (mpa == null) return null;
    return mpaToPressure(mpa, toId);
  }
  if (cat === 'torque') {
    const nm = torqueToNm(value, fromId);
    if (nm == null) return null;
    return nmToTorque(nm, toId);
  }
  return null;
}

/**
 * @param {LabConvertCategory} cat
 * @param {string} unitId
 * @param {number | null} n
 */
function formatOut(cat, unitId, n) {
  if (n == null || !Number.isFinite(n)) return '—';
  if (cat === 'life' && unitId === 'rev' && (Math.abs(n) >= 1e7 || (Math.abs(n) > 0 && Math.abs(n) < 1e-2))) {
    return `${n.toExponential(2)} vueltas`;
  }
  const suf = OUT_SUFFIX[unitId] ?? '';
  return `${n.toFixed(2)} ${suf}`.trim();
}

/**
 * @param {{ categories: LabConvertCategory[], title?: string, tip?: string }} opts
 */
export function buildLabUnitConverterHtml(opts) {
  const categories = opts.categories.length ? opts.categories : ['length', 'rotation', 'linear'];
  const title = opts.title || 'Conversor de unidades';
  const tip =
    opts.tip ||
    'No modifica el calculo principal; solo traduce valores entre las unidades de esta calculadora.';

  const magOptions = categories
    .map((c) => `<option value="${c}">${escapeHtml(CAT_LABELS[c])}</option>`)
    .join('');

  return `
<div class="lab-unit-converter" aria-label="Conversor de unidades del laboratorio" data-lab-convert-cats="${categories.join(',')}">
  <div class="lab-unit-converter__head">
    <span class="lab-unit-converter__title">${escapeHtml(title)}</span>
    <span class="lab-help-hover lab-help-hover--field">
      <button type="button" class="lab-help-hover__btn" aria-label="Informacion del conversor">?</button>
      <span class="lab-help-hover__tip">${escapeHtml(tip)}</span>
    </span>
  </div>
  <div class="lab-unit-converter__grid">
    <label class="lab-unit-converter__field lab-unit-converter__field--mag">
      <span class="lab-unit-converter__lbl">Magnitud</span>
      <select class="lab-unit-converter__mag">${magOptions}</select>
    </label>
    <label class="lab-unit-converter__field">
      <span class="lab-unit-converter__lbl">Valor</span>
      <input class="lab-unit-converter__val" type="text" inputmode="decimal" autocomplete="off" placeholder="p. ej. 1455" />
    </label>
    <label class="lab-unit-converter__field">
      <span class="lab-unit-converter__lbl">Desde</span>
      <select class="lab-unit-converter__from"></select>
    </label>
    <div class="lab-unit-converter__swap-wrap">
      <button type="button" class="lab-unit-converter__swap" title="Intercambiar unidades">⇄</button>
    </div>
    <label class="lab-unit-converter__field">
      <span class="lab-unit-converter__lbl">Hasta</span>
      <select class="lab-unit-converter__to"></select>
    </label>
  </div>
  <label class="lab-unit-converter__field lab-unit-converter__rpm-row is-hidden">
    <span class="lab-unit-converter__lbl-row">
      <span class="lab-unit-converter__lbl">RPM del eje</span>
      <span class="lab-help-hover lab-help-hover--field">
        <button type="button" class="lab-help-hover__btn" aria-label="Ayuda RPM">?</button>
        <span class="lab-help-hover__tip">Necesario si en <strong>vida L10</strong> interviene la unidad <strong>horas</strong> (horas ↔ vueltas).</span>
      </span>
    </span>
    <input class="lab-unit-converter__rpm" type="text" inputmode="decimal" autocomplete="off" placeholder="p. ej. 1455" />
  </label>
  <div class="lab-unit-converter__result" aria-live="polite">
    <span class="lab-unit-converter__eq">=</span>
    <span class="lab-unit-converter__out">—</span>
  </div>
</div>`;
}

/** @deprecated Usar buildLabUnitConverterHtml; conservado por compatibilidad. */
export const LAB_UNIT_CONVERTER_HTML = buildLabUnitConverterHtml({
  categories: ['length', 'rotation', 'linear', 'life'],
  title: 'Conversor de unidades',
  tip: 'No altera el calculo principal; solo traduce valores entre unidades (longitud, giro, velocidad lineal o vida L10).',
});

const mounted = new WeakSet();

/**
 * Inserta el panel de conversion bajo la barra de unidades.
 * Atributos opcionales en .lab-units-bar:
 * - data-lab-convert-categories="length,rotation,linear" (coma o espacio)
 * - data-lab-convert-title, data-lab-convert-tip
 */
export function injectLabUnitConverterIfNeeded() {
  const bar = document.querySelector('.lab-calc-layout__out > .lab-units-bar');
  if (!bar) return;
  const next = bar.nextElementSibling;
  if (next instanceof HTMLElement && next.classList.contains('lab-unit-converter')) return;

  const rawCats = bar.getAttribute('data-lab-convert-categories');
  let categories = parseLabConvertCategories(rawCats);
  if (!categories.length) {
    const hasLife = document.getElementById('labUnitLife');
    categories = hasLife
      ? ['length', 'rotation', 'linear', 'life']
      : ['length', 'rotation', 'linear'];
  }

  const title = bar.getAttribute('data-lab-convert-title') || undefined;
  const tip = bar.getAttribute('data-lab-convert-tip') || undefined;

  const html = buildLabUnitConverterHtml({ categories, title, tip });
  bar.insertAdjacentHTML('afterend', html);
}

/**
 * Enlaza todos los bloques `.lab-unit-converter` del documento (una sola vez por nodo).
 */
export function mountLabUnitConverter() {
  document.querySelectorAll('.lab-unit-converter').forEach((root) => {
    if (!(root instanceof HTMLElement) || mounted.has(root)) return;
    mounted.add(root);

    const mag = root.querySelector('.lab-unit-converter__mag');
    const magField = root.querySelector('.lab-unit-converter__field--mag');
    const valIn = root.querySelector('.lab-unit-converter__val');
    const fromSel = root.querySelector('.lab-unit-converter__from');
    const toSel = root.querySelector('.lab-unit-converter__to');
    const rpmRow = root.querySelector('.lab-unit-converter__rpm-row');
    const rpmIn = root.querySelector('.lab-unit-converter__rpm');
    const outEl = root.querySelector('.lab-unit-converter__out');
    const swapBtn = root.querySelector('.lab-unit-converter__swap');

    if (
      !(mag instanceof HTMLSelectElement) ||
      !(valIn instanceof HTMLInputElement) ||
      !(fromSel instanceof HTMLSelectElement) ||
      !(toSel instanceof HTMLSelectElement) ||
      !(outEl instanceof HTMLElement) ||
      !(swapBtn instanceof HTMLButtonElement)
    ) {
      return;
    }

    const rpmInput = rpmIn instanceof HTMLInputElement ? rpmIn : null;

    function fillUnitSelects(cat) {
      const c = /** @type {LabConvertCategory} */ (cat);
      const opts = OPTS_BY_CAT[c];
      if (!opts) return;
      fromSel.innerHTML = opts.map((o) => `<option value="${o.id}">${o.label}</option>`).join('');
      toSel.innerHTML = opts.map((o) => `<option value="${o.id}">${o.label}</option>`).join('');
      fromSel.selectedIndex = 0;
      toSel.selectedIndex = Math.min(1, opts.length - 1);
    }

    function toggleMagVisibility() {
      const single = mag.options.length <= 1;
      if (magField instanceof HTMLElement) {
        magField.classList.toggle('is-hidden', single);
        magField.setAttribute('aria-hidden', single ? 'true' : 'false');
      }
    }

    function updateRpmVisibility() {
      const isLife = mag.value === 'life';
      if (rpmRow instanceof HTMLElement) {
        rpmRow.classList.toggle('is-hidden', !isLife);
      }
    }

    function recalc() {
      const cat = /** @type {LabConvertCategory} */ (mag.value);
      const v = parseNum(valIn.value);
      const fromId = fromSel.value;
      const toId = toSel.value;
      const rpm = rpmInput ? parseNum(rpmInput.value) : null;

      if (v == null) {
        outEl.textContent = '—';
        return;
      }

      if (cat === 'life') {
        const needsRpm = fromId === 'hours' || toId === 'hours';
        if (needsRpm && !(rpm != null && rpm > 0)) {
          outEl.textContent = 'Indique RPM > 0';
          return;
        }
      }

      const result = convertLabUnits(cat, v, fromId, toId, rpm);
      if (result == null || !Number.isFinite(result)) {
        outEl.textContent = '—';
        return;
      }
      outEl.textContent = formatOut(cat, toId, result);
    }

    mag.addEventListener('change', () => {
      fillUnitSelects(mag.value);
      toggleMagVisibility();
      updateRpmVisibility();
      recalc();
    });

    fromSel.addEventListener('change', recalc);
    toSel.addEventListener('change', recalc);
    valIn.addEventListener('input', recalc);
    rpmInput?.addEventListener('input', recalc);

    swapBtn.addEventListener('click', () => {
      const a = fromSel.value;
      fromSel.value = toSel.value;
      toSel.value = a;
      const maybeOut = parseNum(outEl.textContent.replace(/[^\d.,eE+-]/g, '').split(' ')[0] ?? '');
      if (maybeOut != null && valIn.value.trim() !== '') {
        valIn.value = String(maybeOut);
      }
      recalc();
    });

    fillUnitSelects(mag.value);
    toggleMagVisibility();
    updateRpmVisibility();
    recalc();
  });
}
