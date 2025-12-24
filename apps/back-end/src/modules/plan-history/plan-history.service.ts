import { unauthorized } from "../../core/http/errors.js";
import { PlanHistoryRepository } from "../../core/db/repositories/plan-history.repository.js";

  return PlanHistoryRepository.listPlanHistory(userId, unauthorized);
}

export const planHistoryService = { listPlanHistory };
