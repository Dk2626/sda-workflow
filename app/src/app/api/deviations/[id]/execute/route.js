import { NextResponse } from 'next/server';
const { requireUser } = require('@/lib/api-helpers');
const { getDb } = require('@/lib/db');
const { logAudit, recordAction } = require('@/lib/workflow');

export async function POST(_req, { params }) {
  const { user, error } = requireUser(['REQUESTOR', 'ADMIN']);
  if (error) return error;
  const db = getDb();
  const dev = db.prepare('SELECT * FROM deviation_requests WHERE id = ?').get(params.id);
  if (!dev) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (dev.state !== 'FINAL_APPROVED') {
    return NextResponse.json({ error: `Cannot execute from state ${dev.state}` }, { status: 400 });
  }
  if (user.role !== 'ADMIN' && dev.requestor_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  db.prepare(`UPDATE deviation_requests SET state = 'EXECUTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(dev.id);
  recordAction(dev.id, user.id, 'EXECUTE', 'FINAL_APPROVED', 'EXECUTED', 'Downstream action executed');
  logAudit(dev.id, user.id, 'EXECUTE', {});
  return NextResponse.json({ ok: true });
}
