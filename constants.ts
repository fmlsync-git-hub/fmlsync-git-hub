
import { Company } from './types';
import { SpieIcon } from './components/icons/SpieIcon';
import { ModecIcon } from './components/icons/ModecIcon';
import { DslIcon } from './components/icons/AdlIcon'; // Renamed component, not file
import { BghIcon } from './components/icons/BhgIcon';
import { OtherIcon } from './components/icons/OtherIcon';

export const COMPANIES: Company[] = [
  { id: 'spie', name: 'SPIE', logo: SpieIcon },
  { id: 'dsl', name: 'DSL', logo: DslIcon },
  { id: 'modec', name: 'MODEC', logo: ModecIcon },
  { id: 'bgh', name: 'BGH', logo: BghIcon },
  { id: 'others', name: 'OTHER', logo: OtherIcon },
  // Hidden/Demo Companies for Guest Tutorials - Note: These will not appear in standard lists
  // { id: 'guest-demo', name: 'DSL (Guest)', logo: DslIcon }, 
  // { id: 'guest-demo-spie', name: 'SPIE (Guest)', logo: SpieIcon },
  // { id: 'guest-demo-modec', name: 'MODEC (Guest)', logo: ModecIcon },
];
