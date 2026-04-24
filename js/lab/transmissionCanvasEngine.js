/**
 * Lienzo técnico Pro — estado, cinemática, geometría de correa 2D, validaciones.
 * Modelos educativos; no sustituyen catálogo OEM.
 */

import { chainPitchDiameter_mm } from './chains.js';
import { getChainById, chainAssemblyHints } from './chainCatalog.js';
import {
  svgSerpentineClosedPath,
  convexHullIndices,
  svgConvexExteriorBelt,
  convexExteriorBeltLengthMm,
} from './diagramGeometry.js';

/** @typedef {{ x: number; y: number }} Pt */

/** @type {'ok'|'warn'|'err'} */
export const VERDICT = { OK: 'ok', WARN: 'warn', ERR: 'err' };

/** Longitudes comerciales demo (mm) — paso 10 en rango habitual correas V */
export const DEMO_V_BELT_LENGTHS_MM = (() => {
  const a = [];
  for (let L = 500; L <= 5000; L += 10) a.push(L);
  return a;
})();

/**
 * @param {number} L_mm
 * @returns {{ L_nom: number; delta_mm: number; ok: boolean }}
 */
export function nearestCommercialVBeltLength(L_mm) {
  const L = Number(L_mm);
  if (!Number.isFinite(L) || L <= 0) return { L_nom: L_mm, delta_mm: 0, ok: false };
  let best = DEMO_V_BELT_LENGTHS_MM[0];
  let bd = Math.abs(L - best);
  for (const v of DEMO_V_BELT_LENGTHS_MM) {
    const d = Math.abs(L - v);
    if (d < bd) {
      bd = d;
      best = v;
    }
  }
  const tol = 15;
  return { L_nom: best, delta_mm: L - best, ok: bd <= tol };
}

/**
 * Tangente exterior entre circunferencias (correa abierta).
 * @returns {{ p0: Pt; p1: Pt; n: Pt } | null}
 */
export function outerTangentSegment(c0, r0, c1, r1, side) {
  const dx = c1.x - c0.x;
  const dy = c1.y - c0.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return null;
  if (Math.abs(r0 - r1) >= d - 1e-9) return null;
  const ux = dx / d;
  const uy = dy / d;
  /* Tangente exterior: sin(theta) = (R1 - R2) / d */
  const rrel = (r0 - r1) / d;
  const h = Math.sqrt(Math.max(0, 1 - rrel * rrel)) * side;
  const nx = rrel * ux - h * uy;
  const ny = rrel * uy + h * ux;
  return {
    p0: { x: c0.x + r0 * nx, y: c0.y + r0 * ny },
    p1: { x: c1.x + r1 * nx, y: c1.y + r1 * ny },
    n: { x: nx, y: ny },
  };
}

/**
 * Tangente interior (cruzada) entre circunferencias.
 * Se usa para contacto "back-side" (cara externa) en polea tensora.
 * @returns {{ p0: Pt; p1: Pt; n: Pt } | null}
 */
export function innerTangentSegment(c0, r0, c1, r1, side) {
  const dx = c1.x - c0.x;
  const dy = c1.y - c0.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return null;
  if (r0 + r1 >= d - 1e-9) return null;
  const alpha = Math.atan2(dy, dx);
  /* Tangente interior: beta = acos((R1 + R2)/d) */
  const beta = Math.acos(Math.max(-1, Math.min(1, (r0 + r1) / d)));
  const ang = alpha + side * beta;
  const nx = Math.cos(ang);
  const ny = Math.sin(ang);
  return {
    p0: { x: c0.x + r0 * nx, y: c0.y + r0 * ny },
    p1: { x: c1.x - r1 * nx, y: c1.y - r1 * ny },
    n: { x: nx, y: ny },
  };
}

function orient(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function onSegment(a, b, p) {
  return (
    Math.min(a.x, b.x) - 1e-9 <= p.x &&
    p.x <= Math.max(a.x, b.x) + 1e-9 &&
    Math.min(a.y, b.y) - 1e-9 <= p.y &&
    p.y <= Math.max(a.y, b.y) + 1e-9
  );
}

function segmentsIntersect(a, b, c, d) {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  if ((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) {
    if ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0)) return true;
  }
  if (Math.abs(o1) < 1e-9 && onSegment(a, b, c)) return true;
  if (Math.abs(o2) < 1e-9 && onSegment(a, b, d)) return true;
  if (Math.abs(o3) < 1e-9 && onSegment(c, d, a)) return true;
  if (Math.abs(o4) < 1e-9 && onSegment(c, d, b)) return true;
  return false;
}

function hasSelfIntersections(segments) {
  const n = segments.length;
  for (let i = 0; i < n; i++) {
    const a = segments[i];
    for (let j = i + 1; j < n; j++) {
      if (j === i || j === (i + 1) % n || i === (j + 1) % n) continue;
      const b = segments[j];
      if (segmentsIntersect(a.p0, a.p1, b.p0, b.p1)) return true;
    }
  }
  return false;
}

function angleOnCircle(c, p) {
  return Math.atan2(p.y - c.y, p.x - c.x);
}

/** Arco CCW length r * |Δθ| con Δθ en (-π, π] */
function arcLenCCW(r, t0, t1) {
  let d = t1 - t0;
  while (d <= -Math.PI) d += 2 * Math.PI;
  while (d > Math.PI) d -= 2 * Math.PI;
  return r * Math.abs(d);
}

/**
 * Construye lazo de correa abierta por poleas ordenadas; elige rama de tangente por continuidad.
 * @param {{ x: number; y: number }[]} centers
 * @param {number[]} radii
 * @returns {{ pathD: string; length_mm: number; reliable: boolean; note: string }}
 */
