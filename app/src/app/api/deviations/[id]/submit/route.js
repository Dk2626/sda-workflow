import { NextResponse } from 'next/server';
const { requireUser } = require('@/lib/api-helpers');
const { getDb } = require('@/lib/db');
const { logAudit, recordAction, slaDeadline, nextApproverRole } = require('@/lib/workflow');
const { scoreRisk } = require('@/lib/ai-agents');

export async function POST(_req, { params }) {
  const { user, error } = requireUser();
  if (error) return error;
  const db = getDb();
  const dev = db.prepare('SELECT * FROM deviation_requests WHERE id = ?').get(params.id);
  if (!dev) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (dev.requestor_id !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (dev.state !== 'DRAFT') {
    return NextResponse.json({ error: `Cannot submit from state ${dev.state}` }, { status: 400 });
  }

  // Run AI risk scoring
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(dev.customer_id);
  const historicalCount = db.prepare(
    'SELECT COUNT(*) AS n FROM deviation_requests WHERE customer_id = ? AND id != ?'
  ).get(dev.customer_id, dev.id).n;

  const risk = await scoreRisk({
    deviationId: dev.id,
    deviationType: dev.deviation_type,
    customer,
    amount: dev.amount,
    duration: dev.duration_days,
    historicalCount,
  });

  // Next approver is always L1 first
  const nextRole = nextApproverRole(dev.deviation_type, dev.amount, []);

  db.prepare(`
    UPDATE deviation_requests
    SET state = 'UNDER_REVIEW',
        ai_risk_score = ?, ai_risk_factors = ?,
        current_approver_role = ?,
        sla_deadline = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(risk.score || 'MEDIUM', JSON.stringify(risk.factors || []), nextRole, slaDeadline(), dev.id);

  recordAction(dev.id, user.id, 'SUBMIT', 'DRAFT', 'UNDER_REVIEW', 'Submitted for review');
  logAudit(dev.id, user.id, 'SUBMIT', { risk_score: risk.score, next_role: nextRole });

  return NextResponse.json({ ok: true, risk });
}
