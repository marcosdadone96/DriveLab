/**
 * Guardado/carga local de configuraciones por maquina.
 */

import { isPremiumEffective } from '../services/accessTier.js';

const LS_KEY = 'mdr-machine-configs-v1';

function getLang() {
  try {
    return localStorage.getItem('mdr-home-lang') === 'en' ? 'en' : 'es';
  } catch (_) {
    return 'es';
  }
}

function getTx(lang, isPro) {
  if (lang === 'en') {
    return {
      panelTitle: `Machine Configuration ${isPro ? '<span class="premium-flag">Pro</span>' : ''}`,
      namePlaceholder: 'Name (e.g. Production 1)',
      saveCurrent: 'Save Current',
      savedConfigs: 'Saved Configurations',
      load: 'Load',
      remove: 'Delete',
      hint: isPro
        ? 'Saved in this browser (localStorage).'
        : 'Pro feature: activate Pro version to save and load configurations.',
      promptName: 'Enter a name to save.',
      saved: (name) => `Configuration "${name}" saved.`,
      pickToLoad: 'Select a configuration to load.',
      notFound: 'Selected configuration was not found.',
      loaded: (name) => `Configuration "${name}" loaded.`,
      pickToDelete: 'Select a configuration to delete.',
      deleted: (name) => `Configuration "${name}" deleted.`,
      defaultOption: 'Saved configurations...',
    };
  }
  return {
    panelTitle: `Configuraci\u00f3n de la m\u00e1quina ${isPro ? '<span class="premium-flag">Pro</span>' : ''}`,
    namePlaceholder: 'Nombre (ej. Producci\u00f3n 1)',
    saveCurrent: 'Guardar actual',
    savedConfigs: 'Configuraciones guardadas',
    load: 'Cargar',
    remove: 'Eliminar',
    hint: isPro
      ? 'Se guardan en este navegador (localStorage).'
      : 'Funci\u00f3n Pro: active la versi\u00f3n Pro para guardar y cargar configuraciones.',
    promptName: 'Indique un nombre para guardar.',
    saved: (name) => `Configuraci\u00f3n "${name}" guardada.`,
    pickToLoad: 'Seleccione una configuraci\u00f3n para cargar.',
    notFound: 'No se encontr\u00f3 la configuraci\u00f3n seleccionada.',
    loaded: (name) => `Configuraci\u00f3n "${name}" cargada.`,
    pickToDelete: 'Seleccione una configuraci\u00f3n para eliminar.',
    deleted: (name) => `Configuraci\u00f3n "${name}" eliminada.`,
    defaultOption: 'Configuraciones guardadas...',
  };
}

function getToolKey() {
  const html = document.documentElement;
  const attrs = ['data-conveyor-tool', 'data-tool'];
  for (const a of attrs) {
    const v = html.getAttribute(a);
    if (v) return v;
  }
  const p = (window.location.pathname || '').toLowerCase();
  if (p.includes('roller-conveyor')) return 'roller';
  if (p.includes('screw-conveyor')) return 'screw';
  if (p.includes('bucket-elevator')) return 'bucket';
  if (p.includes('traction-elevator')) return 'traction';
  if (p.includes('car-lift-screw')) return 'carLift';
  if (p.includes('centrifugal-pump')) return 'pump';
  if (p.includes('flat-conveyor')) return 'flat';
  if (p.includes('inclined-conveyor')) return 'inclined';
  return 'machine';
}

function readStore() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

function writeStore(v) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(v));
  } catch (_) {
    /* ignore */
  }
}

function collectFormState(scope) {
  const out = {};
  scope.querySelectorAll('input[id], select[id], textarea[id]').forEach((el) => {
    if (el instanceof HTMLInputElement) {
      if (el.type === 'button' || el.type === 'submit' || el.type === 'reset' || el.type === 'search') return;
      out[el.id] = el.type === 'checkbox' ? Boolean(el.checked) : String(el.value ?? '');
      return;
    }
    if (el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
      out[el.id] = String(el.value ?? '');
    }
  });
  return out;
}

