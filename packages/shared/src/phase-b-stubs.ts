// 🔐 Security constants (Phase-B stubs)
export const CSRF_COOKIE_NAME = "csrf_token";
export const CSRF_HEADER_NAME = "x-csrf-token";
export const SESSION_COOKIE_NAME = "mh_session";
export const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7d stub

// 🧩 Auth/Plan types (Phase-B stubs)
export type AuthSessionResponse = any;
export type PlanFeatures = any;
export type PlanTier = any;
// Phase-B compatibility stubs for missing shared exports
// DO NOT add logic or validation. All types = any, schemas = z.any()

import { z } from "zod";
import type { PricingSuggestionInput, PricingSuggestionOutput } from "./ai/phase-b.js";

// 🔐 Auth
export type LoginDto = any;
export type RegisterDto = any;
export type ForgotPasswordDto = any;
export const loginSchema = z.any();
export const registerSchema = z.any();
export const forgotPasswordSchema = z.any();

// 🤖 Automation OS
export type AutomationRule = any;
export type AutomationRuleVersion = any;
export type AutomationRun = any;
export type AutomationActionRun = any;
export const AutomationRuleBaseSchema = z.object({}).passthrough() as any;
export const AutomationRuleVersionSchema = z.object({}).passthrough() as any;
export const AutomationRunSchema = z.object({}).passthrough() as any;
export const AutomationActionRunSchema = z.object({}).passthrough() as any;
// Pricing suggestion DTO aliases (Phase-B)
export type PricingSuggestionInputDto = PricingSuggestionInput;
export type PricingSuggestionOutputDto = PricingSuggestionOutput;

// 💰 Pricing
export type PricingRecordDto = any;
export type PricingDraftCreateDto = any;
export type CreatePricingInputDto = any;
export type UpdatePricingInputDto = any;
export const competitorPriceCreateSchema = z.any();
export const createPricingInputSchema = z.any();
export const pricingDraftApprovalSchema = z.any();
export const pricingDraftCreateSchema = z.any();
export const pricingDraftRejectionSchema = z.any();
export const pricingListQuerySchema = z.any();
export const pricingPlanInputSchema = z.any();
export const pricingPlanOutputSchema = z.any();
export const pricingSuggestionInputSchema = z.any();
export const pricingSuggestionOutputSchema = z.any();
export const pricingRecordSchema = z.any();
export const updatePricingInputSchema = z.any();

// 👥 Users
export type CreateUserDto = any;
export type UpdateUserDto = any;
export type ListUsersDto = any;
export const createUserSchema = z.any();
export const updateUserSchema = z.any();
export const listUsersSchema = z.any();

// 🧾 Finance (E-Invoice)
export type EInvoiceFormat = any;
export type GenerateEInvoiceDto = any;
export type SendEInvoiceDto = any;
export type ValidateEInvoiceDto = any;
