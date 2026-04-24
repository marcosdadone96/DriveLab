import { mountTierStatusBar } from './paywallMount.js';
import { mountMachineConfigBar } from './machineConfigMount.js';
import { initBucketElevatorLangChrome } from './bucketElevatorStaticI18n.js';

mountTierStatusBar();
initBucketElevatorLangChrome();
await import('./bucketElevatorPage.js');
mountMachineConfigBar();
