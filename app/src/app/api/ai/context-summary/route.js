import { NextResponse } from 'next/server';
const { requireUser } = require('@/lib/api-helpers');
const { getDb } = require('@/lib/db');
const { summariseContext } = require('@/lib/ai-agents');

export async function POST(req) {
  const { user, error } = requireUser();
  if (error) return error;
  const { deviation_id } = await req.json();
  const db = getDb();
  const dev = db.prepare('SELECT * FROM deviation_requests WHERE id = ?').get(deviation_id);
  if (!dev) return NextResponse.json({ error: 'Deviation not found' }, { status: 404 });

  // Return cached if present
  if (dev.ai_context_summary) {
    return NextResponse.json({ summary: dev.ai_context_summary, cached: true });
  }
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(dev.customer_id);
  const service = dev.service_id ? db.prepare('SELECT * FROM services WHERE id = ?').get(dev.service_id) : null;
  const histN = db.prepare('SELECT COUNT(*) AS n FROM deviation_requests WHERE customer_id = ? AND id != ?').get(dev.customer_id, dev.id).n;
  const result = await summariseContext({ deviationId: dev.id, customer, service, historicalCount: histN });
  const text = result.text || '';
  db.prepare('UPDATE deviation_requests SET ai_context_summary = ? WHERE id = ?').run(text, dev.id);
  return NextResponse.json({ summary: text });
}
