# SDA Workflow — Deliverables Index

**Use Case**: AI-Assisted Service Deviation & Approval Workflow for Telecom & Media
**Submitted**: 13 May 2026
**Build approach**: SPEC-Driven Development for SDLC using AI (Claude for build-time, OpenAI gpt-4o-mini for runtime)

---

## The 8 Required Deliverables

| # | Deliverable | Location | Format |
|---|---|---|---|
| 1 | **Functional Requirements Document (FRD)** | `docs/01_FRD.html` | Interactive HTML with sidebar nav, search, print-to-PDF |
| 2 | **SPECS & DSL** | `specs/00_main.yaml`, `specs/01_user_stories.yaml` | YAML DSL (entities, state machine, AI agents, API, validation) + 12 user stories |
| 3 | **Architecture Diagrams** | `diagrams/architecture.md` | 6 Mermaid diagrams: app architecture, deployment, sequence, state machine, AI orchestrator, C4 container |
| 4 | **Database Design** | `db/database_design.md` | Logical ER + physical DDL + indexing + SQLite→PostgreSQL migration notes |
| 5 | **Software Code & Working App** | `app/` | Next.js 14 full-stack app, 33 source files, 18 REST APIs, 6 UI pages, 4 AI agents |
| 6 | **Functional Test Scripts** | `tests/test_scripts_and_traceability.xlsx` (Sheet 1) | 54 test cases mapped to FRs/user stories |
| 7 | **Traceability Matrix** | `tests/test_scripts_and_traceability.xlsx` (Sheet 2) | All 25 FRs/NFRs → user story → spec → code file → test case |
| 8 | **End User Manual** | `manual/02_User_Manual.html` | Per-role guides (Requestor, Approver, Compliance, Auditor, Admin), workflows, FAQ, troubleshooting |

---

## Bonus Deliverables

| Item | Location | Description |
|---|---|---|
| **Prompt Log** | `prompts/prompt_log.md` | Every prompt used across 7 SDLC phases; demonstrates AI-driven build process |
| **AI Tool Usage Matrix** | `tests/test_scripts_and_traceability.xlsx` (Sheet 3) | Per-phase mapping of which AI was used for what artifact |
| **Custom AI Agent Layer** | `app/src/lib/ai-agents.js` | 4 specialized agents with PII redaction, schema-validated JSON output, graceful fallback |

---

## Quick Demo Path

```bash
cd app
npm install                      # installs Next.js, better-sqlite3, openai, etc.
cp .env.example .env.local       # then edit .env.local with your OPENAI_API_KEY
npm run init-db                  # initialize SQLite schema
npm run seed                     # load demo users + customers + policies
npm run dev                      # http://localhost:3000
```

**Login**: `alice` / `demo123` (Requestor) — try creating a Billing Credit > $5,000 to see the 3-tier (L1 → Finance → Compliance) approval chain.

---

## SDLC + AI Coverage

This project illustrates how AI accelerates **every** SDLC phase, not just code generation:

- **Requirements** — FRs, NFRs, and user stories drafted by Claude from a use-case PDF
- **Specification** — Single YAML DSL as the source of truth for code + tests + diagrams
- **Design** — Mermaid architecture diagrams, ER model, DDL
- **Implementation** — Full-stack Next.js app with 4 runtime AI agents
- **Testing** — 54 test cases derived from requirements
- **Traceability** — Forward and backward across all artifacts
- **Documentation** — FRD and user manual generated as polished HTML
- **Operation** — Runtime AI assists actual users (drafts, scores risk, summarises context, cites policies)

---

## Notes on Architecture Choices

- **SQLite over PostgreSQL** for the demo to keep `npm install` self-contained. Schema is portable; migration notes are in `db/database_design.md`.
- **Cookie session auth over OIDC** for the same reason. The auth module is replaceable.
- **gpt-4o-mini over larger models** — cost-effective, structured JSON output, fast enough for the workflow's 8s NFR.
- **PII redaction** baked into the orchestrator: customer names/codes are tokenised before any LLM call.
- **Append-only audit log + AI invocation log** captures everything the system did, what AI suggested, and how humans overrode it.
- **Graceful fallback** when AI is unavailable — synthetic responses keep the workflow demoable without an API key.
