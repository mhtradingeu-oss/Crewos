# MASTER OS ARCHITECTECTURE FINAL

This document is the canonical technical bible for MH-OS SUPERAPP. It restates the mission, unifies every OS, defines the platform layers, maps APIs/data/entities, diagrams the operating flows, and codifies the AI + automation + governance rules that emerged across the archived artifact set.

---

## 1. Executive Summary
- MH-OS SUPERAPP runs as a multi-brand, AI-first Operating System for commerce: governance plus Brand → Product → Operating Systems → AI Crew → Automation Layer → Platform Stack.
- The platform centers on **HAIROTICMEN** as the seeded pilot brand and scales to any future tenant through multi-tenant guards (brand scoping, RBAC, policy, data partitioning).
- Every domain ships a Prisma data model, Express route module, AI orchestration touchpoint, automation/event hook, and Next.js dashboard landing page under a unified naming standard (`/api/v1/{module}/...`).
- This final master doc stitches together: the layered architecture, OS catalog, entity map, API structure, user roles, flow diagrams, AI + automation strategy, pricing/insight engines, Stand/Dealer program, notification/security infrastructure, and inferred modules (multi-brand manager, API gateway, devops). All previous docs now sit in `docs/archive_old` for reference.

## 2. Mission, Vision & Planes
### Mission statement
- Turn MH Trading UG into an autonomous commerce engine (products, pricing, marketing, CRM, loyalty, finance, partners, automation) with an AI crew operating 80–92% of daily decisions.
- Expose a single control plane for administrators, brand owners, partners, dealers, stand operators, affiliates, and AI agents.

### Vision planes (per `docs/01_product-vision.md`)
1. **Admin Plane** – global RBAC, AI guardrails, automations, platform monitoring, notifications, multi-region settings.
2. **Brand Plane** – brand-scoped commerce sprints (products → pricing → CRM → marketing → finance → loyalty → virtual office) with AI suggestions and automation inbox.
3. **Virtual Office Plane** – AI crew meeting room where AI Directors (pricing, marketing, CRM, loyalty, operations, finance, stand, sales) collaborate with humans, emit action items, and route outputs to automations/notifications.

## 3. Layered Architecture (6 layers from `docs/02_architecture_map.md`)
1. **Layer 1 – Brand Foundation**: Brand OS, identity, rules, AI config, packaging/compliance metadata.
2. **Layer 2 – Product & Pricing Infrastructure**: Product OS, catalog, packaging, compliance, pricing, competitor data, product lifecycle, media library.
3. **Layer 3 – Operating Systems (OS Layer)**: CRM, Marketing, Pricing, Sales (Sales Reps + Dealers), Partner, Stand Program, Affiliate, Loyalty, Inventory, Finance, Support, Knowledge Base, Operations, Welfare (Notification, Communication), Automation.
4. **Layer 4 – AI Workforce Layer**: AI Brain orchestrator plus AI Pricing Engine, Marketing Engineer, CRM Agent, Sales Manager, Inventory Forecaster, Finance Analyst, Partner Advisor, WL Advisor, Stand Coach, Influencer Scout, SEO Engine, Content Factory.
5. **Layer 5 – Automation & Intelligence Layer**: Event Bus, Automation Engine, Notifications, Social Intelligence, Analytics/BI, Smart Segmentation, AI Learning Loop, Knowledge sync, Virtual Office outputs.
6. **Layer 6 – Platform & Governance Layer**: Express API (`/api/v1/...`), Next.js admin/portal shells, Security/Governance OS (RBAC, sessions, policies), SuperAdmin controls, API Gateway, Multi-Brand/Region managers, DevOps and platform observability.

