const { executeApprovedSuggestion } = require('../automation-executor.js');

jest.mock('../../../db/repositories/ai-suggestions.repository', () => {
  return {
    AISuggestionRepository: jest.fn().mockImplementation(() => ({
      getSuggestionById: jest.fn(),
      markSuggestionExecuted: jest.fn(),
      markSuggestionFailed: jest.fn(),
      appendAuditLog: jest.fn(),
    })),
  };
});
jest.mock('../automation-plan-mapper', () => ({
  mapSuggestionToExecutionPlan: jest.fn(() => ({ plan: 'mocked' })),
}));
jest.mock('../../../automation/engine/automation-engine', () => ({
  runAutomationPlan: jest.fn(async () => ({ result: 'success' })),
}));
jest.mock('../../../events/event-bus', () => ({
  emitEvent: jest.fn(),
}));

const { AISuggestionRepository } = require('../../../db/repositories/ai-suggestions.repository');
const engine = require('../../../automation/engine/automation-engine');

const repoInstance = new AISuggestionRepository();
const baseSuggestion = {
  id: 's1',
  status: 'approved',
  executedAt: null,
};

describe('executeApprovedSuggestion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns not_found if suggestion missing', async () => {
    repoInstance.getSuggestionById.mockResolvedValue(undefined);
    const res = await executeApprovedSuggestion('bad', undefined, repoInstance);
    expect(res.status).toBe('not_found');
  });

  it('returns not_approved if status not approved', async () => {
    repoInstance.getSuggestionById.mockResolvedValue({ ...baseSuggestion, status: 'pending' });
    const res = await executeApprovedSuggestion('s1', undefined, repoInstance);
    expect(res.status).toBe('not_approved');
  });

  it('returns already_executed if already executed', async () => {
    repoInstance.getSuggestionById.mockResolvedValue({ ...baseSuggestion, executedAt: '2024-01-01T00:00:00Z' });
    const res = await executeApprovedSuggestion('s1', undefined, repoInstance);
    expect(res.status).toBe('already_executed');
  });

  it('executes and marks executed on success', async () => {
    repoInstance.getSuggestionById.mockResolvedValue(baseSuggestion);
    const res = await executeApprovedSuggestion('s1', 'u1', repoInstance);
    expect(res.status).toBe('executed');
    expect(repoInstance.markSuggestionExecuted).toHaveBeenCalledWith('s1', expect.anything());
    expect(repoInstance.appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({ type: 'ai.suggestion.executed' }));
  });

  it('marks failed and logs on error', async () => {
    repoInstance.getSuggestionById.mockResolvedValue(baseSuggestion);
    engine.runAutomationPlan.mockImplementationOnce(() => { throw new Error('fail'); });
    const res = await executeApprovedSuggestion('s1', 'u1', repoInstance);
    expect(res.status).toBe('failed');
    expect(repoInstance.markSuggestionFailed).toHaveBeenCalledWith('s1', 'fail');
    expect(repoInstance.appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({ type: 'ai.suggestion.failed' }));
  });
});
