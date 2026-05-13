# SDA Workflow — Architecture Diagrams

> All diagrams are written in **Mermaid** for portability. Each can be rendered in GitHub, VS Code (Mermaid plugin), or `mmdc` CLI.

---

## 1. Application Architecture (Layered)

```mermaid
flowchart TB
    subgraph PRES["Presentation Layer (Next.js / React)"]
        UI1[Dashboard]
        UI2[Deviation Form]
        UI3[Deviation Detail / Approver Workbench]
        UI4[Audit Trail Viewer]
        UI5[Admin Config]
    end

    subgraph API["API Layer (Next.js Route Handlers)"]
        A1[Auth API]
        A2[Deviation API]
        A3[AI Orchestration API]
        A4[Audit API]
        A5[Reports API]
    end

    subgraph SVC["Service / Domain Layer"]
        S1[Deviation Service]
        S2[Workflow Engine - State Machine]
        S3[Approval Chain Resolver]
        S4[Notification Service]
        S5[Audit Service]
    end

    subgraph AGENTS["AI Agent Layer"]
        AG1[Justification Agent]
        AG2[Risk Scoring Agent]
        AG3[Context Summary Agent]
        AG4[Policy Interpretation Agent]
        AG5[PII Redactor]
    end

    subgraph DATA["Data Layer"]
        D1[(SQLite / PostgreSQL)]
        D2[Audit Log - append only]
        D3[AI Invocations Store]
    end

    subgraph EXT["External Systems"]
        E1[OpenAI API]
        E2[CRM / Customer Master - mocked]
        E3[Billing - mocked]
        E4[Notification Gateway - email stub]
    end

    UI1 & UI2 & UI3 & UI4 & UI5 --> A1
    UI1 & UI2 & UI3 & UI4 & UI5 --> A2
    UI3 --> A3
    UI4 --> A4
    UI1 --> A5

    A1 & A2 --> S1
    A2 --> S2
    S2 --> S3
    S2 --> S4
    S1 & S2 --> S5
    A3 --> AGENTS

    AGENTS --> AG5
    AG5 --> E1

    S1 & S5 & AGENTS --> DATA
    S4 --> E4
    S1 --> E2
    S1 -.executed.-> E3
```

---

## 2. Technical Architecture (Deployment)

```mermaid
flowchart LR
    USER([User Browser])

    subgraph EDGE["Edge / CDN"]
        CDN[Static Assets]
    end

    subgraph APP_TIER["Application Tier"]
        NEXT[Next.js Server<br/>Node 20]
        WORKER[Background Worker<br/>SLA timer / notifications]
    end

    subgraph DATA_TIER["Data Tier"]
        DB[(PostgreSQL<br/>Primary + Replica)]
        CACHE[(Redis<br/>Sessions + AI cache)]
    end

    subgraph OBS["Observability"]
        LOG[Structured Logs]
        MET[Metrics / Prometheus]
        TRC[OpenTelemetry Traces]
    end

    subgraph EXTERNAL["External Services"]
        OPENAI[OpenAI API]
        SSO[OIDC SSO]
        SMTP[SMTP Gateway]
    end

    USER -- HTTPS --> CDN
    USER -- API --> NEXT
    NEXT -- SQL --> DB
    NEXT -- KV --> CACHE
    NEXT -- HTTPS --> OPENAI
    NEXT -- HTTPS --> SSO
    WORKER -- SQL --> DB
    WORKER -- SMTP --> SMTP
    NEXT -.logs.-> LOG
    NEXT -.metrics.-> MET
    NEXT -.traces.-> TRC
```

---

## 3. End-to-End Sequence — Submit & Approve Flow

