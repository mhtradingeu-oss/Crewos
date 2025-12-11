import { randomUUID } from "crypto";
import { badRequest, forbidden } from "../../http/errors.js";
import { runAIRequest, type AIMessage } from "../../ai-service/ai-client.js";
import { prisma } from "../../prisma.js";
import { activityLogService } from "../../../modules/activity-log/activity-log.service.js";
import { AI_AGENTS_MANIFEST, AgentManifestByScope } from "../../../ai/schema/ai-agents-manifest.js";
import { validateAgentOutput } from "../ai-validators.js";
import {
  enforceAgentBudget,
  enforceManifestBudget,
  estimateCostUsd,
  estimateTokens,
  recordMonitoringEvent,
  recordSafetyEvent,
} from "../ai-monitoring.js";
import { decideAutonomy } from "../autonomy/autonomy-guard.js";
import {
  buildAIInsightContext,
  buildAutomationContext,
  buildBrandContext,
  buildCRMClientContext,
  buildFinanceContext,
  buildInvoiceContext,
  buildInventoryContext,
  buildKnowledgeBaseContext,
  buildLoyaltyAccountContext,
  buildMarketingContext,
  buildOperationsContext,
  buildPartnerContext,
  buildPricingContext,
  buildProductContext,
  buildSalesRepContext,
  buildSupportContext,
} from "../../../ai/context/context-builders.js";
import { mergeContexts, buildPromptFromContexts, logStage, safeTruncate } from "./pipeline-utils.js";
import type { PipelineContextMap, PipelineResult, RunAIPipelineParams } from "./pipeline-types.js";

const manifestByName = new Map(AI_AGENTS_MANIFEST.map((agent) => [agent.name, agent]));
const HIGH_RISK_SCOPES = [
  "pricing",
  "finance",
  "governance",
  "operations",
  "support",
  "media",
  "social",
  "influencer",
  "notification",
];

function inferScope(params: { requested?: string; namespace?: string; agentScope?: string }): string | undefined {
  const ordered = [params.requested, params.namespace, params.agentScope].filter(Boolean) as string[];
  return ordered[0];
}

async function triggerOversight(params: {
  scope?: string;
  agentKey?: string;
  runId?: string;
  brandId?: string | null;
  tenantId?: string | null;
  errors: string[];
  taskSummary: string;
}) {
  const normalized = params.scope?.toLowerCase() ?? "";
  const matchedScope = HIGH_RISK_SCOPES.find((candidate) => normalized.includes(candidate));
  if (!matchedScope) return;
  try {
    await recordSafetyEvent({
      type: "OVERSIGHT",
      namespace: matchedScope,
      agentName: params.agentKey,
      runId: params.runId,
      riskLevel: "HIGH",
      detail: {
        scope: params.scope ?? matchedScope,
        errors: params.errors,
        inputSummary: params.taskSummary,
      },
      brandId: params.brandId ?? null,
      tenantId: params.tenantId ?? null,
    });
  } catch {
    /* oversight hooks must not break pipeline */
  }
}

const contextBuilders: Record<
  string,
  (task: Record<string, any>, options: Parameters<typeof buildProductContext>[1]) => Promise<unknown>
