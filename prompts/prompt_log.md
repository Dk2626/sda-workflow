# Prompt Log — SDA Workflow Build Session

> **Purpose**: This document records the prompts used during each SDLC phase of building the AI-Assisted Service Deviation & Approval Workflow. It demonstrates how AI was applied throughout the lifecycle — not only at runtime — and provides reproducibility for future iterations.

---

## Phase 1 — Requirements Analysis

### Prompt 1.1: Use-case decomposition
> "Read the attached PDF. Extract the use case for AI-Assisted Service Deviation & Approval Workflow (Telecom & Media). Identify in-scope actors, deviation types, AI capabilities, audit/compliance requirements, and the 8 expected deliverables."

**Output**: Structured summary used to scope the FRD and design the spec.

### Prompt 1.2: Functional requirement generation
> "Generate 15–20 functional requirements (FR-001 … FR-018) for this use case. Each must be testable, unambiguous, and traceable. Cover: request creation, AI integration, approval routing, audit, compliance, RBAC, SLA, notifications, exception handling, and reporting. Use MoSCoW priority (Must/Should/Could)."

**Output**: The 18 FRs in `docs/01_FRD.html` section 10.

### Prompt 1.3: NFR derivation
> "Derive 5–7 non-functional requirements appropriate for a regulated telecom workflow: performance (p95 latency), availability, security (OWASP, encryption), auditability (retention), scalability, usability, observability."

**Output**: NFR-001 through NFR-007.

### Prompt 1.4: User story authoring
> "Convert the FRs into 12 user stories using 'As a / I want / So that' format. Cover all 7 actors (Requestor, L1, Finance, Network, Compliance, Auditor, Admin). Add acceptance criteria in Given/When/Then style. Map each story back to FR IDs."

**Output**: `specs/01_user_stories.yaml`.

---

## Phase 2 — Specification & DSL

### Prompt 2.1: YAML DSL authoring
> "Author a single YAML spec that becomes the source of truth for code generation. Include: entity definitions, state machine (with transitions, guards, on_enter hooks), per-deviation-type approval chains with conditional rules, AI agent configurations (model, temperature, schema), REST API endpoints, UI routes, validation rules, SLA, notifications, and security."

**Output**: `specs/00_main.yaml`.

### Prompt 2.2: Approval chain logic
> "For each deviation type, define the base approval chain and any conditional rules. Specifically: Billing Credit needs Compliance only if amount > 5,000; KYC always requires Compliance; SLA Waiver requires both Network and Compliance."

**Output**: `approval_chains` section of the spec, implemented in `app/src/lib/workflow.js#chainFor`.

---

## Phase 3 — Architecture & Design

### Prompt 3.1: Diagram set
> "Produce 6 Mermaid diagrams for an architecture document:
> 1. Application architecture — 5 layers (UI, API, Service/Domain, AI Agent, Data) plus external systems.
> 2. Technical/deployment architecture — Edge, App Tier (Next.js + worker), Data Tier (Postgres + Redis), Observability, External.
> 3. End-to-end sequence diagram for Submit & Approve flow.
> 4. State machine for the deviation lifecycle.
> 5. AI Agent architecture (orchestrator, PII redactor, cache, 4 agents, OpenAI).
> 6. C4 container-level component view.
> Use clear labels and ASCII-safe identifiers."

**Output**: `diagrams/architecture.md`.

### Prompt 3.2: Database design
> "Produce a logical ER diagram and physical DDL (SQLite-compatible, with PostgreSQL migration notes). Include: users, customers, services, deviation_requests, approval_actions, audit_log, ai_invocations, attachments, policies, sessions. Add appropriate indexes, CHECK constraints, foreign keys, and explain the SQLite→PG migration nuances."

**Output**: `db/database_design.md` and the schema in `app/src/lib/db/schema.js`.

---

## Phase 4 — Implementation

### Prompt 4.1: Next.js project scaffold
> "Generate a Next.js 14 App Router project. Use better-sqlite3 for DB, bcrypt for password hashing, the OpenAI SDK for AI calls, and Tailwind CSS for styling. Include cookie-based session auth with bcrypt and 8-hour TTL. Provide jsconfig.json with `@/` aliased to `./src/`."

**Output**: `app/package.json`, `app/next.config.js`, `app/tailwind.config.js`, `app/jsconfig.json`.

### Prompt 4.2: Workflow engine
> "Implement the state machine engine in plain JavaScript. Export: chainFor(type, amount), nextApproverRole(type, amount, completedRoles), logAudit, recordAction, generateReference (SDA-YYYY-NNNNN format), slaDeadline (8 working hours simplified). Encode the approval chains for all 5 deviation types."

**Output**: `app/src/lib/workflow.js`.

### Prompt 4.3: AI agent orchestrator
> "Implement an AI orchestrator with 4 specialized agents:
> - Justification: temp 0.4, plain text, 100–200 words.
> - Risk Scoring: temp 0.2, JSON mode, schema {score, factors[], confidence, rationale}.
> - Context Summary: temp 0.3, plain text, 60–90 words.
> - Policy Interpretation: temp 0.1, JSON mode, schema {citations:[{policy_code, title, snippet, relevance}]}.
> Include PII redaction (strip customer.name and customer.customer_code from prompts), persistent invocation logging (model, prompt, response, tokens, duration, confidence), and synthetic fallbacks when OPENAI_API_KEY is missing or the API fails."

