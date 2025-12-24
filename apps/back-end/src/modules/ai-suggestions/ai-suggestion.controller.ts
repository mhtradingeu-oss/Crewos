import { Request, Response, NextFunction } from "express";
import { AISuggestionService } from "./ai-suggestion.service.js";
import { forbidden, notFound } from "../../core/http/errors.js";
import { getPermissionsForRole } from "../../core/security/rbac.js";

const service = new AISuggestionService();

function getUserRole(req: Request) {
  return req.user?.role || "";
}

export async function listSuggestions(req: Request, res: Response, next: NextFunction) {
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

async function checkApprovalPermission(suggestion: any, req: Request) {
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

export async function approveSuggestion(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const suggestion = await service.repo.listSuggestions({ filter: { id } });
    if (!suggestion[0]) throw notFound("Suggestion not found");
    await checkApprovalPermission(suggestion[0], req);
    const result = await service.approveSuggestion(id, req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function rejectSuggestion(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const suggestion = await service.repo.listSuggestions({ filter: { id } });
    if (!suggestion[0]) throw notFound("Suggestion not found");
    await checkApprovalPermission(suggestion[0], req);
    const result = await service.rejectSuggestion(id, req.user!.id, reason);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
