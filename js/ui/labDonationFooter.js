/**
 * Pie opcional: llamada a donacion en paginas del laboratorio gratuito (no lienzo Pro).
 */

import { FEATURES } from '../config/features.js';

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

export function mountLabDonationFooter() {
  const main = document.querySelector('main.lab-main');
  if (!main || document.getElementById('lab-donation-footer')) return;

  const url = typeof FEATURES.labDonationUrl === 'string' ? FEATURES.labDonationUrl.trim() : '';

  const aside = document.createElement('aside');
  aside.id = 'lab-donation-footer';
  aside.className = 'lab-donate';
  aside.setAttribute('aria-label', 'Apoyar el proyecto MechAssist');

  const cta = url
    ? `<a class="lab-donate__btn lab-btn" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">Invitar a un caf&eacute;</a>`
    : '';

  aside.innerHTML = `
    <div class="lab-donate__inner">
      <p class="lab-donate__kicker">Laboratorio gratuito</p>
      <p class="lab-donate__text">
        Estas herramientas son <strong>gratuitas para la comunidad</strong>.
        El <a href="transmission-canvas.html">lienzo t&eacute;cnico Pro</a> sigue en un plan de pago aparte.
        Si MechAssist le resulta &uacute;til en su trabajo o estudio, puede ayudar con una <strong>donaci&oacute;n voluntaria</strong>
        para mantener servidores, mejoras y nuevas calculadoras.
      </p>
      ${cta ? `<p class="lab-donate__actions">${cta}</p>` : ''}
    </div>
  `;

  main.appendChild(aside);
}

mountLabDonationFooter();
