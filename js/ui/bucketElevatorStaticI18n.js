/**
 * Static copy for bucket-elevator.html (ES/EN). Uses \\u escapes for Spanish (ASCII-safe).
 */

import { getCurrentLang, setCurrentLang } from '../config/locales.js';
import { refreshMountingConfigSection } from './mountingConfigSection.js';

export const BUCKET_ELEVATOR_LANG_EVENT = 'mdr-home-lang-changed';

/** @type {Record<string, { es: string; en: string }>} */
const CHIPS = {
  rho: {
    es: 'Densidad aparente del granel (kg/m\u00b3). Aconsejado: 500\u2013900 para grano/pienso, 900\u20131300 para \u00e1ridos finos. Si duda, use ficha t\u00e9cnica del material.',
    en: 'Bulk apparent density (kg/m\u00b3). Typical: 500\u2013900 for grain/feed, 900\u20131300 for fine aggregates. Use vendor data if unsure.',
  },
  particle: {
    es: 'Tama\u00f1o caracter\u00edstico del producto (mm). Influye en llenado y riesgo de degradaci\u00f3n. Referencia: fino <2 mm, medio 2\u201315 mm, grueso >15 mm.',
    en: 'Characteristic particle size (mm). Affects fill and degradation risk. Reference: fine <2 mm, medium 2\u201315 mm, coarse >15 mm.',
  },
  fluidity: {
    es: 'Calidad de flujo del material en cangil\u00f3n: pobre/medio/bueno. Afecta el factor de llenado \u03c6. Si hay apelmazamiento, elija Pobre por seguridad.',
    en: 'Flow quality in the bucket: poor/medium/good. Affects fill factor \u03c6. If material packs, choose Poor for safety.',
  },
  nature: {
    es: 'Clase operativa para recomendar velocidad de banda. Fr\u00e1gil/abrasivo: velocidades m\u00e1s bajas; fluido/ligero: puede aceptar m\u00e1s velocidad.',
    en: 'Operating class for belt speed hints. Fragile/abrasive: lower speeds; fluid/light: may allow higher speeds.',
  },
  q: {
    es: 'Producci\u00f3n objetivo en t/h (TPH). Conviene a\u00f1adir margen operativo del 10\u201320% seg\u00fan variabilidad del proceso.',
    en: 'Target throughput in t/h (TPH). Consider 10\u201320% operating margin depending on process variability.',
  },
  h: {
    es: 'Cota vertical \u00fatil de elevaci\u00f3n (m). Es la variable m\u00e1s influyente en potencia de elevaci\u00f3n pura.',
    en: 'Useful vertical lift (m). Strongest driver of pure lift power.',
  },
  c: {
    es: 'Distancia aproximada entre ejes de tambor cabeza y pie (m). Se usa para geometr\u00eda del circuito y representaci\u00f3n.',
    en: 'Approx. center distance head to boot drum (m). Used for circuit geometry and the sketch.',
  },
  dhead: {
    es: 'Di\u00e1metro del tambor superior (m). Mayor di\u00e1metro reduce par\u00e1metro centr\u00edfugo K=v\u00b2/(gR) y puede mejorar descarga.',
    en: 'Upper drum diameter (m). Larger diameter lowers K=v\u00b2/(gR) and can improve discharge.',
  },
  dboot: {
    es: 'Di\u00e1metro del tambor inferior (m). Afecta envolvente, curvatura de banda y comportamiento en bota.',
    en: 'Lower drum diameter (m). Affects envelope, belt curvature and boot behavior.',
  },
  diagGrow: {
    es: 'El diagrama a la derecha crece con H para visualizar la escala del elevador.',
    en: 'The diagram on the right scales with H to visualize elevator size.',
  },
  bucket: {
    es: 'Define volumen por cangil\u00f3n y ancho m\u00ednimo de banda orientativo. Seleccione primero seg\u00fan capacidad y naturaleza del producto.',
    en: 'Sets volume per bucket and indicative minimum belt width. Pick from capacity and material behavior first.',
  },
  vbelt: {
    es: 'Velocidad lineal de banda (m/s). Referencia: 1.0\u20131.8 fr\u00e1gil/abrasivo, 1.5\u20132.4 est\u00e1ndar, 2.2\u20133.6 fluido/ligero.',
    en: 'Belt line speed (m/s). Reference: 1.0\u20131.8 fragile/abrasive, 1.5\u20132.4 standard, 2.2\u20133.6 fluid/light.',
  },
  width: {
    es: 'Ancho nominal de banda (mm). Debe ser igual o superior al m\u00ednimo recomendado por cangil\u00f3n y tensi\u00f3n de trabajo.',
    en: 'Nominal belt width (mm). Must meet bucket minimum and working tension needs.',
  },
  sigma: {
    es: 'Resistencia nominal de banda en N/mm (clase textil o equivalente). Valores t\u00edpicos demo: 250\u2013630 N/mm.',
    en: 'Nominal belt strength in N/mm (textile class or equivalent). Demo typical: 250\u2013630 N/mm.',
  },
  eta: {
    es: 'Rendimiento mec\u00e1nico del tramo de elevaci\u00f3n. Orientativo: 0.70\u20130.85. Si hay dudas, use 0.75\u20130.80 para lado conservador.',
    en: 'Mechanical efficiency of the lift run. Typical 0.70\u20130.85; use 0.75\u20130.80 if unsure (conservative).',
  },
  kboot: {
    es: 'Fracci\u00f3n de potencia adicional por dragado/resistencia en pie. Referencia: 0.10\u20130.25 t\u00edpico, hasta 0.35 en condiciones severas.',
    en: 'Extra power fraction from boot drag. Reference: 0.10\u20130.25 typical, up to 0.35 in harsh conditions.',
  },
  etatrans: {
    es: 'Rendimiento del tren de transmisi\u00f3n (reductor, acoples). Valor habitual 0.92\u20130.98; usar 0.95\u20130.96 como base.',
    en: 'Drive train efficiency (gearbox, couplings). Often 0.92\u20130.98; 0.95\u20130.96 is a reasonable base.',
  },
  vbrand: {
    es: 'Fabricante del cat\u00e1logo demo para comprobaci\u00f3n r\u00e1pida.',
    en: 'Demo catalog manufacturer for quick checks.',
  },
  vsearch: {
    es: 'Busca por c\u00f3digo o fragmento de nombre para reducir la lista de modelos.',
    en: 'Filter by code or name fragment to shorten the model list.',
  },
  vmodel: {
    es: 'Se compara contra potencia, par y rpm requeridos en el tambor de cabeza.',
    en: 'Compared to required power, torque and rpm at the head drum.',
  },
};