```mermaid
sequenceDiagram
    actor REQ as Requestor
    participant UI as Web UI
    participant API as Next.js API
    participant SVC as Deviation Service
    participant FSM as Workflow Engine
    participant AI as AI Orchestrator
    participant OPENAI as OpenAI API
    participant DB as Database
    participant NOTIF as Notification Service
    actor APPR as L1 Approver

    REQ->>UI: Fill deviation form
    UI->>API: POST /api/ai/justification
    API->>AI: invoke justification_agent(context)
    AI->>OPENAI: chat.completions.create
    OPENAI-->>AI: drafted text
    AI->>DB: store ai_invocation
    AI-->>API: drafted text
    API-->>UI: text rendered into form

    REQ->>UI: Submit
    UI->>API: POST /api/deviations/:id/submit
    API->>SVC: submit(id)
    SVC->>FSM: transition(DRAFT -> SUBMITTED)
    FSM->>AI: risk_scoring_agent
    AI->>OPENAI: chat.completions.create
    OPENAI-->>AI: {score, factors}
    AI->>DB: store invocation + score
    FSM->>DB: update state, sla_deadline
    FSM->>NOTIF: notify L1
    NOTIF-->>APPR: Email + in-app alert

    APPR->>UI: Open detail
    UI->>API: GET /deviations/:id (incl. context summary)
    API->>AI: context_summary_agent
    AI-->>API: 1-para summary
    APPR->>UI: Approve
    UI->>API: POST /deviations/:id/approve
    API->>FSM: transition(UNDER_REVIEW -> APPROVED_L1)
    FSM->>DB: write audit log + approval action
    FSM->>NOTIF: notify next approver
```

---

## 4. State Machine — Deviation Lifecycle

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> SUBMITTED: submit
    DRAFT --> WITHDRAWN: withdraw
    SUBMITTED --> UNDER_REVIEW: start review
    SUBMITTED --> ESCALATED: SLA breach
    UNDER_REVIEW --> APPROVED_L1: approve
    UNDER_REVIEW --> REJECTED: reject
    UNDER_REVIEW --> INFO_REQUESTED: request info
    INFO_REQUESTED --> UNDER_REVIEW: info provided
    APPROVED_L1 --> APPROVED_L2: L2 approve
    APPROVED_L1 --> REJECTED: reject
    APPROVED_L2 --> FINAL_APPROVED: compliance approve
    APPROVED_L2 --> FINAL_APPROVED: no compliance required
    APPROVED_L2 --> REJECTED: reject
    FINAL_APPROVED --> EXECUTED: execute
    FINAL_APPROVED --> EXPIRED: not executed in window
    REJECTED --> [*]
    EXECUTED --> [*]
    EXPIRED --> [*]
    WITHDRAWN --> [*]
```

---

## 5. AI Agent Architecture

```mermaid
flowchart LR
    subgraph ORCH["AI Orchestrator"]
        SEL[Agent Selector]
        RED[PII Redactor]
        CACHE[Response Cache]
        LOG[Invocation Logger]
    end

    subgraph AGENTS["Specialized Agents"]
        A1[Justification<br/>temp=0.4]
        A2[Risk Scoring<br/>temp=0.2 JSON]
        A3[Context Summary<br/>temp=0.3]
        A4[Policy<br/>temp=0.1 JSON]
    end

    APP[Application Code] --> SEL
    SEL --> RED --> CACHE
    CACHE -- miss --> A1 & A2 & A3 & A4
    CACHE -- hit --> APP
    A1 & A2 & A3 & A4 --> OPENAI[(OpenAI API)]
    A1 & A2 & A3 & A4 --> LOG
    LOG --> DB[(ai_invocations)]
```

---

## 6. Component Interaction (C4 — Container Level)

```mermaid
flowchart TB
    USER([Telecom Operations User])
    AUDITOR([Auditor])

    subgraph SDA["SDA Workflow Platform"]
        WEB[Web Application<br/>Next.js]
        DB[(Relational DB)]
        AIO[AI Orchestrator]
    end

    OPENAI[OpenAI Platform]
    CRM[CRM / Customer Master]
    BILL[Billing System]
    NOTIF[Email Gateway]

    USER -- uses --> WEB
    AUDITOR -- reviews logs --> WEB
    WEB -- reads/writes --> DB
    WEB -- invokes --> AIO
    AIO -- calls --> OPENAI
    WEB -- reads --> CRM
    WEB -- writes (on EXECUTE) --> BILL
    WEB -- sends --> NOTIF
```
