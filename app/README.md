# SDA Workflow — AI-Assisted Service Deviation & Approval Platform

A working full-stack reference implementation of the **AI-Assisted Service Deviation & Approval Workflow** for Telecom & Media operators, built with Next.js 14, SQLite, and the OpenAI API.

---

## Features

- **Multi-role workflow**: Requestor → L1 → Finance/Network → Compliance, with veto rights and segregation of duties.
- **5 deviation types**: Billing Credit, Bandwidth Boost, SLA Waiver, Content Access, KYC Deferral — each with its own approval chain.
- **4 AI Agents**:
  - **Justification Agent** — drafts compliance-friendly business justifications.
  - **Risk Scoring Agent** — assigns LOW/MEDIUM/HIGH with weighted factors.
  - **Context Summary Agent** — one-paragraph approver brief.
  - **Policy Interpretation Agent** — surfaces relevant internal policies.
- **PII redaction** before any LLM call.
- **Human-in-the-loop** at every step: approvers can edit AI drafts, override risk scores (with mandatory written reason).
- **Append-only audit log** + AI invocation log, with model, prompt, response, tokens, and duration captured.
- **Graceful fallback** when the OpenAI key is missing or the API is unreachable — the workflow remains demoable.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file and add your OpenAI key
cp .env.example .env.local
# edit .env.local and set OPENAI_API_KEY

# 3. Initialize DB schema
npm run init-db

# 4. Seed demo data
npm run seed

# 5. Run the dev server
npm run dev
# open http://localhost:3000
```

## Demo Accounts (password `demo123`)

| Username | Role |
|----------|------|
| alice    | Requestor (Account Manager) |
| bob      | L1 Approver |
| finn     | Finance Approver |
| nina     | Network Approver |
| carol    | Compliance Approver |
| aud      | Auditor |
| admin    | System Admin |

## Demo Flow

1. Log in as **alice**.
2. Create a new deviation (e.g., Billing Credit, Acme Industries, $6,000 — large enough to require Compliance).
3. Click **✨ Generate with AI** to draft a justification.
4. Save & Submit. AI risk scoring runs in the background.
5. Log out, log in as **bob** (L1). Open the request — context summary auto-loads.
6. Approve with a comment.
7. Log in as **finn** (Finance). Approve.
8. Log in as **carol** (Compliance). Optionally veto, or approve to reach FINAL_APPROVED.
9. Back as **alice**, click Execute. Then **aud** can review the full audit trail.

## Tech

- **Framework**: Next.js 14 App Router (React server + client components)
- **DB**: SQLite via `better-sqlite3` (one file, no external service)
- **AI**: OpenAI `gpt-4o-mini` (configurable)
- **Auth**: Session-cookie + bcrypt
- **Styling**: Tailwind CSS

## Project Structure

```
src/
├── app/                # Next.js routes (pages + API)
├── lib/                # db, auth, workflow engine, AI agents
├── components/         # Shared React components
scripts/
├── init-db.js          # Creates the schema
└── seed.js             # Loads demo data
```

## Production Considerations (Out-of-Scope for Demo)

- Replace SQLite → PostgreSQL (driver swap; schema is portable).
- Replace session-cookie auth → NextAuth + OIDC (SSO).
- Move AI keys to a secrets manager (Vault, AWS Secrets Manager).
- Add OpenTelemetry / structured logs / Prometheus metrics.
- Background worker for SLA escalation & email-stub → real SMTP.

## License

Internal proof-of-concept. Not for production use as-is.
