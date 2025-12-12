import { Router } from "express";
import { validateBody } from "../../core/http/middleware/validate.js";
import { authenticateRequest } from "../../core/security/auth-middleware.js";
import { requirePermission } from "../../core/security/rbac.js";
import { forgotPasswordSchema, loginSchema, registerSchema } from "./auth.validators.js";
import {
  loginHandler,
  logoutHandler,
  meHandler,
  registerHandler,
  requestPasswordResetHandler,
  csrfTokenHandler,
} from "./auth.controller.js";

const router = Router();

router.get("/csrf", csrfTokenHandler);
router.post("/register", validateBody(registerSchema), registerHandler);
router.post("/login", validateBody(loginSchema), loginHandler);
router.post("/logout", logoutHandler);
router.post("/password/forgot", validateBody(forgotPasswordSchema), requestPasswordResetHandler);
router.get("/me", authenticateRequest, requirePermission("auth:me"), meHandler);

export default router;
