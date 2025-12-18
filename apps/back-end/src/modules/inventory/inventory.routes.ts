import { Router } from "express";
import * as controller from "./inventory.controller.js";
import { requireRole } from "../../core/security/auth-middleware.js";
import { validateBody, validateQuery } from "../../core/http/middleware/validate.js";
import { inventoryAdjustInputSchema, inventoryGetStockQuerySchema } from "./inventory.validators.js";

const router = Router();

router.get("/stock", validateQuery(inventoryGetStockQuerySchema), controller.getStock);
router.post(
  "/adjust",
  requireRole("ADMIN", "SUPER_ADMIN", "SYSTEM"),
  validateBody(inventoryAdjustInputSchema),
  controller.adjustStock,
);

export { router };
