// PHASE 8.1 — GOVERNANCE UI ONLY
// This interface approves ExecutionIntents.
// It NEVER executes or triggers automation.

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useRouter, useParams } from "next/navigation";

// Types for ExecutionIntent detail (minimal, for UI)
type ApprovalHistory = { timestamp: string; userId: string; status: string; reason?: string }[];
type ExecutionIntentDetail = {
  intentId: string;
  scope: string;
  riskLevel: string;
  decisionId: string;
  createdAt: string;
  approval: { status: "PENDING" | "APPROVED" | "REJECTED"; history: ApprovalHistory };
  decision: {
    decisionId: string;
    scope: string;
    intent: string;
    primaryAgent: string;
    rationale: string;
  };
  plan: {
    kind: string;
    summary: string;
    steps: string[];
    constraints: { label: string; value: string }[];
  };
  governance: {
    riskLevel: string;
    safety: { reasons: string[] };
    policyRefs?: string[];
  };
};

export function ApprovalDetail() {
  const { hasPermission, user } = useAuth();
  const canApprove = hasPermission("ai.execution.approve");
  const params = useParams();
  const intentId = params?.intentId as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState<"approve"|"reject"|null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<ExecutionIntentDetail>({
    queryKey: ["execution-intent", intentId],
    queryFn: async () => {
      const res = await api.get(`/ai/execution-intents/${intentId}`);
      return res.data as ExecutionIntentDetail;
    },
    enabled: !!intentId,
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/ai/execution-intents/${intentId}/approve`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["execution-intent", intentId]);
      setShowModal(null);
      setReason("");
      setError(null);
    },
    onError: (err: any) => setError(err.message || "Failed to approve."),
  });
  const rejectMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/ai/execution-intents/${intentId}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["execution-intent", intentId]);
      setShowModal(null);
      setReason("");
      setError(null);
    },
    onError: (err: any) => setError(err.message || "Failed to reject."),
  });

  if (isLoading || !data) return <div>Loading...</div>;

  const { decision, plan, governance, approval, createdAt } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold">Execution Intent Detail</h1>
        <span className="badge badge-warning">Phase 8.1 — Governance Only</span>
      </div>
      <div className="rounded-xl bg-yellow-100/80 p-3 text-yellow-900 font-semibold border border-yellow-300">
        EXECUTION DISABLED — Approval does NOT execute. Execution is disabled by design.
      </div>
      {/* Decision Summary */}
      <div className="rounded-xl border bg-white/5 p-4">
        <h2 className="font-semibold text-lg mb-2">Decision Summary</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><b>Decision ID:</b> {decision.decisionId}</div>
          <div><b>Scope:</b> {decision.scope}</div>
          <div><b>Intent:</b> {decision.intent}</div>
          <div><b>Primary Agent:</b> {decision.primaryAgent}</div>
          <div className="col-span-2"><b>Rationale:</b> {decision.rationale}</div>
        </div>
      </div>
      {/* Execution Intent */}
      <div className="rounded-xl border bg-white/5 p-4">
        <h2 className="font-semibold text-lg mb-2">Execution Intent</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><b>Plan Kind:</b> {plan.kind}</div>
          <div><b>Plan Summary:</b> {plan.summary}</div>
          <div className="col-span-2"><b>Steps:</b> <ul className="list-disc ml-6">{plan.steps.map((s,i) => <li key={i}>{s}</li>)}</ul></div>
          <div className="col-span-2"><b>Constraints:</b> <ul className="list-disc ml-6">{plan.constraints.map((c,i) => <li key={i}><input type="text" value={c.value} disabled className="bg-slate-200 text-slate-500 px-2 py-1 rounded" /></li>)}</ul></div>
        </div>
      </div>
      {/* Governance */}
      <div className="rounded-xl border bg-white/5 p-4">
        <h2 className="font-semibold text-lg mb-2">Governance</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><b>Risk Level:</b> {governance.riskLevel}</div>
          <div><b>Safety Reasons:</b> <ul className="list-disc ml-6">{governance.safety.reasons.map((r,i) => <li key={i}>{r}</li>)}</ul></div>
          {governance.policyRefs && governance.policyRefs.length > 0 && (
            <div className="col-span-2"><b>Policy Refs:</b> {governance.policyRefs.join(", ")}</div>
          )}
        </div>
      </div>
      {/* Audit Trail */}
      <div className="rounded-xl border bg-white/5 p-4">
        <h2 className="font-semibold text-lg mb-2">Audit Trail</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><b>Created At:</b> {new Date(createdAt).toLocaleString()}</div>
          <div className="col-span-2"><b>Approval History:</b>
            <ul className="list-disc ml-6">
              {approval.history.map((h,i) => <li key={i}>{h.status} by {h.userId} at {new Date(h.timestamp).toLocaleString()} {h.reason && `— ${h.reason}`}</li>)}
            </ul>
          </div>
        </div>
      </div>
      {/* Approval Actions */}
      <div className="flex gap-4 mt-4">
        <button
          className="btn btn-success"
          disabled={!canApprove || approval.status !== "PENDING"}
          onClick={() => setShowModal("approve")}
        >
          Approve
        </button>
        <button
          className="btn btn-danger"
          disabled={!canApprove || approval.status !== "PENDING"}
          onClick={() => setShowModal("reject")}
        >
          Reject
        </button>
      </div>
      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
            <h3 className="font-bold text-lg mb-2">Confirm {showModal === "approve" ? "Approval" : "Rejection"}</h3>
            <p className="mb-2">Please provide a reason (min 10 characters):</p>
            <textarea
              className="w-full border rounded p-2 mb-2"
              value={reason}
              onChange={e => setReason(e.target.value)}
              minLength={10}
              rows={3}
              disabled={approveMutation.isLoading || rejectMutation.isLoading}
            />
            {error && <div className="text-red-500 mb-2">{error}</div>}
            <div className="flex gap-2 justify-end">
              <button className="btn btn-secondary" onClick={() => { setShowModal(null); setReason(""); setError(null); }}>
                Cancel
              </button>
              <button
                className="btn btn-success"
                disabled={reason.length < 10 || approveMutation.isLoading || rejectMutation.isLoading}
                onClick={() => showModal === "approve" ? approveMutation.mutate() : rejectMutation.mutate()}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
