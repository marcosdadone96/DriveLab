/**
 * Static ES/EN for screw-conveyor.html. Same language key as hub (mdr-home-lang).
 */

import { getCurrentLang, setCurrentLang } from '../config/locales.js';
import { refreshMountingConfigSection } from './mountingConfigSection.js';

export const SCREW_LANG_EVENT = 'mdr-home-lang-changed';

/** @param {boolean} en */
function chipAria(prefix, en) {
  return `${en ? 'Help:' : 'Ayuda'} ${prefix}.`;
}

/** @type {Record<string, { es: { title: string; aria: string }; en: { title: string; aria: string } }>} */
const CHIPS = {
  cap: {
    es: {
      title:
        'Caudal objetivo de la instalaci\u00f3n. Si trabaja con t/h, se convierte con la densidad aparente del bloque Material.',
      aria: 'capacidad requerida del tornillo',
    },
    en: {
      title: 'Target throughput. If you use t/h, it converts using bulk density from the Material section.',
      aria: 'required screw capacity',
    },
  },
  capUnit: {
    es: {
      title: 'm\u00b3/h para caudal volum\u00e9trico o t/h para caudal m\u00e1sico. En t/h la densidad afecta directamente al c\u00e1lculo.',
      aria: 'unidad de capacidad',
    },
    en: {
      title: 'm\u00b3/h for volumetric or t/h for mass flow. t/h uses bulk density directly in the math.',
      aria: 'capacity unit',
    },
  },
  diam: {
    es: {
      title:
        '\u00d8 exterior del tornillo. Referencia t\u00edpica industrial: 150\u2013600 mm. Di\u00e1metros mayores suelen requerir RPM menores.',
      aria: 'di\u00e1metro de tornillo',
    },
    en: {
      title: 'Outside screw diameter. Typical industrial range: 150\u2013600 mm. Larger diameters often need lower RPM.',
      aria: 'screw diameter',
    },
  },
  diamUnit: {
    es: {
      title: 'Puede introducir di\u00e1metro en mm o pulgadas; el c\u00e1lculo interno se normaliza en metros.',
      aria: 'unidad de di\u00e1metro',
    },
    en: {
      title: 'Diameter in mm or inches; internally normalized to metres.',
      aria: 'diameter unit',
    },
  },
  pitch: {
    es: {
      title: 'Avance axial por vuelta. Regla r\u00e1pida: p\u2248D en muchos dise\u00f1os generales; p menor para materiales dif\u00edciles.',
      aria: 'paso de tornillo',
    },
    en: {
      title: 'Axial advance per turn. Rule of thumb: p\u2248D for many designs; lower p for difficult materials.',
      aria: 'screw pitch',
    },
  },
  pitchUnit: {
    es: {
      title: 'Unidad del paso (mm o pulgadas). Se convierte autom\u00e1ticamente para las f\u00f3rmulas internas.',
      aria: 'unidad de paso',
    },
    en: {
      title: 'Pitch unit (mm or in); converted automatically for internal formulas.',
      aria: 'pitch unit',
    },
  },
  length: {
    es: {
      title: 'Longitud efectiva de transporte en metros. A mayor longitud, mayor resistencia equivalente y potencia requerida.',
      aria: 'longitud de transporte',
    },
    en: {
      title: 'Effective conveying length in metres. Longer runs increase equivalent resistance and power.',
      aria: 'conveying length',
    },
  },
  angle: {
    es: {
      title:
        '\u00c1ngulo respecto a horizontal. En inclinaciones altas el rendimiento real puede caer; valide con fabricante para \u03b8 elevados.',
      aria: 'inclinaci\u00f3n del tornillo',
    },
    en: {
      title: 'Angle from horizontal. Performance may drop at high angles; validate with the OEM.',
      aria: 'screw inclination',
    },
  },
  rho: {
    es: {
      title:
        'Densidad bulk del material (kg/m\u00b3). Valores orientativos: 500\u2013900 granos/piensos, 900\u20131500 minerales finos.',
      aria: 'densidad aparente',
    },
    en: {
      title: 'Bulk density (kg/m\u00b3). Typical: 500\u2013900 grain/feed, 900\u20131500 fine minerals.',
      aria: 'bulk density',
    },
  },
  trough: {
    es: {
      title: 'Porcentaje de llenado de la secci\u00f3n del canal. 15% para fluidos, 30% uso general, 45% materiales m\u00e1s dif\u00edciles.',
      aria: 'porcentaje de llenado del canal',
    },
    en: {
      title: 'Trough cross-section fill. 15% fluid-like, 30% general duty, 45% difficult materials.',
      aria: 'trough fill percentage',
    },
  },
  abrasive: {
    es: {
      title: 'Ajusta margen por desgaste y l\u00edmite orientativo de RPM. Materiales abrasivos requieren m\u00e1s margen y menor r\u00e9gimen.',
      aria: 'abrasividad',
    },
    en: {
      title: 'Adjusts wear margin and indicative RPM cap. Abrasive materials need more margin and lower speed.',
      aria: 'abrasiveness',
    },
  },
  corrosive: {
    es: {
      title: 'Ajusta margen de dise\u00f1o por entorno/material corrosivo. Niveles altos recomiendan materiales/recubrimientos espec\u00edficos.',
      aria: 'corrosividad',
    },
    en: {
      title: 'Design margin for corrosive environment/material. High levels suggest special materials/linings.',
      aria: 'corrosiveness',
    },
  },
  mu: {
    es: {
      title:
        'Coeficiente de rozamiento equivalente en canal. Orientativo: 0,20\u20130,35 materiales m\u00e1s fluidos; 0,35\u20130,60 m\u00e1s dif\u00edciles.',
      aria: 'coeficiente de rozamiento',
    },
    en: {
      title: 'Equivalent friction in trough. Typical: 0.20\u20130.35 freer-flowing; 0.35\u20130.60 more difficult.',
      aria: 'friction coefficient',
    },
  },
  bearingEta: {
    es: {
      title: 'Rendimiento agregado de apoyos/transmisi\u00f3n mec\u00e1nica. Valor t\u00edpico de partida: 90\u201395 %.',
      aria: 'rendimiento mec\u00e1nico',
    },
    en: {
      title: 'Aggregate mechanical efficiency of bearings/drive. Typical starting point: 90\u201395%.',
      aria: 'mechanical efficiency',
    },
  },
  loadDuty: {
    es: {
      title:
        'Selecciona factor de servicio base seg\u00fan severidad (uniforme, moderada, pesada) o permite valor personalizado.',
      aria: 'tipo de carga',
    },
    en: {
      title: 'Base service factor by duty severity (uniform, moderate, heavy) or custom value.',
      aria: 'load duty type',
    },
  },
  sf: {
    es: {
      title:
        'Margen de dimensionamiento sobre par/potencia. Referencia com\u00fan: 1,15\u20131,35 moderado, hasta 1,75 o m\u00e1s en cargas severas.',
      aria: 'factor de servicio',
    },
    en: {
      title: 'Sizing margin on torque/power. Common: 1.15\u20131.35 moderate, up to 1.75+ for severe duty.',
      aria: 'service factor',
    },
  },
  vBrand: {
    es: {
      title: 'Fabricante del cat\u00e1logo de demostraci\u00f3n para comprobar disponibilidad de modelos.',
      aria: 'marca en comprobador',
    },
    en: {
      title: 'Demo catalog manufacturer to filter models.',
      aria: 'verifier brand',
    },
  },
  vSearch: {
    es: {
      title: 'B\u00fasqueda por texto/c\u00f3digo para reducir el listado de modelos del cat\u00e1logo.',
      aria: 'filtro de modelo',
    },
    en: {
      title: 'Text/code search to shorten the model list.',
      aria: 'model filter',
    },
  },
  vModel: {
    es: {
      title: 'Se compara contra potencia, par y RPM calculados para este tornillo helicoidal.',
      aria: 'modelo en comprobador',
    },
    en: {
      title: 'Compared to calculated power, torque and RPM for this screw conveyor.',
      aria: 'verifier model',
    },
  },
};

