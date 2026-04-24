/**
 * Entrada — elevador de coches por husillo (2 columnas).
 */

import { mountTierStatusBar } from './paywallMount.js';
import { mountMachineConfigBar } from './machineConfigMount.js';

mountTierStatusBar();
await import('./carLiftScrewPage.js');
mountMachineConfigBar();

