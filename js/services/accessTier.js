/**
 * Plan de acceso — gratuito vs Pro (sin backend; listo para enlazar a pagos más adelante).
 *
 * Estrategia (qué módulo es la puerta gratis): `FEATURES.whichCalculatorIsFree` o `?freeTool=flat|inclined`.
 * Pro efectivo: `FEATURES.devSimulatePremium`, `?pro=1`, o acceso Pro limitado (free trial por usos).
 */

import { FEATURES } from '../config/features.js';
const LS_FREE_PRO_USES = 'mdr-free-pro-uses';
const SS_FREE_PRO_PAGE_MARK = 'mdr-free-pro-page-mark';
const MAX_FREE_PRO_USES = 5;

/** @returns {'flat'|'inclined'} */
export function getFreemiumStrategy() {
  try {
    const u = new URLSearchParams(window.location.search).get('freeTool');
    if (u === 'flat' || u === 'inclined') return u;
  } catch (_) {
    /* ignore */
  }
  const w = FEATURES.whichCalculatorIsFree;
  return w === 'inclined' ? 'inclined' : 'flat';
}

/** @returns {'free'|'premium'} */
export function getEffectiveTier() {
  if (FEATURES.devSimulatePremium) return 'premium';
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get('pro') === '1') {
      return 'premium';
    }
  } catch (_) {
    /* ignore */
  }
  if (getFreeProRemainingUses() > 0) return 'premium';
  return 'free';
}

/** @param {'flat'|'inclined'|'pump'|'screw'} tool */
export function isToolUnlocked(tool) {
  if (getEffectiveTier() === 'premium') return true;
  // Cinta inclinada queda abierta como el resto de máquinas generalistas.
  if (tool === 'inclined' || tool === 'pump' || tool === 'screw') return true;
  return getFreemiumStrategy() === tool;
}

export function setPremiumPersistent() {
  activateProDemoInBrowser();
}

/**
 * Demo Pro: guarda en almacenamiento si el navegador lo permite y redirige con ?pro=1.
 * Así funciona aunque localStorage falle (p. ej. algunos entornos file:// o modo estricto).
 */
export function activateProDemoInBrowser() {
  try {
    const u = new URL(window.location.href);
    u.searchParams.set('pro', '1');
    window.location.replace(u.toString());
  } catch (_) {
    const href = window.location.href.replace(/\?.*$/, '');
    window.location.replace(`${href}?pro=1`);
  }
}

export function clearPremiumPersistent() {
  try {
    const u = new URL(window.location.href);
    u.searchParams.delete('pro');
    window.location.replace(u.toString());
  } catch (_) {
    const href = window.location.href.replace(/\?.*$/, '');
    window.location.replace(href);
  }
}

export function isPremiumEffective() {
  return getEffectiveTier() === 'premium';
}

function getUsageCounterRaw() {
  try {
    const n = Number(localStorage.getItem(LS_FREE_PRO_USES) || 0);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch (_) {
    return 0;
  }
}

function setUsageCounterRaw(v) {
  try {
    localStorage.setItem(LS_FREE_PRO_USES, String(Math.max(0, Math.floor(v))));
  } catch (_) {
    /* ignore */
  }
}

/**
 * Marca un uso Pro gratuito (máximo 1 por página/sesión del navegador).
 * Llame a esto al montar una máquina para que el cupo avance.
 */
export function consumeFreeProUseIfNeeded() {
  if (FEATURES.devSimulatePremium) return;
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get('pro') === '1') return;
  } catch (_) {
    /* ignore */
  }

  const key = `${window.location.pathname}|${window.location.search}`;
  try {
    if (sessionStorage.getItem(SS_FREE_PRO_PAGE_MARK) === key) return;
    sessionStorage.setItem(SS_FREE_PRO_PAGE_MARK, key);
  } catch (_) {
    /* ignore */
  }

  const used = getUsageCounterRaw();
  if (used >= MAX_FREE_PRO_USES) return;
  setUsageCounterRaw(used + 1);
}

export function getFreeProUsageCount() {
  return getUsageCounterRaw();
}

export function getFreeProRemainingUses() {
  const left = MAX_FREE_PRO_USES - getUsageCounterRaw();
  return left > 0 ? left : 0;
}

export function getFreeProUsageLimit() {
  return MAX_FREE_PRO_USES;
}
