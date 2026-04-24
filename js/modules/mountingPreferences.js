/**
 * Preferencias de montaje IEC / eje hueco — filtrado y textos para integración mecánica.
 * Términos: B3 patas, B5 brida grande, B14 brida compacta, eje hueco (accionamiento sobre eje máquina).
 */

import { getCurrentLang } from '../config/locales.js';

/**
 * @typedef {'B3' | 'B5' | 'B14' | 'hollowShaft'} MountingType
 */

/**
 * @typedef {object} MountingPreferences
 * @property {MountingType} mountingType
 * @property {number | null} machineShaftDiameter_mm
 * @property {'horizontal' | 'vertical'} orientation
 * @property {string} spaceConstraint
 */

/** Texto orientativo por tipo (ventajas / límites) */
export const MOUNTING_GUIDE = Object.freeze({
  B3: {
    title: 'Patas en suelo (IEC B3)',
    pros: 'Estable, fácil de alinear y de acceder a patas de tensado; muy habitual en bastidores y suelos de obra.',
    cons: 'Ocupa más huella que una brida frontal; el centro de altura debe coincidir con el accionamiento.',
  },
  B5: {
    title: 'Brida grande (IEC B5)',
    pros: 'Montaje frontal compacto en pared o soporte perpendicular al eje; muy usado con reductores cubo y motores IEC.',
    cons: 'Requiere superficie de apoyo bien mecanizada y reparto de carga en la brida; acceso a tornillería a veces estrecho.',
  },
  B14: {
    title: 'Brida compacta (IEC B14)',
    pros: 'Menor diámetro de interfaz que B5; útil cuando el espacio radial es limitado o hay interferencias.',
    cons: 'Menor superficie de apoyo: vigilar momentos flectores y parásitos; no siempre disponible en todos los tamaños.',
  },
  hollowShaft: {
    title: 'Montaje sobre eje (eje hueco)',
    pros: 'El reductor “envuelve” el eje del tambor/árbol: menos elementos de acoplamiento, buen encaje en rodillos motrices.',
    cons: 'Exige diámetro de eje y chaveta / fijación compatibles; suele necesitarse brazo de reacción o fijación antitorque.',
  },
});

/** @type {typeof MOUNTING_GUIDE} */
export const MOUNTING_GUIDE_EN = Object.freeze({
  B3: {
    title: 'Foot-mounted (IEC B3)',
    pros: 'Stable, easy to align and tension; common on frames and plant floors.',
    cons: 'Larger footprint than a flange mount; mounting height must match the drive line.',
  },
  B5: {
    title: 'Large flange (IEC B5)',
    pros: 'Compact front mount on a wall or bracket normal to the shaft; common with cub gearmotors.',
    cons: 'Needs a flat, load-sharing flange face; bolt access can be tight.',
  },
  B14: {
    title: 'Compact flange (IEC B14)',
    pros: 'Smaller interface than B5 when radial space is limited.',
    cons: 'Less bearing surface: watch bending and parasitic loads; not all sizes offer B14.',
  },
  hollowShaft: {
    title: 'Hollow shaft on machine shaft',
    pros: 'Gear unit wraps the drum shaft: fewer coupling parts; common on drum drives.',
    cons: 'Shaft diameter and locking must match; often needs a torque arm or anti-rotation fix.',
  },
});

/**
 * Lee controles globales de la página (mismos ids en cinta, pendiente, tornillo, bomba).
 * @returns {MountingPreferences}
 */
