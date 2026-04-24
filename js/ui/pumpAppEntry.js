/**
 * Entrada página bomba centrífuga — sin paywall de módulo; bloques Pro dentro del formulario.
 */

import { mountTierStatusBar } from './paywallMount.js';
import { mountMachineConfigBar } from './machineConfigMount.js';

mountTierStatusBar();
await import('./centrifugalPumpPage.js');
mountMachineConfigBar();