export function buildOpenBeltPath2D(centers, radii) {
  const n = centers.length;
  if (n < 2) return { pathD: '', length_mm: 0, reliable: false, note: 'Mínimo 2 poleas.' };
  if (n === 2) {
    const c0 = centers[0];
    const c1 = centers[1];
    const r0 = radii[0];
    const r1 = radii[1];
    const sPos = outerTangentSegment(c0, r0, c1, r1, +1);
    const sNeg = outerTangentSegment(c0, r0, c1, r1, -1);
    const seg = sPos || sNeg;
    if (!seg) return { pathD: '', length_mm: 0, reliable: false, note: 'Geometría inválida (una polea dentro de otra).' };
    const otherSide = seg === sPos ? -1 : +1;
    const opp = outerTangentSegment(c0, r0, c1, r1, otherSide);
    if (!opp) {
      return { pathD: '', length_mm: 0, reliable: false, note: 'No se pudo cerrar el lazo de correa entre las dos poleas.' };
    }
    const t0a = angleOnCircle(c0, seg.p0);
    const t1a = angleOnCircle(c1, seg.p1);
    const t0b = angleOnCircle(c0, opp.p0);
    const t1b = angleOnCircle(c1, opp.p1);
    const straight1 = Math.hypot(seg.p1.x - seg.p0.x, seg.p1.y - seg.p0.y);
    const straight2 = Math.hypot(opp.p1.x - opp.p0.x, opp.p1.y - opp.p0.y);
    const arc0 = arcLenCCW(r0, t0a, t0b);
    const arc1 = arcLenCCW(r1, t1a, t1b);
    const len = straight1 + straight2 + arc0 + arc1;
    const pathD = [
      `M ${seg.p0.x.toFixed(2)} ${seg.p0.y.toFixed(2)}`,
      `L ${seg.p1.x.toFixed(2)} ${seg.p1.y.toFixed(2)}`,
      `A ${r1.toFixed(3)} ${r1.toFixed(3)} 0 0 1 ${opp.p1.x.toFixed(2)} ${opp.p1.y.toFixed(2)}`,
      `L ${opp.p0.x.toFixed(2)} ${opp.p0.y.toFixed(2)}`,
      `A ${r0.toFixed(3)} ${r0.toFixed(3)} 0 0 1 ${seg.p0.x.toFixed(2)} ${seg.p0.y.toFixed(2)}`,
      'Z',
    ].join(' ');
    return { pathD, length_mm: len, reliable: true, note: '' };
  }

  /** Triángulo / polígono: lazo exterior tangente al cierre convexo (como envolvente real). */
  const hullIdx = convexHullIndices(centers);
  if (hullIdx.length >= 3) {
    const path = svgConvexExteriorBelt(centers, radii, hullIdx);
    if (path) {
      const len = convexExteriorBeltLengthMm(centers, radii, hullIdx);
      let note = 'Correa/cadena en lazo exterior del cierre convexo (tangentes).';
      if (hullIdx.length < n) {
        note += ' Piezas dentro del polígono no forman parte de este contorno; valide trazado interior si aplica.';
      }
      return {
        pathD: path,
        length_mm: len,
        reliable: hullIdx.length === n,
        note,
      };
    }
  }

  /** Colineales (caso degenerado del casco): serpentín proyectado a Y media y orden por X. */
  const ys = centers.map((c) => c.y);
  const xsRaw = centers.map((c) => c.x);
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  const yVar = Math.max(...ys.map((yy) => Math.abs(yy - yMean)));
  const xsSpan = Math.max(...xsRaw) - Math.min(...xsRaw);

  const geomCenters = centers.map((c) => ({ x: c.x, y: yMean }));
  const projected = yVar > Math.max(8, 0.02 * Math.max(xsSpan, 60));

  const orderIdx = geomCenters.map((_, i) => i).sort((i, j) => geomCenters[i].x - geomCenters[j].x);
  const xs = orderIdx.map((i) => geomCenters[i].x);
  const rs = orderIdx.map((i) => radii[i]);
  const path = svgSerpentineClosedPath(xs, yMean, rs);

  let len = 0;
  for (let k = 0; k < n - 1; k++) {
    const dx = xs[k + 1] - xs[k];
    len += Math.sqrt(Math.max(0, dx * dx - (rs[k + 1] - rs[k]) ** 2));
  }
  len *= 2;
  for (let k = 0; k < n; k++) {
    len += Math.PI * rs[k];
  }

  let note = 'Serpentín cerrado (poleas casi alineadas; orden por X).';
  if (projected) note += ' Dispersión en Y: trazo en plano medio (referencia).';

  return {
    pathD: path,
    length_mm: len,
    reliable: !projected,
    note,
  };
}

/**
 * Lazo ordenado que fuerza contacto en todas las poleas (incluye tensoras/intermedias).
 * Aproxima puntos de entrada/salida por dirección entre centros consecutivos y suma arcos locales.
 * @param {{ x: number; y: number }[]} centers
 * @param {number[]} radii
 * @param {Array<{ role?: 'drive'|'driven'|'idler', wrapSide?: 'outside'|'inside', isExternal?: boolean, contacto?: 'interior'|'exterior' }>} [nodeMeta]
 * @param {Array<-1|1|null|undefined>} [edgeSigns] Signo por tramo i->i+1 (1=pos, -1=neg)
 * @returns {{ pathD: string; length_mm: number; reliable: boolean; note: string }}
 */
