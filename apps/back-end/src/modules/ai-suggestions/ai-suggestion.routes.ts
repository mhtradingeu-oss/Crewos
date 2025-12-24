import { Router } from "express";
import { authenticateRequest } from "../../core/security/auth-middleware.js";
import { listSuggestions, approveSuggestion, rejectSuggestion } from "./ai-suggestion.controller.js";

const router = Router();

router.use(authenticateRequest);

router.get("/", listSuggestions);
router.post("/:id/approve", approveSuggestion);
router.post("/:id/reject", rejectSuggestion);

export default router;