> = {
  buildProductContext: async (task, options) => {
    const productId = (task.input?.productId ?? task.productId ?? task.id) as string | undefined;
    if (!productId) throw badRequest("productId is required for product context");
    return buildProductContext(productId, options);
  },
  buildPricingContext: async (task, options) => {
    const productId = (task.input?.productId ?? task.productId ?? task.id) as string | undefined;
    if (!productId) throw badRequest("productId is required for pricing context");
    return buildPricingContext(productId, options);
  },
  buildInventoryContext: async (task, options) => {
    const productId = (task.input?.productId ?? task.productId) as string | undefined;
    const warehouseId = (task.input?.warehouseId ?? task.warehouseId) as string | undefined;
    if (!productId && !warehouseId) throw badRequest("productId or warehouseId required for inventory context");
    return buildInventoryContext({ productId, warehouseId }, options);
  },
  buildCRMClientContext: async (task, options) => {
    const clientId = (task.input?.leadId ?? task.input?.clientId ?? task.leadId ?? task.clientId ?? task.id) as
      | string
      | undefined;
    if (!clientId) throw badRequest("leadId/clientId required for CRM context");
    return buildCRMClientContext(clientId, options);
  },
  buildPartnerContext: async (task, options) => {
    const partnerUserId = (task.input?.partnerUserId ?? task.input?.userId ?? task.userId) as string | undefined;
    const partnerId = (task.input?.partnerId ?? task.partnerId) as string | undefined;
    if (!partnerUserId && !partnerId) throw badRequest("partnerUserId or partnerId required for partner context");
    return buildPartnerContext({ partnerUserId, partnerId }, options);
  },
  buildSalesRepContext: async (task, options) => {
    const repId = (task.input?.salesRepId ?? task.input?.repId ?? task.repId ?? task.id) as string | undefined;
    if (!repId) throw badRequest("salesRepId required for sales context");
    return buildSalesRepContext(repId, options);
  },
  buildBrandContext: async (task, options) => {
    const brandId = (task.input?.brandId ?? task.brandId ?? options?.brandId) as string | undefined;
    if (!brandId) throw badRequest("brandId required for brand context");
    return buildBrandContext(brandId, options);
  },
  buildMarketingContext: async (task, options) => {
    const brandId = (task.input?.brandId ?? task.brandId ?? options?.brandId) as string | undefined;
    if (!brandId) throw badRequest("brandId required for marketing context");
    return buildMarketingContext(brandId, options);
  },
  buildFinanceContext: async (task, options) => {
    const brandId = (task.input?.brandId ?? task.brandId ?? options?.brandId) as string | undefined;
    if (!brandId) throw badRequest("brandId required for finance context");
    return buildFinanceContext(brandId, options);
  },
  buildInvoiceContext: async (task, options) => {
    const invoiceId = (task.input?.invoiceId ?? task.invoiceId ?? task.id) as string | undefined;
    if (!invoiceId) throw badRequest("invoiceId required for invoice context");
    return buildInvoiceContext(invoiceId, options);
  },
  buildOperationsContext: async (task, options) => {
    const brandId = (task.input?.brandId ?? task.brandId ?? options?.brandId) as string | undefined;
    if (!brandId) throw badRequest("brandId required for operations context");
    return buildOperationsContext(brandId, options);
  },
  buildKnowledgeBaseContext: async (task, options) => {
    const documentId = (task.input?.documentId ?? task.input?.knowledgeId ?? task.documentId) as string | undefined;
    if (!documentId) throw badRequest("documentId required for knowledge context");
    return buildKnowledgeBaseContext(documentId, options);
  },
  buildSupportContext: async (task, options) => {
    const ticketId = (task.input?.ticketId ?? task.ticketId ?? task.id) as string | undefined;
    if (!ticketId) throw badRequest("ticketId required for support context");
    return buildSupportContext(ticketId, options);
  },
  buildLoyaltyAccountContext: async (task, options) => {
    const loyaltyCustomerId = (task.input?.loyaltyCustomerId ?? task.input?.accountId ?? task.accountId) as
      | string
      | undefined;
    if (!loyaltyCustomerId) throw badRequest("loyaltyCustomerId required for loyalty context");
    return buildLoyaltyAccountContext(loyaltyCustomerId, options);
  },
  buildAutomationContext: async (task, options) => {
    const ruleId = (task.input?.ruleId ?? task.input?.automationRuleId ?? task.ruleId ?? task.id) as
      | string
      | undefined;
    if (!ruleId) throw badRequest("ruleId required for automation context");
    return buildAutomationContext(ruleId, options);
  },
  buildAIInsightContext: async (task, options) => {
    const insightId = (task.input?.insightId ?? task.insightId ?? task.id) as string | undefined;
    if (!insightId) throw badRequest("insightId required for AI insight context");
    return buildAIInsightContext(insightId, options);
  },
};

function resolveAgent(agentId: string) {
  return manifestByName.get(agentId) ?? AgentManifestByScope[agentId] ?? null;
}

function assertPermissions(agentPermissions: string[], actor?: { role?: string | null; permissions?: string[] }) {
  if (!agentPermissions.length) return;
  if (actor?.role === "SUPER_ADMIN") return;
  const granted = actor?.permissions ?? [];
  const allowed = agentPermissions.every((code) => granted.includes(code) || granted.includes("*"));
  if (!allowed) {
    throw forbidden("Missing AI permissions");
  }
}

