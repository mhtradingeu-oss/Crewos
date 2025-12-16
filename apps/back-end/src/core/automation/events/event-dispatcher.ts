import { AutomationEvent } from './event-types.js';
import { RuleMatcher } from '../matcher/rule-matcher.js';
import { AutomationRuntime } from '../runtime/automation-runtime.js';
import { AutomationRuntimeResult } from '../runtime/types.js';

export class EventDispatcher {
  constructor(
    private readonly matcher: RuleMatcher,
    private readonly runtime: AutomationRuntime
  ) {}

 async dispatch(
    event: AutomationEvent
  ): Promise<AutomationRuntimeResult> {
    const matchedRules = await this.matcher.match(event);

    // Convert occurredAt to string if it's a Date
    const normalizedEvent = {
      ...event,
      occurredAt: typeof event.occurredAt === 'string'
        ? event.occurredAt
        : event.occurredAt.toISOString(),
    };

    return this.runtime.run(normalizedEvent, matchedRules);
  }
}
