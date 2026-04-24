import { activateProDemoInBrowser, isPremiumEffective } from '../services/accessTier.js';

const LOCK_HTML = `
  <div class="premium-gate-note">
    <p class="premium-gate-note__title">Contenido Pro</p>
    <p class="premium-gate-note__text">En plan gratuito solo se muestran los datos clave para elegir motorreductor.</p>
    <button type="button" class="button button--primary premium-gate-note__btn" data-premium-upgrade>
      Activar Pro (demo)
    </button>
  </div>
`;

function lockOneDetails(detailsEl) {
  if (!(detailsEl instanceof HTMLDetailsElement)) return;
  if (detailsEl.dataset.premiumGateApplied === '1') return;
  detailsEl.dataset.premiumGateApplied = '1';
  detailsEl.open = false;
  detailsEl.classList.add('premium-gated-details');

  const summary = detailsEl.querySelector('summary');
  if (summary && !summary.querySelector('.premium-gate-badge')) {
    summary.insertAdjacentHTML(
      'beforeend',
      '<span class="premium-gate-badge" aria-label="Contenido Pro">Pro</span>',
    );
  }
  summary?.addEventListener('click', (ev) => {
    ev.preventDefault();
    detailsEl.open = false;
  });
  detailsEl.addEventListener('toggle', () => {
    if (detailsEl.open) detailsEl.open = false;
  });

  const toRemove = [];
  detailsEl.childNodes.forEach((node) => {
    if (node !== summary) toRemove.push(node);
  });
  toRemove.forEach((node) => node.remove());
  detailsEl.insertAdjacentHTML('beforeend', LOCK_HTML);

  detailsEl.querySelector('[data-premium-upgrade]')?.addEventListener('click', () => {
    activateProDemoInBrowser();
  });
}

export function applyMachinePremiumGates(root = document) {
  if (isPremiumEffective()) return;
  root.querySelectorAll('details').forEach((el) => lockOneDetails(el));
}