function chipAria(prefix, lang) {
  const p = lang === 'en' ? 'Help:' : 'Ayuda';
  return `${p} ${prefix}.`;
}

/**
 * @param {'es'|'en'} lang
 */
function applyChips(lang) {
  const en = lang === 'en';
  document.querySelectorAll('[data-be-chip]').forEach((el) => {
    const k = el.getAttribute('data-be-chip');
    if (!k || !CHIPS[k]) return;
    const t = CHIPS[k][en ? 'en' : 'es'];
    el.setAttribute('title', t);
    const short =
      {
        rho: en ? 'bulk density' : 'densidad aparente',
        particle: en ? 'particle size' : 'granulometr\u00eda',
        fluidity: en ? 'flowability' : 'fluidez',
        nature: en ? 'material nature' : 'naturaleza del producto',
        q: en ? 'required capacity' : 'capacidad requerida',
        h: en ? 'lift height' : 'altura de elevaci\u00f3n',
        c: en ? 'center distance' : 'distancia entre centros',
        dhead: en ? 'head drum diameter' : 'di\u00e1metro tambor de cabeza',
        dboot: en ? 'boot drum diameter' : 'di\u00e1metro tambor de pie',
        diagGrow: en ? 'diagram scale' : 'escala del diagrama',
        bucket: en ? 'bucket type' : 'tipo de cangil\u00f3n',
        vbelt: en ? 'belt speed' : 'velocidad de banda',
        width: en ? 'belt width' : 'ancho de banda',
        sigma: en ? 'belt strength' : 'resistencia de banda',
        eta: en ? 'lift efficiency' : 'rendimiento de elevaci\u00f3n',
        kboot: en ? 'boot drag factor' : 'coeficiente de arrastre en bota',
        etatrans: en ? 'transmission efficiency' : 'rendimiento de transmisi\u00f3n',
        vbrand: en ? 'verifier brand' : 'marca del comprobador',
        vsearch: en ? 'model filter' : 'filtro de modelo',
        vmodel: en ? 'catalog model' : 'modelo del cat\u00e1logo',
      }[k] || k;
    el.setAttribute('aria-label', chipAria(short, lang));
  });
}

