import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../core/http/http-types.js";
import { AISuggestionService } from "./ai-suggestion.service.js";
import { forbidden, notFound } from "../../core/http/errors.js";
import { getPermissionsForRole } from "../../core/security/rbac.js";

const service = new AISuggestionService();

function getUserRole(req: AuthenticatedRequest) {
  return req.user?.role || "";
}
export async function listSuggestions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { status, domain, tenantId, brandId } = req.query;
    const filter: any = {};
    if (status) filter.status = status;
    if (domain) filter.domain = domain;
    if (tenantId) filter.tenantId = tenantId;
    if (brandId) filter.brandId = brandId;
    const suggestions = await service.repo.listSuggestions({ filter });
    res.json(suggestions);
  } catch (err) {
    next(err);
  }
}

async function checkApprovalPermission(suggestion: any, req: AuthenticatedRequest) {
  const userRole = getUserRole(req);
  if (!userRole) throw forbidden("No user role");
  if (userRole === "SUPER_ADMIN") return true; // If global bypass is already policy
  const requiredRole = suggestion.requiredApprovalRole;
  if (!requiredRole) throw forbidden("No requiredApprovalRole");
  if (userRole === requiredRole) return true;
  // Check permission codes for role
  const perms = await getPermissionsForRole(userRole);
  if (!perms.includes(`ai-suggestion:approve:${requiredRole}`)) throw forbidden();
  return true;
}

export async function approveSuggestion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const suggestion = await service.repo.listSuggestions({ filter: { id } });
    if (!suggestion[0]) throw notFound("Suggestion not found");
    await checkApprovalPermission(suggestion[0], req);
    const { user } = req;
    if (!user?.id) throw forbidden("Missing user id");
    const userId = user.id;
    const result = await service.approveSuggestion(id, userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function rejectSuggestion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const suggestion = await service.repo.listSuggestions({ filter: { id } });
    if (!suggestion[0]) throw notFound("Suggestion not found");
    await checkApprovalPermission(suggestion[0], req);
    const { user } = req;
    if (!user?.id) throw forbidden("Missing user id");
    const userId = user.id;
    const result = await service.rejectSuggestion(id, userId, reason);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