## 4. OS Catalog — canonical list
| OS Module | Short Description | Primary AI/Automation Partners |
| --- | --- | --- |
| Brand OS | Identity, rules, AI config + guardrail seeds. Integrates with AI Brain to keep tone/guardrails honored. | AI Brain, Automation, SuperAdmin |
| Product OS | Master catalog + media + specs (USP, how-to, packaging). Feeds Pricing/Inventory/Marketing. | Pricing, Marketing |
| Packaging OS | Captures cartons, weights, dimensions, materials for logistics and compliance. | Inventory, Logistics |
| Compliance OS (CNPN/ISO/INCI) | Regulatory records (CNPN EU, ISO quality, ingredients). | Finance, Partners |
| Pricing OS | Multi-channel pricing, guardrails, drafts, approvals, automation hooks. | AI Pricing Engine, Automation |
| Competitor OS | Competitor pricing feeds, SWOT detection, bias engine. | Pricing, AI Brain |
| CRM OS | Customer lifecycle, leads, pipelines, tasks, segmented communications. | Marketing, Sales, AI CRM |
| Marketing OS | Campaign builder, content studio, SEO, influencer CRM. | AI Marketing, Social Intelligence |
| Sales OS (Sales Rep) | Field reps, territories, visits, quotes, commissions, pipelines. | Automation, Finance, AI Sales Manager |
| Dealer OS | Dealers, pricing tiers, contracts, orders, AI partner ratings. | Partner OS, Finance |
| Partner Ecosystem OS | Unified partner registry (dealers, distributors, salons, stands, WL owners, affiliates). | AI Partner Advisor, CRM |
| Stand Program OS | Stand partners, inventory, refill engine, loyalty incentives, pos scores. | Inventory, Automation, AI Stand Coach |
| Affiliate OS | Influencers, affiliate links/payment, commissions, AI influencer scouting. | Marketing, Finance |
| Loyalty OS | Program rules, points, tiers, redemptions, referrals. | CRM, Automation |
| Inventory OS | Warehouses, stock, forecasting, transfers, notifications. | Stand, Sales, Logistics |
| Finance OS | Revenue, invoices, payments, expenses, payouts, budgets. | Automation, AI Finance Analyst |
| Automation OS | Event/Rule/Workflow engine tied to Notifications, Pricing, CRM, Inventory actions. | All OS (trigger source) |
| Notification OS | Templates/channels (email, SMS, WhatsApp, in-app, push) + AI Event Rules. | Automation, Activity Log |
| Communication OS | Messaging spool, template management, channel connectors. | Notification, CRM |
| Social Intelligence OS | Listening/trend/competitor monitoring + influencer signals. | Marketing, AI Content Factory |
| Knowledge Base OS | Documents, training content, embeddings for AI. | AI Brain, Support |
| AI Brain OS | Agent orchestrator, insights, reports, learning loop, Virtual Office. | All AI agents |
| AI Pricing Engine | Pricing director agent, margin simulations, competitor adjustments. | Pricing OS |
| AI Marketing Engine | Campaign generation, creative briefs, SEO. | Marketing OS |
| AI CRM Agent | Lead scoring, next actions, journey mapping. | CRM OS |
| AI Sales Manager | Territory analysis, visit planning, commission alerts. | Sales OS, Virtual Office |
| AI Inventory Forecaster | Demand forecasting, reorder alerts, stand refills. | Inventory OS, Stand Program |
| AI Finance Analyst | Runway modeling, profit insight, alerts. | Finance OS |
| AI Partner Advisor | Partner performance, risk, opportunity scoring. | Partner OS, Dealer OS |
| AI White Label Advisor | White Label brand creation, pricing, launch coaching. | White Label OS |
| AI Stand Coach | Refill health, display quality, loyalty incentives. | Stand Program |
| AI Influencer Scout | Finds/validates creators for affiliate + marketing. | Affiliate OS |
| AI SEO Engine & Content Factory | Content optimization, planning, AI marketing copy. | Marketing, Knowledge Base |
| AI Learning Loop OS | Observes events, logs decisions, improves agents. | AI Brain, Automation |
| SuperAdmin OS | Global governance (AI controls, module toggles, monitoring). | Security, Platform Ops |
| Security & Governance OS | RBAC, permissions, policies, audit logs, guardrails. | All OS |
| Platform Ops | Health jobs, telemetry, activity log dashboards. | Automation, Notification |
| API Gateway OS | `/api/v1/*` naming, authentication, rate limiting. | All OS |
| Multi-Brand/Region Manager | Tenant/brand partitioning + region-specific compliance/menu. | Security, DevOps |
| DevOps & Deployment OS | CI/CD, infra descriptors, Docker + Compose + monitoring. | Platform Ops |