export function buildOrderedBeltPath2D(centers, radii, nodeMeta = [], edgeSigns = []) {
  const n = centers.length;
  if (n < 2) return { pathD: '', length_mm: 0, reliable: false, note: 'Minimo 2 poleas.' };
  if (n === 2) return buildOpenBeltPath2D(centers, radii);
  const edges = Array.from({ length: n }, (_, i) => ({ i, j: (i + 1) % n }));
  const centroid = centers.reduce((acc, c) => ({ x: acc.x + c.x, y: acc.y + c.y }), { x: 0, y: 0 });
  centroid.x /= n;
  centroid.y /= n;
  const isExternal = (meta) =>
    !!meta && (meta.contacto === 'exterior' || meta.isExternal === true || meta.wrapSide === 'outside');
  const edgeUsesInnerTangents = (i, j) => {
    const aExt = isExternal(nodeMeta[i] || {});
    const bExt = isExternal(nodeMeta[j] || {});
    return aExt !== bExt;
  };
  /** @type {Array<{pos: ReturnType<typeof outerTangentSegment>, neg: ReturnType<typeof outerTangentSegment>}>} */
  const edgeTangents = edges.map(({ i, j }) => {
    const useInner = edgeUsesInnerTangents(i, j);
    const tangentFn = useInner ? innerTangentSegment : outerTangentSegment;
    return {
      pos: tangentFn(centers[i], radii[i], centers[j], radii[j], +1),
      neg: tangentFn(centers[i], radii[i], centers[j], radii[j], -1),
    };
  });
  if (edgeTangents.some((e) => !e.pos && !e.neg)) {
    return { pathD: '', length_mm: 0, reliable: false, note: 'Geometria invalida para tangencias en al menos un tramo.' };
  }

  const maxMask = 1 << n;
  let best = { mask: 0, len: Infinity, score: Infinity };

  for (let mask = 0; mask < maxMask; mask++) {
    /** @type {Array<ReturnType<typeof outerTangentSegment>>} */
    const seg = [];
    let valid = true;
    for (let e = 0; e < n; e++) {
      const choosePos = ((mask >> e) & 1) === 1;
      const forced = edgeSigns[e];
      if (forced === 1 && !choosePos) {
        valid = false;
        break;
      }
      if (forced === -1 && choosePos) {
        valid = false;
        break;
      }
      const t = choosePos ? edgeTangents[e].pos : edgeTangents[e].neg;
      if (!t) {
        valid = false;
        break;
      }
      seg.push(t);
    }
    if (!valid) continue;
    if (hasSelfIntersections(seg)) continue;

    let L = 0;
    let externalWrapPenalty = 0;
    let externalWrapInvalid = false;
    for (let e = 0; e < n; e++) {
      const s = seg[e];
      L += Math.hypot(s.p1.x - s.p0.x, s.p1.y - s.p0.y);
    }
    for (let k = 0; k < n; k++) {
      const prev = seg[(k - 1 + n) % n];
      const cur = seg[k];
      const c = centers[k];
      const r = Math.max(1e-6, radii[k]);
      const tIn = angleOnCircle(c, prev.p1);
      const tOut = angleOnCircle(c, cur.p0);
      let d = tOut - tIn;
      while (d <= -Math.PI) d += 2 * Math.PI;
      while (d > Math.PI) d -= 2 * Math.PI;
      const shortAbs = Math.abs(d);
      const meta = nodeMeta[k] || {};
      const insideIdler = meta.role === 'idler' && meta.wrapSide === 'inside';
      const externalIdler = meta.role === 'idler' && isExternal(meta);
      /* Polea interna: arco largo. Tensora dorsal (back-side): arco corto. */
      L += insideIdler ? r * (2 * Math.PI - shortAbs) : r * shortAbs;
      if (externalIdler) {
        // Limitar abrazamiento de tensora dorsal: contacto pequeño/local.
        const maxWrap = (95 * Math.PI) / 180;
        if (shortAbs > maxWrap) {
          externalWrapPenalty += shortAbs - maxWrap;
          externalWrapInvalid = true;
        }
      }
    }
    if (externalWrapInvalid) continue;
    /* Evitar que al insertar tensora se "gire" el lazo completo:
       penalizamos cambios de rama entre tramos consecutivos en poleas no tensoras. */
    let branchFlipPenalty = 0;
    for (let k = 0; k < n; k++) {
      const prevBit = (mask >> ((k - 1 + n) % n)) & 1;
      const curBit = (mask >> k) & 1;
      const meta = nodeMeta[k] || {};
      const isIdler = meta.role === 'idler';
      if (!isIdler && prevBit !== curBit) branchFlipPenalty += 1;
    }
    /* Mantener contorno exterior en tramos entre poleas no tensoras:
       el segmento tangente debe quedar por fuera del "interior" definido por el centroide. */
    let exteriorPenalty = 0;
    /* En tramos mixtos (interior↔exterior), la rama debe desviar hacia el interior del lazo
       (caso tensora dorsal) para evitar la rama "superior" no deseada. */
    let inflectionPenalty = 0;
    /* Regla local para tensora dorsal:
       el contacto debe quedar en la cara orientada hacia el centro del lazo
       (en tu caso, la parte inferior de la polea superior). */
    let idlerContactPenalty = 0;
    for (let e = 0; e < n; e++) {
      const i = e;
      const j = (e + 1) % n;
      const mi = nodeMeta[i] || {};
      const mj = nodeMeta[j] || {};
      if (mi.role === 'idler' || mj.role === 'idler') continue;
      const c0 = centers[i];
      const c1 = centers[j];
      const ux = c1.x - c0.x;
      const uy = c1.y - c0.y;
      const vx = centroid.x - c0.x;
      const vy = centroid.y - c0.y;
      const interiorSign = Math.sign(ux * vy - uy * vx);
      const tangentSign = Math.sign(ux * seg[e].n.y - uy * seg[e].n.x);
      if (interiorSign !== 0 && tangentSign !== 0 && interiorSign === tangentSign) exteriorPenalty += 1;

      const mixed = edgeUsesInnerTangents(i, j);
      if (mixed && interiorSign !== 0 && tangentSign !== 0 && interiorSign !== tangentSign) inflectionPenalty += 1;
    }
    for (let k = 0; k < n; k++) {
      const meta = nodeMeta[k] || {};
      const isExternalIdler = meta.role === 'idler' && isExternal(meta);
      if (!isExternalIdler) continue;
      const prev = seg[(k - 1 + n) % n];
      const cur = seg[k];
      const c = centers[k];
      const cx = centroid.x - c.x;
      const cy = centroid.y - c.y;
      const inx = prev.p1.x - c.x;
      const iny = prev.p1.y - c.y;
      const outx = cur.p0.x - c.x;
      const outy = cur.p0.y - c.y;
      const inToward = inx * cx + iny * cy;
      const outToward = outx * cx + outy * cy;
      if (!(inToward > 0)) idlerContactPenalty += 1;
      if (!(outToward > 0)) idlerContactPenalty += 1;
    }
    const score =
      L +
      branchFlipPenalty * 1e6 +
      exteriorPenalty * 1e6 +
      inflectionPenalty * 1e6 +
      idlerContactPenalty * 1e6 +
      externalWrapPenalty * 1e5;
    if (score < best.score) best = { mask, len: L, score };
  }

  if (!Number.isFinite(best.len)) {
    return { pathD: '', length_mm: 0, reliable: false, note: 'No se encontro combinacion de tangentes valida.' };
  }

  /** @type {Array<ReturnType<typeof outerTangentSegment>>} */
  const bestSeg = [];
  for (let e = 0; e < n; e++) {
    const choosePos = ((best.mask >> e) & 1) === 1;
    bestSeg.push((choosePos ? edgeTangents[e].pos : edgeTangents[e].neg) || edgeTangents[e].pos || edgeTangents[e].neg);
  }

  let pathD = `M ${bestSeg[0].p0.x.toFixed(2)} ${bestSeg[0].p0.y.toFixed(2)}`;
  for (let e = 0; e < n; e++) {
    const s = bestSeg[e];
    const k = (e + 1) % n;
    const nextOut = bestSeg[k].p0;
    const c = centers[k];
    const r = Math.max(1e-6, radii[k]);
    const tIn = angleOnCircle(c, s.p1);
    const tOut = angleOnCircle(c, nextOut);
    let d = tOut - tIn;
    while (d <= -Math.PI) d += 2 * Math.PI;
    while (d > Math.PI) d -= 2 * Math.PI;
    const shortAbs = Math.abs(d);
    const meta = nodeMeta[k] || {};
    const insideIdler = meta.role === 'idler' && meta.wrapSide === 'inside';
    const externalIdler = isExternal(meta);
    const largeArc = insideIdler ? 1 : externalIdler ? 0 : shortAbs > Math.PI ? 1 : 0;
    const sweep = insideIdler ? (d >= 0 ? 0 : 1) : d >= 0 ? 1 : 0;
    pathD += ` L ${s.p1.x.toFixed(2)} ${s.p1.y.toFixed(2)}`;
    pathD += ` A ${r.toFixed(3)} ${r.toFixed(3)} 0 ${largeArc} ${sweep} ${nextOut.x.toFixed(2)} ${nextOut.y.toFixed(2)}`;
  }
  pathD += ' Z';

  return {
    pathD,
    length_mm: best.len,
    reliable: true,
    note: 'Trazado tangente por tramos sin auto-intersecciones; tensora dorsal usa bitangentes internas.',
  };
}

