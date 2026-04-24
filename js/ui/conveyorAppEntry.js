/**
 * Punto de entrada de las páginas de cinta: freemium + carga dinámica del módulo de cálculo.
 */

import { isToolUnlocked } from '../services/accessTier.js';
import { mountPaywall, mountTierStatusBar } from './paywallMount.js';
import { mountMachineConfigBar } from './machineConfigMount.js';

const toolAttr = document.documentElement.getAttribute('data-conveyor-tool');
const tool = toolAttr === 'inclined' ? 'inclined' : 'flat';

mountTierStatusBar();

if (!isToolUnlocked(tool)) {
  mountPaywall(tool);
} else if (tool === 'flat') {
  await import('./flatConveyorPage.js');
  mountMachineConfigBar();
} else {
  await import('./inclinedConveyorPage.js');
  mountMachineConfigBar();
}
