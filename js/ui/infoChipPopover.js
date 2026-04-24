/**
 * Ayuda compacta en táctil: al pulsar un .info-chip muestra el texto de title en un globo.
 * El atributo title sigue existiendo para escritorio (hover); lectores usan aria-label.
 */

let activeEl = null;

function removePopover() {
  if (activeEl) {
    const c = activeEl._cleanup;
    if (typeof c === 'function') c();
    activeEl.remove();
    activeEl = null;
  }
}

function positionPopover(bubble, anchor) {
  const rect = anchor.getBoundingClientRect();
  const margin = 8;
  const gap = 6;
  bubble.style.position = 'fixed';
  bubble.style.visibility = 'hidden';
  bubble.style.left = '0';
  bubble.style.top = '0';
  const bw = bubble.offsetWidth;
  const bh = bubble.offsetHeight;
  let left = rect.left + rect.width / 2 - bw / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - bw - margin));
  let top = rect.bottom + gap;
  if (top + bh > window.innerHeight - margin) {
    top = rect.top - bh - gap;
  }
  top = Math.max(margin, top);
  bubble.style.left = `${left}px`;
  bubble.style.top = `${top}px`;
  bubble.style.visibility = '';
}

/**
 * @param {ParentNode} [root]
 */
export function initInfoChipPopovers(root = document.body) {
  if (root.dataset.infoChipPopoverInit === '1') return;
  root.dataset.infoChipPopoverInit = '1';

  root.querySelectorAll('.info-chip').forEach((chip) => {
    if (!chip.hasAttribute('tabindex')) chip.setAttribute('tabindex', '0');
    if (!chip.hasAttribute('role')) chip.setAttribute('role', 'button');
  });

  document.addEventListener(
    'mousedown',
    (e) => {
      const t = /** @type {HTMLElement} */ (e.target);
      if (t.closest('.info-chip') || t.closest('.info-chip-popover')) return;
      removePopover();
    },
    true,
  );

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') removePopover();
  });

  root.addEventListener('click', (e) => {
    const chip = /** @type {HTMLElement | null} */ (e.target)?.closest?.('.info-chip');
    if (!chip || !root.contains(chip)) return;
    if (chip.classList.contains('info-chip--static')) return;
    const text = chip.getAttribute('title') || chip.getAttribute('aria-label') || '';
    if (!text.trim()) return;
    e.preventDefault();
    e.stopPropagation();

    if (activeEl?.dataset.anchorId === chip.dataset.popoverAnchorId && chip.dataset.popoverAnchorId) {
      removePopover();
      return;
    }
    removePopover();
    if (!chip.dataset.popoverAnchorId) chip.dataset.popoverAnchorId = `ic-${Math.random().toString(36).slice(2, 9)}`;

    const bubble = document.createElement('div');
    bubble.className = 'info-chip-popover';
    bubble.setAttribute('role', 'tooltip');
    bubble.dataset.anchorId = chip.dataset.popoverAnchorId;
    bubble.textContent = text;
    document.body.appendChild(bubble);
    activeEl = bubble;
    positionPopover(bubble, chip);

    const onReposition = () => {
      if (document.body.contains(bubble)) positionPopover(bubble, chip);
    };
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    bubble._cleanup = () => {
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  });

  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const chip = /** @type {HTMLElement | null} */ (e.target)?.closest?.('.info-chip');
    if (!chip || !root.contains(chip) || chip.classList.contains('info-chip--static')) return;
    e.preventDefault();
    chip.click();
  });
}
