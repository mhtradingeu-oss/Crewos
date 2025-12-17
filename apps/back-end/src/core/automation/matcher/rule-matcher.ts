

import type { AutomationPlan, AutomationEvent } from '@mh-os/shared';

  export function buildPlan(event: AutomationEvent): { event: AutomationEvent; matchedRules: any[] } {
    return {
      event,
      matchedRules: [], // Phase C.2: empty by design
    };
  }