> All enumerated OS modules are described in the archive (`docs/archive_old`). New docs under `docs/os/` now follow the clean template; they capture the distilled responsibilities summarized above.

## 5. OS-to-OS Relationships & Integration Map
| Triggering OS | Consumes | Notifies/Outputs | AI/Automation Flow |
| --- | --- | --- | --- |
| Product → Pricing | Product catalog + competitor data | Pricing guardrails, price drafts | AI Pricing Engine uses snapshots for insights |
| Pricing → Finance | Draft application, price updates | Revenue/margin updates | Automation rules publish notifications |
| CRM ↔ Marketing | Leads ↔ campaign segments | Campaign results feed CRM scores | AI CRM & AI Marketing share insights in Virtual Office |
| Stand Program → Inventory | Refill orders | Inventory adjustments + loyalty adds | AI Stand Coach seeds automation to issue refills |
| Sales Rep → Partner/Finance | Orders, commissions | Partner totals, finance payouts | AI Sales Manager triggers notifications |
| Automation → Notification | Rules triggered | Delivered alert | Notification builder executes multi-channel sends |
| AI Brain → Automation | Action items | Automation seeds (pricing/CRM/marketing) | Virtual Office outputs route via event bus |

Integration notes:
- Every event flows through the typed Event Bus (`docs/13_event_bus_design.md`). Subscribers include Automation Engine, Notification Center, Activity Log, AI Learning Loop, and Platform Ops.
- All modules persist context (brandId, user, module tag) in Activity Log entries (`docs/16_activity_log_spec.md`). The log is the audit trail that matches Virtual Office outputs to actions.
- Multi-module automations rely on shared DTOs (shared packages) and the API naming conventions captured in `docs/04_api_index.md` + `docs/ai/33_api-master-specification.md`.

## 6. Entities, Tables & Models (Prisma references)
Primary models referenced across OS modules (per `docs/05_database_schema_index.md` and `docs/ai/34_database-schema-master.md`):
- **Security:** `User`, `Role`, `Permission`, `Policy`, `AIRestrictionPolicy`, `AuditLog`.
- **Brand:** `Brand`, `BrandIdentity`, `BrandRules`, `BrandAIConfig`, `BrandCategory`, `BrandProduct`, `ProductPricing`, `CompetitorPrice`, `ProductPriceDraft`, `AIPricingHistory`, `AILearningJournal`.
- **CRM & Sales:** `Person`, `Company`, `Lead`, `Pipeline`, `Deal`, `CRMTask`, `CRMNote`, `SalesRep`, `SalesTerritory`, `SalesVisit`, `SalesQuote`, `SalesOrder`, `SalesCommission`.
- **Partners & Stand:** `Partner`, `PartnerContract`, `PartnerPricing`, `StandPartner`, `StandLocation`, `StandInventory`, `StandOrder`, `StandLoyaltyLedger`, `StandRefillOrder`.
- **Marketing:** `Campaign`, `CampaignAdSet`, `CampaignAd`, `MarketingPerformanceLog`, `MarketingChannel`, `ContentPlan`, `ContentPlanItem`, `TrackingProfile`.
- **Inventory & Logistics:** `Warehouse`, `InventoryItem`, `InventoryTransaction`, `StockAdjustment`, `PurchaseOrder`, `Shipment`, `InventoryKPIRecord`, `Logistics` metadata from packaging docs.
- **Finance & Loyalty:** `Invoice`, `InvoiceItem`, `Payment`, `Expense`, `RevenueRecord`, `ProgramPayout`, `BudgetPlan`, `LoyaltyProgram`, `LoyaltyCustomer`, `LoyaltyTransaction`, `RewardRedemption`.
- **Automation & Notification:** `AutomationRule`, `AutomationWorkflow`, `AutomationEvent`, `AutomationExecutionLog`, `ScheduledJob`, `Notification`, `NotificationTemplate`, `NotificationChannel`, `Communication` records.
- **AI:** `AIAgentConfig`, `AIInsight`, `AIReport`, `AILearningJournal`, `AIPricingHistory`, `SocialMention`, `SocialTrend`, `InfluencerProfile`, `KnowledgeDocument`, `KnowledgeCategory`, `KnowledgeTag`.
- **Operations/Support:** `OperationsTask`, `Ticket`, `TicketMessage`, `TicketAssignment`, `ActivityLog`, `CallSession`, `CallIntent` (planned for IVR) – references from `docs/05_future-architecture-pos-sales-whitelabel-ivr.md`.

