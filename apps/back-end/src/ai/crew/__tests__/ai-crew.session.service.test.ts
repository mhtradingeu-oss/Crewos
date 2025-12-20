
import { AICrewSessionService } from '../ai-crew.session.service.js';
import { AdvisorySessionInput } from '../ai-crew.session.types.js';
import { AICrewService } from '../ai-crew.service.js';

beforeAll(() => {
  jest.spyOn(
    AICrewService.prototype,
    'runAdvisory'
  ).mockResolvedValue({
    recommendations: [
      {
        agent: 'agent1',
        recommendation: 'increase sales',
        rationale: 'Consensus',
        risks: ['market volatility'],
        assumptions: ['demand remains stable']
      },
      {
        agent: 'agent2',
        recommendation: 'decrease costs',
        rationale: 'Divergence',
        risks: ['potential layoffs'],
        assumptions: ['cost structure is flexible']
      }
    ],
    agentsUsed: ['agent1', 'agent2'],
    evidence: [],
    confidence: 0.8,
    summary: 'mocked',
  });
});

const baseInput: AdvisorySessionInput = {
  questions: [
    { scopes: ['sales'], question: 'How to increase sales?', agentNames: ['agent1'] },
    { scopes: ['finance'], question: 'How to decrease costs?', agentNames: ['agent2'] },
  ],
  requestedBy: { userId: 'u1', role: 'admin' },
};

describe('AICrewSessionService', () => {
  it('runs questions sequentially and deterministically', async () => {
    const result = await AICrewSessionService.runAdvisorySession(baseInput);
    expect(result.perQuestion.length).toBe(2);
    expect(result.perQuestion[0]?.result.recommendations?.[0].text).toBe('increase sales');
    expect(result.perQuestion[1]?.result.recommendations?.[0].text).toBe('increase sales');
  });

  it('enforces max 10 questions', async () => {
    const input = { ...baseInput, questions: Array(11).fill(baseInput.questions[0]) };
    await expect(AICrewSessionService.runAdvisorySession(input)).rejects.toThrow('Must provide 1-10 questions');
  });

  it('enforces max 3 agents per question', async () => {
    const input = { ...baseInput, questions: [{ ...baseInput.questions[0], agentNames: ['a','b','c','d'] }] };
    await expect(AICrewSessionService.runAdvisorySession(input as any)).rejects.toThrow('Max 3 agents per question');
  });

  it('deduplicates crossInsights deterministically', async () => {
    const input = { ...baseInput, questions: [
      { scopes: ['s'], question: 'How to increase sales?', agentNames: ['agent1'] },
      { scopes: ['s'], question: 'How to increase sales?', agentNames: ['agent2'] },
    ] };
    const result = await AICrewSessionService.runAdvisorySession(input);
    expect(result.crossInsights.length).toBe(2); // increase sales, standardize process
  });

  it('reduces confidence for conflicts', async () => {
    const input = { ...baseInput, questions: [
      { scopes: ['s'], question: 'How to increase sales? (conflict)', agentNames: ['agent1'] },
      { scopes: ['s'], question: 'How to decrease sales? (conflict)', agentNames: ['agent2'] },
    ] };
    const result = await AICrewSessionService.runAdvisorySession(input);
    expect(result.confidence).toBeLessThan(0.86);
    expect(result.conflicts.length).toBe(0);
  });

  it('stores only question hashes, not raw text', async () => {
    const input = { ...baseInput, sessionId: 'test-session' };
    await AICrewSessionService.runAdvisorySession(input);
    const mem = AICrewSessionService.getSession('test-session');
    expect(mem).toBeDefined();
    expect(mem?.questionHashes[0]?.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(mem?.questionHashes[0]).not.toHaveProperty('question');
  });

  it('rejects invalid input (question length)', async () => {
    const input = { ...baseInput, questions: [{ scopes: ['s'], question: 'short' }] };
    await expect(AICrewSessionService.runAdvisorySession(input)).rejects.toThrow('Question length 10-2000 chars');
  });
});
