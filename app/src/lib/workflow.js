// Workflow engine — state machine + approval chain resolver.
const { getDb } = require('./db');

// Approval chains per deviation type.
const CHAINS = {
  DT_BILL_CR: { base: ['L1_APPROVER', 'FINANCE_APPROVER'], conditional: { ifAmountGt: 5000, append: ['COMPLIANCE_APPROVER'] } },
  DT_DATA_BW: { base: ['L1_APPROVER', 'NETWORK_APPROVER'] },
  DT_SLA_WV:  { base: ['L1_APPROVER', 'NETWORK_APPROVER', 'COMPLIANCE_APPROVER'] },
  DT_CONTENT: { base: ['L1_APPROVER', 'COMPLIANCE_APPROVER'] },
  DT_KYC_DF:  { base: ['L1_APPROVER', 'COMPLIANCE_APPROVER'] },
};

function chainFor(type, amount) {
  const c = CHAINS[type];
  if (!c) return ['L1_APPROVER'];
  let chain = [...c.base];
  if (c.conditional && amount && amount > c.conditional.ifAmountGt) {
    chain = chain.concat(c.conditional.append);
  }
  return chain;
}

// Returns the next approver role given current chain + already approved tiers.
function nextApproverRole(type, amount, completedRoles) {
  const chain = chainFor(type, amount);
  for (const role of chain) {
    if (!completedRoles.includes(role)) return role;
  }
  return null;
}

function logAudit(deviationId, actorId, eventType, eventData) {
  getDb().prepare(
    'INSERT INTO audit_log (deviation_id, actor_id, event_type, event_data) VALUES (?, ?, ?, ?)'
  ).run(deviationId, actorId || null, eventType, JSON.stringify(eventData || {}));
}

function recordAction(deviationId, actorId, action, fromState, toState, comments, riskReason) {
  getDb().prepare(`
    INSERT INTO approval_actions (deviation_id, actor_id, action, from_state, to_state, comments, risk_override_reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(deviationId, actorId, action, fromState, toState, comments || '', riskReason || null);
}

function generateReference() {
  const year = new Date().getFullYear();
  const db = getDb();
  const row = db.prepare(`SELECT COUNT(*) AS n FROM deviation_requests WHERE reference LIKE ?`).get(`SDA-${year}-%`);
  const n = (row.n || 0) + 1;
  return `SDA-${year}-${String(n).padStart(5, '0')}`;
}

// Sla deadline: 8 working hours from now (simplified: 8 hours).
function slaDeadline() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
}

module.exports = { CHAINS, chainFor, nextApproverRole, logAudit, recordAction, generateReference, slaDeadline };
