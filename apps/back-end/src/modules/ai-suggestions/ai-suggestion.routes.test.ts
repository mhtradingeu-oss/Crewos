import request from "supertest";
import express from "express";
import router from "./ai-suggestion.routes.js";
import { prisma } from "../../core/prisma.js";

const app = express();
app.use(express.json());
app.use("/api/v1/ai-suggestions", router);

// Mock user injection middleware
function withUser(user: any) {
  return (req: any, _res: any, next: any) => {
    req.user = user;
    next();
  };
}

describe("AI Suggestion Approval API", () => {
  let suggestionId: string;
  beforeAll(async () => {
    await prisma.aISuggestion.deleteMany();
    const suggestion = await prisma.aISuggestion.create({
      data: {
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
      },
    });
    suggestionId = suggestion.id;
  });

  it("should 403 for unauthorized user", async () => {
    app.use(withUser({ id: "u1", role: "USER" }));
    const res = await request(app).post(`/api/v1/ai-suggestions/${suggestionId}/approve`).send();
    expect(res.status).toBe(403);
  });

  it("should approve for authorized user", async () => {
    app.use(withUser({ id: "u2", role: "MANAGER" }));
    const res = await request(app).post(`/api/v1/ai-suggestions/${suggestionId}/approve`).send();
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("approved");
  });

  it("should be idempotent on double approval", async () => {
    app.use(withUser({ id: "u2", role: "MANAGER" }));
    const res = await request(app).post(`/api/v1/ai-suggestions/${suggestionId}/approve`).send();
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("approved");
  });

  it("should reject for authorized user", async () => {
    // Create new pending suggestion
    const s = await prisma.aISuggestion.create({
      data: {
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
        correlationId: "corr-4",
      },
    });
    app.use(withUser({ id: "u2", role: "MANAGER" }));
    const res = await request(app)
      .post(`/api/v1/ai-suggestions/${s.id}/reject`)
      .send({ reason: "not valid" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("rejected");
  });
});
