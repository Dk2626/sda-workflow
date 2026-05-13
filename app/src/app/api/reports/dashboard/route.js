import { NextResponse } from 'next/server';
const { requireUser } = require('@/lib/api-helpers');
const { getDb } = require('@/lib/db');

export async function GET() {
  const { user, error } = requireUser();
  if (error) return error;
  const db = getDb();
  const totals = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN state IN ('SUBMITTED','UNDER_REVIEW','INFO_REQUESTED','APPROVED_L1','APPROVED_L2') THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN state = 'FINAL_APPROVED' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN state = 'REJECTED' THEN 1 ELSE 0 END) AS rejected,
      SUM(CASE WHEN state = 'EXECUTED' THEN 1 ELSE 0 END) AS executed,
      SUM(CASE WHEN ai_risk_score = 'HIGH' THEN 1 ELSE 0 END) AS high_risk,
      SUM(CASE WHEN sla_deadline IS NOT NULL AND sla_deadline < CURRENT_TIMESTAMP
                 AND state IN ('UNDER_REVIEW','INFO_REQUESTED') THEN 1 ELSE 0 END) AS overdue
    FROM deviation_requests
  `).get();

  const byType = db.prepare(`
    SELECT deviation_type, COUNT(*) AS n FROM deviation_requests GROUP BY deviation_type
  `).all();

  const recent = db.prepare(`
    SELECT d.id, d.reference, d.deviation_type, d.state, d.ai_risk_score, d.created_at,
           c.name AS customer_name
    FROM deviation_requests d JOIN customers c ON c.id = d.customer_id
    ORDER BY d.created_at DESC LIMIT 10
  `).all();

  return NextResponse.json({ totals, byType, recent });
}
