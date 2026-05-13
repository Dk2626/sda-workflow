#!/usr/bin/env node
// Seed data for demo. Creates users (all password 'demo123'), customers, services, policies.
const bcrypt = require('bcryptjs');
const { getDb } = require('../src/lib/db');
const { SCHEMA } = require('../src/lib/db/schema');

const db = getDb();
db.exec(SCHEMA);

// Reset (idempotent re-seed)
db.exec(`
DELETE FROM sessions;
DELETE FROM ai_invocations;
DELETE FROM audit_log;
DELETE FROM approval_actions;
DELETE FROM deviation_requests;
DELETE FROM services;
DELETE FROM customers;
DELETE FROM policies;
DELETE FROM users;
`);

const pw = bcrypt.hashSync('demo123', 10);
const users = [
  ['alice',  'Alice Account',     'alice@telco.com',  'REQUESTOR'],
  ['bob',    'Bob L1 Lead',       'bob@telco.com',    'L1_APPROVER'],
  ['finn',   'Finn Finance',      'finn@telco.com',   'FINANCE_APPROVER'],
  ['nina',   'Nina Network',      'nina@telco.com',   'NETWORK_APPROVER'],
  ['carol',  'Carol Compliance',  'carol@telco.com',  'COMPLIANCE_APPROVER'],
  ['aud',    'Audra Auditor',     'aud@telco.com',    'AUDITOR'],
  ['admin',  'System Admin',      'admin@telco.com',  'ADMIN'],
];
const uStmt = db.prepare('INSERT INTO users (username, full_name, email, role, password_hash) VALUES (?, ?, ?, ?, ?)');
users.forEach(u => uStmt.run(...u, pw));

const customers = [
  ['CUST-001', 'Acme Industries',   'PLATINUM', 12500.00, 'VERIFIED'],
  ['CUST-002', 'Globex Media',      'GOLD',      6800.00, 'VERIFIED'],
  ['CUST-003', 'Initech Telecom',   'SILVER',    2400.00, 'PENDING'],
  ['CUST-004', 'Wayne Enterprises', 'PLATINUM', 22500.00, 'VERIFIED'],
  ['CUST-005', 'Stark Networks',    'GOLD',     11200.00, 'VERIFIED'],
];
const cStmt = db.prepare('INSERT INTO customers (customer_code, name, tier, monthly_revenue, kyc_status) VALUES (?, ?, ?, ?, ?)');
const cIds = customers.map(c => cStmt.run(...c).lastInsertRowid);

const services = [
  [cIds[0], 'ENTERPRISE',      1000, 'PREMIUM'],
  [cIds[1], 'MEDIA_STREAMING',  500, 'STANDARD'],
  [cIds[2], 'BROADBAND',        100, 'STANDARD'],
  [cIds[3], 'ENTERPRISE',     2000, 'PREMIUM'],
  [cIds[4], 'ENTERPRISE',      800, 'PREMIUM'],
];
const sStmt = db.prepare('INSERT INTO services (customer_id, service_type, bandwidth_mbps, sla_tier) VALUES (?, ?, ?, ?)');
services.forEach(s => sStmt.run(...s));

const policies = [
  ['POL-BILL-001', 'Billing Credit Authority Matrix',
   'Operations Managers may issue credits up to USD 1,000 with L1 approval. Credits between USD 1,001 and 5,000 require Finance approval. Credits exceeding USD 5,000 require additional Compliance review and documented business justification.',
   '["DT_BILL_CR"]'],
  ['POL-NET-002',  'Bandwidth Boost Policy',
   'Temporary bandwidth boosts are permitted for up to 30 days. Boosts exceeding 50% of contracted capacity require Network architect approval and customer written acknowledgement.',
   '["DT_DATA_BW"]'],
  ['POL-SLA-003',  'SLA Waiver Guidelines',
   'SLA waivers must be linked to a documented planned-maintenance or force-majeure event. All waivers require Network and Compliance sign-off and a customer notification of at least 72 hours where feasible.',
   '["DT_SLA_WV"]'],
  ['POL-KYC-004',  'KYC Deferral Procedure',
   'Short-term KYC deferrals are limited to 7 calendar days, contingent on a customer commitment to submit required documents. Deferrals beyond 7 days require Compliance sign-off. Repeat deferrals on the same customer are not permitted.',
   '["DT_KYC_DF"]'],
  ['POL-CON-005',  'Content Access Exception Standard',
   'Geo-locked content access exceptions are allowed for enterprise or VIP customers when contractually permitted. Exceptions must be time-bound and recorded with the contractual clause reference.',
   '["DT_CONTENT"]'],
];
const pStmt = db.prepare('INSERT INTO policies (code, title, content, applies_to_types) VALUES (?, ?, ?, ?)');
policies.forEach(p => pStmt.run(...p));

console.log('Seed complete. Users created (password "demo123" for all):');
users.forEach(u => console.log(`  ${u[0].padEnd(8)} -> ${u[3]}`));
