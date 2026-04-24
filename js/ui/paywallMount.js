/**
 * Pantalla de módulo Pro cuando el usuario está en plan gratuito.
 */

import { FEATURES } from '../config/features.js';
import {
  getFreemiumStrategy,
  setPremiumPersistent,
  clearPremiumPersistent,
  consumeFreeProUseIfNeeded,
  getFreeProRemainingUses,
  getFreeProUsageCount,
  getFreeProUsageLimit,
} from '../services/accessTier.js';
import { getCurrentUser, registerLocalUser, clearLocalUser } from '../services/localAuth.js';

function getLang() {
  try {
    return localStorage.getItem('mdr-home-lang') === 'en' ? 'en' : 'es';
  } catch (_) {
    return 'es';
  }
}

function getPaywallTx(lang, freeLabel, lockedLabel, freeHref) {
  if (lang === 'en') {
    return {
      title: 'Pro Module',
      lead: `The <strong>${lockedLabel}</strong> simulator is part of the <strong>paid plan</strong>. In the free version you can use the <strong>${freeLabel}</strong> model with the same level of detail (results, report, and gearmotors).`,
      freeCalc: `Access free calculator: <a href="${freeHref}">${freeHref}</a>`,
      backHome: 'Back to <a href="index.html">home</a> to view all systems',
      tryPro: 'Use <span class="paywall-screen__code">?pro=1</span> in the URL to simulate a Pro user only in this browser session',
      goFree: `Go to free calculator (${freeLabel})`,
      home: 'Home',
      demoTitle: 'Local demo (no real payment)',
      demoText: 'Use this to test the Pro experience before integrating Stripe or another payment provider.',
      activate: 'Activate Pro (persistent demo)',
      backToFree: 'Back to free plan',
      lockedFlat: 'flat conveyor',
      lockedInclined: 'inclined conveyor',
    };
  }
  return {
    title: 'M\u00f3dulo Pro',
    lead: `El simulador de <strong>${lockedLabel}</strong> forma parte del <strong>plan de pago</strong>. En la versi\u00f3n gratuita puede usar el modelo de <strong>${freeLabel}</strong> con el mismo nivel de detalle (resultados, informe y motorreductores).`,
    freeCalc: `Acceda al calculador gratuito: <a href="${freeHref}">${freeHref}</a>`,
    backHome: 'Vuelva al <a href="index.html">inicio</a> para ver todos los sistemas',
    tryPro: 'Pruebe con <span class="paywall-screen__code">?pro=1</span> en la URL para simular un usuario Pro solo en esta sesi\u00f3n del navegador',
    goFree: `Ir al calculador gratuito (${freeLabel})`,
    home: 'Inicio',
    demoTitle: 'Demostraci\u00f3n local (sin pago real)',
    demoText: 'Use esto para probar la experiencia Pro antes de integrar Stripe u otro cobro.',
    activate: 'Activar Pro (demo persistente)',
    backToFree: 'Volver a plan gratuito',
    lockedFlat: 'cinta plana',
    lockedInclined: 'cinta inclinada',
  };
}

/**
 * @param {'flat'|'inclined'} lockedTool — módulo de esta página (bloqueado para el visitante actual).
 */
export function mountPaywall(lockedTool) {
  const lang = getLang();
  const free = getFreemiumStrategy();
  const txBase = getPaywallTx(lang, '', '', '');
  const freeLabel = free === 'flat' ? txBase.lockedFlat : txBase.lockedInclined;
  const lockedLabel = lockedTool === 'flat' ? txBase.lockedFlat : txBase.lockedInclined;
  const freeHref = free === 'flat' ? 'flat-conveyor.html' : 'inclined-conveyor.html';
  const tx = getPaywallTx(lang, freeLabel, lockedLabel, freeHref);

  const wrap = document.createElement('div');
  wrap.className = 'paywall-screen';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-labelledby', 'paywall-title');
  wrap.innerHTML = `
    <div class="paywall-screen__card">
      <p class="paywall-screen__eyebrow">MechAssist</p>
      <h1 id="paywall-title" class="paywall-screen__title">${tx.title}</h1>
      <p class="paywall-screen__lead">${tx.lead}</p>
      <ul class="paywall-screen__list">
        <li>${tx.freeCalc}</li>
        <li>${tx.backHome}</li>
        <li>${tx.tryPro}</li>
      </ul>
      <div class="paywall-screen__actions">
        <a class="button button--primary" href="${freeHref}">${tx.goFree}</a>
        <a class="button button--ghost" href="index.html">${tx.home}</a>
      </div>
      <div class="paywall-screen__demo">
        <p class="paywall-screen__demo-title">${tx.demoTitle}</p>
        <p class="paywall-screen__demo-text">${tx.demoText}</p>
        <div class="paywall-screen__demo-row">
          <button type="button" class="button button--accent" data-paywall-activate>${tx.activate}</button>
          <button type="button" class="button button--ghost" data-paywall-clear>${tx.backToFree}</button>
        </div>
      </div>
    </div>
  `;

  const header = document.querySelector('.app-header');
  if (header) {
    header.insertAdjacentElement('afterend', wrap);
  } else {
    document.body.prepend(wrap);
  }

  const main = document.querySelector('.app-main');
  if (main) {
    main.hidden = true;
    main.setAttribute('aria-hidden', 'true');
  }

  wrap.querySelector('[data-paywall-activate]')?.addEventListener('click', () => {
    setPremiumPersistent();
    window.location.reload();
  });
  wrap.querySelector('[data-paywall-clear]')?.addEventListener('click', () => {
    clearPremiumPersistent();
    window.location.reload();
  });
}

