// Canonical Policy Layer DTOs for Automation Runtime (Phase C.2 Step 4)
// All types are serializable, immutable, and explainable.
import { z } from "zod";
import type { AutomationPlan } from "./automation-plan.js";

export type AutomationPolicyScope = {
  companyId: string; // MANDATORY tenant context
  tenantId: string;
  brandId?: string;
  actorUserId?: string;
  actorRole?: string;
  environment?: "dev" | "staging" | "prod";
};

export type AutomationPolicyReason = {
  code: string;
  message: string;
  details?: Record<string, string | number | boolean | null>;
};

export const AutomationPolicyReasonSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null()
  ])).optional(),
});

export type AutomationActionAllowlistItem = {
  actionType: string;
  allowed: boolean;
  constraints?: {
    maxPerRun?: number;
    allowedDomains?: string[];
  };
};

export const AutomationActionAllowlistItemSchema = z.object({
  actionType: z.string(),
  allowed: z.boolean(),
  constraints: z.object({
    maxPerRun: z.number().optional(),
    allowedDomains: z.array(z.string()).optional(),
  }).optional(),
});

export type AutomationPolicyConfig = {
  enabled: boolean;
  allowlist: AutomationActionAllowlistItem[];
  defaultDeny: boolean;
};

export const AutomationPolicyConfigSchema = z.object({
  enabled: z.boolean(),
  allowlist: z.array(AutomationActionAllowlistItemSchema),
  defaultDeny: z.boolean(),
});

export type AutomationPolicyDecision = {
  allowed: boolean;
  mode: "DISABLED" | "ALLOWLIST_ONLY";
  reasons: AutomationPolicyReason[];
};

export const AutomationPolicyDecisionSchema = z.object({
  allowed: z.boolean(),
  mode: z.enum(["DISABLED", "ALLOWLIST_ONLY"]),
  reasons: z.array(AutomationPolicyReasonSchema),
});

export type AutomationPolicyInput = {
  scope: AutomationPolicyScope;
  plan: AutomationPlan;
  config: AutomationPolicyConfig;
};

export const AutomationPolicyInputSchema = z.object({
  scope: z.object({
    tenantId: z.string(),
    brandId: z.string().optional(),
    actorUserId: z.string().optional(),
    actorRole: z.string().optional(),
    environment: z.enum(["dev", "staging", "prod"]).optional(),
  }),
  plan: z.any(), // Plan is validated elsewhere
  config: AutomationPolicyConfigSchema,
});
