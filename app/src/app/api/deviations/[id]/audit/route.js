import { NextResponse } from 'next/server';
const { requireUser } = require('@/lib/api-helpers');
const { getDb } = require('@/lib/db');

export async function GET(_req, { params }) {
  const { user, error } = requireUser();
  if (error) return error;
  const db = getDb();
  const dev = db.prepare('SELECT * FROM deviation_requests WHERE id = ?').get(params.id);
  if (!dev) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (user.role === 'REQUESTOR' && dev.requestor_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const audits = db.prepare(`
    SELECT a.*, u.full_name AS actor_name, u.role AS actor_role
    FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
    WHERE a.deviation_id = ? ORDER BY a.created_at ASC
  `).all(params.id);
  const ais = db.prepare(`
    SELECT id, agent_type, model, confidence, tokens_used, duration_ms, created_at,
           substr(prompt, 1, 500) AS prompt_preview,
           substr(response, 1, 1000) AS response_preview
    FROM ai_invocations WHERE deviation_id = ? ORDER BY created_at ASC
  `).all(params.id);
  return NextResponse.json({ audits, ai_invocations: ais });
}
