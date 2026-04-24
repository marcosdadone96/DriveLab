/**
 * Google Analytics 4 — configuración tras cargar gtag/js (snippet oficial).
 * ID de medición: G-43E5C8TB38
 */
window.dataLayer = window.dataLayer || [];
function gtag() {
  dataLayer.push(arguments);
}
gtag('js', new Date());
gtag('config', 'G-43E5C8TB38');

/**
 * Global ES -> EN runtime translation layer.
 * It is intentionally conservative and only runs when user language is EN.
 * This allows all pages (machines + lab + calculators) to share one i18n bridge.
 */
(function applyGlobalRuntimeI18n() {
  let lang = 'es';
  try {
    lang = localStorage.getItem('mdr-home-lang') === 'en' ? 'en' : 'es';
  } catch (_) {
    lang = 'es';
  }
  if (lang !== 'en') return;

  /* Portada: todo el copy va por js/ui/homeI18n.js; esta capa rompe mezclas (p. ej. "Cinta inclined"). */
  if (document.body && document.body.classList.contains('hub-body')) return;

  const exactRaw = [
    ['Inicio', 'Home'],
    ['Laboratorio', 'Laboratory'],
    ['Lienzo Pro', 'Pro canvas'],
    ['Lienzo tecnico Pro', 'Pro canvas'],
    ['SISTEMA APTO', 'SYSTEM SUITABLE'],
    ['SISTEMA NO APTO', 'SYSTEM NOT SUITABLE'],
    ['RIESGO DE FALLO', 'FAILURE RISK'],
    ['EFICIENCIA BAJA', 'LOW EFFICIENCY'],
    ['Ver Datos Tecnicos Secundarios', 'View Secondary Technical Data'],
    ['Teoricos e intermedios', 'Theoretical and intermediate'],
    ['Caudales, pandeo y espesor', 'Flow, buckling and wall thickness'],
    ['Cavitacion', 'Cavitation'],
    ['RIESGO ALTO DE CAVITACION', 'HIGH CAVITATION RISK'],
    ['Potencia absorbida', 'Absorbed power'],
    ['Caudal real', 'Real flow'],
    ['Caudal teorico', 'Theoretical flow'],
    ['Presion de trabajo', 'Working pressure'],
    ['Presion operacion', 'Operating pressure'],
    ['Tipo de bomba', 'Pump type'],
    ['Velocidad en tuberia', 'Line velocity'],
    ['Velocidad en puertos', 'Port velocity'],
    ['Carga Critica Pandeo', 'Critical Buckling Load'],
    ['Factor de Seguridad Fuerza', 'Force Safety Factor'],
    ['Consumo de Aire', 'Air Consumption'],
    ['Carrera (mm)', 'Stroke (mm)'],
    ['Tipo de movimiento', 'Motion type'],
    ['Horizontal', 'Horizontal'],
    ['Vertical (elevacion)', 'Vertical (lifting)'],
    ['Aspiracion', 'Suction'],
    ['Retorno', 'Return'],
    ['Presion', 'Pressure'],
    ['Diametro', 'Diameter'],
    ['Rodamientos', 'Bearings'],
    ['Engranajes', 'Gears'],
    ['Correas', 'Belts'],
    ['Cadenas', 'Chains'],
    ['Eje', 'Shaft'],
    ['Mas', 'More'],
    ['Mas fluidos', 'More fluids'],
    ['Valvulas', 'Valves'],
    ['Bomba hidraulica', 'Hydraulic pump'],
    ['Cilindro hidraulico', 'Hydraulic cylinder'],
    ['Cilindro neumatico', 'Pneumatic cylinder'],
    ['Compresor neumatico', 'Pneumatic compressor'],
    ['Hidraulica y neumatica', 'Hydraulics and pneumatics'],
    ['Maquinas', 'Machines'],
    ['Máquinas', 'Machines'],
    ['Transmision', 'Power Transmission'],
    ['Transmisión', 'Power Transmission'],
    ['Hidráulica y neumática', 'Hydraulics and pneumatics'],
    ['Rodillos', 'Roller conveyor'],
    ['Datos de entrada', 'Input data'],
    ['Guia rapida de cada magnitud', 'Quick guide for each variable'],
    ['Resultados finales (tambor y motor)', 'Final results (drum and motor)'],
    ['Norma y load (afectan al modelo)', 'Standard and load (affect model)'],
    ['Norma de referencia del calculo', 'Reference calculation standard'],
    ['Tipo de load - factor de servicio (orientacion AGMA / ISO)', 'Load type - service factor (AGMA / ISO guidance)'],
    ['No es obligatorio rellenar banda, distribuciones ni arranque', 'It is not mandatory to fill belt, distributions or startup'],
    ['Abra Opciones avanzadas solo para afinar el modelo.', 'Open Advanced options only to fine-tune the model.'],
    ['Par requerido', 'Required torque'],
    ['Factor de servicio', 'Service factor'],
    ['Tipo de montaje', 'Mounting type'],
    ['Velocidad', 'Speed'],
    ['Motor (kW)', 'Motor (kW)'],
    ['Detalles mecanicos', 'Mechanical details'],
    ['Resultado completo', 'Full result'],
    ['Hipotesis del modelo', 'Model assumptions'],
    ['Opciones avanzadas', 'Advanced options'],
    ['Recomendaciones de motorreductor', 'Gearmotor recommendations'],
    ['Resumen en 6 claves (uso rapido)', '6-key summary (quick use)'],
    ['Sesion Pro', 'Pro session'],
    ['Probar: gratis plana', 'Try: free flat conveyor'],
    ['Probar: gratis inclinada', 'Try: free inclined conveyor'],
    ['Pro activo', 'Pro active'],
  ];

  const replacements = [
    [/\bPresion\b/g, 'Pressure'],
    [/\bpresion\b/g, 'pressure'],
    [/\bVelocidad\b/g, 'Speed'],
    [/\bvelocidad\b/g, 'speed'],
    [/\bDiametro\b/g, 'Diameter'],
    [/\bdiametro\b/g, 'diameter'],
    [/\bCaudal\b/g, 'Flow'],
    [/\bcaudal\b/g, 'flow'],
    [/\bCarga\b/g, 'Load'],
    [/\bcarga\b/g, 'load'],
    [/\bFuerza\b/g, 'Force'],
    [/\bfuerza\b/g, 'force'],
    [/\bEspesor\b/g, 'Wall thickness'],
    [/\bespesor\b/g, 'wall thickness'],
    [/\bpandeo\b/g, 'buckling'],
    [/\bvastago\b/g, 'rod'],
    [/\bcilindro\b/g, 'cylinder'],
    [/\bbomba\b/g, 'pump'],
    [/\btuberia\b/g, 'pipe'],
    [/\blinea\b/g, 'line'],
    [/\briesgo\b/g, 'risk'],
    [/\bseguridad\b/g, 'safety'],
    [/\bperdida de carga\b/g, 'pressure loss'],
    [/\bpotencia\b/g, 'power'],
    [/\bpar\b/g, 'torque'],
    [/\bdatos\b/g, 'data'],
    [/\bentrada\b/g, 'input'],
    [/\bsalida\b/g, 'output'],
    [/\bresultado\b/g, 'result'],
    [/\bresultados\b/g, 'results'],
    [/\bfinales\b/g, 'final'],
    [/\bmodelo\b/g, 'model'],
    [/\bopciones\b/g, 'options'],
    [/\bavanzadas\b/g, 'advanced'],
    [/\bguia\b/g, 'guide'],
    [/\bnorma\b/g, 'standard'],
    [/\breferencia\b/g, 'reference'],
    [/\bcalculo\b/g, 'calculation'],
    [/\bservicio\b/g, 'service'],
    [/\brequerido\b/g, 'required'],
    [/\bmotorreductor\b/g, 'gearmotor'],
    [/\btambor\b/g, 'drum'],
    [/\bbanda\b/g, 'belt'],
    [/\barranque\b/g, 'startup'],
    [/\bresumen\b/g, 'summary'],
    [/\bclaves\b/g, 'keys'],
    [/\brapido\b/g, 'quick'],
    [/\bactivo\b/g, 'active'],
    [/\bprobar\b/g, 'try'],
    [/\bgratis\b/g, 'free'],
    [/\bplana\b/g, 'flat'],
    [/\binclinada\b/g, 'inclined'],
    [/\belevacion\b/g, 'lifting'],
    [/\bestandar\b/g, 'standard'],
    [/\bmanual\b/g, 'manual'],
    [/\bno apto\b/g, 'not suitable'],
    [/\bapto\b/g, 'suitable'],
    [/\bdatos de entrada\b/g, 'input data'],
    [/\bresultados finales\b/g, 'final results'],
    [/\bguia rapida\b/g, 'quick guide'],
    [/\bnorma de referencia\b/g, 'reference standard'],
    [/\bfactor de servicio\b/g, 'service factor'],
    [/\btipo de montaje\b/g, 'mounting type'],
    [/\bdetalles mecanicos\b/g, 'mechanical details'],
    [/\bmotor\b/g, 'motor'],
    [/\brequerido\b/g, 'required'],
    [/\bopciones avanzadas\b/g, 'advanced options'],
    [/\bresultado completo\b/g, 'full result'],
    [/\bhipotesis del modelo\b/g, 'model assumptions'],
    [/\bresumen\b/g, 'summary'],
    [/\bregimen\b/g, 'regime'],
    [/\barranque\b/g, 'startup'],
    [/\btambor\b/g, 'drum'],
    [/\bhorizontal\b/g, 'horizontal'],
    [/\binclinada\b/g, 'inclined'],
    [/\bplana\b/g, 'flat'],
    [/\bmaquina\b/g, 'machine'],
    [/\bmaquinas\b/g, 'machines'],
    [/\blaboratorio\b/g, 'laboratory'],
    [/\bcinta transportadora horizontal\b/g, 'horizontal conveyor belt'],
    [/\bcinta transportadora inclinada\b/g, 'inclined conveyor belt'],
    [/\bcinta transportadora\b/g, 'conveyor belt'],
    [/\bpara orientar un\b/g, 'to orient a'],
    [/\bno es obligatorio\b/g, 'it is not mandatory'],
    [/\babra\b/g, 'open'],
    [/\bsolo\b/g, 'only'],
    [/\bafectan al modelo\b/g, 'affect the model'],
    [/\benfoque\b/g, 'approach'],
    [/\banalitico\b/g, 'analytical'],
    [/\belegir\b/g, 'choose'],
    [/\bcompleto\b/g, 'complete'],
    [/\bvariaciones\b/g, 'variations'],
    [/\bfrecuentes\b/g, 'frequent'],
    [/\bse ignora\b/g, 'is ignored'],
    [/\bej\.\b/g, 'e.g.'],
    [/\bes\b/g, 'is'],
    [/\bson\b/g, 'are'],
    [/\bdel\b/g, 'of the'],
    [/\bde la\b/g, 'of the'],
    [/\bde\b/g, 'of'],
    [/\bpara\b/g, 'for'],
    [/\bcon\b/g, 'with'],
    [/\bsin\b/g, 'without'],
    [/\by\b/g, 'and'],
    [/\ben\b/g, 'in'],
    [/\bpor\b/g, 'by'],
    [/\bque\b/g, 'that'],
    [/\bsi\b/g, 'if'],
    [/\bmas\b/g, 'more'],
    [/\bmenos\b/g, 'less'],
    [/\bmayor\b/g, 'greater'],
    [/\bmenor\b/g, 'lower'],
    [/\brecuadro\b/g, 'panel'],
    [/\bprincipal\b/g, 'main'],
    [/\bobtendra\b/g, 'you will obtain'],
    [/\bgiro\b/g, 'rotation'],
    [/\bbastan\b/g, 'only'],
    [/\brellenar\b/g, 'fill'],
    [/\bdistribuciones\b/g, 'distributions'],
    [/\bdejelos\b/g, 'leave them'],
    [/\bvalores\b/g, 'values'],
    [/\bpor defecto\b/g, 'default'],
    [/\bmasa\b/g, 'mass'],
    [/\bpeso\b/g, 'weight'],
    [/\bpropio\b/g, 'self'],
    [/\bafinar\b/g, 'fine-tune'],
    [/\bchoque moderado\b/g, 'moderate shock'],
    [/\bvariaciones de load o arranques frecuentes\b/g, 'load variations or frequent startups'],
    [/\benfoque analitico\b/g, 'analytical approach'],
    [/\biso\s*5048\b/gi, 'ISO 5048'],
    [/\bdin\s*22101\b/gi, 'DIN 22101'],
  ];

  function normalizeEs(input) {
    return (input || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  const exact = new Map(exactRaw.map(([k, v]) => [normalizeEs(k), v]));

  function translateText(input) {
    if (!input) return input;
    const trimmed = input.trim();
    if (!trimmed) return input;

    const normalized = normalizeEs(trimmed);
    let out = exact.get(normalized) || input;
    out = out
      .replace(/sesion pro/gi, 'Pro session')
      .replace(/pro activo/gi, 'Pro active')
      .replace(/probar:\s*gratis plana/gi, 'Try: free flat conveyor')
      .replace(/probar:\s*gratis inclinada/gi, 'Try: free inclined conveyor')
      .replace(/guia rapida de cada magnitud/gi, 'Quick guide for each variable')
      .replace(/norma y load \(afectan al modelo\)/gi, 'Standard and load (affect model)')
      .replace(/norma de referencia del calculo/gi, 'Reference calculation standard')
      .replace(/tipo de load\s*-\s*factor de servicio/gi, 'Load type - service factor')
      .replace(/resultados finales \(tambor y motor\)/gi, 'Final results (drum and motor)')
      .replace(/datos de entrada/gi, 'Input data')
      .replace(/cinta transportadora horizontal/gi, 'Horizontal conveyor belt');

    out = out
      .replace(/á/g, 'a')
      .replace(/é/g, 'e')
      .replace(/í/g, 'i')
      .replace(/ó/g, 'o')
      .replace(/ú/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/Á/g, 'A')
      .replace(/É/g, 'E')
      .replace(/Í/g, 'I')
      .replace(/Ó/g, 'O')
      .replace(/Ú/g, 'U')
      .replace(/Ñ/g, 'N');

    for (let i = 0; i < replacements.length; i += 1) {
      out = out.replace(replacements[i][0], replacements[i][1]);
    }

    out = out
      .replace(/No es obligatorio rellenar/gi, 'It is not mandatory to fill')
      .replace(/Abra opciones avanzadas/gi, 'Open advanced options')
      .replace(/para afinar el modelo/gi, 'to fine-tune the model')
      .replace(/enfoque anal/i, 'analytical approach')
      .replace(/Regimen y arranque/gi, 'Regime and startup')
      .replace(/incluye el mayor de ambos y factor de servicio/gi, 'includes the higher of both and service factor')
      .replace(/tipo de load/gi, 'load type')
      .replace(/norma y load/gi, 'standard and load')
      .replace(/datos de entrada/gi, 'input data')
      .replace(/resultados finales/gi, 'final results')
      .replace(/guia rapida de cada magnitud/gi, 'quick guide for each variable')
      .replace(/norma de referencia del calculo/gi, 'reference calculation standard')
      .replace(/tipo de montaje/gi, 'mounting type')
      .replace(/factor de servicio/gi, 'service factor')
      .replace(/par requerido/gi, 'required torque')
      .replace(/detalles mecanicos/gi, 'mechanical details')
      .replace(/para orientar un/gi, 'to size a')
      .replace(/no es obligatorio rellenar/gi, 'it is not mandatory to fill')
      .replace(/dejelos en los valores por defecto/gi, 'leave them at default values')
      .replace(/se ignora el peso propio/gi, 'self weight is ignored')
      .replace(/abra opciones avanzadas/gi, 'open advanced options')
      .replace(/solo para afinar el modelo/gi, 'only to fine-tune the model')
      .replace(/regimen y arranque/gi, 'regime and startup')
      .replace(/de diseno/gi, 'design')
      .replace(/incluye el mayor de ambos y factor de servicio/gi, 'includes the higher of both and service factor')
      .replace(/cinta transportadora horizontal/gi, 'horizontal conveyor belt')
      .replace(/cinta transportadora inclinada/gi, 'inclined conveyor belt')
      .replace(/choque moderado/gi, 'moderate shock');
    return out;
  }

  function translateNode(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    for (let i = 0; i < textNodes.length; i += 1) {
      const n = textNodes[i];
      if (!n || !n.nodeValue) continue;
      const p = n.parentElement;
      if (!p) continue;
      const tag = p.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE') continue;
      const next = translateText(n.nodeValue);
      if (next !== n.nodeValue) n.nodeValue = next;
    }

    if (root.querySelectorAll) {
      root.querySelectorAll('[placeholder],[title],[aria-label]').forEach((el) => {
        ['placeholder', 'title', 'aria-label'].forEach((attr) => {
          const v = el.getAttribute(attr);
          if (!v) return;
          const next = translateText(v);
          if (next !== v) el.setAttribute(attr, next);
        });
      });
    }
  }

  function run() {
    document.documentElement.setAttribute('lang', 'en');
    translateNode(document.body);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }

  const observer = new MutationObserver((mutations) => {
    for (let i = 0; i < mutations.length; i += 1) {
      const m = mutations[i];
      if (m.type === 'childList') {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const current = node.nodeValue || '';
            const next = translateText(current);
            if (next !== current) node.nodeValue = next;
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            translateNode(node);
          }
        });
      } else if (m.type === 'characterData' && m.target) {
        const current = m.target.nodeValue || '';
        const next = translateText(current);
        if (next !== current) m.target.nodeValue = next;
      }
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  });
})();