## 7. API Surface & Naming Standards
- All APIs expose REST routes under `/api/v1/{os}/...` with consistent verbs (`list`, `details/:id`, `create`, `update/:id`, `delete/:id`, `search`). See `docs/04_api_index.md` and `docs/ai/33_api-master-specification.md` for the full template.
- AI endpoints live under `/api/v1/{os}/ai/*` (pricing advice, marketing ideas, CRM follow-up, etc.). Automation endpoints live under `/api/v1/{os}/automation/*` (rule creation, trigger tests, workflows). Each OS doc lists the required endpoints.
- Global concerns:
  - Auth: `/api/v1/auth/*` (login/register/me). Guards enforce JWT + RBAC.
  - SuperAdmin: `/api/v1/admin/*` handles system toggles, AI config, feature flags.
  - Security governance: `/api/v1/security/*` manages permissions, policies, audit logs.
- The API Gateway OS orchestrates the uniform naming, rate limits, brand context extraction, and error envelope; front-ends rely on shared API clients (`apps/front-end/services/*.ts`).

## 8. Flow Diagrams (textual)
**1. Pricing update flow**
`User (Pricing Admin)` updates product costs → `Pricing OS` writes `ProductPriceDraft` + guardrail checks → `AI Pricing Engine` runs via `/pricing/ai/advice` and logs `AIPricingHistory` → `Automation OS` emits `PriceChanged` event → `Notification OS` alerts platform/partners → `Finance OS` recomputes margins and `AI Brain` receives AIInsight.

**2. Marketing campaign flow**
`Marketing OS` drafts campaign → `AI Marketing Engine` generates briefs, copy, SEO suggestions → `Marketing Performance` logs run in `MarketingPerformanceLog` → `Automation OS` seeds posts/emails via `Communication/Notification OS` → `CRM OS` receives leads, updates segments → `AI Brain` records results in `AIInsight` and feeds Virtual Office summary.

**3. Stand refill flow**
`Stand Program OS` detects low stock → `Inventory OS` provides real-time counts → `AI Stand Coach` recommends refill qty + timeline → `Automation OS` seeds `StandRefillOrder` and notifies dispatcher → `Notification OS` alerts Stand Partner, `Finance OS` logs expected cost, `Activity Log` records action.

**4. Virtual Office action flow**
Brand owner schedules Virtual Office meeting → `AI Brain` orchestrator gathers `AIInsight`s + `AILearningJournal` records → Virtual Office returns summaries/risks → action items are logged in `ActivityLog` and seeded into `Automation OS` + `Notification OS` → Execution results are monitored and looped into `AI Learning Loop`.

**5. AI guardrail enforcement**
Any AI endpoint (pricing, marketing, CRM) consults `BrandAIConfig` + `BrandRules` → `AI Orchestrator` applies restrictions, logs inputs/outputs (`AIInsight`) → Overriding automation actions require `ai:approval` permission and are surfaced to SuperAdmin via `AI Audit` dashboards (`docs/14_ai_guardrails.md`).

