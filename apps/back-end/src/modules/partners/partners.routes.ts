import { Router } from "express";
import * as controller from "./partners.controller.js";
import { requirePermission } from "../../core/security/rbac.js";
import { validateBody } from "../../core/http/middleware/validate.js";
import { requireFeature } from "../../core/http/middleware/plan-gating.js";
import {
  createPartnerSchema,
  createPartnerUserSchema,
  createPartnerContractSchema,
  updatePartnerContractSchema,
  updatePartnerSchema,
  updatePartnerUserSchema,
  upsertPartnerPricingSchema,
  partnerAiInsightSchema,
} from "./partners.validators.js";

const router = Router();

router.get("/", requirePermission("partners:read"), controller.list);
router.get("/:id", requirePermission("partners:read"), controller.getById);
router.get("/:id/stats", requirePermission("partners:read"), controller.stats);

router.get(
  "/:id/contracts",
  requirePermission("partners:read"),
  controller.listContracts,
);
router.get(
  "/:id/contracts/:contractId",
  requirePermission("partners:read"),
  controller.getContract,
);
router.post(
  "/:id/contracts",
  requirePermission("partners:update"),
  validateBody(createPartnerContractSchema),
  controller.createContract,
);
router.patch(
  "/:id/contracts/:contractId",
  requirePermission("partners:update"),
  validateBody(updatePartnerContractSchema),
  controller.updateContract,
);
router.delete(
  "/:id/contracts/:contractId",
  requirePermission("partners:delete"),
  controller.removeContract,
);

router.get("/:id/pricing", requirePermission("partners:read"), controller.listPricing);
router.post(
  "/:id/pricing/upsert",
  requirePermission("partners:update"),
  validateBody(upsertPartnerPricingSchema),
  controller.upsertPricing,
);

router.post(
  "/",
  requirePermission("partners:create"),
  validateBody(createPartnerSchema),
  controller.create,
);
router.put(
  "/:id",
  requirePermission("partners:update"),
  validateBody(updatePartnerSchema),
  controller.update,
);
router.delete("/:id", requirePermission("partners:delete"), controller.remove);

router.get("/:id/users", requirePermission("partners:read"), controller.listUsers);
router.post(
  "/:id/users",
  requirePermission("partners:update"),
  validateBody(createPartnerUserSchema),
  controller.createUser,
);
router.patch(
  "/:id/users/:userId",
  requirePermission("partners:update"),
  validateBody(updatePartnerUserSchema),
  controller.updateUser,
);
router.delete(
  "/:id/users/:userId",
  requirePermission("partners:delete"),
  controller.deactivateUser,
);

router.post(
  "/ai/insights",
  requirePermission("partners:read"),
  requireFeature("partner"),
  validateBody(partnerAiInsightSchema),
  controller.aiInsights,
);

export { router };