/** @param {'es'|'en'} lang */
function applyChips(lang) {
  const en = lang === 'en';
  document.querySelectorAll('[data-sc-chip]').forEach((el) => {
    const k = el.getAttribute('data-sc-chip');
    if (!k || !CHIPS[k]) return;
    const t = CHIPS[k][en ? 'en' : 'es'];
    el.setAttribute('title', t.title);
    el.setAttribute('aria-label', chipAria(t.aria, lang));
  });
}

/** @param {'es'|'en'} lang */
function applyNav(lang) {
  const en = lang === 'en';
  const map = {
    'index.html': en ? 'Home' : 'Inicio',
    'flat-conveyor.html': en ? 'Flat belt' : 'Cinta plana',
    'inclined-conveyor.html': en ? 'Inclined belt' : 'Cinta inclinada',
    'roller-conveyor.html': en ? 'Rollers' : 'Rodillos',
    'centrifugal-pump.html': en ? 'Pump' : 'Bomba',
    'screw-conveyor.html': en ? 'Screw conveyor' : 'Tornillo',
    'transmission-lab.html': en ? 'Laboratory' : 'Laboratorio',
    'transmission-canvas.html': en ? 'Pro canvas' : 'Lienzo Pro',
  };
  document.querySelectorAll('.app-header__nav-start a[href], .app-header__nav-end a[href]').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (map[href]) a.textContent = map[href];
  });
  const canvas = document.querySelector('.app-header__nav-end a[href="transmission-canvas.html"]');
  if (canvas) {
    canvas.setAttribute('title', en ? 'Multi-shaft technical canvas (Pro)' : 'Lienzo t\u00e9cnico multieje (Pro)');
  }
  const nav = document.querySelector('header nav[aria-label]');
  if (nav) nav.setAttribute('aria-label', en ? 'Main navigation' : 'Navegaci\u00f3n principal');
}

