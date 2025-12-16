// Tests for AICrewService.runAdvisory safety invariants
import { AICrewService } from '../ai-crew.service.js';
import { AI_AGENTS_MANIFEST } from '../../schema/ai-agents-manifest.js';

describe('AICrewService.runAdvisory', () => {
  const service = new AICrewService();
  const baseInput = {
    scopes: ['test-scope'],
    question: 'What is the safest advisory action for this scenario?',
    requestedBy: { userId: 'user-1', role: 'admin' },
  };

  it('uses only agentNames if provided (no scope auto-selection)', async () => {
    const agentNames = AI_AGENTS_MANIFEST.slice(0, 2).map((a: any) => a.name);
    const result = await service.runAdvisory({ ...baseInput, agentNames });
    expect(result.agentsUsed).toEqual(agentNames.sort());
  });

  it('enforces max 3 agents', async () => {
    const agentNames = AI_AGENTS_MANIFEST.slice(0, 10).map((a: any) => a.name);
    const result = await service.runAdvisory({ ...baseInput, agentNames });
    expect(result.agentsUsed.length).toBeLessThanOrEqual(3);
  });

  it('skips/flags agents with forbidden actions', async () => {
    // Create a manifest with a forbidden action
    const forbiddenAgent = {
      ...AI_AGENTS_MANIFEST[0],
      name: 'forbidden-agent',
      allowedActions: ['execute', 'analyze'],
    };
    const manifest = [forbiddenAgent, ...AI_AGENTS_MANIFEST.slice(1, 3)];
    (AI_AGENTS_MANIFEST as any).splice(0, manifest.length, ...manifest);
    const result = await service.runAdvisory({ ...baseInput, agentNames: manifest.map(a => a.name) });
    const forbidden = result.evidence.find((e: any) => e.agent === 'forbidden-agent');
    expect(forbidden?.analysis).toMatch(/not permitted/);
  });

  it('context builder failure does not crash runAdvisory', async () => {
    // Simulate a context builder that throws
    const agent = {
      ...AI_AGENTS_MANIFEST[0],
      name: 'ctx-fail-agent',
      allowedActions: ['analyze'],
      inputContexts: [{ name: 'failCtx', builder: 'nonexistentBuilder' }],
    };
    (AI_AGENTS_MANIFEST as any).unshift(agent);
    const result = await service.runAdvisory({ ...baseInput, agentNames: [agent.name] });
    expect(result.evidence[0]?.contextUsed?.[0]).toMatch(/unavailable/);
  });

  it('selects agents deterministically (priority, then name)', async () => {
    const originalManifest = [...AI_AGENTS_MANIFEST];
    try {
      const agents = [
        { ...originalManifest[0], name: 'A', priority: 2, scope: 'test-scope', allowedActions: ['analyze'] },
        { ...originalManifest[1], name: 'B', priority: 1, scope: 'test-scope', allowedActions: ['analyze'] },
        { ...originalManifest[2], name: 'C', priority: 1, scope: 'test-scope', allowedActions: ['analyze'] },
      ];
      (AI_AGENTS_MANIFEST as any).splice(0, 3, ...agents);
      const result = await service.runAdvisory({ ...baseInput, agentNames: undefined, scopes: ['test-scope'] });
      expect(result.agentsUsed).toEqual(['B', 'C', 'A']);
    } finally {
      (AI_AGENTS_MANIFEST as any).splice(0, AI_AGENTS_MANIFEST.length, ...originalManifest);
    }
  });
});
