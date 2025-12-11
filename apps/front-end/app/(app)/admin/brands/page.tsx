import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/shell/filter-bar";
import { ModulePageLayout, type TableRow } from "@/components/shell/module-page";

const columns = ["Brand", "Region", "Status", "AI Policy", "Owner"];
const rows: TableRow[] = [
  ["HAIROTICMEN", "Global", "Live", "Precision Tone", "Nora"],
  ["ORBIT PHASE", "EMEA", "Pilot", "Orbit Guard", "Ravi"],
  ["NOVA STACK", "APAC", "Live", "Loyalty Rules", "Maya"],
  ["STAND TIES", "Americas", "Staging", "Stand AI", "Adri"],
];

export default function AdminBrandsPage() {
  return (
    <ModulePageLayout
      title="Brands & Tenants"
      description="Central catalog for every tenant, AI profile, and automation bundle."
      actions={<Button variant="outline">Create tenant</Button>}
      kpis={[
        { title: "Live brands", value: "8", hint: "Scoped" },
        { title: "AI configs", value: "72", hint: "Mapped" },
        { title: "Automation templates", value: "14", hint: "Curated" },
      ]}
      table={{
        title: "Tenant snapshots",
        description: "Track readiness, guardrails, and AI settings by brand.",
        columns,
        rows,
        filters: (
          <FilterBar>
            <Button variant="ghost" size="sm">
              Status: Live
            </Button>
            <Button variant="ghost" size="sm">
              Region: Global
            </Button>
            <Button variant="ghost" size="sm">
              Automation set
            </Button>
          </FilterBar>
        ),
      }}
      aiInsights={{
        items: [
          "AI suggests refining loyalty tiers for NOVA STACK before launch.",
          "Recommend guardrail review for STAND TIES staging ops.",
          "Highlight formatting of AI narratives per region.",
        ],
      }}
    />
  );
}
