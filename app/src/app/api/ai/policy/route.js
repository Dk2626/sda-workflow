import { NextResponse } from 'next/server';
const { requireUser } = require('@/lib/api-helpers');
const { getDb } = require('@/lib/db');
const { interpretPolicy } = require('@/lib/ai-agents');

export async function POST(req) {
  const { user, error } = requireUser();
  if (error) return error;
  const { deviation_id } = await req.json();
  const db = getDb();
  const dev = db.prepare('SELECT * FROM deviation_requests WHERE id = ?').get(deviation_id);
  if (!dev) return NextResponse.json({ error: 'Deviation not found' }, { status: 404 });
  const policies = db.prepare('SELECT * FROM policies').all().filter(p => {
    try { return JSON.parse(p.applies_to_types).includes(dev.deviation_type); }
    catch { return false; }
  });
  const result = await interpretPolicy({
    deviationId: dev.id,
    deviationType: dev.deviation_type,
    requestedAction: dev.requested_action,
    policies,
  });
  const citations = result.citations || [];
  db.prepare('UPDATE deviation_requests SET ai_policy_citations = ? WHERE id = ?').run(JSON.stringify(citations), dev.id);
  return NextResponse.json({ citations });
}