/**
 * Barra discreta: accesos rápidos solicitados por el usuario.
 */
export function mountTierStatusBar() {
  if (!FEATURES.showTierSwitcherInDev) return;

  const header = document.querySelector('.app-header, .lab-header');
  if (!header) return;
  if (header.querySelector(':scope > .tier-status-bar')) return;
  consumeFreeProUseIfNeeded();
  const user = getCurrentUser();
  const lang = getLang();
  const remaining = getFreeProRemainingUses();
  const used = getFreeProUsageCount();
  const limit = getFreeProUsageLimit();
  const TX = lang === 'en'
    ? {
        activatePro: 'Activate Pro',
        register: user ? `Account: ${user.name}` : 'Register',
        freeUses: remaining > 0 ? `Pro uses: ${remaining}/${limit}` : `Pro uses exhausted (${used}/${limit})`,
        logoutAsk: 'Log out this local account?',
        fullName: 'Full name',
        email: 'Email',
        password: 'Password (min. 6 chars)',
        registerOk: 'Local registration completed (demo).',
      }
    : {
        activatePro: 'Activar versión Pro',
        register: user ? `Cuenta: ${user.name}` : 'Registrarse',
        freeUses: remaining > 0 ? `Usos Pro: ${remaining}/${limit}` : `Usos Pro agotados (${used}/${limit})`,
        logoutAsk: '¿Cerrar sesión local de esta cuenta?',
        fullName: 'Nombre completo',
        email: 'Email',
        password: 'Contraseña (mín. 6 caracteres)',
        registerOk: 'Registro completado en modo local (demo).',
      };

  const bar = document.createElement('div');
  bar.className = 'tier-status-bar';
  bar.innerHTML = `
    <span class="tier-status-bar__links">
      <a href="?pro=1" data-tier-activate-pro>${TX.activatePro}</a>
      <span aria-hidden="true">·</span>
      <a href="#" data-tier-register>${TX.register}</a>
      <span aria-hidden="true">·</span>
      <a href="#" data-tier-lang="es">ES</a>
      <span aria-hidden="true">/</span>
      <a href="#" data-tier-lang="en">EN</a>
      <span aria-hidden="true">·</span>
      <span title="${lang === 'en' ? 'Free Pro uses' : 'Usos Pro gratis'}">${TX.freeUses}</span>
    </span>
  `;
  bar.querySelector('[data-tier-activate-pro]')?.addEventListener('click', () => {
    setPremiumPersistent();
  });
  bar.querySelector('[data-tier-register]')?.addEventListener('click', (ev) => {
    ev.preventDefault();
    if (getCurrentUser()) {
      if (window.confirm(TX.logoutAsk)) {
        clearLocalUser();
        window.location.reload();
      }
      return;
    }
    const name = window.prompt(TX.fullName);
    if (!name) return;
    const email = window.prompt(TX.email);
    if (!email) return;
    const password = window.prompt(TX.password);
    if (!password) return;
    try {
      registerLocalUser({ name, email, password });
      window.alert(TX.registerOk);
      window.location.reload();
    } catch (e) {
      window.alert(String(e?.message || e));
    }
  });
  bar.querySelectorAll('[data-tier-lang]').forEach((a) => {
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      const l = a.getAttribute('data-tier-lang');
      try {
        localStorage.setItem('mdr-home-lang', l === 'en' ? 'en' : 'es');
      } catch (_) {
        /* ignore */
      }
      window.location.reload();
    });
  });
  header.appendChild(bar);
}