function applyFormState(scope, state) {
  Object.entries(state || {}).forEach(([id, v]) => {
    const el = scope.querySelector(`#${CSS.escape(id)}`);
    if (!el) return;
    if (el instanceof HTMLInputElement) {
      if (el.type === 'checkbox') {
        el.checked = Boolean(v);
      } else {
        el.value = String(v ?? '');
      }
    } else if (el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
      el.value = String(v ?? '');
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // Forzar refresco final: algunas paginas recalculan con logica encadenada
  // y pueden necesitar un segundo pase tras aplicar todos los campos.
  const evInput = new Event('input', { bubbles: true });
  const evChange = new Event('change', { bubbles: true });
  scope.querySelectorAll('input[id], select[id], textarea[id]').forEach((el) => {
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
      el.dispatchEvent(evInput);
      el.dispatchEvent(evChange);
    }
  });
}

function refreshSelect(select, toolConfigs, tx) {
  select.innerHTML = `<option value="">${tx.defaultOption}</option>`;
  Object.keys(toolConfigs || {})
    .sort((a, b) => a.localeCompare(b))
    .forEach((name) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
}

export function mountMachineConfigBar() {
  const main = document.querySelector('.app-main');
  if (!(main instanceof HTMLElement)) return;
  if (document.getElementById('machineConfigBar')) return;

  const tool = getToolKey();
  const isPro = isPremiumEffective();
  const tx = getTx(getLang(), isPro);
  const host = document.createElement('section');
  host.className = 'panel machine-config-panel';
  host.id = 'machineConfigBar';
  host.innerHTML = `
    <h2><span class="panel-icon">CFG</span> ${tx.panelTitle}</h2>
    <div class="machine-config-row">
      <input id="mcName" type="text" placeholder="${tx.namePlaceholder}" ${isPro ? '' : 'disabled'} />
      <button type="button" id="mcSave" class="button button--ghost" ${isPro ? '' : 'disabled'}>${tx.saveCurrent}</button>
      <select id="mcSelect" aria-label="${tx.savedConfigs}" ${isPro ? '' : 'disabled'}></select>
      <button type="button" id="mcLoad" class="button button--ghost" ${isPro ? '' : 'disabled'}>${tx.load}</button>
      <button type="button" id="mcDelete" class="button button--ghost" ${isPro ? '' : 'disabled'}>${tx.remove}</button>
    </div>
    <p class="field-hint" id="mcMsg">${tx.hint}</p>
  `;

  const stage = main.querySelector('.flat-stage, .layout-right');
  const beMain = main.querySelector('.be-main-col');
  if (stage instanceof HTMLElement) {
    stage.prepend(host);
  } else if (beMain instanceof HTMLElement) {
    /* Elevador cangilones: no a�adir un 3.er hijo directo de .app-main--be (rompe el grid 1fr | sidebar). */
    beMain.prepend(host);
  } else {
    main.prepend(host);
  }

  const nameIn = /** @type {HTMLInputElement|null} */ (host.querySelector('#mcName'));
  const select = /** @type {HTMLSelectElement|null} */ (host.querySelector('#mcSelect'));
  const msg = /** @type {HTMLElement|null} */ (host.querySelector('#mcMsg'));
  const saveBtn = host.querySelector('#mcSave');
  const loadBtn = host.querySelector('#mcLoad');
  const delBtn = host.querySelector('#mcDelete');
  if (!nameIn || !select || !msg || !saveBtn || !loadBtn || !delBtn) return;
  if (!isPro) return;

  const getToolConfigs = () => {
    const store = readStore();
    return store[tool] && typeof store[tool] === 'object' ? store[tool] : {};
  };
  refreshSelect(select, getToolConfigs(), tx);

  saveBtn.addEventListener('click', () => {
    const name = String(nameIn.value || '').trim();
    if (!name) {
      msg.textContent = tx.promptName;
      return;
    }
    const store = readStore();
    const byTool = store[tool] && typeof store[tool] === 'object' ? store[tool] : {};
    byTool[name] = {
      updatedAt: new Date().toISOString(),
      state: collectFormState(main),
    };
    store[tool] = byTool;
    writeStore(store);
    refreshSelect(select, byTool, tx);
    select.value = name;
    msg.textContent = tx.saved(name);
  });

  loadBtn.addEventListener('click', () => {
    const selected = String(select.value || '');
    if (!selected) {
      msg.textContent = tx.pickToLoad;
      return;
    }
    const byTool = getToolConfigs();
    const cfg = byTool[selected];
    if (!cfg || !cfg.state) {
      msg.textContent = tx.notFound;
      return;
    }
    applyFormState(main, cfg.state);
    msg.textContent = tx.loaded(selected);
  });

  delBtn.addEventListener('click', () => {
    const selected = String(select.value || '');
    if (!selected) {
      msg.textContent = tx.pickToDelete;
      return;
    }
    const store = readStore();
    const byTool = store[tool] && typeof store[tool] === 'object' ? store[tool] : {};
    delete byTool[selected];
    store[tool] = byTool;
    writeStore(store);
    refreshSelect(select, byTool, tx);
    msg.textContent = tx.deleted(selected);
  });
}

