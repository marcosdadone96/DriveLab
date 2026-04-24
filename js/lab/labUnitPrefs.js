/**
 * Preferencias de unidades para resultados (persistencia + formato único por magnitud).
 * Evita notación min⁻¹; usa RPM y etiquetas legibles.
 */

const STORAGE_KEY = 'mdt_lab_units_v1';

/** @typedef {{ length: 'mm'|'m'|'cm', rotation: 'rpm'|'rad_s', linear: 'm_s'|'mm_s'|'km_h', life?: 'hours'|'Mrev'|'rev' }} LabUnitPrefs */

const DEFAULTS = /** @type {LabUnitPrefs} */ ({
  length: 'mm',
  rotation: 'rpm',
  linear: 'm_s',
  life: 'hours',
});

/**
 * @returns {LabUnitPrefs}
 */
export function getLabUnitPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const j = JSON.parse(raw);
    return { ...DEFAULTS, ...j };
  } catch {
    return { ...DEFAULTS };
  }
}

/**
 * @param {Partial<LabUnitPrefs>} p
 */
export function saveLabUnitPrefs(p) {
  const next = { ...getLabUnitPrefs(), ...p };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/**
 * @param {number | null | undefined} mm
 * @param {'mm'|'m'|'cm'} pref
 */
export function formatLength(mm, pref) {
  if (mm == null || !Number.isFinite(mm)) return '—';
  if (pref === 'm') return `${(mm / 1000).toFixed(2)} m`;
  if (pref === 'cm') return `${(mm / 10).toFixed(2)} cm`;
  return `${mm.toFixed(2)} mm`;
}

/**
 * @param {number | null | undefined} rpm
 * @param {'rpm'|'rad_s'} pref
 */
export function formatRotation(rpm, pref) {
  if (rpm == null || !Number.isFinite(rpm)) return '—';
  if (pref === 'rad_s') {
    const w = (rpm * 2 * Math.PI) / 60;
    return `${w.toFixed(2)} rad/s`;
  }
  return `${rpm.toFixed(2)} RPM`;
}

/**
 * @param {number | null | undefined} m_s
 * @param {'m_s'|'mm_s'|'km_h'} pref
 */
export function formatLinearSpeed(m_s, pref) {
  if (m_s == null || !Number.isFinite(m_s)) return '—';
  if (pref === 'mm_s') return `${(m_s * 1000).toFixed(2)} mm/s`;
  if (pref === 'km_h') return `${(m_s * 3.6).toFixed(2)} km/h`;
  return `${m_s.toFixed(2)} m/s`;
}

/**
 * Vincula selects estándar del DOM y persiste. Llama onChange tras cada cambio y al hidratar.
 * @param {() => void} onChange
 * @param {{ life?: boolean }} [opts]
 */
export function bindLabUnitSelectors(onChange, opts = {}) {
  const len = document.getElementById('labUnitLength');
  const rot = document.getElementById('labUnitRotation');
  const lin = document.getElementById('labUnitLinear');
  const life = document.getElementById('labUnitLife');
  const p = getLabUnitPrefs();

  if (len instanceof HTMLSelectElement) len.value = p.length;
  if (rot instanceof HTMLSelectElement) rot.value = p.rotation;
  if (lin instanceof HTMLSelectElement) lin.value = p.linear;
  if (life instanceof HTMLSelectElement && opts.life) life.value = p.life ?? 'hours';

  const fire = () => {
    saveLabUnitPrefs({
      length: len instanceof HTMLSelectElement ? /** @type {'mm'|'m'|'cm'} */ (len.value) : p.length,
      rotation: rot instanceof HTMLSelectElement ? /** @type {'rpm'|'rad_s'} */ (rot.value) : p.rotation,
      linear: lin instanceof HTMLSelectElement ? /** @type {'m_s'|'mm_s'|'km_h'} */ (lin.value) : p.linear,
      ...(life instanceof HTMLSelectElement && opts.life
        ? { life: /** @type {'hours'|'Mrev'|'rev'} */ (life.value) }
        : {}),
    });
    onChange();
  };

  len?.addEventListener('change', fire);
  rot?.addEventListener('change', fire);
  lin?.addEventListener('change', fire);
  life?.addEventListener('change', fire);
}

/**
 * HTML reutilizable (insertar antes del heroe de resultados).
 * En paginas reales, anadir data-lab-convert-categories / title / tip en el div para el conversor (ver labUnitConvert.js).
 */
export const LAB_UNITS_BAR_HTML = `
<div class="lab-units-bar" role="group" aria-label="Unidades de los resultados">
  <span class="lab-units-bar__title">Cómo ver los resultados</span>
  <label class="lab-units-bar__field">
    <span class="lab-units-bar__lbl">Distancias</span>
    <select id="labUnitLength" class="lab-units-bar__select">
      <option value="mm">mm (taller)</option>
      <option value="cm">cm</option>
      <option value="m">m (SI)</option>
    </select>
  </label>
  <label class="lab-units-bar__field">
    <span class="lab-units-bar__lbl">Giro</span>
    <select id="labUnitRotation" class="lab-units-bar__select">
      <option value="rpm">RPM</option>
      <option value="rad_s">rad/s</option>
    </select>
  </label>
  <label class="lab-units-bar__field">
    <span class="lab-units-bar__lbl">Velocidad lineal</span>
    <select id="labUnitLinear" class="lab-units-bar__select">
      <option value="m_s">m/s</option>
      <option value="mm_s">mm/s</option>
      <option value="km_h">km/h</option>
    </select>
  </label>
</div>`;

export const LAB_UNITS_LIFE_SELECT = `
  <label class="lab-units-bar__field">
    <span class="lab-units-bar__lbl">Vida L₁₀</span>
    <select id="labUnitLife" class="lab-units-bar__select">
      <option value="hours">horas</option>
      <option value="Mrev">millones de vueltas</option>
      <option value="rev">vueltas totales</option>
    </select>
  </label>`;

/**
 * @param {{ L10_million_rev: number, L10_rev: number, nominalLife_hours: number | null }} r
 * @param {'hours'|'Mrev'|'rev'} pref
 */
export function formatBearingLifeDisplay(r, pref) {
  if (pref === 'Mrev') return `${r.L10_million_rev.toFixed(2)} Mrev`;
  if (pref === 'rev') return `${r.L10_rev.toExponential(2)} vueltas`;
  if (r.nominalLife_hours != null && Number.isFinite(r.nominalLife_hours)) return `${r.nominalLife_hours.toFixed(2)} h`;
  return '—';
}
