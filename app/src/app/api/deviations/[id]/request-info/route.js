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
    return NextResponse.json({ error: 'Please specify what information is needed (min 5 chars).' }, { status: 400 });
  }
  const db = getDb();
  const dev = db.prepare('SELECT * FROM deviation_requests WHERE id = ?').get(params.id);
  if (!dev) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (dev.state !== 'UNDER_REVIEW') {
    return NextResponse.json({ error: `Cannot request info from state ${dev.state}` }, { status: 400 });
  }
  db.prepare(`UPDATE deviation_requests SET state = 'INFO_REQUESTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(dev.id);
  recordAction(dev.id, user.id, 'REQUEST_INFO', 'UNDER_REVIEW', 'INFO_REQUESTED', comments);
  logAudit(dev.id, user.id, 'REQUEST_INFO', { role: user.role });
  return NextResponse.json({ ok: true });
}
