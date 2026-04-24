/**
 * Recomendaciones orientativas de ajustes ISO 286 para aplicaciones habituales.
 * Solo combinaciones soportadas por iso286Compute (agujero A-H/JS, eje a-h/js/k/m/n/p).
 * No sustituye norma, catalogo de rodamientos ni criterio de fabricacion.
 */

/** @typedef {{ id: string, label: string, fitCode: string, holeLetter: string, holeIt: string, shaftLetter: string, shaftIt: string, dNomSuggestion: number, category: string, comment: string, examples: string }} IsoFitRecommendation */

/** @type {IsoFitRecommendation[]} */
export const ISO286_FIT_RECOMMENDATIONS = [
  {
    id: 'slide-bush',
    label: 'Casquillo o guia que desliza (cojinete liso)',
    fitCode: 'H7/g6',
    holeLetter: 'H',
    holeIt: 'IT7',
    shaftLetter: 'g',
    shaftIt: 'IT6',
    dNomSuggestion: 25,
    category: 'Juego',
    comment: 'Muy habitual en taller; juego moderado y buen centrado. Ej. 25 H7/g6.',
    examples:
      'Casquillo autolubricado en biela de compresor; guia de corredera en prensa hidraulica; manguito de bomba periferica sobre eje motor.',
  },
  {
    id: 'slide-easy',
    label: 'Deslizamiento con holgura mayor (guia, carrera larga)',
    fitCode: 'H7/f7',
    holeLetter: 'H',
    holeIt: 'IT7',
    shaftLetter: 'f',
    shaftIt: 'IT7',
    dNomSuggestion: 32,
    category: 'Juego',
    comment: 'Menos riesgo de agarrotamiento por dilatacion o alineacion imperfecta.',
    examples:
      'Columna y cabezal de taladro de columna; guias de mesa en cepilladora; carro de sierra cinta industrial; husillo de elevacion de puente-grua ligero.',
  },
  {
    id: 'slide-hand',
    label: 'Ajuste deslizante manual (husillo, mando, cursor)',
    fitCode: 'H7/h6',
    holeLetter: 'H',
    holeIt: 'IT7',
    shaftLetter: 'h',
    shaftIt: 'IT6',
    dNomSuggestion: 20,
    category: 'Juego',
    comment: 'Holgura pequena; el eje h queda en nominal por la parte alta.',
    examples:
      'Husillo de bancada de torno paralelo; mando de avance en fresadora; cursor de regulacion en maquina herramienta; vastago vs guia en valvula manual.',
  },
  {
    id: 'precision-slide',
    label: 'Guia de precision (instrumentos, utillaje fino)',
    fitCode: 'H6/h5',
    holeLetter: 'H',
    holeIt: 'IT6',
    shaftLetter: 'h',
    shaftIt: 'IT5',
    dNomSuggestion: 12,
    category: 'Juego',
    comment: 'Requiere mecanizado afinado y limpieza; IT mas exigentes.',
    examples:
      'Ejes patron en banco de medicion; platinas de utillaje para ajuste de rodamientos; carros de proyector de perfil; mandriles de precision en rectificado.',
  },
  {
    id: 'pivot-pin',
    label: 'Pasador, gozne o articulacion con holgura',
    fitCode: 'H7/e8',
    holeLetter: 'H',
    holeIt: 'IT7',
    shaftLetter: 'e',
    shaftIt: 'IT8',
    dNomSuggestion: 16,
    category: 'Juego',
    comment: 'Holgura apreciable para giro o montaje sin prensa.',
    examples:
      'Pasadores de bielas en prensas exc�ntricas; goznes de compuertas en dep�sitos; ejes de rodillos locos en transportador de rodillos; bisagras de puerta de cabina de maquina.',
  },
  {
    id: 'hydraulic-spool',
    label: 'Carrera hidraulica / distribuidor (holgura funcional)',
    fitCode: 'H8/f7',
    holeLetter: 'H',
    holeIt: 'IT8',
    shaftLetter: 'f',
    shaftIt: 'IT7',
    dNomSuggestion: 18,
    category: 'Juego',
    comment: 'Agujero algo mas holgado; evita trabazon por contaminantes.',
    examples:
      'Camisa vs vastago en cilindro hidraulico de excavadora o prensa; carrete en bloque de valvulas de tractor; piston en bomba de paletas; distribuidor de carretillas elevadoras.',
  },
  {
    id: 'bearing-shaft-inner',
    label: 'Eje para rodamiento rigido (referencia interior)',
    fitCode: 'H7/k6',
    holeLetter: 'H',
    holeIt: 'IT7',
    shaftLetter: 'k',
    shaftIt: 'IT6',
    dNomSuggestion: 25,
    category: 'Transicion',
    comment: 'Muy usado como punto de partida; ver fabricante y carga. A veces m6/n6.',
    examples:
      'Eje de salida de motorreductor SEW/Siemens con 6205; arbol de bomba centrifuga; eje ventilador industrial; tambor motriz de elevador de cangilones.',
  },
  {
    id: 'hub-locate',
    label: 'Manguito o engranaje centrado (transicion)',
    fitCode: 'H7/m6',
    holeLetter: 'H',
    holeIt: 'IT7',
    shaftLetter: 'm',
    shaftIt: 'IT6',
    dNomSuggestion: 40,
    category: 'Transicion',
    comment: 'Puede dar juego o apriete leve segun tramo y cotas; revisar Jmax/Jmin aqui.',
    examples:
      'Engranaje cilindrico sobre eje liso en caja de cambios de maquina textil; polea motriz de compresor; manguito tensor en grupo de laminacion ligero.',
  },
  {
    id: 'press-light',
    label: 'Montaje a presion leve o calor (transicion/apriete)',
    fitCode: 'H7/n6',
    holeLetter: 'H',
    holeIt: 'IT7',
    shaftLetter: 'n',
    shaftIt: 'IT6',
    dNomSuggestion: 35,
    category: 'Transicion / apriete',
    comment: 'Suele tender a interferencia en muchos diametros; validar en calculadora.',
    examples:
      'Rueda dentada de fundicion sobre eje de malacate; buje de guia en bastidor de plegadora; pi�on fijado en eje de transmision sin chaveta (segun carga).',
  },
  {
    id: 'press-firm',
    label: 'Apriete garantizado (engranaje, buje, montaje prensa)',
    fitCode: 'H7/p6',
    holeLetter: 'H',
    holeIt: 'IT7',
    shaftLetter: 'p',
    shaftIt: 'IT6',
    dNomSuggestion: 30,
    category: 'Apriete',
    comment: 'Interferencia en la mayoria de tramos; montaje con herramienta o termico.',
    examples:
      'Engranaje de acero montado a presion en eje de reductor; buje broncina en tapa de bomba de engranajes; manguito de fijacion en turbina hidraulica mini; acople rigido en linea de transmision.',
  },
  {
    id: 'housing-bearing-outer',
    label: 'Alojamiento tipo carcasa (holgura pequena en agujero)',
    fitCode: 'H7/h6',
    holeLetter: 'H',
    holeIt: 'IT7',
    shaftLetter: 'h',
    shaftIt: 'IT6',
    dNomSuggestion: 52,
    category: 'Juego',
    comment: 'Analogia agujero H7 vs elemento tipo eje h: juego ligero. El aro exterior de rodamiento viene de catalogo.',
    examples:
      'Caja de reductor coaxial (alojamiento 62xx); carcasa de motor electrico (cubeta lado acople); soporte de ventilador axial; bastidor de husillo en fresadora.',
  },
  {
    id: 'center-js',
    label: 'Centrado simetrico (js en eje)',
    fitCode: 'H7/js6',
    holeLetter: 'H',
    holeIt: 'IT7',
    shaftLetter: 'js',
    shaftIt: 'IT6',
    dNomSuggestion: 28,
    category: 'Transicion',
    comment: 'Zona simetrica respecto a nominal; puede ser juego o interferencia leve.',
    examples:
      'Manguito de centrado en acoplamiento flexible (Lovejoy/KTR tipo demo); eje pasante en soporte partido de turbina; espaciador entre discos de freno industrial.',
  },
];
