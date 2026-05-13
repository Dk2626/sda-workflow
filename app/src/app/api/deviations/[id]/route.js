import { NextResponse } from 'next/server';
const { requireUser } = require('@/lib/api-helpers');
const { getDb } = require('@/lib/db');

export async function GET(_req, { params }) {
  const { user, error } = requireUser();
  if (error) return error;
  const db = getDb();
  const dev = db.prepare(`
    SELECT d.*, c.name AS customer_name, c.customer_code, c.tier AS customer_tier,
           c.monthly_revenue, c.kyc_status,
           s.service_type, s.bandwidth_mbps, s.sla_tier,
           u.full_name AS requestor_name, u.email AS requestor_email
    FROM deviation_requests d
    JOIN customers c ON c.id = d.customer_id
    LEFT JOIN services s ON s.id = d.service_id
    JOIN users u ON u.id = d.requestor_id
    WHERE d.id = ?
  `).get(params.id);
  if (!dev) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Visibility check
  if (user.role === 'REQUESTOR' && dev.requestor_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const actions = db.prepare(`
    SELECT a.*, u.full_name AS actor_name, u.role AS actor_role
    FROM approval_actions a JOIN users u ON u.id = a.actor_id
    WHERE a.deviation_id = ? ORDER BY a.created_at ASC
  `).all(params.id);

  // Parse JSON fields safely
  ['ai_risk_factors', 'ai_policy_citations'].forEach(k => {
    if (dev[k]) { try { dev[k] = JSON.parse(dev[k]); } catch { /* keep as string */ } }
  });

  return NextResponse.json({ deviation: dev, actions });
}
