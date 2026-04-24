/**
 * Calculadora ISO 286-1:2010 (extracto 1-500 mm).
 * - Unidad i (micras): i = 0.45 * cbrt(D_M) + 0.001 * D_M con D_M = media geometrica del tramo (mm).
 * - Tolerancias IT: tabuladas por tramo (coherente con H7/g6 en 25 mm: IT7=21, IT6=13, g es=-7).
 * - Desviaciones fundamentales: tablas tipo ISO 286-2 para letras habituales.
 * No sustituye la norma completa ni tolerancias geometricas.
 */

/** Tramos nominales (mm): [inicio, fin] ambos incluidos en fin para el ultimo */
export const ISO_RANGES_MM = [
  [1, 3],
  [3, 6],
  [6, 10],
  [10, 18],
  [18, 30],
  [30, 50],
  [50, 80],
  [80, 120],
  [120, 180],
  [180, 250],
  [250, 315],
  [315, 400],
  [400, 500],
];

/** @param {number} dMm */
export function rangeIndex(dMm) {
  const d = Number(dMm);
  if (!Number.isFinite(d) || d < 1 || d > 500) return -1;
  for (let i = 0; i < ISO_RANGES_MM.length; i++) {
    const [lo, hi] = ISO_RANGES_MM[i];
    if (d >= lo && d <= hi) return i;
  }
  return -1;
}

/** Media geometrica del tramo (mm) */
export function geometricMeanDiameter(ri) {
  const [lo, hi] = ISO_RANGES_MM[ri];
  return Math.sqrt(lo * hi);
}

/** Unidad fundamental de tolerancia i (micrometros) */
export function toleranceUnitI_microns(ri) {
  const dM = geometricMeanDiameter(ri);
  return 0.45 * Math.cbrt(dM) + 0.001 * dM;
}

/**
 * Tolerancias IT en micrometros por tramo (filas = tramo 0..12).
 * Fuente: tablas ISO 286 habituales (IT5-IT18 verificadas en puntos clave: IT6/IT7 tramo 18-30).
 */
export const IT_MICRONS_BY_RANGE = {
  IT01: [0.4, 0.5, 0.6, 0.8, 1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6],
  IT0: [0.6, 0.8, 1, 1.2, 1.5, 1.8, 2.2, 2.5, 3, 4, 5, 6, 7],
  IT1: [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 14],
  IT2: [1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 14, 16],
  IT3: [2, 2.5, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 18],
  IT4: [3, 4, 5, 6, 8, 9, 10, 11, 12, 14, 16, 18, 20],
  IT5: [4, 5, 6, 8, 9, 11, 13, 15, 18, 20, 22, 25, 28],
  IT6: [6, 6, 9, 11, 13, 16, 19, 22, 25, 29, 32, 36, 40],
  IT7: [8, 9, 11, 15, 21, 25, 30, 35, 40, 46, 52, 57, 63],
  IT8: [10, 12, 15, 18, 25, 30, 36, 43, 50, 58, 65, 72, 80],
  IT9: [14, 18, 22, 27, 36, 43, 52, 62, 74, 87, 100, 115, 125],
  IT10: [24, 30, 36, 43, 58, 70, 84, 100, 120, 140, 160, 185, 200],
  IT11: [40, 48, 58, 70, 92, 110, 130, 155, 185, 210, 230, 260, 280],
  IT12: [60, 75, 90, 110, 140, 170, 200, 230, 270, 300, 330, 360, 390],
  IT13: [100, 120, 150, 180, 230, 280, 330, 390, 450, 500, 550, 600, 650],
  IT14: [140, 180, 220, 270, 350, 420, 500, 600, 700, 800, 900, 1000, 1100],
  IT15: [250, 300, 360, 440, 560, 680, 800, 950, 1100, 1250, 1400, 1550, 1700],
  IT16: [400, 480, 580, 700, 900, 1100, 1300, 1500, 1800, 2000, 2200, 2400, 2600],
  IT17: [600, 720, 860, 1050, 1350, 1650, 1950, 2300, 2700, 3000, 3300, 3600, 3900],
  IT18: [1000, 1200, 1450, 1750, 2250, 2750, 3250, 3850, 4500, 5000, 5500, 6000, 6500],
};

