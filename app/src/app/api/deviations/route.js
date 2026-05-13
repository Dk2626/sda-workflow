import { NextResponse } from 'next/server';
const { requireUser } = require('@/lib/api-helpers');
const { getDb } = require('@/lib/db');
const { generateReference, logAudit } = require('@/lib/workflow');

export async function GET() {
  const { user, error } = requireUser();
  if (error) return error;
  const db = getDb();
  let rows;
  // Role-based filtering: requestors only see their own; approvers/auditors/admin see all.
  if (user.role === 'REQUESTOR') {
    rows = db.prepare(`
      SELECT d.*, c.name AS customer_name, c.tier AS customer_tier, u.full_name AS requestor_name
      FROM deviation_requests d
      JOIN customers c ON c.id = d.customer_id
      JOIN users u ON u.id = d.requestor_id
      WHERE d.requestor_id = ?
      ORDER BY d.created_at DESC
    `).all(user.id);
  } else {
    rows = db.prepare(`
      SELECT d.*, c.name AS customer_name, c.tier AS customer_tier, u.full_name AS requestor_name
      FROM deviation_requests d
      JOIN customers c ON c.id = d.customer_id
      JOIN users u ON u.id = d.requestor_id
      ORDER BY d.created_at DESC
    `).all();
  }
  return NextResponse.json({ deviations: rows });
}

export async function POST(req) {
  const { user, error } = requireUser(['REQUESTOR', 'ADMIN']);
  if (error) return error;
  const body = await req.json();
  const { customer_id, service_id, deviation_type, requested_action, amount, currency, duration_days, justification, ai_justification } = body;

  // Validation
  if (!customer_id || !deviation_type || !requested_action || !justification) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (justification.length < 50 || justification.length > 4000) {
    return NextResponse.json({ error: 'Justification must be 50-4000 characters' }, { status: 400 });
  }
  if (amount != null && amount < 0) {
    return NextResponse.json({ error: 'Amount must be non-negative' }, { status: 400 });
  }

  const reference = generateReference();
  const db = getDb();
  const info = db.prepare(`
    INSERT INTO deviation_requests
      (reference, deviation_type, customer_id, service_id, requestor_id,
       requested_action, amount, currency, duration_days, justification, ai_justification, state)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT')
  `).run(reference, deviation_type, customer_id, service_id || null, user.id,
         requested_action, amount || null, currency || 'USD', duration_days || null,
         justification, ai_justification || null);

  logAudit(info.lastInsertRowid, user.id, 'CREATE_DRAFT', { reference, deviation_type });
  return NextResponse.json({ id: info.lastInsertRowid, reference }, { status: 201 });
}
