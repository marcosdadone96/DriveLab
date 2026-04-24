/**
 * Bloque UI reutilizable: configuración de montaje motorreductor (mismas ids en todas las páginas).
 */

import { getCurrentLang } from '../config/locales.js';

export const MOUNTING_SECTION_HOST_ID = 'mountingConfigHost';

const SECTION_HTML = `
<details class="input-details mounting-config">
  <summary class="mounting-config__summary">Configuración de montaje del motorreductor <span class="field-badge field-badge--optional">Opcional</span></summary>
  <p class="muted mounting-config__lead">
    Opcional: afecta al <strong>filtro</strong> de motorreductores (IEC B3/B5/B14 o hueco). Pulse <strong>?</strong> en cada campo.
  </p>

  <div class="mounting-legend" aria-hidden="true">
    <div class="mounting-legend__item">
      <svg class="mounting-ico" viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="8" y="14" width="48" height="22" rx="3" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
        <path d="M14 36 L14 42 M32 36 L32 42 M50 36 L50 42" stroke="#475569" stroke-width="3" stroke-linecap="round"/>
        <text x="32" y="28" text-anchor="middle" font-size="9" fill="#334155" font-family="system-ui,sans-serif">B3</text>
      </svg>
      <span>Patas</span>
    </div>
    <div class="mounting-legend__item">
      <svg class="mounting-ico" viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="20" y="10" width="24" height="28" rx="2" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
        <circle cx="32" cy="24" r="14" fill="none" stroke="#0d9488" stroke-width="2" stroke-dasharray="4 3"/>
        <text x="32" y="27" text-anchor="middle" font-size="9" fill="#334155" font-family="system-ui,sans-serif">B5</text>
      </svg>
      <span>Brida grande</span>
    </div>
    <div class="mounting-legend__item">
      <svg class="mounting-ico" viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="22" y="12" width="20" height="24" rx="2" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
        <circle cx="32" cy="24" r="9" fill="none" stroke="#0d9488" stroke-width="2"/>
        <text x="32" y="27" text-anchor="middle" font-size="8" fill="#334155" font-family="system-ui,sans-serif">B14</text>
      </svg>
      <span>Brida compacta</span>
    </div>
    <div class="mounting-legend__item">
      <svg class="mounting-ico" viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="18" y="12" width="28" height="24" rx="2" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
        <circle cx="32" cy="24" r="7" fill="#fff" stroke="#0f172a" stroke-width="2"/>
        <text x="32" y="8" text-anchor="middle" font-size="7" fill="#64748b" font-family="system-ui,sans-serif">hueco</text>
      </svg>
      <span>Eje hueco</span>
    </div>
  </div>

  <div class="field-grid mounting-config__fields">
    <div class="field mounting-config__field--wide">
      <label for="mountingType"
        >Tipo de montaje <span class="info-chip" title="IEC B3/B5/B14: formas típicas de fijar motorreductor. Eje hueco: el reductor envuelve el árbol del tambor. Filtra sugerencias del catálogo." aria-label="Ayuda tipo montaje IEC.">?</span></label
      >
      <select id="mountingType" name="mountingType">
        <option value="B3" selected>Patas en suelo / bastidor (IEC B3)</option>
        <option value="B5">Brida grande frontal (IEC B5)</option>
        <option value="B14">Brida compacta (IEC B14)</option>
        <option value="hollowShaft">Montaje sobre eje de máquina (reductor eje hueco)</option>
      </select>
      <span class="field-hint">—</span>
    </div>
    <div class="field">
      <label for="mountMachineShaftDiam"
        >Ø eje máquina (mm) <span class="info-chip" title="Opcional. Diámetro del eje del tambor o máquina para anotación y comprobaciones orientativas (hueco, llave…)." aria-label="Ayuda diámetro eje máquina.">?</span></label
      >
      <input id="mountMachineShaftDiam" type="number" step="0.1" min="0" placeholder="ej. 50" />
      <span class="field-hint">opc.</span>
    </div>
    <div class="field">
      <label for="mountOrientation"
        >Orientación <span class="info-chip" title="Horizontal: eje de salida ~ horizontal. Vertical/oblicua fuerte: puede excluir familias de reductor en el filtro (p. ej. ciertos sinfín-cubo y lubricación)." aria-label="Ayuda orientación montaje.">?</span></label
      >
      <select id="mountOrientation" name="mountOrientation">
        <option value="horizontal" selected>Horizontal (eje salida ~ horizontal)</option>
        <option value="vertical">Vertical u oblicua fuerte</option>
      </select>
      <span class="field-hint">—</span>
    </div>
    <div class="field mounting-config__field--wide">
      <label for="mountSpaceNote"
        >Espacio / interferencias <span class="info-chip" title="Texto libre (gálibos, pasillo, longitud máxima del conjunto). Aparece en recomendaciones; no entra en el cálculo de par." aria-label="Ayuda notas espacio.">?</span></label
      >
      <input id="mountSpaceNote" type="text" maxlength="500" placeholder="ej. máx. 400 mm largo total; pasillo estrecho…" />
      <span class="field-hint">opc.</span>
    </div>
  </div>
</details>
`;