export function readMountingPreferences() {
  const typeEl = document.getElementById('mountingType');
  const shaftEl = document.getElementById('mountMachineShaftDiam');
  const oriEl = document.getElementById('mountOrientation');
  const spaceEl = document.getElementById('mountSpaceNote');

  let mountingType = /** @type {MountingType} */ ('B3');
  if (typeEl instanceof HTMLSelectElement && typeEl.value) {
    const v = typeEl.value;
    if (v === 'B3' || v === 'B5' || v === 'B14' || v === 'hollowShaft') mountingType = v;
  }

  let machineShaftDiameter_mm = null;
  if (shaftEl instanceof HTMLInputElement) {
    const d = parseFloat(String(shaftEl.value).replace(',', '.'));
    if (Number.isFinite(d) && d > 0) machineShaftDiameter_mm = d;
  }

  let orientation = /** @type {'horizontal' | 'vertical'} */ ('horizontal');
  if (oriEl instanceof HTMLSelectElement) {
    orientation = oriEl.value === 'vertical' ? 'vertical' : 'horizontal';
  }

  const spaceConstraint = spaceEl instanceof HTMLInputElement ? String(spaceEl.value || '').trim() : '';

  return { mountingType, machineShaftDiameter_mm, orientation, spaceConstraint };
}

/**
 * @param {import('../data/gearmotorCatalog.js').GearmotorModel} model
 * @param {MountingType} type
 */
export function modelMatchesMounting(model, type) {
  const mt = model.mountingTypes;
  if (!mt || !Array.isArray(mt) || mt.length === 0) return true;
  if (type === 'hollowShaft') {
    return model.outputShaft?.kind === 'hollow';
  }
  return mt.includes(type);
}

/**
 * @template T
 * @param {T[]} models
 * @param {MountingType} type
 * @returns {{ filtered: T[]; relaxed: boolean }}
 */
export function filterModelsByMounting(models, type) {
  const filtered = models.filter((m) => modelMatchesMounting(m, type));
  if (filtered.length) return { filtered, relaxed: false };
  return { filtered: models, relaxed: true };
}

function isWormLikeModel(model) {
  const s = `${model.series} ${model.code}`.toLowerCase();
  return s.includes('nmrv') || s.includes('sinfín') || s.includes('sinfin') || s.includes('vf ') || model.eta_g < 0.82;
}

/**
 * @param {import('../modules/motorVerify.js').DriveRequirement} req
 * @param {import('../data/gearmotorCatalog.js').GearmotorModel} model
 * @param {import('../modules/motorVerify.js').VerifyResult} base
 * @returns {import('../modules/motorVerify.js').VerifyResult}
 */
