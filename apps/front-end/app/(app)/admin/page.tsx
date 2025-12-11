"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ModulePageLayout, type TableRow } from "@/components/shell/module-page";
import { FilterBar } from "@/components/shell/filter-bar";
import { SectionCard } from "@/components/shell/section-card";
import { SimpleTable } from "@/components/shell/simple-table";
import { cn } from "@/lib/utils";

type AlertSeverity = "Critical" | "Warning" | "Info";

type PlatformAlert = {
  id: string;
  type: string;
  message: string;
  severity: AlertSeverity;
  createdAt: string;
  plane: string;
  status: "Open" | "Resolved";
};

type ActivityWindow = 1 | 7 | 30;

type AdminActivity = {
  id: string;
  actor: string;
  action: string;
  plane: string;
  window: ActivityWindow;
};

type AiMessage = { id: string; role: "user" | "ai"; message: string };

type AiCrewMember = { name: string; focus: string; insight: string };

const ALERT_FILTERS = ["All", "Critical", "Warning", "Info"] as const;

const INITIAL_ALERTS: PlatformAlert[] = [
  {
    id: "alert-1",
    type: "Security",
    message: "RBAC sync failed for ORBIT PHASE tenant",
    severity: "Critical",
    createdAt: "2m ago",
    plane: "Admin",
    status: "Open",
  },
  {
    id: "alert-2",
    type: "Automation",
    message: "Inventory refill job exceeded SLA",
    severity: "Warning",
    createdAt: "14m ago",
    plane: "Automation",
    status: "Open",
  },
  {
    id: "alert-3",
    type: "Health",
    message: "API heartbeat delayed in APAC",
    severity: "Warning",
    createdAt: "32m ago",
    plane: "Ops",
    status: "Open",
  },
  {
    id: "alert-4",
    type: "Notifications",
    message: "Campaign webhook retried 3 times",
    severity: "Info",
    createdAt: "1h ago",
    plane: "Notifications",
    status: "Open",
  },
];

const ACTIVITY_LOG: AdminActivity[] = [
  { id: "act-1", actor: "Governance AI", action: "Approved new RBAC guardrail", plane: "Admin", window: 1 },
  { id: "act-2", actor: "Security Squad", action: "Validated MFA attempt", plane: "Security", window: 1 },
  { id: "act-3", actor: "Automation", action: "Queued stand refill batch", plane: "Field", window: 7 },
  { id: "act-4", actor: "Ops", action: "Archived stale alerts", plane: "Platform Ops", window: 7 },
  { id: "act-5", actor: "AI Brain", action: "Summarized weekly signals", plane: "AI HQ", window: 30 },
];

const AI_CREW: AiCrewMember[] = [
  { name: "Governance AI", focus: "Policy & RBAC", insight: "Queued 3 policy reviews" },
  { name: "Security AI", focus: "Threat Hunting", insight: "2 anomalies in APAC" },
  { name: "Ops AI", focus: "Platform Health", insight: "Queue depth stable" },
];

const AI_REPLY_TEMPLATES = [
  "Guardrails remain stable; no escalation required.",
  "Scheduling a governance calibration session for Friday.",
  "Security AI suggests auditing new session tokens.",
];

const CONTROL_ACTIONS = [
  {
    id: "scan",
    label: "Scan Alerts for Risks",
    description: "Highlights critical signals discovered by the AI Brain.",
    severity: "Critical" as AlertSeverity,
  },
  {
    id: "governance",
    label: "Suggest Governance Actions",
    description: "Surface policy shifts, RBAC reviews, or approvals.",
    severity: "Warning" as AlertSeverity,
  },
  {
    id: "summarize",
    label: "Summarize Today",
    description: "AI crew composes a summary for the leadership briefing.",
    severity: "Info" as AlertSeverity,
  },
];

const activityWindows = ["Today", "7 Days", "30 Days"] as const;

