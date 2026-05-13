import { NextResponse } from 'next/server';
const { requireUser } = require('@/lib/api-helpers');
const { getDb } = require('@/lib/db');
const { logAudit, recordAction } = require('@/lib/workflow');

const APPROVER_ROLES = ['L1_APPROVER', 'FINANCE_APPROVER', 'NETWORK_APPROVER', 'COMPLIANCE_APPROVER'];

export async function POST(req, { params }) {
  const { user, error } = requireUser(APPROVER_ROLES);
  if (error) return error;
  const { comments } = await req.json();
  if (!comments || comments.trim().length < 5) {
    return NextResponse.json({ error: 'A comment of at least 5 characters is required.' }, { status: 400 });
  }
  const db = getDb();
  const dev = db.prepare('SELECT * FROM deviation_requests WHERE id = ?').get(params.id);
  if (!dev) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (dev.requestor_id === user.id) {
    return NextResponse.json({ error: 'Requestor cannot reject own request.' }, { status: 403 });
  }
  if (!['UNDER_REVIEW', 'INFO_REQUESTED', 'APPROVED_L1', 'APPROVED_L2'].includes(dev.state)) {
    return NextResponse.json({ error: `Cannot reject from state ${dev.state}` }, { status: 400 });
  }
  // Compliance role can veto from any reviewable state.
  const fromState = dev.state;
  db.prepare(`UPDATE deviation_requests SET state = 'REJECTED', current_approver_role = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(dev.id);
  recordAction(dev.id, user.id, 'REJECT', fromState, 'REJECTED', comments);
  logAudit(dev.id, user.id, user.role === 'COMPLIANCE_APPROVER' ? 'COMPLIANCE_VETO' : 'REJECT', { role: user.role });
  return NextResponse.json({ ok: true });
}
