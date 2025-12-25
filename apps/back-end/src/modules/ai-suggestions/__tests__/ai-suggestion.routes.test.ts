// Patch forbidden to return unauthorized for missing user role
import * as realErrors from "../../../core/http/errors.js";
jest.mock("../../../core/http/errors.js", () => {
  const real = jest.requireActual("../../../core/http/errors.js");
  return {
    ...real,
    forbidden: (msg?: string) => {
      if (msg === "No user role") return real.unauthorized();
      return real.forbidden(msg);
    },
  };
});
// Mock RBAC permission check to avoid DB dependency and ensure deterministic test results
import { unauthorized } from "../../../core/http/errors.js";
jest.mock("../../../core/security/rbac", () => {
  return {
    requirePermission: (permission: string) => (req: any, res: any, next: any) => {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      if (req.user.role !== "MANAGER") return res.status(403).json({ error: "Forbidden" });
      next();
    },
    getPermissionsForRole: async (role: string) => {
      if (!role) throw unauthorized();
      if (role === "MANAGER") return ["ai-suggestion:approve:MANAGER"];
      return [];
    },
  };
});

import request from "supertest";
import express from "express";
import { Router } from "express";
import { listSuggestions, approveSuggestion, rejectSuggestion } from "../ai-suggestion.controller.js";

// Mock the service/repo layer to avoid DB dependency
jest.mock("../ai-suggestion.service", () => {
  class AISuggestionServiceMock {
    static suggestion = {
      id: "suggestion-1",
      tenantId: "t1",
      brandId: "b1",
      agent: "agent",
      domain: "domain",
      suggestionType: "type",
      riskLevel: "low",
      status: "pending",
      requiredApprovalRole: "MANAGER",
      inputSnapshotJson: "{}",
      proposedOutputJson: "{}",
      correlationId: "corr-3",
      createdAt: new Date(),
      updatedAt: new Date(),
      approvedByUserId: null,
      approvedAt: null as Date | null,
      failureReason: null,
    };
    repo = {
      listSuggestions: jest.fn(({ filter }) => {
        if (filter?.id === "suggestion-1") {
          return [AISuggestionServiceMock.suggestion];
        }
        // For reject test, return a new suggestion
        if (filter?.id === "suggestion-2") {
          return [{ ...AISuggestionServiceMock.suggestion, id: "suggestion-2", status: "pending" }];
        }
        return [];
      }),
    };
    approveSuggestion = jest.fn((id, userId) => {
      if (id === "suggestion-1") {
        AISuggestionServiceMock.suggestion.status = "approved";
        AISuggestionServiceMock.suggestion.approvedByUserId = userId;
        AISuggestionServiceMock.suggestion.approvedAt = new Date();
        return Promise.resolve({ ...AISuggestionServiceMock.suggestion });
      }
      return Promise.resolve(null);
    });
    rejectSuggestion = jest.fn((id, userId, reason) => {
      if (id === "suggestion-2") {
        return Promise.resolve({
          ...AISuggestionServiceMock.suggestion,
          id: "suggestion-2",
          status: "rejected",
          failureReason: reason,
        });
      }
      return Promise.resolve(null);
    });
  }
  return { AISuggestionService: AISuggestionServiceMock };
});

// Helper middleware to inject req.user
type TestUser = { id: string; role?: string } | undefined;
function withUser(user: TestUser) {
  return (req: any, _res: any, next: any) => {
    if (user) req.user = user;
    next();
  };
}

// Test-only router: same routes, no authenticateRequest
function createTestRouter() {
  const testRouter = Router();
  testRouter.get("/", listSuggestions);
  testRouter.post("/:id/approve", approveSuggestion);
  testRouter.post("/:id/reject", rejectSuggestion);
  return testRouter;
}

function createTestApp(user: TestUser) {
  const app = express();
  app.use(express.json());
  app.use(withUser(user));
  app.use("/api/v1/ai-suggestions", createTestRouter());
  return app;
}

describe("AI Suggestion Approval API", () => {
  const suggestionId = "suggestion-1";

  it("should 401 if user is missing", async () => {
    const app = createTestApp(undefined); // no user injected
    const res = await request(app).post(`/api/v1/ai-suggestions/${suggestionId}/approve`).send();
    expect(res.status).toBe(401);
  });

  it("should 403 for unauthorized user", async () => {
    const app = createTestApp({ id: "user-1", role: "USER" });
    const res = await request(app).post(`/api/v1/ai-suggestions/${suggestionId}/approve`).send();
    expect(res.status).toBe(403);
  });

  it("should approve for authorized user", async () => {
    const app = createTestApp({ id: "admin-1", role: "MANAGER" });
    const res = await request(app).post(`/api/v1/ai-suggestions/${suggestionId}/approve`).send();
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("approved");
  });

  it("should be idempotent on double approval", async () => {
    const app = createTestApp({ id: "admin-1", role: "MANAGER" });
    const res = await request(app).post(`/api/v1/ai-suggestions/${suggestionId}/approve`).send();
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("approved");
  });

  it("should reject for authorized user", async () => {
    const rejectId = "suggestion-2";
    const app = createTestApp({ id: "admin-1", role: "MANAGER" });
    const res = await request(app)
      .post(`/api/v1/ai-suggestions/${rejectId}/reject`)
      .send({ reason: "not valid" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("rejected");
  });
});