const SECTION_HTML_EN = `
<details class="input-details mounting-config">
  <summary class="mounting-config__summary">Gearmotor mounting <span class="field-badge field-badge--optional">Optional</span></summary>
  <p class="muted mounting-config__lead">
    Optional: affects the <strong>filter</strong> for sample-catalog gearmotors (IEC B3/B5/B14 or hollow shaft). Use <strong>?</strong> on each field.
  </p>

  <div class="mounting-legend" aria-hidden="true">
    <div class="mounting-legend__item">
      <svg class="mounting-ico" viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="8" y="14" width="48" height="22" rx="3" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
        <path d="M14 36 L14 42 M32 36 L32 42 M50 36 L50 42" stroke="#475569" stroke-width="3" stroke-linecap="round"/>
        <text x="32" y="28" text-anchor="middle" font-size="9" fill="#334155" font-family="system-ui,sans-serif">B3</text>
      </svg>
      <span>Foot</span>
    </div>
    <div class="mounting-legend__item">
      <svg class="mounting-ico" viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="20" y="10" width="24" height="28" rx="2" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
        <circle cx="32" cy="24" r="14" fill="none" stroke="#0d9488" stroke-width="2" stroke-dasharray="4 3"/>
        <text x="32" y="27" text-anchor="middle" font-size="9" fill="#334155" font-family="system-ui,sans-serif">B5</text>
      </svg>
      <span>Large flange</span>
    </div>
    <div class="mounting-legend__item">
      <svg class="mounting-ico" viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="22" y="12" width="20" height="24" rx="2" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
        <circle cx="32" cy="24" r="9" fill="none" stroke="#0d9488" stroke-width="2"/>
        <text x="32" y="27" text-anchor="middle" font-size="8" fill="#334155" font-family="system-ui,sans-serif">B14</text>
      </svg>
      <span>Compact flange</span>
    </div>
    <div class="mounting-legend__item">
      <svg class="mounting-ico" viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="18" y="12" width="28" height="24" rx="2" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
        <circle cx="32" cy="24" r="7" fill="#fff" stroke="#0f172a" stroke-width="2"/>
        <text x="32" y="8" text-anchor="middle" font-size="7" fill="#64748b" font-family="system-ui,sans-serif">hollow</text>
      </svg>
      <span>Hollow shaft</span>
    </div>
  </div>

  <div class="field-grid mounting-config__fields">
    <div class="field mounting-config__field--wide">
      <label for="mountingType"
        >Mounting type <span class="info-chip" title="IEC B3/B5/B14: typical gearmotor mounts. Hollow shaft: unit wraps the drum shaft. Filters catalog suggestions." aria-label="IEC mounting help.">?</span></label
      >
      <select id="mountingType" name="mountingType">
        <option value="B3" selected>Foot on floor / frame (IEC B3)</option>
        <option value="B5">Large front flange (IEC B5)</option>
        <option value="B14">Compact flange (IEC B14)</option>
        <option value="hollowShaft">Hollow shaft on machine shaft</option>
      </select>
      <span class="field-hint">\u2014</span>
    </div>
    <div class="field">
      <label for="mountMachineShaftDiam"
        >Machine shaft OD (mm) <span class="info-chip" title="Optional. Drum/machine shaft diameter for notes and indicative checks (hollow bore, key\u2026)." aria-label="Machine shaft diameter help.">?</span></label
      >
      <input id="mountMachineShaftDiam" type="number" step="0.1" min="0" placeholder="e.g. 50" />
      <span class="field-hint">opt.</span>
    </div>
    <div class="field">
      <label for="mountOrientation"
        >Orientation <span class="info-chip" title="Horizontal: output shaft ~ horizontal. Strong vertical/tilt: may exclude some gearbox families in the filter (e.g. worm-cub units and lubrication)." aria-label="Mounting orientation help.">?</span></label
      >
      <select id="mountOrientation" name="mountOrientation">
        <option value="horizontal" selected>Horizontal (output ~ horizontal)</option>
        <option value="vertical">Strong vertical or tilt</option>
      </select>
      <span class="field-hint">\u2014</span>
    </div>
    <div class="field mounting-config__field--wide">
      <label for="mountSpaceNote"
        >Space / clearance <span class="info-chip" title="Free text (envelopes, aisle, max assembly length). Shown in recommendations; not used in torque math." aria-label="Space notes help.">?</span></label
      >
      <input id="mountSpaceNote" type="text" maxlength="500" placeholder="e.g. max 400 mm total length; narrow aisle\u2026" />
      <span class="field-hint">opt.</span>
    </div>
  </div>
</details>
`;

/**
 * Inserta el bloque en el host vacío del HTML (una vez por página).
 * @param {string} [hostId]
 */
export function injectMountingConfigSection(hostId = MOUNTING_SECTION_HOST_ID) {
  const el = document.getElementById(hostId);
  if (el && !el.dataset.mountingInjected) {
    el.innerHTML = getCurrentLang() === 'en' ? SECTION_HTML_EN : SECTION_HTML;
    el.dataset.mountingInjected = '1';
  }
}

/** Re-render mounting block when language changes (replaces inner HTML). */
export function refreshMountingConfigSection(hostId = MOUNTING_SECTION_HOST_ID) {
  const el = document.getElementById(hostId);
  if (!el) return;
  delete el.dataset.mountingInjected;
  el.innerHTML = '';
  injectMountingConfigSection(hostId);
}

/** Ids de controles que deben disparar recálculo de recomendaciones */
export const MOUNTING_INPUT_IDS = [
  'mountingType',
  'mountMachineShaftDiam',
  'mountOrientation',
  'mountSpaceNote',
];