/** @type {Record<string, { es: string; en: string }>} */
const LBL = {
  lblCap: { es: 'Capacidad requerida', en: 'Required capacity' },
  lblCapUnit: { es: 'Unidad capacidad', en: 'Capacity unit' },
  lblDiam: { es: 'Di\u00e1metro tornillo', en: 'Screw diameter' },
  lblDiamUnit: { es: 'Unidad \u00d8', en: 'Diameter unit' },
  lblPitch: { es: 'Paso', en: 'Pitch' },
  lblPitchUnit: { es: 'Unidad paso', en: 'Pitch unit' },
  lblLength: { es: 'Longitud transporte', en: 'Conveying length' },
  lblAngle: { es: 'Inclinaci\u00f3n \u03b8', en: 'Inclination \u03b8' },
  lblRho: { es: 'Densidad aparente', en: 'Bulk density' },
  lblTrough: { es: 'Trough loading', en: 'Trough loading' },
  lblAbrasive: { es: 'Abrasividad', en: 'Abrasiveness' },
  lblCorrosive: { es: 'Corrosividad', en: 'Corrosiveness' },
  lblMu: { es: '\u03bc material\u2013acero', en: '\u03bc material\u2013steel' },
  lblBearingEta: { es: 'Rend. mec\u00e1nico (apoyos)', en: 'Mech. efficiency (bearings)' },
  lblLoadDuty: { es: 'Tipo de carga', en: 'Load duty' },
  lblSf: { es: 'Factor de servicio SF', en: 'Service factor SF' },
  lblVBrand: { es: 'Marca', en: 'Brand' },
  lblVSearch: { es: 'Filtrar modelo', en: 'Filter model' },
  lblVModel: { es: 'Modelo', en: 'Model' },
  accGeom: { es: 'Capacidad y geometr\u00eda', en: 'Capacity and geometry' },
  accMat: { es: 'Material', en: 'Material' },
  accFriction: { es: 'Rozamiento, rendimiento y servicio', en: 'Friction, efficiency and service' },
};

