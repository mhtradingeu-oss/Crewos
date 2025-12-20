import type { AutomationAuditSink, AutomationAuditEnvelope } from "@mh-os/shared";

export class NoopAutomationAuditSink implements AutomationAuditSink {
  async capture(_envelope: AutomationAuditEnvelope): Promise<void> {
    // noop
  }
}