**Output**: `app/src/lib/ai-agents.js`.

### Prompt 4.4: API surface
> "Generate Next.js route handlers under `app/api/*` matching this endpoint list: …(18 endpoints)… Each must enforce authentication and role-based access. The approve route must enforce segregation of duties (requestor ≠ approver) and current_approver_role match. The override-risk route requires ≥20-char reason. The CSV export streams text/csv with attachment headers."

**Output**: 18 route handlers under `app/src/app/api/`.

### Prompt 4.5: UI pages
> "Build six React pages with Tailwind:
> - `/login` — form with demo accounts hint
> - `/` — dashboard with metric tiles, recent table, by-type counts
> - `/deviations` — filterable list
> - `/deviations/new` — form with ✨ Generate with AI button
> - `/deviations/[id]` — approver workbench with risk badge, AI summary, policy panel, action history, approve/reject/override controls
> - `/audit` — audit + AI-invocation viewer
> Style theme: primary #0a2540, accent #635bff. Use semantic components: card, btn-primary, badge-low/medium/high."

**Output**: All pages under `app/src/app/*/page.js`.

---

## Phase 5 — Testing & Traceability

### Prompt 5.1: Functional test cases
> "Derive 50+ functional test cases for the platform. Cover: authentication, RBAC, deviation creation validation, AI fallbacks, workflow routing for all 5 deviation types, segregation of duties, risk override rules, audit append-only, CSV export, UI smoke tests, performance NFRs. Each row should have: TC ID, module, title, preconditions, steps, expected result, type (positive/negative/security/UI/perf), FR/US mapping, priority."

**Output**: Sheet 1 of `tests/test_scripts_and_traceability.xlsx` (54 test cases).

### Prompt 5.2: Traceability matrix
> "For every FR-001..018 and NFR-001..007, list: requirement summary, supporting user story, spec/DSL element, code file(s), and test case IDs that exercise it."

**Output**: Sheet 2 of `tests/test_scripts_and_traceability.xlsx`.

---

## Phase 6 — Documentation

### Prompt 6.1: FRD as interactive HTML
> "Render the FRD as a single self-contained HTML file with sidebar navigation, search filter, print/PDF button, and consistent styling. Use the design tokens from the app (primary #0a2540, accent #635bff). 20 sections covering executive summary, objectives, scope, actors, deviation types, states, AI capabilities, HITL controls, 18 FRs, 7 NFRs, validation, audit, exceptions, integrations, notifications, security, compliance, reporting, and 12 user stories."

**Output**: `docs/01_FRD.html`.

### Prompt 6.2: End User Manual
> "Author a comprehensive end-user manual in HTML matching the FRD styling. Sections: introduction, login, navigation, then dedicated chapters for each role (Requestor, Approver, Compliance, Auditor, Admin). Include step-by-step workflows, screen mock-ups in monospace, callouts for tips/warnings, FAQ, and troubleshooting table."

**Output**: `manual/02_User_Manual.html`.

---

## Phase 7 — Runtime AI (Production)

These are the prompts the **deployed application** sends at runtime. They live in `app/src/lib/ai-agents.js` and are version-controlled.

### Justification Agent (system prompt)
> "You are a compliance-aware drafter for a telecom operator. Write concise, professional business justifications for operational deviations. Cite policy reasoning when relevant. Keep tone factual; no marketing language. Max 200 words. Never name end-customers; use [CUSTOMER] placeholder."

### Risk Scoring Agent (system prompt)
> "You are a risk-scoring agent for telecom deviations. Respond with strict JSON: {\"score\":\"LOW|MEDIUM|HIGH\",\"factors\":[{\"factor\":string,\"weight\":0-1,\"value\":string}],\"confidence\":0-1,\"rationale\":string}. Consider financial impact, regulatory exposure, customer tier, KYC status, recurrence."

### Context Summary Agent (system prompt)
> "You are an approval-assist agent. Write one paragraph (60-90 words) summarising a customer + service profile for an approver. Be neutral, factual, no recommendations. Use [CUSTOMER] in place of names."

### Policy Interpretation Agent (system prompt)
> "You are a policy-citation agent. Respond with strict JSON: {\"citations\":[{\"policy_code\":string,\"title\":string,\"snippet\":string,\"relevance\":0-1}]}. Cite at most 3 most relevant policies."

---

## Summary

| Phase | Prompts | AI Tool | Deliverables Produced |
|---|---|---|---|
| Requirements | 4 | Claude | FRD, NFRs, user stories |
| Specification | 2 | Claude | YAML DSL |
| Architecture | 2 | Claude | 6 Mermaid diagrams, DB design |
| Implementation | 5 | Claude | Working Next.js app |
| Testing | 2 | Claude | 54 test cases + traceability |
| Documentation | 2 | Claude | FRD HTML, user manual HTML |
| Runtime (Production) | 4 system prompts | OpenAI gpt-4o-mini | Live AI-augmented workflow |

**Total**: 17 build-time prompts (Claude) + 4 runtime system prompts (gpt-4o-mini) covering 7 SDLC phases.
