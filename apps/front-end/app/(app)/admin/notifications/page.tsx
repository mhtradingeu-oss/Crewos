import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/shell/filter-bar";
import { ModulePageLayout, type TableRow } from "@/components/shell/module-page";

const columns = ["Alert", "Plane", "Severity", "Status", "Owner"];
const rows: TableRow[] = [
  ["Inventory Reorder", "Commerce", "Medium", "Queued", "Supply Ops"],
  ["Automation Failure", "Automations", "High", "Retrying", "Automation"],
  ["AI Guardrail", "AI HQ", "Medium", "Acknowledged", "Security"],
  ["Platform health", "Ops", "Low", "Monitored", "Infra"],
];

export default function AdminNotificationsPage() {
  return (
    <ModulePageLayout
      title="Notifications & Activity"
      description="Inbox for alerts, activities, and multi-plane signals."
      meta="Filters stay in sync with Automations and Ops"
      kpis={[
        { title: "Live alerts", value: "42", hint: "24h" },
        { title: "Resolved", value: "28", hint: "Queued" },
        { title: "Escalations", value: "4", hint: "Needs review" },
      ]}
      table={{
        title: "Alert stream",
        description: "Each notification links back to the responsible plane.",
        columns,
        rows,
        filters: (
          <FilterBar>
            <Button variant="ghost" size="sm">
              Severity: High
            </Button>
            <Button variant="ghost" size="sm">
              Plane: Ops
            </Button>
          </FilterBar>
        ),
      }}
      aiInsights={{
        items: [
          "AI suggests bundling 5 alerts into a single Ops checklist.",
          "Recommend routing automation errors to Platform Ops once per hour.",
          "Notify CRM when loyalty tiers drift beyond thresholds.",
        ],
      }}
    />
  );
}
