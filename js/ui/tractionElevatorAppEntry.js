import { mountTierStatusBar } from './paywallMount.js';
import { mountMachineConfigBar } from './machineConfigMount.js';

mountTierStatusBar();
await import('./tractionElevatorPage.js');
mountMachineConfigBar();