/** @param {'es'|'en'} lang */
function applySelectOptions(lang) {
  const en = lang === 'en';
  const fluid = document.getElementById('beFluidity');
  if (fluid) {
    const o = /** @type {HTMLSelectElement} */ (fluid).options;
    if (o[0]) o[0].textContent = en ? 'Poor \u2014 sticky fines / very fine' : 'Pobre \u2014 polvo pegajoso / muy fino';
    if (o[1]) o[1].textContent = en ? 'Medium \u2014 typical bulk' : 'Media \u2014 granel t\u00edpico';
    if (o[2]) o[2].textContent = en ? 'Good \u2014 free-flowing dry grains' : 'Buena \u2014 granos secos fluidos';
  }
  const nature = document.getElementById('beNature');
  if (nature) {
    const o = /** @type {HTMLSelectElement} */ (nature).options;
    if (o[0]) o[0].textContent = en ? 'Fragile / abrasive \u2014 lower speed' : 'Fr\u00e1gil / abrasivo \u2014 baja velocidad';
    if (o[1]) o[1].textContent = en ? 'Standard' : 'Est\u00e1ndar';
    if (o[2]) o[2].textContent = en ? 'Fluid / light \u2014 higher speed' : 'Fluido / ligero \u2014 velocidad mayor';
  }
}

