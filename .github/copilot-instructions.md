# Copilot Instructions — MH-OS SUPERAPP

You are assisting in a **large, enterprise-grade, AI-first SuperApp**.

## HARD RULES
- Do NOT invent files, modules, or folders.
- Do NOT bypass existing DTOs, schemas, or types.
- Do NOT re-run logic that already exists.
- Prefer extending existing functions over creating new ones.
- Always respect immutability and readonly contracts.
- Automation Engine outputs must be deterministic.

## ARCHITECTURE DISCIPLINE
- Modular Monolith
- Shared types live in packages/shared
- No cross-layer imports
- Engine logic must be side-effect aware

## TYPESCRIPT
- Strict typing only
- Avoid `any`
- Prefer explicit return types
- Never widen types silently

## AUTOMATION OS
- One execution = one result + one explain snapshot
- Explainability is immutable
- No recomputation of explain data

## PHASE DISCIPLINE
- If task is PLAN / AUDIT / REVIEW → DO NOT WRITE CODE
- If task is BUILD → follow existing patterns only

When unsure, ask for clarification instead of guessing.
