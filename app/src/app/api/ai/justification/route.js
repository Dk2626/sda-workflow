import { NextResponse } from 'next/server';
const { requireUser } = require('@/lib/api-helpers');
const { getDb } = require('@/lib/db');
const { generateJustification } = require('@/lib/ai-agents');

export async function POST(req) {
  const { user, error } = requireUser();
  if (error) return error;
  const { customer_id, service_id, deviation_type, requested_action, amount, duration_days, deviation_id } = await req.json();
  if (!customer_id || !deviation_type || !requested_action) {
    return NextResponse.json({ error: 'Missing required context' }, { status: 400 });
  }
  const db = getDb();
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
  const service = service_id ? db.prepare('SELECT * FROM services WHERE id = ?').get(service_id) : null;
  const result = await generateJustification({
    deviationId: deviation_id || null,
    deviationType: deviation_type,
    customer, service,
    requestedAction: requested_action,
    amount, duration: duration_days,
  });
  return NextResponse.json({ justification: result.text || '' });
}