export async function runAIPipeline(params: RunAIPipelineParams): Promise<PipelineResult> {
  const logs = [logStage("contextLoad", { agentId: params.agentId })];
  const agent = resolveAgent(params.agentId);
  if (!agent) {
    throw badRequest("Unknown agentId");
  }

  assertPermissions(agent.safety.permissions ?? [], params.actor);

  const brandId = params.brandId ?? params.actor?.brandId ?? (params.task.input?.brandId as string | undefined);
  const tenantId = params.tenantId ?? params.actor?.tenantId ?? (params.task.input?.tenantId as string | undefined);

  const autonomyDecision = decideAutonomy({
    agent,
    requestedAction: (params.task.input?.action as string | undefined) ?? params.task.prompt,
    domain: agent.scope,
    forceApproval: HIGH_RISK_SCOPES.includes(agent.scope?.toLowerCase() ?? ""),
  });

  if (HIGH_RISK_SCOPES.includes(agent.scope?.toLowerCase() ?? "")) {
    recordSafetyEvent({
      type: "SAFETY_CONSTRAINT",
      namespace: agent.scope,
      agentName: agent.name,
      decision: autonomyDecision.status,
      detail: { autonomy: autonomyDecision },
      brandId: brandId ?? null,
      tenantId: tenantId ?? null,
    }).catch(() => {
      /* safety logging must not block */
    });
  }

  if (autonomyDecision.status === "deny") {
    logs.push(logStage("safetyValidate", { autonomy: autonomyDecision }));
    return {
      success: false,
      agent,
      contexts: {},
      logs,
      status: "autonomy_blocked",
      errors: [autonomyDecision.reason ?? "Autonomy denied"],
      autonomyDecision,
    };
  }

  const contexts: Record<string, unknown> = {};
  for (const ctx of agent.inputContexts ?? []) {
    const builderName = ctx.builder as keyof typeof contextBuilders;
    const builder = contextBuilders[builderName];
    if (!builder) {
      if (ctx.required) throw badRequest(`Context builder ${builderName} missing`);
      continue;
    }
    try {
      const context = await builder(params.task as Record<string, any>, {
        brandId,
        tenantId,
        role: params.actor?.role ?? undefined,
        permissions: params.actor?.permissions,
        includeEmbeddings: params.includeEmbeddings,
        requiredPermissions: agent.safety.permissions,
      });
      if (context) {
        contexts[ctx.name] = context;
      } else if (ctx.required) {
        throw badRequest(`Required context ${ctx.name} returned empty`);
      }
    } catch (err) {
      if (ctx.required) throw err;
      logs.push(logStage("contextLoad", { skipped: ctx.name, reason: (err as Error).message }));
    }
  }

  const mergedContexts: PipelineContextMap = mergeContexts(contexts);

  logs.push(logStage("safetyValidate", { brandId }));

  const taskPayload = params.task.input
    ? { ...params.task.input, prompt: params.task.prompt, message: params.task.message }
    : { prompt: params.task.prompt, message: params.task.message };

  const messages: AIMessage[] = [
    {
      role: "system",
      content: `You are MH-OS AI agent ${agent.name}. Boot prompt: ${agent.bootPrompt ?? ""}
Capabilities: ${(agent.capabilities ?? []).join(", ")}. Required contexts: ${(agent.inputContexts ?? []).map((c) => c.name).join(", ")}. Autonomy: ${agent.autonomyLevel ?? "viewer"}. Safety rules: ${(agent.safetyRules ?? agent.safety?.blockedTopics ?? []).join("; ")}. Expected JSON output: ${safeTruncate(agent.output?.schema ?? agent.output ?? {}, 2000)}`,
    },
    {
      role: "user",
      content: buildPromptFromContexts(
        agent.name,
        taskPayload,
        mergedContexts,
        agent.output?.schema ?? agent.output,
      ),
    },
  ];

  const estimatedTokens = estimateTokens(messages);
  const estimatedCostUsd = estimateCostUsd(estimatedTokens, process.env.AI_MODEL_MHOS ?? "gpt-4-turbo");
  await enforceManifestBudget({ agent, estimatedTokens, estimatedCostUsd, brandId, tenantId });
  await enforceAgentBudget({
    agentName: agent.name,
    brandId,
    tenantId,
    estimatedTokens,
    estimatedCostUsd,
  });

  if (params.dryRun) {
    return {
      success: true,
      agent,
      contexts: mergedContexts,
      messages,
      promptPreview: messages.map((m) => m.content).join("\n---\n"),
      logs,
      autonomyDecision,
    };
  }

  logs.push(logStage("callLLM"));
  const response = await runAIRequest({
    model: process.env.AI_MODEL_MHOS ?? "gpt-4-turbo",
    messages,
    namespace: agent.scope ?? agent.name,
    agentName: agent.name,
    brandId,
    tenantId,
    requestedActions: [params.task.prompt ?? agent.scope ?? agent.name],
  });

  if (!response.success) {
    logs.push(logStage("callLLM", { error: response.error }));
    return {
      success: false,
      agent,
      contexts: mergedContexts,
      logs,
      messages,
      error: response.error,
    };
  }

  let output: unknown = response.content;
  if (response.content) {
    try {
      output = JSON.parse(response.content);
    } catch {
      output = response.content;
    }
  }

  logs.push(logStage("parseResponse"));

  const inferredScope = inferScope({
    requested: (params.task.input?.scope as string | undefined) ?? (params.task.input?.osScope as string | undefined),
    namespace: agent.scope ?? agent.name,
    agentScope: agent.scope,
  });

  const validation = validateAgentOutput(inferredScope, output);
  if (!validation.ok) {
    logs.push(logStage("parseResponse", { validation: "failed", errors: validation.errors }));
    await recordMonitoringEvent({
      category: "PERFORMANCE_METRIC",
      status: "VALIDATION_FAILED",
      agentName: agent.name,
      namespace: agent.scope,
      riskLevel: HIGH_RISK_SCOPES.includes(agent.scope?.toLowerCase() ?? "") ? "HIGH" : "MEDIUM",
      metric: { errors: validation.errors, scope: inferredScope },
      brandId: brandId ?? null,
      tenantId: tenantId ?? null,
    });
    await triggerOversight({
      scope: inferredScope,
      agentKey: agent.name,
      runId: response.runId,
      brandId: brandId ?? null,
      tenantId: tenantId ?? null,
      errors: validation.errors,
      taskSummary: safeTruncate(taskPayload, 800),
    });
    return {
      success: false,
      status: "validation_failed",
      errors: validation.errors,
      agent,
      contexts: mergedContexts,
      logs,
      messages,
      runId: response.runId,
      autonomyDecision,
    };
  }

  const validatedOutput = validation.data;

  const targetEntityId =
    (params.task.input?.entityId as string | undefined) ??
    (params.task.input?.productId as string | undefined) ??
    (params.task.input?.leadId as string | undefined) ??
    (params.task.input?.ticketId as string | undefined) ??
    (params.task.input?.id as string | undefined);

  const insightEntityType = autonomyDecision.requireApproval ? "pending-approval" : "agent";

  const insight = await prisma.aIInsight.create({
    data: {
      brandId: brandId ?? null,
      os: agent.scope,
      entityType: insightEntityType,
      entityId: targetEntityId ?? agent.name,
      summary: typeof validatedOutput === "object" && validatedOutput !== null && "summary" in (validatedOutput as Record<string, unknown>)
        ? String((validatedOutput as Record<string, unknown>).summary)
        : `${agent.name} output`,
      details: safeTruncate({ output: validatedOutput, contexts, task: params.task, autonomy: autonomyDecision }, 4000),
    },
  });

  logs.push(logStage("persistAIOutput", { insightId: insight.id }));

  await recordMonitoringEvent({
    category: "PERFORMANCE_METRIC",
    status: autonomyDecision.requireApproval ? "PENDING_APPROVAL" : "SUCCESS",
    agentName: agent.name,
    namespace: agent.scope,
    riskLevel: HIGH_RISK_SCOPES.includes(agent.scope?.toLowerCase() ?? "") ? "HIGH" : "LOW",
    metric: {
      runId: response.runId,
      outputPreview: safeTruncate(validatedOutput, 400),
      autonomy: autonomyDecision,
      contextsLoaded: Object.keys(mergedContexts ?? {}).length,
    },
    brandId: brandId ?? null,
    tenantId: tenantId ?? null,
  });

  await activityLogService.record({
    id: randomUUID(),
    name: "ai.pipeline.run",
    payload: {
      module: "ai",
      action: "ai.pipeline.run",
      actorId: params.actor?.userId,
      actorRole: params.actor?.role ?? undefined,
      brandId: brandId ?? undefined,
      tenantId: tenantId ?? undefined,
      metadata: { agent: agent.name, scope: agent.scope, outputPreview: safeTruncate(validatedOutput, 500) },
    },
    context: {
      brandId: brandId ?? undefined,
      tenantId: tenantId ?? undefined,
      actorUserId: params.actor?.userId,
      role: params.actor?.role ?? undefined,
      source: "api",
    },
    occurredAt: new Date(),
  });

  return {
    success: true,
    agent,
    output: validatedOutput,
    contexts: mergedContexts,
    logs,
    messages,
    runId: response.runId,
    autonomyDecision,
    status: autonomyDecision.requireApproval ? "pending_approval" : "ok",
  };
}
