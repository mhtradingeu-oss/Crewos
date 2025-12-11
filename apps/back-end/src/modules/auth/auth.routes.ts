import { Router } from "express";
import { validateBody } from "../../core/http/middleware/validate.js";
import { authenticateRequest } from "../../core/security/auth-middleware.js";
import { requirePermission } from "../../core/security/rbac.js";
import { forgotPasswordSchema, loginSchema, registerSchema } from "./auth.validators.js";
import { loginHandler, meHandler, registerHandler, requestPasswordResetHandler } from "./auth.controller.js";

const router = Router();

router.post("/register", validateBody(registerSchema), registerHandler);
router.post("/login", validateBody(loginSchema), loginHandler);
router.post("/password/forgot", validateBody(forgotPasswordSchema), requestPasswordResetHandler);
router.get("/me", authenticateRequest, requirePermission("auth:me"), meHandler);

export default router;
