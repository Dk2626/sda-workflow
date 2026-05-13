import { NextResponse } from 'next/server';
const { requireUser } = require('@/lib/api-helpers');
const { getDb } = require('@/lib/db');

export async function GET() {
  const { user, error } = requireUser();
  if (error) return error;
  const customers = getDb().prepare(`
    SELECT c.*, (SELECT json_group_array(json_object('id', s.id, 'service_type', s.service_type, 'bandwidth_mbps', s.bandwidth_mbps, 'sla_tier', s.sla_tier))
                 FROM services s WHERE s.customer_id = c.id) AS services
    FROM customers c ORDER BY c.name
  `).all();
  // services arrives as JSON string; parse it
  customers.forEach(c => { try { c.services = JSON.parse(c.services); } catch { c.services = []; } });
  return NextResponse.json({ customers });
}
