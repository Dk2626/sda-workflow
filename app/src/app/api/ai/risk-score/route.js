import { NextResponse } from 'next/server';
const { requireUser } = require('@/lib/api-helpers');
const { getDb } = require('@/lib/db');
const { scoreRisk } = require('@/lib/ai-agents');

export async function POST(req) {
  const { user, error } = requireUser();
  if (error) return error;
  const { customer_id, deviation_type, amount, duration_days, deviation_id } = await req.json();
  const db = getDb();
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
  const historicalCount = db.prepare('SELECT COUNT(*) AS n FROM deviation_requests WHERE customer_id = ?').get(customer_id).n;
  const result = await scoreRisk({
    deviationId: deviation_id || null,
    deviationType: deviation_type, customer, amount, duration: duration_days, historicalCount,
  });
  return NextResponse.json({ risk: result });
}
