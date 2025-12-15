import { AIStatusCard } from "@/components/ai/AIStatusCard";
import { ReadinessPanel } from "@/components/ai/ReadinessPanel";
import { GovernanceSummary } from "@/components/ai/GovernanceSummary";
import { Card } from "@/components/ui/card";

function PageHeader() {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight">AI HQ</h1>
      <p className="text-muted-foreground mt-1">Central overview of AI systems and governance</p>
    </div>
  );
}

const aiSystems = [
  {
    title: "AI Brain",
    status: "Active",
    governance: "Board Approved",
    description: "Core intelligence engine orchestrating all AI operations.",
  },
  {
    title: "Decision Engine",
    status: "Monitoring",
    governance: "Policy Board",
    description: "Automates and validates key business decisions.",
  },
  {
    title: "Safety Firewall",
    status: "Active",
    governance: "Security",
    description: "Guards against unsafe or non-compliant actions.",
  },
  {
    title: "Monitoring",
    status: "Active",
    governance: "Audit",
    description: "Continuous oversight of AI activity and health.",
  },
  {
    title: "Learning Loop",
    status: "Disabled",
    governance: "Compliance",
    description: "Self-improving feedback and retraining system.",
  },
];

export default function AIHQPage() {
  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <PageHeader />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {aiSystems.map((sys) => (
            <AIStatusCard key={sys.title} {...sys} />
          ))}
        </div>
        <div className="md:col-span-1">
          <ReadinessPanel />
        </div>
      </div>
      <GovernanceSummary />
    </div>
  );
}