## 9. AI Architecture & Automation
- **AI Crew**: Agents (Pricing, Marketing, CRM, Loyalty, Finance, Operations, Partner, Stand, Sales, Influence, Content) are defined in AI Brain module and stored in `AIAgentConfig`. Each agent has `charter`, `focus`, permissions, and context for guardrails (`docs/03_ai-crew-and-virtual-office.md`).
- **Orchestrator**: `core/ai/orchestrator.ts` proxies prompts, caches responses, and wires each OS-specific AI call (`pricing.ai.ts`, `marketing.ai.ts`, `crm.ai.ts`). AI endpoints only talk to `runAIRequest` with guardrail metadata.
- **Learning Loop**: `AILearningJournal` + `AIInsight` feed `AI Learning Loop OS` (observing decisions, results, confidence). This loop updates agent weights and populates Virtual Office summaries when similar scenarios appear.
- **Automation**: Event Bus (typed envelopes) broadcasts events (OrderCreated, PriceUpdated, LowStock, LeadConverted, etc.) → Automation Engine evaluates `AutomationRule` (conditions + actions) and executes workflows via `AutomationWorkflow`. `AutomationExecutionLog` tracks attempts + retries.
- **Notification/Communication**: Alerts triggered by automation flow through Notification/Communication OS (templates, channels, severity). Each notification message retains `brandId`, `module`, and `eventId` for traceability.

## 10. Pricing + Insights + Competitor Engines
- **Pricing Engine OS**: Central AI director for multi-channel pricing, dynamic updates, guardrail enforcement. Inputs: product costs, competitor data, inventory levels, sales velocity. Outputs: price suggestions, drafts, risk/fault logs.
- **Pricing Insights OS**: Profitability dashboards (heatmap, margin curve, channel insights). Integrates with Pricing OS, Finance OS, Product OS.
- **Competitor Engine OS**: Polls competitor prices (Amazon, TikTok Shop, etc.), builds SWOT, and shares threats/opportunities with Pricing OS and AI Brain.
- **AI Learning Loop**: Observes each price change/advice, records outcomes in `AILearningJournal` for future calibrations (`docs/ai/28_ai-learning-loop-os.md`).
- **Pricing Workbench UI** (`docs/pricing-workbench.md`): Tabs for Overview, Channel Ladder, Guardrails, AI Suggestions, Drafts, History. Each tab is fed by Pricing OS endpoints, AI suggestions, and automation logs.

## 11. Stand POS & Dealer OS
- **Stand Program OS**: Onboards stand partners (Starter → Pro), tracks inventory, loyalty bonuses, refill cadence. Provides refill alerts (private loyalty) + logistic metadata (QR, location) to Inventory and Finance.
- **Dealer OS**: Registers dealers, tiered pricing, contract management, order history, partner promotions.
- **Sales Rep OS**: Works closely with Dealers/Stands by planning visits, logging quotes/orders, tracking commissions, and linking to CRM leads.
- Automation: Stand low-stock, dealer contract renewals, and rep commission anomalies trigger automations plus notifications (dashboards or directly to the partner app).

## 12. Notification OS
- Channels: Email, SMS, WhatsApp, In-App, Telegram, Push (per `docs/ai/30_notification-os.md`). Templates support variables for personalization.
- Event rules subscribe to Automation events (low-stock, guardrail breach, AI recommendation). Notification builder configures triggers, segments, severity, channel fallbacks, retries.
- Notifications integrate with Activity Log; unread count surfaces in the global bell and AI/Virtual Office outputs.