function pointSegmentDistance(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const vv = vx * vx + vy * vy;
  const t = vv > 1e-9 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / vv)) : 0;
  const qx = ax + t * vx;
  const qy = ay + t * vy;
  return Math.hypot(px - qx, py - qy);
}

/**
 * Ordena nodos de correa para que las poleas tensoras se inserten en el tramo más cercano
 * sin romper el lazo principal de poleas motriz/conducidas.
 * @param {TxState} state
 * @param {{ nodeIds: number[] }} br
 */
export function orderedBeltNodeIds(state, br) {
  const all = (br.nodeIds || []).filter((id) => state.nodes.some((n) => n.id === id && n.kind === 'pulley'));
  if (all.length < 3) return all;

  /** @type {number[]} */
  const core = [];
  /** @type {number[]} */
  const idlers = [];
  for (const id of all) {
    const n = state.nodes.find((x) => x.id === id);
    if (!n || n.kind !== 'pulley') continue;
    if (n.pulleyRole === 'idler') idlers.push(id);
    else core.push(id);
  }
  if (core.length < 2) return all;

  /** @type {number[]} */
  const ring = [...core];
  for (const id of idlers) {
    const p = state.nodes.find((x) => x.id === id);
    if (!p) continue;
    let bestIdx = 0;
    let bestD = Infinity;
    for (let i = 0; i < ring.length; i++) {
      const a = state.nodes.find((x) => x.id === ring[i]);
      const b = state.nodes.find((x) => x.id === ring[(i + 1) % ring.length]);
      if (!a || !b) continue;
      const d = pointSegmentDistance(p.x, p.y, a.x, a.y, b.x, b.y);
      if (d < bestD) {
        bestD = d;
        bestIdx = i + 1;
      }
    }
    ring.splice(bestIdx, 0, id);
  }
  return ring;
}

