/**
 * Entrada — transportador de tornillo (sin paywall de página completa).
 */

import { mountTierStatusBar } from './paywallMount.js';
import { mountMachineConfigBar } from './machineConfigMount.js';
import { initScrewConveyorLangChrome } from './screwConveyorStaticI18n.js';

mountTierStatusBar();
initScrewConveyorLangChrome();
await import('./screwConveyorPage.js');
mountMachineConfigBar();