/** @type {Record<string, { es: string; en: string }>} */
const RANGE_ARIA = {
  capR: { es: 'Capacidad', en: 'Capacity' },
  diamR: { es: '\u00d8 tornillo', en: 'Screw diameter' },
  pitchR: { es: 'Paso', en: 'Pitch' },
  lengthR: { es: 'Longitud L', en: 'Length L' },
  angleR: { es: '\u00c1ngulo \u03b8', en: 'Angle \u03b8' },
  rhoR: { es: 'Densidad \u03c1', en: 'Density \u03c1' },
  muR: { es: 'Coeficiente \u03bc', en: 'Coefficient \u03bc' },
};

/** @param {'es'|'en'} lang */
function applyLabelsAndRanges(lang) {
  const en = lang === 'en';
  const t = en ? 'en' : 'es';
  document.querySelectorAll('[data-sc-for]').forEach((el) => {
    const k = el.getAttribute('data-sc-for');
    if (k && LBL[k]) el.textContent = LBL[k][t];
  });
  document.querySelectorAll('[data-sc-aria-for]').forEach((el) => {
    const k = el.getAttribute('data-sc-aria-for');
    if (k && RANGE_ARIA[k]) el.setAttribute('aria-label', RANGE_ARIA[k][t]);
  });
}

/** @param {'es'|'en'} lang */
function applySelectOptions(lang) {
  const en = lang === 'en';
  const cap = document.getElementById('screwCapUnit');
  if (cap) {
    const o = /** @type {HTMLSelectElement} */ (cap).options;
    if (o[0]) o[0].textContent = 'm\u00b3/h';
    if (o[1]) o[1].textContent = 't/h';
  }
  const capHint = document.querySelector('#screwCapUnit + .field-hint');
  if (capHint) {
    capHint.textContent = en ? 't/h uses bulk density from Material.' : 't/h usa densidad del bloque Material.';
  }
  document.querySelectorAll('#screwDiamUnit option[value="mm"], #screwPitchUnit option[value="mm"]').forEach((o) => {
    o.textContent = 'mm';
  });
  document.querySelectorAll('#screwDiamUnit option[value="in"], #screwPitchUnit option[value="in"]').forEach((o) => {
    o.textContent = en ? 'in' : 'pulgadas';
  });
  const trough15 = document.querySelector('#screwTroughLoad option[value="15"]');
  const trough30 = document.querySelector('#screwTroughLoad option[value="30"]');
  const trough45 = document.querySelector('#screwTroughLoad option[value="45"]');
  if (trough15) trough15.textContent = en ? '15 % \u2014 fluid-like' : '15 % \u2014 fluidos';
  if (trough30) trough30.textContent = en ? '30 % \u2014 general duty' : '30 % \u2014 uso general';
  if (trough45) trough45.textContent = en ? '45 % \u2014 difficult' : '45 % \u2014 dif\u00edciles';
  const wear = (sel) => {
    const low = document.querySelector(`${sel} option[value="low"]`);
    const med = document.querySelector(`${sel} option[value="medium"]`);
    const high = document.querySelector(`${sel} option[value="high"]`);
    if (low) low.textContent = en ? 'Low' : 'Baja';
    if (med) med.textContent = en ? 'Medium' : 'Media';
    if (high) high.textContent = en ? 'High' : 'Alta';
  };
  wear('#screwAbrasive');
  wear('#screwCorrosive');
  const duty = document.getElementById('screwLoadDuty');
  if (duty) {
    const o = /** @type {HTMLSelectElement} */ (duty).options;
    const rows = [
      { v: 'uniform', es: 'Carga uniforme \u2014 SF \u2248 1,15', en: 'Uniform load \u2014 SF \u2248 1.15' },
      { v: 'moderate', es: 'Choque moderado \u2014 SF \u2248 1,35', en: 'Moderate shock \u2014 SF \u2248 1.35' },
      { v: 'heavy', es: 'Choque pesado \u2014 SF \u2248 1,75', en: 'Heavy shock \u2014 SF \u2248 1.75' },
      { v: 'custom', es: 'Personalizado', en: 'Custom' },
    ];
    rows.forEach((r, i) => {
      if (o[i] && o[i].value === r.v) o[i].textContent = en ? r.en : r.es;
    });
  }
  const sfHint = document.querySelector('#screwServiceFactor')?.parentElement?.querySelector('.field-hint');
  if (sfHint) {
    sfHint.textContent = en
      ? 'Combined with abrasiveness / corrosiveness margins.'
      : 'Se combina con abrasividad/corrosividad.';
  }
}