/** Carga de rotura demo kN ~ f(paso) — orientativa */
export function demoChainBreakingLoad_kN(pitch_mm) {
  const p = Number(pitch_mm) || 12.7;
  return Math.max(4, 12 + (p - 6) * 2.2);
}

/** Lewis simplificado: σ ≈ 2T/(b m² z Y) con Y aproximado */
export function gearBendingStress_MPa(T_Nm, m_mm, z, faceWidth_mm) {
  const m = Math.max(0.25, m_mm);
  const zf = Math.max(6, z);
  const b = Math.max(4, faceWidth_mm);
  const Y = 0.3 + 0.4 / zf;
  const d_m = (m * zf) / 1000;
  const Ft = (2 * T_Nm) / Math.max(1e-6, d_m);
  return Ft / (b * m * Y);
}

export function gearContactHint_MPa(T_Nm, m_mm, z1, z2, faceWidth_mm) {
  const m = Math.max(0.25, m_mm);
  const d1 = (m * z1) / 1000;
  const d2 = (m * z2) / 1000;
  const b = Math.max(4, faceWidth_mm) / 1000;
  const Ft = (2 * T_Nm) / Math.max(1e-6, d1);
  const rho1 = d1 / 2;
  const rho2 = d2 / 2;
  const E = 210e9;
  const inv = 1 / rho1 + 1 / rho2;
  const sigmaH = Math.sqrt((Ft * E * inv) / (Math.PI * b * Math.sin((20 * Math.PI) / 180) * Math.cos((20 * Math.PI) / 180)));
  return sigmaH / 1e6;
}

/**
 * @typedef {{
 *   id: number;
 *   kind: 'gear'|'pulley'|'sprocket';
 *   x: number;
 *   y: number;
 *   z?: number;
 *   module_mm?: number;
 *   faceWidth_mm?: number;
 *   d_mm?: number;
 *   pulleyRole?: 'drive'|'driven'|'idler';
 *   idlerWrapSide?: 'outside'|'inside';
 *   isExternal?: boolean;
 *   pitch_mm?: number;
 *   chainRefId?: string;
 *   isMotor?: boolean;
 *   phase_rad?: number;
 * }} TxNode
 */

/**
 * @typedef {{
 *   nodes: TxNode[];
 *   meshes: { a: number; b: number }[];
 *   beltRuns: { id: string; nodeIds: number[]; kind: 'v'|'sync'; slip: number; edgeSigns?: Array<-1|1> }[];
 *   chainRuns: { id: string; nodeIds: number[]; chainRefId: string }[];
 *   selectedId: number | null;
 *   beltPickOrder: number[];
 *   chainPickOrder: number[];
 *   nextId: number;
 * }} TxState
 */

export function createInitialState() {
  return {
    nodes: [],
    meshes: [],
    beltRuns: [],
    chainRuns: [],
    selectedId: null,
    beltPickOrder: [],
    chainPickOrder: [],
    nextId: 1,
  };
}

export function gearPrimitiveDiameter_mm(m, z) {
  return m * z;
}

export function getNodeD_mm(node) {
  if (node.kind === 'gear') {
    const m = Math.max(0.25, node.module_mm ?? 2.5);
    const z = Math.max(6, node.z ?? 20);
    return m * z;
  }
  if (node.kind === 'pulley') return Math.max(10, node.d_mm ?? 100);
  const p = node.pitch_mm ?? getChainById(node.chainRefId || '')?.pitch_mm ?? 12.7;
  const z = Math.max(6, node.z ?? 17);
  return chainPitchDiameter_mm(p, z);
}

/** Distancia entre centros teórica engrane exterior */
export function theoreticalMeshCenter_mm(m, z1, z2) {
  return (m * (Math.max(6, z1) + Math.max(6, z2))) / 2;
}

/**
 * Ajusta posición de nodeId acercándolo a otro engranaje compatible (snap magnético).
 * @returns {boolean} si hubo snap
 */
export function snapGearToPeer(state, nodeId, snapPx = 14) {
  const node = state.nodes.find((n) => n.id === nodeId);
  if (!node || node.kind !== 'gear') return false;
  const m = Math.max(0.25, node.module_mm ?? 2.5);
  const z = Math.max(6, node.z ?? 20);
  let best = null;
  let bestD = Infinity;
  for (const o of state.nodes) {
    if (o.id === node.id || o.kind !== 'gear') continue;
    const mo = Math.max(0.25, o.module_mm ?? 2.5);
    if (Math.abs(mo - m) > 0.01) continue;
    const zo = Math.max(6, o.z ?? 20);
    const a = theoreticalMeshCenter_mm(m, z, zo);
    const dx = o.x - node.x;
    const dy = o.y - node.y;
    const d = Math.hypot(dx, dy);
    const err = Math.abs(d - a);
    if (err < snapPx && err < bestD) {
      bestD = err;
      best = { o, a, dx, dy, d };
    }
  }
  if (!best) return false;
  const u = best.d > 1e-6 ? best.dx / best.d : 1;
  const v = best.d > 1e-6 ? best.dy / best.d : 0;
  node.x = best.o.x - u * best.a;
  node.y = best.o.y - v * best.a;
  if (!state.meshes.some((e) => (e.a === node.id && e.b === best.o.id) || (e.b === node.id && e.a === best.o.id))) {
    state.meshes.push({ a: node.id, b: best.o.id });
  }
  return true;
}

