# PHASE 0 — Repository Reality Scope
MH-OS SUPERAPP / CrewOS

This document classifies the current repository state based strictly on
actual execution, persistence, and enforcement evidence.
No refactors, fixes, or implementations are proposed here.

---

## ✅ Runtime (Verified Execution)

The following files participate in real execution paths and/or
are wired into live request handling or persistence layers.

### Core Security & Access
- apps/back-end/src/core/security/auth-middleware.ts  
  Reason: Enforces authentication and request context at runtime.
- apps/back-end/src/core/security/rbac.ts  
  Reason: Evaluates roles and permissions during live request handling.

### HTTP & Validation
- apps/back-end/src/core/http/validate.ts  
  Reason: Actively validates incoming requests.
- apps/back-end/src/core/http/errors.ts  
  Reason: Centralized runtime error handling.

### Authentication & Sessions
- apps/back-end/src/modules/auth/auth.service.ts  
  Reason: Performs real authentication logic.
- apps/back-end/src/modules/auth/auth.controller.ts  
  Reason: Handles live authentication endpoints.

### Data Models & Persistence
- apps/back-end/prisma/schema.prisma  
  Reason: Canonical data model used at runtime.
- apps/back-end/prisma/migrations/**  
  Reason: Applied database schema migrations.

---

## 🟡 Stub / Plan / Design-Only (No Runtime Enforcement)

The following files define interfaces, DTOs, or planned logic
but do NOT enforce behavior at runtime or persist state.

### Automation OS — Core Engine
- apps/back-end/src/core/automation/engine/engine.ts  
  Reason: Lifecycle logic defined but execution and persistence are incomplete.
- apps/back-end/src/core/automation/engine/rule-matcher.ts  
  Reason: Matching logic exists but is not fully enforced or persisted.
- apps/back-end/src/core/automation/engine/condition-evaluator.ts  
  Reason: Evaluation logic not wired to full execution lifecycle.
- apps/back-end/src/core/automation/engine/run-repository.ts  
  Reason: Repository abstraction without complete runtime guarantees.

### Automation Audit & Observability
- apps/back-end/src/core/automation/audit/automation-audit.ts  
  Reason: Audit contracts exist without persistent or immutable storage.
- apps/back-end/src/core/automation/observability/**  
  Reason: Observability defined as DTOs/contracts only.

### Automation Planning & Phase Stubs
- apps/back-end/src/core/automation/automation-plan.ts  
  Reason: Explicit plan-only logic masking missing runtime behavior.

### AI Explainability & Governance
- packages/shared/src/dto/automation/automation-explain-policy.ts  
  Reason: Explainability policies defined but not bound to execution.
- packages/shared/src/dto/automation/automation-explain-snapshot.ts  
  Reason: Snapshot schema exists without runtime capture.
- packages/shared/src/dto/automation/automation-observability-binding.ts  
  Reason: Binding contracts only, no live enforcement.

---

## 🧩 Compatibility / Phase Stubs (Masking Missing Logic)

Files that provide compatibility or placeholders
which give the appearance of completion without execution.

- apps/back-end/src/core/automation/automation-plan.ts  
  Reason: Phase stub explicitly defers implementation.
- apps/back-end/src/core/automation/audit/automation-audit.ts  
  Reason: Audit interface without persistence.

---

## ⚠️ Dead / Unused (Suspected)

Files suspected to be unused or unreachable due to
lack of imports or execution references.
(Verification required in later phases.)

- apps/back-end/src/core/automation/observability/**  
  Reason: No verified runtime invocation.
- packages/shared/src/dto/automation/**  
  Reason: DTOs not proven to be consumed by runtime paths.

---

## 📌 Notes

- Presence of schemas, DTOs, or interfaces does NOT imply implementation.
- Only files with verified execution, state mutation, or enforcement
  are considered Runtime.
- This document is intentionally conservative.
