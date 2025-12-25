
import { AISuggestionRepository } from '../../db/repositories/ai-suggestions.repository.js';
import { mapSuggestionToExecutionPlan } from './automation-plan-mapper.js';
import { runAutomationPlan } from '../engine/automation-engine.js';
import { emitEvent } from '../../events/event-bus.js';


export async function executeApprovedSuggestion(
  suggestionId: string,
  actorUserId?: string,
  repo?: AISuggestionRepository
) {
  const repository = repo || new AISuggestionRepository();
  const suggestion = await repository.getSuggestionById(suggestionId);
  if (!suggestion) return { status: 'not_found' };
  if (suggestion.status !== 'approved') return { status: 'not_approved' };
  if (suggestion.executedAt) return { status: 'already_executed' };

  const plan = mapSuggestionToExecutionPlan(suggestion);
  const correlationId = suggestion.correlationId || `exec-${suggestionId}-${Date.now()}`;
  let output, error;

  try {
    output = await runAutomationPlan(plan, { actorUserId, correlationId });
    await repository.markSuggestionExecuted(suggestionId, output);
    await emitEvent('ai.suggestion.executed', { suggestionId, actorUserId, output, correlationId });
    await repository.appendAuditLog({
      type: 'ai.suggestion.executed',
      suggestionId,
      actorUserId,
      input: suggestion,
      output,
      correlationId,
      timestamp: new Date().toISOString(),
    });
    return { status: 'executed', output };
  } catch (err: any) {
    error = err?.message || 'Unknown error';
    await repository.markSuggestionFailed(suggestionId, error);
    await emitEvent('ai.suggestion.failed', { suggestionId, actorUserId, error, correlationId });
    await repository.appendAuditLog({
      type: 'ai.suggestion.failed',
      suggestionId,
      actorUserId,
      input: suggestion,
      output: error,
      correlationId,
      timestamp: new Date().toISOString(),
    });
    return { status: 'failed', error };
  }
}