export const IT_GRADE_KEYS = Object.keys(IT_MICRONS_BY_RANGE);

/** @param {string} itKey ej. IT7 */
export function itMicrons(itKey, ri) {
  const row = IT_MICRONS_BY_RANGE[itKey];
  if (!row || ri < 0 || ri >= row.length) return NaN;
  return row[ri];
}

/**
 * Desviacion superior es del eje (micras). Letras a-h (clearence / h).
 * h -> 0. js calculado aparte.
 */
export const SHAFT_ES_MICRONS = {
  a: [-300, -270, -280, -290, -300, -310, -320, -340, -350, -370, -380, -400, -410],
  b: [-140, -140, -150, -150, -160, -170, -180, -200, -220, -240, -260, -280, -300],
  c: [-60, -70, -80, -95, -110, -120, -130, -150, -170, -190, -210, -230, -250],
  d: [-30, -40, -50, -65, -80, -100, -120, -145, -170, -190, -210, -230, -250],
  e: [-20, -30, -40, -50, -65, -80, -100, -115, -135, -150, -170, -190, -210],
  f: [-10, -13, -16, -20, -25, -30, -36, -43, -50, -56, -62, -68, -76],
  g: [-4, -5, -5, -6, -7, -9, -10, -12, -15, -18, -20, -22, -25],
  h: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

/** ei positivo (micras) para eje k,m,n,p (desviacion inferior); es = ei + IT */
export const SHAFT_EI_POS_MICRONS = {
  k: [0, 0, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 5],
  m: [2, 2, 3, 4, 5, 6, 8, 9, 11, 12, 14, 14, 16],
  n: [4, 6, 7, 8, 10, 12, 15, 17, 20, 22, 24, 26, 28],
  p: [6, 10, 13, 16, 20, 24, 28, 32, 37, 39, 43, 46, 49],
};

/** Agujero tipo A-H: desviacion inferior EI (micras); ES = EI + IT. H: todo 0 */
export const HOLE_EI_MICRONS = {
  A: [-270, -270, -280, -290, -300, -310, -320, -340, -350, -370, -380, -400, -410],
  B: [-140, -140, -150, -150, -160, -170, -180, -200, -220, -240, -260, -280, -300],
  C: [-60, -70, -80, -95, -110, -120, -130, -150, -170, -190, -210, -230, -250],
  D: [-30, -40, -50, -65, -80, -100, -120, -145, -170, -190, -210, -230, -250],
  E: [-20, -30, -40, -50, -65, -80, -100, -115, -135, -150, -170, -190, -210],
  F: [-10, -13, -16, -20, -25, -30, -36, -43, -50, -56, -62, -68, -76],
  G: [-4, -6, -7, -9, -10, -12, -15, -18, -20, -22, -25, -26, -28],
  H: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

/**
 * @param {'hole'|'shaft'} kind
 * @param {string} letter una letra MAYUS (agujero) o minus (eje)
 * @param {string} itKey IT6 etc.
 * @param {number} ri
 * @returns {{ ok: boolean, EI?: number, ES?: number, ei?: number, es?: number, err?: string }}
 */
export function fundamentalDeviationsMicrons(kind, letter, itKey, ri) {
  const IT = itMicrons(itKey, ri);
  if (!Number.isFinite(IT) || IT <= 0) return { ok: false, err: 'IT no valido' };

  if (kind === 'hole') {
    const L = letter.toUpperCase();
    if (L === 'JS') {
      const half = IT / 2;
      return { ok: true, EI: -half, ES: half };
    }
    if (HOLE_EI_MICRONS[L] != null) {
      const EI = HOLE_EI_MICRONS[L][ri];
      return { ok: true, EI, ES: EI + IT };
    }
    return { ok: false, err: `Letra de agujero "${L}" no tabulada en esta demo` };
  }

  const l = letter.toLowerCase();
  if (l === 'js') {
    const half = IT / 2;
    return { ok: true, ei: -half, es: half };
  }
  if (SHAFT_ES_MICRONS[l] != null) {
    const es = SHAFT_ES_MICRONS[l][ri];
    const ei = es - IT;
    return { ok: true, ei, es };
  }
  if (SHAFT_EI_POS_MICRONS[l] != null) {
    const ei = SHAFT_EI_POS_MICRONS[l][ri];
    const es = ei + IT;
    return { ok: true, ei, es };
  }
  return { ok: false, err: `Letra de eje "${l}" no tabulada en esta demo` };
}

/** Limites en mm */
export function holeLimitsMm(dNom, EI_um, ES_um) {
  return {
    dMin: dNom + EI_um / 1000,
    dMax: dNom + ES_um / 1000,
  };
}

export function shaftLimitsMm(dNom, ei_um, es_um) {
  return {
    dMin: dNom + ei_um / 1000,
    dMax: dNom + es_um / 1000,
  };
}

/**
 * @param {number} dNom
 * @param {string} holeLetter
 * @param {string} holeIt
 * @param {string} shaftLetter
 * @param {string} shaftIt
 */
export function computeIsoFit(dNom, holeLetter, holeIt, shaftLetter, shaftIt) {
  const d = Number(dNom);
  const ri = rangeIndex(d);
  if (ri < 0) {
    return { ok: false, err: 'D nominal fuera de 1-500 mm' };
  }

  const iUm = toleranceUnitI_microns(ri);
  const dM = geometricMeanDiameter(ri);

  const holeF = fundamentalDeviationsMicrons('hole', holeLetter, holeIt, ri);
  if (!holeF.ok) return { ok: false, err: holeF.err };

  const shaftF = fundamentalDeviationsMicrons('shaft', shaftLetter, shaftIt, ri);
  if (!shaftF.ok) return { ok: false, err: shaftF.err };

  const IT_h = itMicrons(holeIt, ri);
  const IT_s = itMicrons(shaftIt, ri);

  const hLim = holeLimitsMm(d, /** @type {number} */ (holeF.EI), /** @type {number} */ (holeF.ES));
  const sLim = shaftLimitsMm(d, /** @type {number} */ (shaftF.ei), /** @type {number} */ (shaftF.es));

  const jMaxUm = (hLim.dMax - sLim.dMin) * 1000;
  const jMinUm = (hLim.dMin - sLim.dMax) * 1000;

  let fitKind = 'transition';
  let fitLabelEs = 'Ajuste de transicion';
  let fitLabelEn = 'Transition fit';
  if (jMinUm >= 0) {
    fitKind = 'clearance';
    fitLabelEs = 'Ajuste con juego';
    fitLabelEn = 'Clearance fit';
  } else if (jMaxUm <= 0) {
    fitKind = 'interference';
    fitLabelEs = 'Ajuste con apriete / interferencia';
    fitLabelEn = 'Interference fit';
  }

  return {
    ok: true,
    dNom: d,
    rangeIndex: ri,
    dGeo_mm: dM,
    i_microns: iUm,
    IT_hole_microns: IT_h,
    IT_shaft_microns: IT_s,
    hole: {
      letter: holeLetter.toUpperCase(),
      it: holeIt,
      EI_um: holeF.EI,
      ES_um: holeF.ES,
      ...hLim,
    },
    shaft: {
      letter: shaftLetter.toLowerCase(),
      it: shaftIt,
      ei_um: shaftF.ei,
      es_um: shaftF.es,
      ...sLim,
    },
    clearanceMax_um: jMaxUm,
    clearanceMin_um: jMinUm,
    fitKind,
    fitLabelEs,
    fitLabelEn,
  };
}

export const HOLE_LETTERS_SUPPORTED = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'JS'];
export const SHAFT_LETTERS_SUPPORTED = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'js', 'k', 'm', 'n', 'p'];
