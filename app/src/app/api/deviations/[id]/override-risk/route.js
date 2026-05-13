import { NextResponse } from 'next/server';
const { requireUser } = require('@/lib/api-helpers');
const { getDb } = require('@/lib/db');
const { logAudit, recordAction } = require('@/lib/workflow');

const APPROVER_ROLES = ['L1_APPROVER', 'FINANCE_APPROVER', 'NETWORK_APPROVER', 'COMPLIANCE_APPROVER'];

export async function POST(req, { params }) {
  const { user, error } = requireUser(APPROVER_ROLES);
  if (error) return error;
  const { new_score, reason } = await req.json();
  if (!['LOW', 'MEDIUM', 'HIGH'].includes(new_score)) {
    return NextResponse.json({ error: 'new_score must be LOW, MEDIUM, or HIGH' }, { status: 400 });
  }
  if (!reason || reason.trim().length < 20) {
    return NextResponse.json({ error: 'A reason of at least 20 characters is required.' }, { status: 400 });
  }
  const db = getDb();
  const dev = db.prepare('SELECT * FROM deviation_requests WHERE id = ?').get(params.id);
  if (!dev) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const oldScore = dev.ai_risk_score;
  db.prepare('UPDATE deviation_requests SET ai_risk_score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(new_score, dev.id);
  recordAction(dev.id, user.id, 'OVERRIDE_RISK', dev.state, dev.state, `Risk overridden from ${oldScore} to ${new_score}`, reason);
  logAudit(dev.id, user.id, 'OVERRIDE_RISK', { from: oldScore, to: new_score, reason });
  return NextResponse.json({ ok: true });
}
