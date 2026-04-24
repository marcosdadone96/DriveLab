/**
 * Home hub i18n. Spanish non-ASCII uses \\uXXXX escapes so the file is ASCII-safe
 * valid UTF-8 even if the server omits charset on *.js (avoids mojibake).
 */
const LS_LANG = 'mdr-home-lang';

const dict = {
  es: {
    'header.tag': 'Transmisi\u00f3n',
    'zone.machines': 'M\u00e1quinas',
    'zone.lab': 'Laboratorio',
    'zone.fluids': 'Hidr\u00e1ulica y neum\u00e1tica',
    'fluids.subtitle': 'Nuevos c\u00e1lculos del bloque de fluidos',
    'fluids.pump': 'Bomba hidr\u00e1ulica',
    'fluids.pumpMeta': 'Curva, potencia y selecci\u00f3n',
    'fluids.compressor': 'Compresor neum\u00e1tico',
    'fluids.compressorMeta': 'Calculadora pr\u00f3xima',
    'fluids.cylinder': 'Cilindro neum\u00e1tico',
    'fluids.cylinderMeta': 'Fuerza, caudal y tiempos',
    'fluids.hydraulicCylinder': 'Cilindro hidr\u00e1ulico',
    'fluids.hydraulicUnit': 'Unidad hidr\u00e1ulica',
    'fluids.hydraulicUnitMeta': 'Dep\u00f3sito, bomba y p\u00e9rdidas',
    'fluids.valves': 'V\u00e1lvulas',
    'fluids.more': 'M\u00e1s fluidos',
    'fluids.press': 'Prensa hidr\u00e1ulica',
    'machine.pump': 'Bomba',
    'machine.extruder': 'Extrusor',
    'machine.flatConveyor': 'Cinta plana',
    'machine.rollerConveyor': 'Rodillos',
    'machine.carLift': 'Elevador coches',
    'machine.bucketElevator': 'Elev. cangilones',
    'machine.screwConveyor': 'Tornillo',
    'machine.fan': 'Ventilador',
    'machine.tractionElevator': 'Ascensor',
    'machine.inclinedConveyor': 'Cinta inclinada',
    'lab.index': '\u00cdndice',
    'lab.canvasPro': 'Lienzo Pro',
    'lab.gears': 'Engranajes',
    'lab.belts': 'Correas',
    'lab.chains': 'Cadenas',
    'lab.bearings': 'Rodamientos',
    'lab.shaft': 'Eje',
    'lab.more': 'M\u00e1s',
    'aria.langSelector': 'Selector de idioma',
    'aria.machineSystems': 'Sistemas disponibles',
    'aria.transmissionCalcs': 'Calculadoras de transmisi\u00f3n',
    'aria.fluidCalcs': 'Calculadoras de hidr\u00e1ulica y neum\u00e1tica',
    footnote: 'Verde = activo \u00b7 Cintas: Gratis o Pro seg\u00fan el m\u00f3dulo',
    badgePro: 'ACCESO PRO',
  },
  en: {
    'header.tag': 'Power Transmission',
    'zone.machines': 'Machines',
    'zone.lab': 'Laboratory',
    'zone.fluids': 'Hydraulics and pneumatics',
    'fluids.subtitle': 'New calculators in the fluid block',
    'fluids.pump': 'Hydraulic pump',
    'fluids.pumpMeta': 'Curve, power and selection',
    'fluids.compressor': 'Pneumatic compressor',
    'fluids.compressorMeta': 'Calculator coming soon',
    'fluids.cylinder': 'Pneumatic cylinder',
    'fluids.cylinderMeta': 'Force, flow and timing',
    'fluids.hydraulicCylinder': 'Hydraulic cylinder',
    'fluids.hydraulicUnit': 'Hydraulic unit',
    'fluids.hydraulicUnitMeta': 'Tank, pump and losses',
    'fluids.valves': 'Valves',
    'fluids.more': 'More fluids',
    'fluids.press': 'Hydraulic press',
    'machine.pump': 'Pump',
    'machine.extruder': 'Extruder',
    'machine.flatConveyor': 'Flat conveyor',
    'machine.rollerConveyor': 'Roller conveyor',
    'machine.carLift': 'Car lift',
    'machine.bucketElevator': 'Bucket elevator',
    'machine.screwConveyor': 'Screw conveyor',
    'machine.fan': 'Fan',
    'machine.tractionElevator': 'Elevator',
    'machine.inclinedConveyor': 'Inclined conveyor',
    'lab.index': 'Index',
    'lab.canvasPro': 'Pro canvas',
    'lab.gears': 'Gears',
    'lab.belts': 'Belts',
    'lab.chains': 'Chains',
    'lab.bearings': 'Bearings',
    'lab.shaft': 'Shaft',
    'lab.more': 'More',
    'aria.langSelector': 'Language selector',
    'aria.machineSystems': 'Available systems',
    'aria.transmissionCalcs': 'Power transmission calculators',
    'aria.fluidCalcs': 'Hydraulic and pneumatic calculators',
    footnote: 'Green = active \u00b7 Conveyors: free or Pro by module',
    badgePro: 'PRO ACCESS',
  },
};

function currentLang() {
  try {
    const saved = localStorage.getItem(LS_LANG);
    if (saved === 'en' || saved === 'es') return saved;
  } catch (_) {
    /* ignore */
  }
  return 'es';
}

function setLang(lang) {
  const l = lang === 'en' ? 'en' : 'es';
  try {
    localStorage.setItem(LS_LANG, l);
  } catch (_) {
    /* ignore */
  }
  document.documentElement.setAttribute('lang', l);
  const table = dict[l];
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const txt = table[key];
    if (!txt) return;
    const attr = el.getAttribute('data-i18n-attr');
    if (attr) {
      el.setAttribute(attr, txt);
    } else {
      el.textContent = txt;
    }
  });
  document.querySelectorAll('.hub-lang__btn[data-lang]').forEach((btn) => {
    const on = btn.getAttribute('data-lang') === l;
    btn.classList.toggle('hub-lang__btn--active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  window.__homeLang = l;
  window.__t = (k) => dict[l][k] || k;
  window.dispatchEvent(new CustomEvent('home-language-changed', { detail: { lang: l } }));
}

document.querySelectorAll('.hub-lang__btn[data-lang]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const l = btn.getAttribute('data-lang');
    setLang(l === 'en' ? 'en' : 'es');
  });
});

setLang(currentLang());
