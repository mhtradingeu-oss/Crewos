import { Router } from "express";
import * as controller from "./automation.controller.js";
import { requirePermission } from "../../core/security/rbac.js";
import { validateBody } from "../../core/http/middleware/validate.js";
import { createAutomationSchema, updateAutomationSchema } from "./automation.validators.js";

const router = Router();

router.get("/", requirePermission("automation:read"), controller.list);
router.get("/:id", requirePermission("automation:read"), controller.getById);
router.post(
  "/",
  requirePermission("automation:create"),
  validateBody(createAutomationSchema),
  controller.create,
);
router.put(
  "/:id",
  requirePermission("automation:update"),
  validateBody(updateAutomationSchema),
  controller.update,
);
router.delete("/:id", requirePermission("automation:delete"), controller.remove);
router.post("/run-scheduled", requirePermission("automation:run"), controller.runScheduled);
router.post("/:id/run", requirePermission("automation:run"), controller.runNow);

export { router };