/** @param {'es'|'en'} lang */
function applyBlocks(lang) {
  const en = lang === 'en';
  const t = en ? 'en' : 'es';
  const sideTitle = document.querySelector('.flat-sidebar__title');
  if (sideTitle) {
    sideTitle.textContent = en ? 'Screw conveyor' : 'Tornillo helicoidal';
  }
  const sideLead = document.querySelector('.flat-sidebar__lead');
  if (sideLead) {
    sideLead.textContent = en
      ? 'Capacity, geometry and bulk solid. Indicative model (not a full CEMA 350 replacement). Dashboard and schematic on the right, like the flat belt tool.'
      : 'Capacidad, geometr\u00eda y material. Modelo orientativo (no sustituye CEMA 350). Dashboard y esquema a la derecha, como en cinta plana.';
  }
  const helpSum = document.querySelector('.help-details.flat-help > summary');
  if (helpSum) helpSum.textContent = en ? 'Quick guide to each quantity' : 'Gu\u00eda r\u00e1pida de cada magnitud';
  const helpBody = document.querySelector('.help-details.flat-help .help-details__body');
  if (helpBody) {
    helpBody.innerHTML = en
      ? `<p class="help-details__lead muted">
      Almost every label has a <span class="info-chip info-chip--static" aria-hidden="true">?</span>: on desktop hover; on touch <strong>tap</strong> for help.
    </p>
    <ul>
      <li><strong>Capacity</strong> and geometry (D, pitch, L, \u03b8): the model estimates screw speed and shaft torque.</li>
      <li><strong>Material</strong>: bulk density, trough fill, abrasiveness and corrosiveness adjust margins.</li>
      <li><strong>\u03bc and efficiency</strong>: solid\u2013steel friction and bearing losses; load duty sets the base service factor.</li>
      <li><strong>RPM</strong>: if a high-speed warning appears, cross-check with the screw OEM.</li>
    </ul>`
      : `<p class="help-details__lead muted">
      Junto a casi cada etiqueta hay un <span class="info-chip info-chip--static" aria-hidden="true">?</span>: en escritorio, sit\u00fae el cursor encima; en t\u00e1ctil, <strong>pulse</strong> el mismo s\u00edmbolo para leer la ayuda sin alargar el formulario.
    </p>
    <ul>
      <li><strong>Capacidad</strong> y geometr\u00eda (\u00d8, paso, L, \u03b8): el modelo estima r\u00e9gimen y par en el eje del tornillo.</li>
      <li><strong>Material</strong>: densidad, llenado del trough, abrasividad y corrosividad ajustan m\u00e1rgenes.</li>
      <li><strong>\u03bc y rendimiento</strong>: rozamiento s\u00f3lido\u2013acero y p\u00e9rdidas en apoyos; el SF lo fija el tipo de carga.</li>
      <li><strong>RPM</strong>: si aparece aviso de r\u00e9gimen alto, contr\u00e1stelo con el fabricante del tornillo.</li>
    </ul>`;
  }
  const scope = document.querySelector('.flat-model-scope');
  if (scope) {
    scope.innerHTML = en
      ? '<strong>Model:</strong> bulk solid \u00b7 indicative shaft power. <a href="#screw-conveyor-assumptions">Assumptions and exclusions</a>'
      : '<strong>Modelo:</strong> s\u00f3lido a granel \u00b7 potencia orientativa en eje. <a href="#screw-conveyor-assumptions">Hip\u00f3tesis y exclusiones</a>';
  }
  const btn = document.getElementById('btnScrewCalc');
  if (btn) btn.textContent = en ? 'View suggested gearmotors' : 'Ver motorreductores sugeridos';
  const calcHint = document.querySelector('.flat-calc-hint');
  if (calcHint) {
    calcHint.innerHTML = en
      ? 'Results and the diagram <strong>update automatically</strong>. This button expands suggested gearmotors.'
      : 'Los resultados y el diagrama se <strong>actualizan solos</strong>. Este bot\u00f3n despliega motorreductores sugeridos.';
  }
  const dashTitle = document.querySelector('.flat-dashboard__title');
  if (dashTitle) dashTitle.textContent = en ? 'Sizing dashboard' : 'Dashboard de dimensionamiento';
  const dashLead = document.querySelector('.flat-dashboard__lead');
  if (dashLead) {
    dashLead.textContent = en
      ? 'Torque, motor power and screw speed; review the RPM banner if it appears.'
      : 'Par, potencia y r\u00e9gimen del tornillo; revise el aviso de RPM si aparece.';
  }
  const svg = document.getElementById('diagramScrew');
  if (svg) {
    svg.setAttribute('aria-label', en ? 'Screw conveyor schematic' : 'Esquema tornillo');
  }
  const note = document.querySelector('.diagram-duo.flat-visual .diagram-schematic-note');
  if (note) {
    note.innerHTML = en
      ? '<strong>Quick read:</strong> qualitative side view of trough, screw and bulk flow; <strong>L</strong>, <strong>OD</strong>, <strong>pitch</strong> and <strong>angle</strong> come from the form. The dashboard updates when inputs change.'
      : '<strong>Lectura r\u00e1pida:</strong> vista lateral cualitativa del canal, tornillo y flujo; <strong>L</strong>, <strong>\u00d8</strong>, <strong>paso</strong> e <strong>inclinaci\u00f3n</strong> salen del formulario. El dashboard se actualiza al cambiar entradas.';
  }
  const fig = document.querySelector('.diagram-duo__real img');
  if (fig) {
    fig.setAttribute(
      'alt',
      en ? 'Screw conveyor reference photo' : 'Transportador de tornillo en planta (referencia)',
    );
  }
  const cap = document.querySelector('.diagram-duo__real figcaption');
  if (cap) {
    cap.innerHTML = en
      ? 'Reference: screw (illustrative). <a href="https://commons.wikimedia.org/wiki/File:Archimedes_screw_at_Kinderdijk.jpg" target="_blank" rel="noopener">Wikimedia</a>'
      : 'Referencia: tornillo (ejemplo visual). <a href="https://commons.wikimedia.org/wiki/File:Archimedes_screw_at_Kinderdijk.jpg" target="_blank" rel="noopener">Wikimedia</a>';
  }
  document.querySelector('.diagram-duo.flat-visual')?.setAttribute('aria-label', en ? 'Schematic and reference photo' : 'Esquema tornillo');
  const vh2 = document.querySelector('#screwVerifyPanel h2');
  if (vh2) {
    vh2.innerHTML = en
      ? '<span class="panel-icon">\u2713</span> Check a gearmotor'
      : '<span class="panel-icon">\u2713</span> Comprobar motorreductor';
  }
  const vlead = document.querySelector('#screwVerifyPanel .panel-lead');
  if (vlead) {
    vlead.textContent = en
      ? 'Same logic as the flat belt tool: compare against the calculated screw duty point.'
      : 'Misma l\u00f3gica que cinta plana: compare con el punto calculado del tornillo.';
  }
  const vrun = document.querySelector('#screwVerifyPanel [data-verify-run]');
  if (vrun) vrun.textContent = en ? 'Check for this screw' : 'Comprobar para este tornillo';
  const eng = document.querySelector('#screwEngineeringReport')?.closest('.panel');
  if (eng) {
    const title = eng.querySelector('.motors-details__title');
    const hint = eng.querySelector('.motors-details__hint');
    if (title) title.textContent = en ? 'Engineering breakdown' : 'Desglose de ingenier\u00eda';
    if (hint) hint.textContent = en ? 'Step-by-step detail' : 'C\u00e1lculo paso a paso';
  }
  const motTitle = document.querySelector('#section-screw-motores .motors-details__title');
  const motHint = document.querySelector('#section-screw-motores .motors-details__hint');
  if (motTitle) motTitle.textContent = en ? 'Gearmotors (sample catalog)' : 'Motorreductores (cat\u00e1logo ejemplo)';
  if (motHint) motHint.textContent = en ? 'Recommendations and export' : 'Recomendaciones y exportaci\u00f3n';
  const hypTitle = document.querySelector('#screw-conveyor-assumptions .motors-details__title');
  const hypHint = document.querySelector('#screw-conveyor-assumptions .motors-details__hint');
  if (hypTitle) hypTitle.textContent = en ? 'Model assumptions' : 'Hip\u00f3tesis del modelo';
  if (hypHint) hypHint.textContent = en ? 'Assumptions and limits' : 'Supuestos y l\u00edmites';
  const pdfH2 = document.querySelector('#premiumPdfExportMount')?.closest('section.panel')?.querySelector('h2');
  if (pdfH2) pdfH2.innerHTML = en ? '<span class="panel-icon">PDF</span> Export report' : '<span class="panel-icon">PDF</span> Exportar informe';
}

