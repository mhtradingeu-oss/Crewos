import { PageHeader } from '@/components/shell/PageHeader.tsx';
import { PageLayout } from '@/components/shell/PageLayout.tsx';
import { AIStatusCard, ReadinessPanel, GovernanceSummary } from '@/components/ai-hq/index.ts';

export default function AIHQPage() {
  const systems = [
    {
      name: 'AI Brain',
      status: 'Active',
      statusVariant: 'success',
      approval: 'approved',
      risk: 'low',
      riskExplanation: 'No current issues.',
      description: 'Core intelligence and orchestration layer.',
    },
    {
      name: 'Decision Engine',
      status: 'Monitoring',
      statusVariant: 'info',
      approval: 'pending',
      risk: 'medium',
      riskExplanation: 'Pending governance review.',
      description: 'Automated decision-making and policy enforcement.',
    },
    {
      name: 'Safety Firewall',
      status: 'Active',
      statusVariant: 'success',
      approval: 'approved',
      risk: 'low',
      riskExplanation: 'All safety checks passed.',
      description: 'Guards against unsafe or unauthorized actions.',
    },
    {
      name: 'Monitoring',
      status: 'Active',
      statusVariant: 'success',
      approval: 'approved',
      risk: 'low',
      riskExplanation: 'No anomalies detected.',
      description: 'Continuous oversight and anomaly detection.',
    },
    {
      name: 'Learning Loop',
      status: 'Disabled',
      statusVariant: 'warning',
      approval: 'rejected',
      risk: 'high',
      riskExplanation: 'Learning is disabled in V1.',
      description: 'Self-improvement and retraining system.',
    },
  ];

  return (
    <PageLayout footer={<span>MH-OS SUPERAPP v1.0.0 &mdash; Governance enforced</span>}>
      <PageHeader
        title="AI HQ"
        description="Central overview of AI systems and governance"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {systems.map((system) => (
          <AIStatusCard key={system.name} system={system} />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ReadinessPanel />
        <GovernanceSummary />
      </div>
    </PageLayout>
  );
}