## 13. Security & Governance OS
- RBAC: Roles (`SUPER_ADMIN`, `COMPANY_ADMIN`, `BRAND_MANAGER`, `SALES_MANAGER`, `SALES_REP`, `DEALER`, `STAND_PARTNER`, `AFFILIATE`, `WL_OWNER`, `MARKETING`, `FINANCE`, `AI_ENGINEER`, etc.) map to `RoleBrandLink`, `RolePermission`. Guards validate brand context before hitting services (`docs/15_rbac_brand_roles.md`).
- Guardrails: `BrandRules`, `AIRestrictionPolicy`, `BrandAIConfig` keep AI outputs safe (`docs/09_security_governance.md`, `docs/11_safe_ai_architecture.md`, `docs/14_ai_guardrails.md`).
- Activity log tracks every change with `brandId`, `userId`, `entity`, `action`, `metadata`. Logs feed Platform Ops and Virtual Office.
- SuperAdmin OS controls global toggles, AI aggressiveness, module activation, and system health.

## 14. User Roles
- **Super Admin**: system health, AI controls, feature flags, tenant on-boarding, security dashboards.
- **Platform Admin**: manages brand catalog, automation library, API integrations, notifications.
- **Brand Owner / Operator**: orchestrates commerce (product → pricing → marketing → CRM → loyalty → finance) with AI suggestions and Virtual Office meetings.
- **Sales Rep**: field operations, territory visits, quotes, commissions.
- **Dealer / Distributor / Stand Partner**: receives pricing, loyalty incentives, refill alerts, product updates.
- **Affiliate / Influencer**: monetizes links, tracks performance, receives AI push content.
- **AI Agents**: revolve around the AI Brain (Pricing Director, Marketing Director, CRM Manager, etc.) and are governed via AI guardrails and audit logs.

## 15. Platform Ops & Infrastructure
- Platform health/ops dashboards rely on Activity Log + ScheduledJob tables. Platform Ops OS exposes health, job history, audit, error lists, and backup statuses to the admin plane.
- DevOps/Deployment OS ensures Docker Compose + CI/CD pipelines (per `docs/18_ai-ultimate-workspace.md`). Multi-region manager handles compliant deployments, and API Gateway enforces `/api/v1` naming, rate limits, and brand scoping.
- Multi-Brand Manager ensures each request (front-end or API) attaches brand context (`BrandContextGuard`), uses `withBrandScope()` on Prisma queries (`docs/10_brand_scoping.md`, `docs/12_safe_prisma_wrapper.md`).

## 16. Implementation Plan & Phases
- **Phase 4** (Admin plane hardening) extends pricing, CRM, marketing, loyalty, finance monitors plus Virtual Office logging (`docs/04_execution-roadmap-phase4-7.md`, `docs/phase-4-architecture.md`).
- **Phase 5** adds Stand/POS + Sales Rep, along with AI insights + automation for field commerce (`docs/05_future-architecture-pos-sales-whitelabel-ivr.md`).
- **Phase 6** introduces brand workspace + White Label studio, relying on AI Brand Builder and cross-module integrations described here.
- **Phase 7** delivers IVR/contact center and self-optimizing agents (SEO/UX/Ops), with call session models feeding CRM/Support plus AI summarizations.

## 17. Inferred Modules (added in this architecture)
- **API Gateway OS** – ensures all modules follow the `/api/v1` pattern, caching, versioning, and rate limiting.
- **Multi-Brand & Multi-Region Managers** – orchestrate tenant-level isolation and region-specific compliance (CNPN/ISO obligations).
- **DevOps & Deployment OS** – houses CI/CD manifests, Docker Compose definitions, orchestrates Compose services for Postgres + Redis + backend + frontend.
- **Analytics & BI OS** – surfaces cross-domain KPIs (Revenue, ROAS, Stock, Partner health) via aggregated BI tables.
- **Smart Segmentation OS** – calculates AI-driven segments for marketing + CRM + loyalty.

## 18. Document Hygiene
- Every previous doc now lives under `docs/archive_old/`. The new `docs/os/<os-name>-os.md` set is the authoritative OS library.
- Use this master doc and the per-OS manifest to guide backend models, API contracts, AI prompts, automation rules, and frontend navigation.
- Future additions must be appended here by name and also be reflected in the `docs/os` folder to keep the system map current.

