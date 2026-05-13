const { requireUser } = require('@/lib/api-helpers');
const { getDb } = require('@/lib/db');

function csvCell(v) {
  if (v == null) return '';
  const s = String(v).replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

export async function GET() {
  const { user, error } = requireUser();
  if (error) return error;
  const db = getDb();
  const rows = db.prepare(`
    SELECT d.reference, d.deviation_type, d.state, d.ai_risk_score, d.amount, d.currency,
           d.created_at, c.name AS customer, u.full_name AS requestor
    FROM deviation_requests d
    JOIN customers c ON c.id = d.customer_id
    JOIN users u ON u.id = d.requestor_id
    ORDER BY d.created_at DESC
  `).all();
  const header = 'reference,deviation_type,state,risk_score,amount,currency,created_at,customer,requestor';
  const body = rows.map(r => [r.reference, r.deviation_type, r.state, r.ai_risk_score, r.amount, r.currency, r.created_at, r.customer, r.requestor].map(csvCell).join(',')).join('\n');
  return new Response(header + '\n' + body, {
    status: 200,
    headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="deviations.csv"' },
  });
}
