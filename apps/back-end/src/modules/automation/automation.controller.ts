import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../../core/security/rbac.js";
import { badRequest } from "../../core/http/errors.js";
import { requireParam } from "../../core/http/params.js";
import { publishActivity } from "../../core/activity/activity.js";
import { automationService } from "./automation.service.js";
import { createAutomationSchema, updateAutomationSchema } from "./automation.validators.js";
import { respondWithSuccess } from "../../core/http/respond.js";
import { parsePagination } from "../../core/http/pagination.js";

export async function list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { page, pageSize } = parsePagination(req.query);
    const items = await automationService.list({
      brandId: req.query.brandId as string | undefined,
      page,
      pageSize,
    });
    respondWithSuccess(res, items);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = requireParam(req.params.id, "id");
    const item = await automationService.getById(id);
    respondWithSuccess(res, item);
  } catch (err) {
    next(err);
  }
}

export async function create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = createAutomationSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(badRequest("Validation error", parsed.error.flatten()));
    }
    const item = await automationService.create({ ...parsed.data, createdById: req.user?.id });
    await publishActivity(
      "automation",
      "created",
      {
        entityType: "automation-rule",
        entityId: item.id,
        metadata: { name: item.name, brandId: item.brandId },
      },
      {
        actorUserId: req.user?.id,
        role: req.user?.role,
        tenantId: req.user?.tenantId,
        brandId: (item as { brandId?: string }).brandId ?? req.user?.brandId,
        source: "api",
      },
    );
    respondWithSuccess(res, item, 201);
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = updateAutomationSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(badRequest("Validation error", parsed.error.flatten()));
    }
    const id = requireParam(req.params.id, "id");
    const item = await automationService.update(id, {
      ...parsed.data,
      createdById: req.user?.id,
    });
    await publishActivity(
      "automation",
      "updated",
      {
        entityType: "automation-rule",
        entityId: item.id,
        metadata: { name: item.name, brandId: item.brandId },
      },
      {
        actorUserId: req.user?.id,
        role: req.user?.role,
        tenantId: req.user?.tenantId,
        brandId: (item as { brandId?: string }).brandId ?? req.user?.brandId,
        source: "api",
      },
    );
    respondWithSuccess(res, item);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = requireParam(req.params.id, "id");
    await automationService.remove(id);
    await publishActivity(
      "automation",
      "deleted",
      {
        entityType: "automation-rule",
        entityId: id,
      },
      {
        actorUserId: req.user?.id,
        role: req.user?.role,
        tenantId: req.user?.tenantId,
        brandId: req.user?.brandId,
        source: "api",
      },
    );
    respondWithSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}

export async function runScheduled(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await automationService.runScheduled(new Date());
    await publishActivity("automation", "run_scheduled", { entityType: "automation-schedule" }, { source: "system" });
    respondWithSuccess(res, { status: "scheduled" }, 200);
  } catch (err) {
    next(err);
  }
}

export async function runNow(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = requireParam(req.params.id, "id");
    await automationService.runRule(id, {
      actorUserId: req.user?.id,
      role: req.user?.role,
      tenantId: req.user?.tenantId,
      brandId: req.user?.brandId,
      source: "api",
    });
    respondWithSuccess(res, { id, status: "executed" });
  } catch (err) {
    next(err);
  }
}
