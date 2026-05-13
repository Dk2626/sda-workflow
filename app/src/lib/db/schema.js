// Schema DDL — runs on init-db.js
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        TEXT    NOT NULL UNIQUE,
    full_name       TEXT    NOT NULL,
    email           TEXT    NOT NULL,
    role            TEXT    NOT NULL CHECK (role IN
                      ('REQUESTOR','L1_APPROVER','FINANCE_APPROVER',
                       'NETWORK_APPROVER','COMPLIANCE_APPROVER','AUDITOR','ADMIN')),
    active          INTEGER NOT NULL DEFAULT 1,
    password_hash   TEXT    NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS customers (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_code    TEXT    NOT NULL UNIQUE,
    name             TEXT    NOT NULL,
    tier             TEXT    NOT NULL CHECK (tier IN ('BRONZE','SILVER','GOLD','PLATINUM')),
    monthly_revenue  REAL    NOT NULL DEFAULT 0,
    kyc_status       TEXT    NOT NULL DEFAULT 'VERIFIED'
                      CHECK (kyc_status IN ('VERIFIED','PENDING','DEFERRED','EXPIRED'))
);

CREATE TABLE IF NOT EXISTS services (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id     INTEGER NOT NULL REFERENCES customers(id),
    service_type    TEXT    NOT NULL CHECK (service_type IN
                     ('MOBILE','BROADBAND','ENTERPRISE','MEDIA_STREAMING')),
    bandwidth_mbps  INTEGER NOT NULL DEFAULT 0,
    sla_tier        TEXT    NOT NULL DEFAULT 'STANDARD'
);
CREATE INDEX IF NOT EXISTS idx_services_customer ON services(customer_id);

CREATE TABLE IF NOT EXISTS deviation_requests (
    id                       INTEGER PRIMARY KEY AUTOINCREMENT,
    reference                TEXT    NOT NULL UNIQUE,
    deviation_type           TEXT    NOT NULL CHECK (deviation_type IN
                              ('DT_BILL_CR','DT_DATA_BW','DT_SLA_WV','DT_CONTENT','DT_KYC_DF')),
    customer_id              INTEGER NOT NULL REFERENCES customers(id),
    service_id               INTEGER REFERENCES services(id),
    requestor_id             INTEGER NOT NULL REFERENCES users(id),
    requested_action         TEXT    NOT NULL,
    amount                   REAL,
    currency                 TEXT    NOT NULL DEFAULT 'USD',
    duration_days            INTEGER,
    justification            TEXT    NOT NULL,
    ai_justification         TEXT,
    ai_risk_score            TEXT CHECK (ai_risk_score IN ('LOW','MEDIUM','HIGH')),
    ai_risk_factors          TEXT,
    ai_context_summary       TEXT,
    ai_policy_citations      TEXT,
    state                    TEXT    NOT NULL DEFAULT 'DRAFT' CHECK (state IN
                              ('DRAFT','SUBMITTED','UNDER_REVIEW','INFO_REQUESTED',
                               'APPROVED_L1','APPROVED_L2','FINAL_APPROVED',
                               'EXECUTED','REJECTED','EXPIRED','WITHDRAWN','ESCALATED')),
    current_approver_role    TEXT,
    sla_deadline             DATETIME,
    created_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_dev_state ON deviation_requests(state);
CREATE INDEX IF NOT EXISTS idx_dev_requestor ON deviation_requests(requestor_id);

CREATE TABLE IF NOT EXISTS approval_actions (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    deviation_id          INTEGER NOT NULL REFERENCES deviation_requests(id),
    actor_id              INTEGER NOT NULL REFERENCES users(id),
    action                TEXT    NOT NULL CHECK (action IN
                           ('SUBMIT','APPROVE','REJECT','REQUEST_INFO',
                            'OVERRIDE_RISK','WITHDRAW','ESCALATE','EXECUTE')),
    from_state            TEXT,
    to_state              TEXT,
    comments              TEXT,
    risk_override_reason  TEXT,
    created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_action_deviation ON approval_actions(deviation_id);

CREATE TABLE IF NOT EXISTS audit_log (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    deviation_id  INTEGER REFERENCES deviation_requests(id),
    actor_id      INTEGER REFERENCES users(id),
    event_type    TEXT NOT NULL,
    event_data    TEXT,
    ip_address    TEXT,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_deviation ON audit_log(deviation_id);

CREATE TABLE IF NOT EXISTS ai_invocations (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    deviation_id  INTEGER REFERENCES deviation_requests(id),
    agent_type    TEXT NOT NULL CHECK (agent_type IN
                   ('JUSTIFICATION','RISK_SCORING','CONTEXT_SUMMARY','POLICY_INTERPRETATION')),
    model         TEXT NOT NULL,
    prompt        TEXT NOT NULL,
    response      TEXT NOT NULL,
    confidence    REAL,
    tokens_used   INTEGER,
    duration_ms   INTEGER,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_deviation ON ai_invocations(deviation_id);

CREATE TABLE IF NOT EXISTS policies (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    code              TEXT NOT NULL UNIQUE,
    title             TEXT NOT NULL,
    content           TEXT NOT NULL,
    applies_to_types  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    token       TEXT PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    expires_at  DATETIME NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

module.exports = { SCHEMA };
