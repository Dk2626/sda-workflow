# AI-Assisted Service Deviation & Approval Workflow

> **TCS AI Fridays — SPEC-Driven Development for SDLC using AI** · Telecom & Media Use Case

A reference implementation showing how AI can accelerate every phase of the SDLC — from requirements analysis to runtime — built around a real business workflow: routing operational deviations (billing credits, bandwidth boosts, SLA waivers, content access exceptions, KYC deferrals) through multi-level approvals with AI assistance and full auditability.

---

## 📦 Deliverables

| # | Deliverable | File |
|---|---|---|
| 1 | Functional Requirements Document | [`docs/01_FRD.html`](docs/01_FRD.html) |
| 2 | SPECS & DSL | [`specs/00_main.yaml`](specs/00_main.yaml), [`specs/01_user_stories.yaml`](specs/01_user_stories.yaml) |
| 3 | Architecture Diagrams | [`diagrams/architecture.md`](diagrams/architecture.md) |
| 4 | Database Design | [`db/database_design.md`](db/database_design.md) |
| 5 | Software Code & Working App | [`app/`](app/) |
| 6 | Functional Test Scripts | [`tests/test_scripts_and_traceability.xlsx`](tests/test_scripts_and_traceability.xlsx) (Sheet 1) |
| 7 | Traceability Matrix | [`tests/test_scripts_and_traceability.xlsx`](tests/test_scripts_and_traceability.xlsx) (Sheet 2) |
| 8 | End User Manual | [`manual/02_User_Manual.html`](manual/02_User_Manual.html) |

**Bonus:** Prompt log ([`prompts/prompt_log.md`](prompts/prompt_log.md)) · AI Tool Usage Matrix (Sheet 3 of the Excel) · 4-agent AI orchestrator with PII redaction and graceful fallback

See [`INDEX.md`](INDEX.md) for the full breakdown.

---

## 🚀 Quick Start

```bash
# Clone
git clone <your-repo-url>
cd sda-workflow/app

# Install dependencies
npm install

# Configure environment (works without an API key — uses fallback mocks)
cp .env.example .env.local
# Optionally edit .env.local and add your OPENAI_API_KEY for real AI calls

# Initialize and seed database
npm run init-db
npm run seed

# Run the app
npm run dev
# Open http://localhost:3000
```

**Login** with any of the seeded accounts (all use password `demo123`):

| Username | Role |
|----------|------|
| `alice`  | Requestor (Account Manager) |
| `bob`    | L1 Approver |
| `finn`   | Finance Approver |
| `nina`   | Network Approver |
| `carol`  | Compliance Approver |
| `aud`    | Auditor |
| `admin`  | System Admin |

---

## 🎬 Demo Flow

1. Sign in as **alice**, click **+ New Deviation**
2. Choose **Billing Credit**, customer **Acme Industries**, amount **$6,000**
3. Click **✨ Generate with AI** for an auto-drafted justification
4. Click **Save & Submit for Approval** — AI risk scoring runs automatically
5. Sign out, sign in as **bob** (L1) — context summary loads automatically; approve
6. Sign in as **finn** (Finance) — approve
7. Sign in as **carol** (Compliance) — approve or **Veto** (because amount > $5K)
8. Back as **alice**, click **Mark Executed**
9. Sign in as **aud** to view the full audit trail with all AI invocations

---

## 🧱 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: SQLite (`better-sqlite3`) — portable to PostgreSQL
- **AI**: OpenAI `gpt-4o-mini` with graceful fallback to synthetic responses
- **Auth**: Session cookies + bcrypt
- **UI**: React 18 + Tailwind CSS

---

## 🤖 AI Architecture

Four specialized agents, orchestrated server-side with PII redaction and audit logging:

| Agent | Purpose | Temperature | Output |
|---|---|---|---|
| **Justification** | Draft compliance-friendly business justifications | 0.4 | Plain text |
| **Risk Scoring** | Compute LOW/MEDIUM/HIGH with weighted factors | 0.2 | Structured JSON |
| **Context Summary** | One-paragraph customer & service brief for approvers | 0.3 | Plain text |
| **Policy Interpretation** | Surface relevant internal policies with citations | 0.1 | Structured JSON |

Every AI call is logged to the `ai_invocations` table with model, prompt, response, tokens, duration, and confidence — making the system fully auditable.

---

## 📁 Project Structure

```
sda-workflow/
├── docs/01_FRD.html                          # Deliverable 1: FRD
├── specs/                                    # Deliverable 2: DSL
│   ├── 00_main.yaml
│   └── 01_user_stories.yaml
├── diagrams/architecture.md                  # Deliverable 3: Architecture
├── db/database_design.md                     # Deliverable 4: Database design
├── app/                                      # Deliverable 5: Working app
│   ├── src/
│   │   ├── app/                              # Next.js pages + API routes
│   │   ├── lib/                              # DB, auth, workflow, AI agents
│   │   └── components/
│   ├── scripts/                              # init-db, seed
│   ├── package.json
│   └── README.md
├── tests/test_scripts_and_traceability.xlsx  # Deliverables 6 + 7 + AI Usage
├── manual/02_User_Manual.html                # Deliverable 8: User manual
├── prompts/prompt_log.md                     # Bonus: SDLC prompt log
└── INDEX.md                                  # Deliverables index
```

---

## 🔒 No API Key? No Problem

The app works without an OpenAI API key. The `synthFallback` function in `app/src/lib/ai-agents.js` returns realistic mock responses, and the workflow remains fully demoable. Real AI calls are activated automatically once `OPENAI_API_KEY` is set in `.env.local`.

---

## 📜 License

Internal proof-of-concept for TCS AI Fridays. Not for production use as-is.

---

**Author**: Built collaboratively with Claude (Anthropic) for build-time SDLC artifacts, and OpenAI gpt-4o-mini for runtime AI agents.
