import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/shell/filter-bar";
import { ModulePageLayout, type TableRow } from "@/components/shell/module-page";

const columns = ["Automation", "Trigger", "Status", "Owner", "Next Run"];
const rows: TableRow[] = [
  ["Inventory Refill", "Low stock", "Healthy", "Inventory", "Scheduled"],
  ["Pricing safe mode", "Margin shift", "Queued", "Pricing", "Review"],
  ["CRM nurture", "Lead stage", "Running", "CRM", "1m"],
  ["Stand refill", "POS alert", "Paused", "Field", "Approve"],
];

export default function AdminAutomationsPage() {
  return (
    <ModulePageLayout
      title="Automations & Rules"
      description="Library of automation rules with run history and guardrails."
      actions={<Button variant="outline">New automation</Button>}
      kpis={[
        { title: "Active rules", value: "63", hint: "Across planes" },
        { title: "Avg runtime", value: "32s", hint: "Healthy" },
        { title: "Backlog", value: "8", hint: "Needs review" },
      ]}
      table={{
        title: "Rule catalog",
        description: "Each automation can be triaged or paused from here.",
        columns,
        rows,
        filters: (
          <FilterBar>
            <Button variant="ghost" size="sm">
              Status: Running
            </Button>
            <Button variant="ghost" size="sm">
              Plane: Field
            </Button>
            <Button variant="ghost" size="sm">
              Guardrail: Medium
            </Button>
          </FilterBar>
        ),
      }}
      aiInsights={{
        items: [
          "AI suggests batching Field refill and Inventory actions.",
          "Recommend pausing CRM nurture rule with 0.2% conversion drop.",
          "Automation queue is stable, no retries pending.",
        ],
      }}
    />
  );
}
