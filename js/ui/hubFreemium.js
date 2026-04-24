/**
 * Hub de maquinas: etiqueta de acceso Pro en cada modulo.
 */

import { getCurrentUser, registerLocalUser, clearLocalUser } from '../services/localAuth.js';

function getLang() {
  try {
    return localStorage.getItem('mdr-home-lang') === 'en' ? 'en' : 'es';
  } catch (_) {
    return 'es';
  }
}

function getTx(lang) {
  if (lang === 'en') {
    return {
      badgePro: 'PRO ACCESS',
      hello: (name) => `Hi, ${name}`,
      logout: 'Log out',
      register: 'Register',
      fullName: 'Full name',
      email: 'Email',
      password: 'Password (min. 6 chars)',
      registerOk: 'Local registration completed.',
    };
  }
  return {
    badgePro: 'ACCESO PRO',
    hello: (name) => `Hola, ${name}`,
    logout: 'Cerrar sesi\u00f3n',
    register: 'Registrarse',
    fullName: 'Nombre completo',
    email: 'Email',
    password: 'Contrase\u00f1a (m\u00edn. 6 caracteres)',
    registerOk: 'Registro local completado.',
  };
}

function badgeText() {
  const tx = getTx(getLang());
  if (typeof window.__t === 'function') return window.__t('badgePro');
  return tx.badgePro;
}

function renderHubProBadges() {
  document.querySelectorAll('.hub-rim--machines a.hub-node--go[href]').forEach((a) => {
    let badge = a.querySelector(':scope > .hub-badge.hub-badge--pro');
    if (!(badge instanceof HTMLElement)) {
      badge = document.createElement('span');
      badge.className = 'hub-badge hub-badge--pro';
      a.appendChild(badge);
    }
    badge.textContent = badgeText();
  });
}

renderHubProBadges();
window.addEventListener('home-language-changed', renderHubProBadges);

function mountHomeAccountControls() {
  const right = document.querySelector('.hub-header__right');
  if (!(right instanceof HTMLElement)) return;
  if (right.querySelector('.hub-account')) return;

  const user = getCurrentUser();
  const tx = getTx(getLang());
  const wrap = document.createElement('div');
  wrap.className = 'hub-account';
  wrap.innerHTML = user
    ? `<span class="hub-account__user">${tx.hello(user.name)}</span><button type="button" class="hub-account__btn" data-logout>${tx.logout}</button>`
    : `<button type="button" class="hub-account__btn" data-register>${tx.register}</button>`;

  wrap.querySelector('[data-register]')?.addEventListener('click', () => {
    const name = window.prompt(tx.fullName);
    if (!name) return;
    const email = window.prompt(tx.email);
    if (!email) return;
    const password = window.prompt(tx.password);
    if (!password) return;
    try {
      registerLocalUser({ name, email, password });
      window.alert(tx.registerOk);
      window.location.reload();
    } catch (e) {
      window.alert(String(e?.message || e));
    }
  });

  wrap.querySelector('[data-logout]')?.addEventListener('click', () => {
    clearLocalUser();
    window.location.reload();
  });
  right.appendChild(wrap);
}

mountHomeAccountControls();
