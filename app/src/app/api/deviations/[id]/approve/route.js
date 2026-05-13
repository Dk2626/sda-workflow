import { NextResponse } from 'next/server';
const { requireUser } = require('@/lib/api-helpers');
const { getDb } = require('@/lib/db');
const { logAudit, recordAction, slaDeadline, nextApproverRole, chainFor } = require('@/lib/workflow');

const APPROVER_ROLES = ['L1_APPROVER', 'FINANCE_APPROVER', 'NETWORK_APPROVER', 'COMPLIANCE_APPROVER'];

export async function POST(req, { params }) {
  const { user, error } = requireUser(APPROVER_ROLES);
  if (error) return error;
  const { comments } = await req.json();
  if (!comments || comments.trim().length < 5) {
    return NextResponse.json({ error: 'A comment of at least 5 characters is required.' }, { status: 400 });
  }

  const db = getDb();
  const dev = db.prepare('SELECT * FROM deviation_requests WHERE id = ?').get(params.id);
  if (!dev) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Segregation of duties
  if (dev.requestor_id === user.id) {
    return NextResponse.json({ error: 'Requestor cannot approve own request.' }, { status: 403 });
  }
  if (dev.state !== 'UNDER_REVIEW' && dev.state !== 'INFO_REQUESTED') {
    return NextResponse.json({ error: `Cannot approve from state ${dev.state}` }, { status: 400 });
  }
  if (dev.current_approver_role !== user.role) {
    return NextResponse.json({ error: `This request is awaiting ${dev.current_approver_role}, not ${user.role}.` }, { status: 403 });
  }

  // Compute completed roles based on prior approvals
  const priorApprovals = db.prepare(`
    SELECT DISTINCT u.role FROM approval_actions a
    JOIN users u ON u.id = a.actor_id
    WHERE a.deviation_id = ? AND a.action = 'APPROVE'
  `).all(dev.id).map(r => r.role);
  const completedRoles = [...priorApprovals, user.role];
  const nextRole = nextApproverRole(dev.deviation_type, dev.amount, completedRoles);

  let newState;
  if (!nextRole) newState = 'FINAL_APPROVED';
  else {
    // Determine which "tier" label
    const chain = chainFor(dev.deviation_type, dev.amount);
    const idxAfter = completedRoles.length; // how many done
    if (idxAfter === 1) newState = 'APPROVED_L1';
    else if (idxAfter === 2) newState = 'APPROVED_L2';
    else newState = 'UNDER_REVIEW';
  }
  const stateForUpdate = newState === 'FINAL_APPROVED' ? 'FINAL_APPROVED' : 'UNDER_REVIEW';
  const fromState = dev.state;

  db.prepare(`
    UPDATE deviation_requests
    SET state = ?, current_approver_role = ?, sla_deadline = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(stateForUpdate, nextRole, nextRole ? slaDeadline() : null, dev.id);

  recordAction(dev.id, user.id, 'APPROVE', fromState, stateForUpdate, comments);
  logAudit(dev.id, user.id, 'APPROVE', { role: user.role, next_role: nextRole, intermediate_state: newState });

  return NextResponse.json({ ok: true, state: stateForUpdate, next_role: nextRole });
}
