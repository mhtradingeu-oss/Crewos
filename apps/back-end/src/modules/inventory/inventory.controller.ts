import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../core/security/rbac.js";
import { badRequest } from "../../core/http/errors.js";
import { respondWithSuccess } from "../../core/http/respond.js";
import { inventoryService } from "./inventory.service.js";
import type { InventoryAdjustInput, InventoryGetStockQuery } from "@mh-os/shared";

export async function getStock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.tenantId;
    if (!companyId) {
      return next(badRequest("Missing company context"));
    }
    const query = req.query as InventoryGetStockQuery;
    const payload = await inventoryService.getStockSnapshot(companyId, query.brandId, query.productIds);
    respondWithSuccess(res, payload);
  } catch (err) {
    next(err);
  }
}

export async function adjustStock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user?.id || !user?.tenantId) {
      return next(badRequest("Missing company context"));
    }
    const body = req.body as InventoryAdjustInput;
    const result = await inventoryService.adjustStock(
      { ...body, companyId: user.tenantId },
      user.id,
    );
    respondWithSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
}