/** @param {'es'|'en'} lang */
export function applyScrewConveyorStaticI18n(lang = getCurrentLang()) {
  const en = lang === 'en';
  document.documentElement.lang = en ? 'en' : 'es';
  document.title = en ? 'Screw conveyor \u2014 MechAssist' : 'Tornillo helicoidal \u2014 MechAssist';

  const fpw = document.getElementById('fileProtoWarn');
  if (fpw) {
    fpw.textContent = en
      ? 'Tip: use a local HTTP server (npx --yes serve .). With file:// modules may not load.'
      : 'Recomendaci\u00f3n: servidor HTTP (npx --yes serve .). Con file:// los m\u00f3dulos pueden no cargar.';
  }

  applyNav(lang);
  applyLabelsAndRanges(lang);
  applySelectOptions(lang);
  applyChips(lang);
  applyBlocks(lang);

  const host = document.getElementById('scLangHost');
  if (host) host.setAttribute('aria-label', en ? 'Language selector' : 'Selector de idioma');
}

function syncScrewLangButtons() {
  const lang = getCurrentLang();
  document.querySelectorAll('#scLangHost [data-lang]').forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    const l = btn.getAttribute('data-lang');
    btn.classList.toggle('hub-lang__btn--active', l === lang);
    btn.setAttribute('aria-pressed', l === lang ? 'true' : 'false');
  });
}

export function applyScrewConveyorPageLanguage() {
  applyScrewConveyorStaticI18n(getCurrentLang());
  refreshMountingConfigSection();
  syncScrewLangButtons();
  window.dispatchEvent(new CustomEvent(SCREW_LANG_EVENT, { detail: { lang: getCurrentLang() } }));
}

export function initScrewConveyorLangChrome() {
  const host = document.getElementById('scLangHost');
  if (!host) return;
  host.innerHTML = `
    <div class="hub-lang" role="group" aria-label="">
      <button type="button" class="hub-lang__btn" data-lang="es" aria-pressed="false">ES</button>
      <button type="button" class="hub-lang__btn" data-lang="en" aria-pressed="false">EN</button>
    </div>`;
  host.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const l = btn.getAttribute('data-lang');
      if (l !== 'es' && l !== 'en') return;
      setCurrentLang(l);
      applyScrewConveyorPageLanguage();
    });
  });
  applyScrewConveyorPageLanguage();
}