/** @param {'es'|'en'} lang */
function applyNav(lang) {
  const en = lang === 'en';
  const map = {
    'index.html': en ? 'Home' : 'Inicio',
    'flat-conveyor.html': en ? 'Flat belt' : 'Cinta plana',
    'inclined-conveyor.html': en ? 'Inclined belt' : 'Cinta inclinada',
    'bucket-elevator.html': en ? 'Bucket elevator' : 'Elevador cangilones',
    'car-lift-screw.html': en ? 'Car lift' : 'Elevador coches',
    'screw-conveyor.html': en ? 'Screw' : 'Tornillo',
    'centrifugal-pump.html': en ? 'Pump' : 'Bomba',
    'transmission-lab.html': en ? 'Laboratory' : 'Laboratorio',
    'transmission-canvas.html': en ? 'Pro canvas' : 'Lienzo Pro',
  };
  document.querySelectorAll('.app-header__nav-start a[href], .app-header__nav-end a[href]').forEach((a) => {
    const href = a.getAttribute('href') || '';
    const base = href.replace(/^\.\//, '');
    if (map[base]) a.textContent = map[base];
  });
  const canvas = document.querySelector('.app-header__nav-end a[href="transmission-canvas.html"]');
  if (canvas) {
    canvas.setAttribute('title', en ? 'Multi-shaft technical canvas (Pro)' : 'Lienzo t\u00e9cnico multieje (Pro)');
  }
  const nav = document.querySelector('header nav[aria-label]');
  if (nav) {
    nav.setAttribute('aria-label', en ? 'Main navigation' : 'Navegaci\u00f3n principal');
  }
}

/** @param {'es'|'en'} lang */
function applyDataBeI18n(lang) {
  const en = lang === 'en';
  const dict = {
    beMainH2: en
      ? 'Bucket elevator \u2014 indicative design (CEMA practice)'
      : 'Elevador de cangilones \u2014 dise\u00f1o orientativo (CEMA)',
    beMainLead: en
      ? 'Three-step assistant: material & geometry \u2192 bucket & belt \u2192 power, tensions and verdicts. Like belt and screw tools: <strong>gearmotor recommendations</strong> plus a verifier if you already own a unit. Formulas follow common practice (capacity, <em>P</em> \u2248 <em>Q\u00b7H/(367\u00b7\u03b7)</em>, boot drag). Validate with <strong>CEMA</strong> and your vendor.'
      : 'Asistente en <strong>tres pasos</strong>: material y geometr\u00eda \u2192 selecci\u00f3n de cangil\u00f3n y banda \u2192 potencia, tensiones y veredictos. Al final, igual que en cintas y tornillo: <strong>recomendaciones de motorreductor</strong> y comprobador si ya tiene un modelo. Las f\u00f3rmulas siguen la pr\u00e1ctica habitual (capacidad, <em>P</em> \u2248 <em>Q\u00b7H/(367\u00b7\u03b7)</em>, arrastre en bota). Valide con <strong>CEMA</strong> y fabricante.',
    beHelpSum: en ? 'Quick guide' : 'Gu\u00eda r\u00e1pida',
    beHelp1: en
      ? '<strong>Step 1:</strong> material, capacity and base geometry (H, C, drums).'
      : '<strong>Paso 1:</strong> material, capacidad y geometr\u00eda base (H, C, tambores).',
    beHelp2: en
      ? '<strong>Step 2:</strong> bucket, belt speed and belt; indicative minimum spacing is computed.'
      : '<strong>Paso 2:</strong> cangil\u00f3n, velocidad y banda; se calcula paso m\u00ednimo orientativo.',
    beHelp3: en
      ? '<strong>Step 3:</strong> power, tension and risk verdicts (centrifugal / margin).'
      : '<strong>Paso 3:</strong> potencia, tensi\u00f3n y veredictos de riesgo (centr\u00edfugo / margen).',
    beHelp4: en
      ? '<strong>Gearmotor:</strong> compared to shaft power, torque and head drum rpm.'
      : '<strong>Motorreductor:</strong> se compara contra potencia de eje, par y rpm del tambor de cabeza.',
    beWiz1: en ? 'Geometry & material' : 'Geometr\u00eda y material',
    beWiz2: en ? 'Buckets & belt' : 'Cangilones y banda',
    beWiz3: en ? 'Power & verdict' : 'Potencia y veredicto',
    beAccMat: en ? 'Material & capacity' : 'Material y capacidad',
    beAccGeom: en ? 'Elevator geometry' : 'Geometr\u00eda del elevador',
    beAccSel: en ? 'Bucket & belt selection' : 'Selecci\u00f3n de cangil\u00f3n y banda',
    beAccEff: en ? 'Efficiencies & boot drag' : 'Rendimientos y arrastre (bota)',
    beAccRes: en ? 'Results, power & checks' : 'Resultados, potencia y comprobaci\u00f3n',
    beLblRho: en
      ? 'Apparent bulk density \u03b3'
      : 'Peso espec\u00edfico aparente \u03b3',
    beHintRho: en ? 'kg/m\u00b3' : 'kg/m\u00b3',
    beLblParticle: en ? 'Mean particle size' : 'Granulometr\u00eda media',
    beHintParticle: en ? 'mm (characteristic)' : 'mm (tama\u00f1o caracter\u00edstico)',
    beLblFluid: en ? 'Flowability (fill)' : 'Fluidez (llenado)',
    beLblNature: en ? 'Product nature' : 'Naturaleza del producto',
    beLblQ: en ? 'Required capacity' : 'Capacidad requerida',
    beHintQ: en ? 't/h (TPH)' : 't/h (TPH)',
    beLblH: en ? 'Lift height <em>H</em>' : 'Altura de elevaci\u00f3n <em>H</em>',
    beHintH: en ? 'm (useful vertical lift)' : 'm (cota vertical \u00fatil)',
    beLblC: en ? 'Drum center distance <em>C</em>' : 'Distancia entre centros de tambores <em>C</em>',
    beHintC: en ? 'm (approx. circuit envelope)' : 'm (envolvente aproximada del circuito)',
    beLblDhead: en ? 'Head drum \u00d8' : '\u00d8 tambor de cabeza',
    beLblDboot: en ? 'Boot drum \u00d8' : '\u00d8 tambor de pie (bota)',
    beHintM: en ? 'm' : 'm',
    beDiagNote: en
      ? 'The diagram on the right <strong>grows</strong> with <em>H</em> to show elevator scale.'
      : 'El diagrama a la derecha <strong>crece</strong> con <em>H</em> para visualizar la escala del elevador.',
    beLblBucket: en
      ? 'Bucket type / volume (demo catalog)'
      : 'Tipo / volumen de cangil\u00f3n (cat\u00e1logo demo)',
    beLblVbelt: en ? 'Belt speed <em>v</em>' : 'Velocidad de banda <em>v</em>',
    beLblWidth: en ? 'Adopted belt width' : 'Ancho de banda adoptado',
    beLblSigma: en ? 'Nominal belt strength (demo)' : 'Resistencia nominal banda (demo)',
    beHintSigma: en ? 'N/mm (indicative ST class)' : 'N/mm (ST clase orientativa)',
    beLblEta: en ? '\u03b7 lift (pulleys, slack)' : '\u03b7 elevaci\u00f3n (poleas, holguras)',
    beLblKboot: en ? '<em>k</em> boot drag' : '<em>k</em> arrastre bota / dragado',
    beHintKboot: en ? 'fraction of <em>P</em><sub>e</sub>' : 'fracci\u00f3n sobre <em>P</em>\u2091',
    beLblEtaTrans: en ? '\u03b7 gearbox / transmission' : '\u03b7 reductor / transmisi\u00f3n',
    beBtnMotors: en ? 'Open gearmotor recommendations' : 'Abrir recomendaciones de motorreductores',
    beVerifyH2: en ? 'Check a gearmotor I already have' : 'Comprobar un motorreductor que ya tengo',
    beVerifyLead: en
      ? 'Compare motor power, output torque and rpm with the <strong>head drum</strong> for this elevator (step 3).'
      : 'Compare potencia de motor, par de salida y rpm con el <strong>tambor de cabeza</strong> de este elevador (punto calculado en el paso 3).',
    beLblVbrand: en ? 'Brand' : 'Marca',
    beLblVsearch: en ? 'Filter model (text)' : 'Filtrar modelo (texto)',
    beLblVmodel: en ? 'Demo catalog model' : 'Modelo del cat\u00e1logo ejemplo',
    beBtnVerify: en ? 'Check for this elevator' : 'Comprobar para este elevador',
    beMotorsTitle: en
      ? 'Gearmotors (sample catalog \u00b7 SEW, Siemens, Nord\u2026)'
      : 'Motorreductores (cat\u00e1logo ejemplo \u00b7 SEW, Siemens, Nord\u2026)',
    beMotorsHint: en
      ? 'Collapsed by default \u2014 open for brand cards and verifier'
      : 'Plegado por defecto \u2014 pulse para ver tarjetas por marca y comprobador',
    beEngTitle: en ? 'Engineering breakdown' : 'Desglose de ingenier\u00eda',
    beEngHint: en
      ? 'Collapsed by default \u2014 gearbox, strategies and model steps'
      : 'Plegado por defecto \u2014 reductor, estrategias y pasos del modelo',
    beEngLead: en
      ? 'Calculation detail for quick audit and traceability.'
      : 'Detalle de c\u00e1lculo para auditor\u00eda r\u00e1pida y trazabilidad de decisiones.',
    beHypTitle: en ? 'Model assumptions' : 'Hip\u00f3tesis del modelo',
    beHypHint: en
      ? 'Assumptions and limits of this indicative calculation'
      : 'Supuestos y l\u00edmites usados en el c\u00e1lculo orientativo',
    bePdfH2: en ? 'Export report' : 'Exportar informe',
    beSchematicH2: en ? 'Schematic' : 'Esquema',
    bePhotoAlt: en
      ? 'Bucket elevator in an industrial plant'
      : 'Elevador de cangilones en instalaci\u00f3n industrial',
    beFigCaption: en
      ? 'Real-world application photo (example). <a href="https://commons.wikimedia.org/wiki/File:Grain_elevator.jpg" target="_blank" rel="noopener">Wikimedia Commons</a> \u2014 replace with <code>assets/bucket-elevator-reference.png</code> if needed.'
      : 'Foto real de aplicaci\u00f3n (ejemplo). <a href="https://commons.wikimedia.org/wiki/File:Grain_elevator.jpg" target="_blank" rel="noopener">Wikimedia Commons</a> \u2014 puede reemplazarla por <code>assets/bucket-elevator-reference.png</code>.',
  };
  document.querySelectorAll('[data-be-i18n]').forEach((el) => {
    const k = el.getAttribute('data-be-i18n');
    if (!k || !dict[k]) return;
    el.innerHTML = dict[k];
  });
  const photo = document.getElementById('beRefPhoto');
  if (photo && dict.bePhotoAlt) photo.setAttribute('alt', dict.bePhotoAlt);
}

/** @param {'es'|'en'} lang */
export function applyBucketElevatorStaticI18n(lang = getCurrentLang()) {
  const en = lang === 'en';
  document.documentElement.lang = en ? 'en' : 'es';

  const beSvg = document.getElementById('beDiagram');
  if (beSvg) {
    beSvg.setAttribute('aria-label', en ? 'Bucket elevator diagram' : 'Diagrama elevador');
  }

  const vSearch = document.getElementById('beVerifySearch');
  if (vSearch && vSearch.dataset.bePlaceholderEs) {
    vSearch.placeholder = en ? vSearch.dataset.bePlaceholderEn || '' : vSearch.dataset.bePlaceholderEs;
  }
  document.title = en ? 'Bucket elevator \u2014 MechAssist' : 'Elevador de cangilones \u2014 MechAssist';

  const fpw = document.getElementById('fileProtoWarn');
  if (fpw) {
    fpw.textContent = en
      ? 'Tip: open via a local server (in the project folder: npx --yes serve . and use the URL shown, e.g. http://localhost:3000). Opening the HTML file directly may block JavaScript and hide results and diagrams.'
      : 'Recomendaci\u00f3n: abrir con un servidor local (en la carpeta del proyecto: npx --yes serve . y use la URL que muestre, p. ej. http://localhost:3000). Si abre el HTML con doble clic, el navegador puede bloquear el JavaScript y no ver\u00e1 resultados ni diagramas.';
  }

  applyNav(lang);
  applyDataBeI18n(lang);
  applyChips(lang);
  applySelectOptions(lang);

  const wz = document.getElementById('beWizardNav');
  if (wz) wz.setAttribute('aria-label', en ? 'Assistant steps' : 'Pasos del asistente');

  const langHost = document.getElementById('beLangHost');
  if (langHost) {
    langHost.setAttribute('aria-label', en ? 'Language selector' : 'Selector de idioma');
  }
}

function syncLangButtons() {
  const lang = getCurrentLang();
  document.querySelectorAll('#beLangHost [data-lang]').forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    const l = btn.getAttribute('data-lang');
    btn.classList.toggle('hub-lang__btn--active', l === lang);
    btn.setAttribute('aria-pressed', l === lang ? 'true' : 'false');
  });
}

export function initBucketElevatorLangChrome() {
  const host = document.getElementById('beLangHost');
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
      applyBucketElevatorPageLanguage();
    });
  });

  applyBucketElevatorPageLanguage();
}

/**
 * Full page language refresh (static DOM + mounting block). Dynamic UI listens on window.
 */
export function applyBucketElevatorPageLanguage() {
  const lang = getCurrentLang();
  applyBucketElevatorStaticI18n(lang);
  refreshMountingConfigSection();
  syncLangButtons();
  window.dispatchEvent(new CustomEvent(BUCKET_ELEVATOR_LANG_EVENT, { detail: { lang } }));
}