export function augmentVerifyWithMounting(req, model, base) {
  const lang = getCurrentLang();
  const en = lang === 'en';
  const hollowLbl = en ? 'hollow shaft' : 'eje hueco';
  const checks = [...base.checks];
  const warnings = [...base.warnings];
  const blockers = [...base.blockers];

  const mt = req.mountingType;
  if (mt && !modelMatchesMounting(model, mt)) {
    const label = mt === 'hollowShaft' ? hollowLbl : mt;
    blockers.push(
      en
        ? `Requested mounting (${label}) does not match typical options for this demo catalog model.`
        : `Montaje solicitado (${label}) no coincide con las opciones típicas de este modelo de catálogo ejemplo.`,
    );
    checks.push(
      en
        ? `Mounting: requested ${label} → model not listed that way in demo → NOT compatible`
        : `Montaje: solicitado ${label} → modelo no catalogado así en la demo → NO compatible`,
    );
  } else if (mt) {
    if (model.userManual) {
      checks.push(
        en
          ? `Mounting: ${mt === 'hollowShaft' ? hollowLbl : mt} → not auto-checked in manual mode (confirm with your documentation).`
          : `Montaje: ${mt === 'hollowShaft' ? hollowLbl : mt} → no verificado automáticamente en modo manual (confirme con su documentación).`,
      );
    } else {
      checks.push(
        en
          ? `Mounting: ${mt === 'hollowShaft' ? hollowLbl : mt} → included in model variants (demo)`
          : `Montaje: ${mt === 'hollowShaft' ? hollowLbl : mt} → incluido en variantes del modelo (demo)`,
      );
    }
  }

  if (req.orientation === 'vertical' && isWormLikeModel(model)) {
    warnings.push(
      en
        ? 'Vertical mounting with worm/cub gearbox: check oil level, seals, and manufacturer limits (lubrication differs from horizontal).'
        : 'Montaje vertical con reductor sinfín-cubo: revisar nivel de aceite, juntas y límites del fabricante (lubricación distinta a horizontal).',
    );
  }

  if (req.spaceConstraint && String(req.spaceConstraint).trim().length > 3) {
    warnings.push(
      en
        ? 'Space constraint noted: confirm total motor+gearbox length, fin heights, and envelopes with the supplier.'
        : 'Restricción de espacio indicada: confirme longitud total motor+reductor, alturas de aleta y gálibos con el fabricante.',
    );
  }

  if (req.machineShaftDiameter_mm != null && model.outputShaft) {
    const dM = req.machineShaftDiameter_mm;
    const dCat = model.outputShaft.nominalDiameter_mm;
    if (model.outputShaft.kind === 'hollow' && Number.isFinite(dCat) && dCat > 0) {
      if (dM > dCat * 0.97) {
        warnings.push(
          en
            ? `Machine shaft OD (${dM} mm) is close to or above catalog hollow bore (~${dCat} mm): check clearance, keying, and ISO tolerances.`
            : `Ø eje máquina (${dM} mm) cercano o mayor al hueco nominal de catálogo (~${dCat} mm): comprobar holgura, chaveta y tolerancias ISO.`,
        );
      }
    }
    if (model.outputShaft.kind === 'solid' && Number.isFinite(dCat) && dCat > 0) {
      const delta = Math.abs(dM - dCat);
      if (delta > 3 && dM > 15) {
        warnings.push(
          en
            ? `Entered shaft OD (${dM} mm) differs from indicative output shaft (~${dCat} mm): validate coupling, bush, or gearing.`
            : `Ø eje introducido (${dM} mm) difiere del Ø de salida orientativo del modelo (~${dCat} mm): valide acoplamiento, buje o engrane.`,
        );
      }
    }
  }

  const hadExtraBlocker = blockers.length > base.blockers.length;
  const suitable = base.suitable && !hadExtraBlocker;
  let verdict = base.verdict;
  if (hadExtraBlocker) {
    verdict = en
      ? 'NOT recommended: requested mounting or shaft does not fit this demo model.'
      : 'NO se recomienda: el montaje o eje solicitados no encajan con este modelo de ejemplo.';
  }

  return {
    suitable,
    verdict,
    checks,
    warnings,
    blockers,
  };
}

/**
 * Resumen breve para tarjetas (por qué encaja el montaje).
 * @param {import('../data/gearmotorCatalog.js').GearmotorModel} model
 * @param {MountingPreferences} pref
 */
export function explainMountingFit(model, pref) {
  const en = getCurrentLang() === 'en';
  const g = (en ? MOUNTING_GUIDE_EN : MOUNTING_GUIDE)[pref.mountingType] || (en ? MOUNTING_GUIDE_EN.B3 : MOUNTING_GUIDE.B3);
  const parts = [];
  parts.push(g.title);
  if (model.flangeLabel) parts.push(model.flangeLabel);
  if (model.shaftConfigLabel) parts.push(model.shaftConfigLabel);
  const why =
    pref.mountingType === 'hollowShaft'
      ? en
        ? 'Suited when torque is applied directly on the machine shaft; fewer couplings.'
        : 'Adecuado cuando el par se introduce directamente sobre el eje de la máquina; reduce acoplamientos.'
      : pref.mountingType === 'B5' || pref.mountingType === 'B14'
        ? en
          ? 'Useful front mount when the gearmotor hangs from a panel or bracket normal to the output shaft.'
          : 'Encaje frontal útil cuando el motorreductor cuelga de un panel o bastidor perpendicular al eje de salida.'
        : en
          ? 'Foot mount: classic reference for alignment with belts and concrete or steel bases.'
          : 'Montaje a patas: referencia clásica para alineación con bandas y bases de hormigón o chapa.';
  return { headline: parts.filter(Boolean).join(' · '), why, guide: g };
}