export default function AdminCommandCenterPage() {
  const [alerts, setAlerts] = useState<PlatformAlert[]>(INITIAL_ALERTS);
  const [alertFilter, setAlertFilter] = useState<typeof ALERT_FILTERS[number]>("All");
  const [activityView, setActivityView] = useState<typeof activityWindows[number]>("Today");
  const [conversation, setConversation] = useState<AiMessage[]>([
    { id: "init-ai", role: "ai", message: "AI Governance crew monitoring 92 policies." },
    { id: "init-user", role: "user", message: "Show me critical alerts." },
    { id: "init-ai-2", role: "ai", message: "Critical telemetry prioritized for Nora Hariri." },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiResponseIndex, setAiResponseIndex] = useState(0);
  const [controlHighlight, setControlHighlight] = useState<string>("Awaiting AI command");

  const filteredAlerts = useMemo(() => {
    if (alertFilter === "All") return alerts;
    return alerts.filter((alert) => alert.severity === alertFilter);
  }, [alertFilter, alerts]);

  const filteredActivity = useMemo(() => {
    const viewDays = activityView === "Today" ? 1 : activityView === "7 Days" ? 7 : 30;
    return ACTIVITY_LOG.filter((item) => item.window <= viewDays);
  }, [activityView]);

  const alertTableRows: TableRow[] = filteredAlerts.map((alert) => [
    alert.type,
    <div key={`${alert.id}-message`} className="space-y-1">
      <p className={cn(alert.status === "Resolved" ? "text-slate-500 line-through" : "text-white")}>
        {alert.message}
      </p>
      <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">{alert.plane}</p>
    </div>,
    <span key={`${alert.id}-severity`} className="text-sm font-semibold text-amber-300">
      {alert.severity}
    </span>,
    alert.createdAt,
    <Button
      key={`${alert.id}-action`}
      size="sm"
      variant={alert.status === "Resolved" ? "outline" : "ghost"}
      disabled={alert.status === "Resolved"}
      onClick={() => markResolved(alert.id)}
    >
      {alert.status === "Resolved" ? "Resolved" : "Mark as Resolved"}
    </Button>,
  ]);

  const activityTableRows: TableRow[] = filteredActivity.map((activity) => {
    const windowLabel = activity.window === 1 ? "Today" : `${activity.window} Days`;
    return [activity.actor, activity.action, activity.plane, windowLabel];
  });

  function markResolved(id: string) {
    setAlerts((prev) => prev.map((alert) => (alert.id === id ? { ...alert, status: "Resolved" } : alert)));
  }

  function handleControlAction(id: string) {
    const action = CONTROL_ACTIONS.find((item) => item.id === id);
    if (!action) return;
    setAlertFilter(action.severity);
    setControlHighlight(action.description);
    const aiReply: string =
      AI_REPLY_TEMPLATES[aiResponseIndex % AI_REPLY_TEMPLATES.length] ?? AI_REPLY_TEMPLATES[0]!;
    setConversation((prev) => [
      ...prev,
      { id: `user-${id}-${prev.length}`, role: "user", message: action.label },
      {
        id: `ai-${id}-${prev.length}`,
        role: "ai",
        message: aiReply,
      },
    ]);
    setAiResponseIndex((prev) => prev + 1);
  }

  function handleAskAi() {
    const trimmed = aiInput.trim();
    if (!trimmed) return;
    const aiReply: string =
      AI_REPLY_TEMPLATES[aiResponseIndex % AI_REPLY_TEMPLATES.length] ??
      AI_REPLY_TEMPLATES[0]!;
    setConversation((prev) => [
      ...prev,
      { id: `user-${prev.length}`, role: "user", message: trimmed },
      {
        id: `ai-${prev.length}`,
        role: "ai",
        message: aiReply,
      },
    ]);
    setAiInput("");
    setAiResponseIndex((prev) => prev + 1);
  }

  const aiControlStrip = (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-3">
      {CONTROL_ACTIONS.map((action) => (
        <Button
          key={action.id}
          variant="ghost"
          size="sm"
          onClick={() => handleControlAction(action.id)}
        >
          {action.label}
        </Button>
      ))}
      <span className="ml-auto text-[0.65rem] uppercase tracking-[0.35em] text-slate-400">
        {controlHighlight}
      </span>
    </div>
  );

  return (
    <>
      <ModulePageLayout
        title="Command Center"
        description="AI-driven governance, telemetry, and platform health summaries for MH-OS."
        meta="Updated moments ago"
        actions={<Button variant="outline">Share snapshot</Button>}
        controlStrip={aiControlStrip}
        kpis={[
          { title: "Total brands", value: "32", hint: "Global + partners" },
          { title: "Active users", value: "4,812", hint: "Live sessions" },
          { title: "Automations", value: "63", hint: "Running" },
          { title: "System health", value: "OK", hint: "Nominal", trend: "Green" },
        ]}
        table={{
          title: "Open platform alerts",
          description: "Severity-driven alerts prioritized by the AI Brain.",
          columns: ["Type", "Message", "Severity", "Created", "Status"],
          rows: alertTableRows,
          filters: (
            <FilterBar>
              {ALERT_FILTERS.map((filter) => (
                <Button
                  key={filter}
                  size="sm"
                  variant={alertFilter === filter ? "secondary" : "ghost"}
                  onClick={() => setAlertFilter(filter)}
                >
                  {filter}
                </Button>
              ))}
            </FilterBar>
          ),
        }}
        aiInsights={{
          title: "AI Governance Crew",
          description: "Governance, security, and operations intelligence ready for review.",
          items: [],
        }}
        aiPanel={
          <AdminAiPanel
            crew={AI_CREW}
            conversation={conversation}
            aiInput={aiInput}
            onAiInputChange={setAiInput}
            onAskAi={handleAskAi}
          />
        }
      />

      <SectionCard
        title="Recent admin activity"
        description="Actions captured across governance, automation, and platform ops."
      >
        <div className="space-y-3">
          <FilterBar>
            {activityWindows.map((window) => (
              <Button
                key={window}
                size="sm"
                variant={activityView === window ? "secondary" : "ghost"}
                onClick={() => setActivityView(window)}
              >
                {window}
              </Button>
            ))}
          </FilterBar>
          <SimpleTable
            columns={["Actor", "Action", "Plane", "Window"]}
            rows={activityTableRows}
          />
        </div>
      </SectionCard>
    </>
  );
}

function AdminAiPanel({
  crew,
  conversation,
  aiInput,
  onAiInputChange,
  onAskAi,
}: {
  crew: AiCrewMember[];
  conversation: AiMessage[];
  aiInput: string;
  onAiInputChange: (value: string) => void;
  onAskAi: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {crew.map((member) => (
          <div
            key={member.name}
            className="space-y-1 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/60 via-slate-900/40 to-slate-900/90 p-4"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{member.name}</p>
            <p className="text-sm font-semibold text-white">{member.focus}</p>
            <p className="text-xs text-slate-400">{member.insight}</p>
          </div>
        ))}
      </div>
      <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">AI Crew Conversation</p>
        <div className="flex flex-col gap-3 max-h-56 overflow-y-auto">
          {conversation.map((entry) => (
            <div
              key={entry.id}
              className={cn(
                "rounded-2xl border border-white/5 p-3 text-sm",
                entry.role === "user"
                  ? "bg-white/10 text-white"
                  : "bg-slate-950/70 text-slate-200",
              )}
            >
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-500">
                {entry.role === "user" ? "You" : "AI"}
              </p>
              <p>{entry.message}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <textarea
            value={aiInput}
            onChange={(event) => onAiInputChange(event.target.value)}
            placeholder="Ask AI about governance guardrails, risk, or automations..."
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 p-3 text-sm text-white placeholder:text-slate-500 focus:border-primary"
            rows={3}
          />
          <div className="flex items-center justify-between">
            <Button size="sm" variant="secondary" onClick={onAskAi}>
              Ask AI
            </Button>
            <p className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">AI Brain · TODO</p>
          </div>
        </div>
      </div>
    </div>
  );
}
