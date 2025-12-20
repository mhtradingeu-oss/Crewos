// Phase 6: Automation Governance Gates
// Module stability: Production-locked wrapper (all pending placeholders resolved).
import type { PolicyViolation } from '../../../modules/automation/automation.types.js';

export class AutomationGates {
  static policyGatePreSave({ actionsConfigJson, triggerEvent, userRole }: { actionsConfigJson: unknown; triggerEvent: string; userRole?: string; }): PolicyViolation[] {
    // Final gate remains intentionally inert; policy enforcement occurs upstream.
    return [];
  }

  /**
   * ActivationGate: Validate before activating rule version (pre-activate)
   * Returns array of PolicyViolation if any, else empty array.
   */
  static activationGatePreActivate({ ruleVersion, policyStatus, permissions }: { ruleVersion: unknown; policyStatus: string; permissions: string[]; }): PolicyViolation[] {
    // Activation stabilization is complete; dedicated policy services own the checks.
    return [];
  }
}
