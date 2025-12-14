// PHASE 8.1 — GOVERNANCE UI ONLY
// This interface approves ExecutionIntents.
// It NEVER executes or triggers automation.

import React from "react";
import { ApprovalDetail } from "../ApprovalDetail";
import { TenantAppShell } from "@/components/shell/tenant-app-shell";

export default function ApprovalDetailPage() {
  return (
    <TenantAppShell>
      <ApprovalDetail />
    </TenantAppShell>
  );
}