export function addNode(state, kind, x, y) {
  const id = state.nextId++;
  if (kind === 'gear') {
    state.nodes.push({
      id,
      kind: 'gear',
      x,
      y,
      z: 24,
      module_mm: 2.5,
      faceWidth_mm: 18,
      isMotor: false,
      phase_rad: 0,
    });
  } else if (kind === 'pulley') {
    state.nodes.push({
      id,
      kind: 'pulley',
      x,
      y,
      d_mm: 120,
      pulleyRole: 'driven',
      idlerWrapSide: 'outside',
      isExternal: false,
      isMotor: false,
      phase_rad: 0,
    });
  } else {
    state.nodes.push({
      id,
      kind: 'sprocket',
      x,
      y,
      z: 17,
      chainRefId: 'iso-08b-1',
      pitch_mm: getChainById('iso-08b-1')?.pitch_mm ?? 12.7,
      isMotor: false,
      phase_rad: 0,
    });
  }
  state.selectedId = id;
  return id;
}

export function removeNode(state, id) {
  state.nodes = state.nodes.filter((n) => n.id !== id);
  state.meshes = state.meshes.filter((e) => e.a !== id && e.b !== id);
  state.beltRuns = state.beltRuns.map((r) => ({
    ...r,
    nodeIds: r.nodeIds.filter((nid) => nid !== id),
  })).filter((r) => r.nodeIds.length >= 2);
  state.chainRuns = state.chainRuns.map((r) => ({
    ...r,
    nodeIds: r.nodeIds.filter((nid) => nid !== id),
  })).filter((r) => r.nodeIds.length >= 2);
  if (state.selectedId === id) state.selectedId = null;
}

/** Un solo motor */
export function setMotor(state, id) {
  for (const n of state.nodes) n.isMotor = n.id === id;
}

/**
 * @param {TxState} state
 * @param {number} n0_rpm
 * @param {number} T0_Nm
 */
export function propagateKinematics(state, n0_rpm, T0_Nm) {
  const motor = state.nodes.find((n) => n.isMotor);
  const out = {
    byId: /** @type {Record<number, { n_rpm: number; T_Nm: number; omega: number }>} */ ({}),
    formulas: /** @type {string[]} */ ([]),
  };
  if (!motor) {
    out.formulas.push('Defina un **motor**: seleccione un elemento y pulse «Marcar motor».');
    return out;
  }

  for (const n of state.nodes) {
    out.byId[n.id] = { n_rpm: 0, T_Nm: 0, omega: 0 };
  }

  /** @type {{ id: number; n: number; T: number; sign: number }[]} */
  const q = [{ id: motor.id, n: n0_rpm, T: T0_Nm, sign: 1 }];
  out.byId[motor.id] = {
    n_rpm: n0_rpm,
    T_Nm: T0_Nm,
    omega: (n0_rpm * 2 * Math.PI) / 60,
  };
  out.formulas.push(
    `Motor (#${motor.id}): n = ${n0_rpm.toFixed(1)} min⁻¹, T = ${T0_Nm.toFixed(2)} N·m → ω = 2π·n/60 = ${out.byId[motor.id].omega.toFixed(3)} rad/s.`,
  );

  /** @type {Set<number>} */
  const seen = new Set([motor.id]);

  while (q.length) {
    const cur = q.shift();
    if (!cur) break;
    const curNode = state.nodes.find((n) => n.id === cur.id);
    if (!curNode) continue;

    for (const e of state.meshes) {
      if (e.a !== cur.id && e.b !== cur.id) continue;
      const otherId = e.a === cur.id ? e.b : e.a;
      if (seen.has(otherId)) continue;
      const a = state.nodes.find((n) => n.id === e.a);
      const b = state.nodes.find((n) => n.id === e.b);
      if (!a || !b || a.kind !== 'gear' || b.kind !== 'gear') continue;
      const zCur = Math.max(6, (cur.id === a.id ? a : b).z ?? 20);
      const zOth = Math.max(6, (cur.id === a.id ? b : a).z ?? 20);
      const nAbs = Math.abs(cur.n);
      const nNext = nAbs * (zCur / zOth);
      const TNext = cur.T * (zOth / zCur);
      const newSign = -cur.sign;
      seen.add(otherId);
      out.byId[otherId] = {
        n_rpm: nNext * newSign,
        T_Nm: Math.abs(TNext),
        omega: (nNext * newSign * 2 * Math.PI) / 60,
      };
      out.formulas.push(
        `Engranaje: n₂ = n₁·z₁/z₂ = ${nAbs.toFixed(2)}·${zCur}/${zOth} = ${nNext.toFixed(2)} min⁻¹; T₂ = T₁·z₂/z₁ = ${Math.abs(TNext).toFixed(2)} N·m (sentido visual alternado).`,
      );
      q.push({ id: otherId, n: nNext, T: Math.abs(TNext), sign: newSign });
    }

    for (const br of state.beltRuns) {
      const orderedIds = orderedBeltNodeIds(state, br).filter((id) => state.nodes.some((n) => n.id === id && n.kind === 'pulley'));
      if (orderedIds.length < 2) continue;

      const slip = br.kind === 'sync' ? 0 : Math.max(0, Math.min(0.08, br.slip ?? 0.015));
      const eff = 1 - slip;
      const lossT = br.kind === 'sync' ? 1 : 0.98;

      for (let i = 0; i < orderedIds.length; i++) {
        const aId = orderedIds[i];
        const bId = orderedIds[(i + 1) % orderedIds.length];
        if (aId === bId) continue;

        const a = state.nodes.find((n) => n.id === aId);
        const b = state.nodes.find((n) => n.id === bId);
        if (!a || !b) continue;
        const da = getNodeD_mm(a);
        const db = getNodeD_mm(b);
        if (!(da > 0 && db > 0)) continue;

        if (cur.id === aId && !seen.has(bId)) {
          const nAbs = Math.abs(cur.n);
          const nNext = nAbs * (da / db) * eff;
          const Tnext = cur.T * (db / da) * lossT;
          seen.add(bId);
          out.byId[bId] = {
            n_rpm: nNext * cur.sign,
            T_Nm: Math.abs(Tnext),
            omega: (nNext * cur.sign * 2 * Math.PI) / 60,
          };
          q.push({ id: bId, n: nNext, T: Math.abs(Tnext), sign: cur.sign });
          out.formulas.push(
            br.kind === 'sync'
              ? `Correa síncrona: n₂ = n₁·d₁/d₂ = ${nAbs.toFixed(2)}·${da.toFixed(1)}/${db.toFixed(1)} = ${(nAbs * (da / db)).toFixed(2)} min⁻¹.`
              : `Correa V: n₂ ≈ n₁·(d₁/d₂)·(1−s), s=${(slip * 100).toFixed(2)}% → ${nNext.toFixed(2)} min⁻¹.`,
          );
        } else if (cur.id === bId && !seen.has(aId)) {
          const nAbs = Math.abs(cur.n);
          const nPrev = nAbs * (db / da) * eff;
          const Tprev = cur.T * (da / db) * lossT;
          seen.add(aId);
          out.byId[aId] = {
            n_rpm: nPrev * cur.sign,
            T_Nm: Math.abs(Tprev),
            omega: (nPrev * cur.sign * 2 * Math.PI) / 60,
          };
          q.push({ id: aId, n: nPrev, T: Math.abs(Tprev), sign: cur.sign });
        }
      }
    }

    for (const cr of state.chainRuns) {
      const idx = cr.nodeIds.indexOf(cur.id);
      if (idx < 0 || idx >= cr.nodeIds.length - 1) continue;
      const idNext = cr.nodeIds[idx + 1];
      if (seen.has(idNext)) continue;
      const pa = state.nodes.find((n) => n.id === cr.nodeIds[idx]);
      const pb = state.nodes.find((n) => n.id === idNext);
      if (!pa || !pb) continue;
      const Da = getNodeD_mm(pa);
      const Db = getNodeD_mm(pb);
      const nAbs = Math.abs(cur.n);
      const nNext = nAbs * (Da / Db);
      const Tnext = cur.T * (Db / Da);
      seen.add(idNext);
      out.byId[idNext] = {
        n_rpm: nNext * cur.sign,
        T_Nm: Math.abs(Tnext),
        omega: (nNext * cur.sign * 2 * Math.PI) / 60,
      };
      out.formulas.push(
        `Cadena: n₂ = n₁·D₁/D₂ = ${nAbs.toFixed(2)}·${Da.toFixed(1)}/${Db.toFixed(1)} = ${nNext.toFixed(2)} min⁻¹; T₂ = ${Math.abs(Tnext).toFixed(2)} N·m.`,
      );
      q.push({ id: idNext, n: nNext, T: Math.abs(Tnext), sign: cur.sign });
    }
  }

  return out;
}

/**
 * @param {TxState} state
 * @param {ReturnType<typeof propagateKinematics>} kin
 */
export function computeVerdicts(state, kin) {
  /** @type {{ level: 'ok'|'warn'|'err'; text: string }[]} */
  const items = [];

  const motor = state.nodes.find((n) => n.isMotor);
  if (!motor) {
    items.push({ level: VERDICT.ERR, text: 'Sin motor definido en el lienzo.' });
    return { items, worst: VERDICT.ERR };
  }

  for (const e of state.meshes) {
    const a = state.nodes.find((n) => n.id === e.a);
    const b = state.nodes.find((n) => n.id === e.b);
    if (!a || !b || a.kind !== 'gear' || b.kind !== 'gear') continue;
    const za = Math.max(6, a.z ?? 20);
    const zb = Math.max(6, b.z ?? 20);
    const ma = Math.max(0.25, a.module_mm ?? 2.5);
    const mb = Math.max(0.25, b.module_mm ?? 2.5);
    if (Math.abs(ma - mb) > 0.02) {
      items.push({ level: VERDICT.ERR, text: `Engranaje ${a.id}-${b.id}: módulos distintos (${ma} ≠ ${mb}) — interferencia de tallado.` });
    }
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    const aTh = theoreticalMeshCenter_mm(ma, za, zb);
    if (Math.abs(d - aTh) > 2) {
      items.push({
        level: VERDICT.WARN,
        text: `Engranaje ${a.id}-${b.id}: a=${d.toFixed(1)} mm vs a₀=m(z₁+z₂)/2=${aTh.toFixed(1)} mm — reajuste posición o valide holgura.`,
      });
    }
    const Tuse = Math.max(kin.byId[a.id]?.T_Nm ?? 0, kin.byId[b.id]?.T_Nm ?? 0, 1e-6);
    const sigmaB = gearBendingStress_MPa(Tuse, ma, za, a.faceWidth_mm ?? 18);
    const sigmaH = gearContactHint_MPa(Tuse, ma, za, zb, a.faceWidth_mm ?? 18);
    if (sigmaB > 320) items.push({ level: VERDICT.ERR, text: `Flexión aprox. σF≈${sigmaB.toFixed(0)} MPa > 320 MPa (acero templado demo) — riesgo de fractura.` });
    else if (sigmaB > 220) items.push({ level: VERDICT.WARN, text: `Flexión σF≈${sigmaB.toFixed(0)} MPa elevada — valide con AGMA/ISO 6336 y acabado real.` });
    if (sigmaH > 1200) items.push({ level: VERDICT.ERR, text: `Presión de contacto orientativa σH≈${sigmaH.toFixed(0)} MPa — límite habitual superado (modelo simplificado).` });
    else if (sigmaH > 850) items.push({ level: VERDICT.WARN, text: `σH≈${sigmaH.toFixed(0)} MPa — revise endurecimiento y curvatura.` });
  }

  for (const br of state.beltRuns) {
    const orderedIds = orderedBeltNodeIds(state, br);
    const hasInsideIdler = orderedIds.some((id) => {
      const n = state.nodes.find((x) => x.id === id);
      return n?.kind === 'pulley' && n.pulleyRole === 'idler' && n.idlerWrapSide === 'inside';
    });
    const effectiveIds = hasInsideIdler
      ? orderedIds
      : orderedIds.filter((id) => {
          const n = state.nodes.find((x) => x.id === id);
          return !(n?.kind === 'pulley' && n.pulleyRole === 'idler' && (n.isExternal === true || n.idlerWrapSide === 'outside'));
        });
    const centers = effectiveIds.map((id) => {
      const n = state.nodes.find((x) => x.id === id);
      return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
    });
    const radii = effectiveIds.map((id) => getNodeD_mm(state.nodes.find((x) => x.id === id)) / 2);
    const hasIdler = effectiveIds.some((id) => state.nodes.find((x) => x.id === id)?.pulleyRole === 'idler');
    const meta = effectiveIds.map((id) => {
      const n = state.nodes.find((x) => x.id === id);
      const isIdler = n?.pulleyRole === 'idler';
      const isExt = isIdler && (n?.isExternal === true || n?.idlerWrapSide === 'outside');
      return { role: n?.pulleyRole, wrapSide: n?.idlerWrapSide, isExternal: isExt, contacto: isExt ? 'exterior' : 'interior' };
    });
    const geo = !hasIdler ? buildOpenBeltPath2D(centers, radii) : buildOrderedBeltPath2D(centers, radii, meta, br.edgeSigns || []);
    const Lgeom = geo.length_mm;
    const Leff = br.kind === 'sync' ? Lgeom : Lgeom * (1 + (br.slip ?? 0.015));
    const comm = nearestCommercialVBeltLength(Leff);
    if (!geo.reliable) items.push({ level: VERDICT.WARN, text: `Correa ${br.id}: ${geo.note}` });
    else if (br.kind === 'v' && !comm.ok) {
      items.push({
        level: VERDICT.WARN,
        text: `Correa V ${br.id}: L efectiva ≈${Leff.toFixed(0)} mm no encaja en paso comercial ±15 mm (nominal demo ${comm.L_nom} mm). Desplace poleas Δ≈${comm.delta_mm.toFixed(0)} mm en tramo libre o elija otra referencia.`,
      });
    }
  }

  for (const cr of state.chainRuns) {
    const ids = cr.nodeIds;
    if (ids.length < 2) continue;
    const n0n = state.nodes.find((x) => x.id === ids[0]);
    const n1n = state.nodes.find((x) => x.id === ids[1]);
    if (!n0n || !n1n) continue;
    const p = n0n.pitch_mm ?? getChainById(cr.chainRefId)?.pitch_mm ?? 12.7;
    const z0 = Math.max(6, n0n.z ?? 17);
    const z1 = Math.max(6, n1n.z ?? 17);
    const C = Math.hypot(n1n.x - n0n.x, n1n.y - n0n.y);
    const Cd = C / p;
    const inv = ((z1 - z0) * (z1 - z0)) / (4 * Math.PI * Math.PI * Cd);
    const Lp = 2 * Cd + (z0 + z1) / 2 + inv;
    const LpInt = Math.ceil(Lp);
    const hints = chainAssemblyHints(Lp);
    if (Math.abs(Lp - Math.round(Lp)) > 0.12) {
      items.push({
        level: VERDICT.WARN,
        text: `Cadena ${cr.id}: L en pasos = ${Lp.toFixed(3)} → entero de montaje recomendado **${LpInt}** (catálogo por paso p=${p.toFixed(3)} mm).`,
      });
    }
    if (hints.offsetLink_recommended) {
      items.push({
        level: VERDICT.WARN,
        text: `Cadena ${cr.id}: número impar de pasos al cerrar bucle — valorar **eslabón desplazado** o variar C ±${(p * 0.5).toFixed(1)} mm.`,
      });
    }
    const zMin = Math.min(...ids.map((id) => Math.max(6, state.nodes.find((x) => x.id === id)?.z ?? 17)));
    if (zMin < 17) {
      items.push({
        level: VERDICT.WARN,
        text: `Efecto poligonal: z_min=${zMin} < 17 — fluctuación de tensión/velocidad; piñón mayor recomendado.`,
      });
    }
    const Fbreak_kN = demoChainBreakingLoad_kN(p);
    const T = kin.byId[ids[0]]?.T_Nm ?? 50;
    const D0_m = getNodeD_mm(n0n) / 1000;
    const Ft = (2 * T) / Math.max(1e-6, D0_m);
    const FkN = Ft / 1000;
    if (FkN > Fbreak_kN * 0.35) {
      items.push({
        level: VERDICT.ERR,
        text: `Cadena ${cr.id}: tensión estimada ≈${FkN.toFixed(2)} kN vs rotura demo ~${Fbreak_kN.toFixed(1)} kN — margen bajo (<35% rotura).`,
      });
    }
  }

  if (!items.length) items.push({ level: VERDICT.OK, text: 'Sin incidencias críticas en el modelo actual (validación orientativa).' });

  const worst = items.some((x) => x.level === VERDICT.ERR)
    ? VERDICT.ERR
    : items.some((x) => x.level === VERDICT.WARN)
      ? VERDICT.WARN
      : VERDICT.OK;
  return { items, worst };
}
