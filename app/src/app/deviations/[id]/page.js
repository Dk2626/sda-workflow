'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TopBar, { useCurrentUser } from '@/components/TopBar';

const STATE_LABELS = {
  DRAFT: 'Draft', SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under Review',
  INFO_REQUESTED: 'Info Requested', APPROVED_L1: 'Approved L1', APPROVED_L2: 'Approved L2',
  FINAL_APPROVED: 'Final Approved', EXECUTED: 'Executed', REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn', EXPIRED: 'Expired',
};

const APPROVER_ROLES = ['L1_APPROVER', 'FINANCE_APPROVER', 'NETWORK_APPROVER', 'COMPLIANCE_APPROVER'];

export default function DeviationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const me = useCurrentUser();
  const [dev, setDev] = useState(null);
  const [actions, setActions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [aiBusy, setAiBusy] = useState({ summary: false, policy: false });
  const [comments, setComments] = useState('');
  const [showOverride, setShowOverride] = useState(false);
  const [overrideForm, setOverrideForm] = useState({ new_score: 'MEDIUM', reason: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function reload() {
    fetch(`/api/deviations/${params.id}`).then(r => r.json()).then(d => {
      if (d.error) setError(d.error);
      else { setDev(d.deviation); setActions(d.actions || []); }
    });
  }
  useEffect(() => { reload(); }, [params.id]);

  // Auto-load context summary when an approver opens a UNDER_REVIEW or later request
  useEffect(() => {
    if (!dev || !me) return;
    if (APPROVER_ROLES.includes(me.role) && dev.state !== 'DRAFT' && !summary) {
      loadSummary();
    }
  }, [dev, me]);

  async function loadSummary() {
    setAiBusy(b => ({ ...b, summary: true }));
    const r = await fetch('/api/ai/context-summary', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviation_id: dev.id }),
    });
    const d = await r.json();
    setSummary(d.summary || '');
    setAiBusy(b => ({ ...b, summary: false }));
  }

  async function loadPolicy() {
    setAiBusy(b => ({ ...b, policy: true }));
    const r = await fetch('/api/ai/policy', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviation_id: dev.id }),
    });
    const d = await r.json();
    setPolicy(d.citations || []);
    setAiBusy(b => ({ ...b, policy: false }));
  }

  async function postAction(path, body) {
    if (!comments.trim() && !body) { setError('Please add a comment.'); return; }
    setBusy(true); setError('');
    const r = await fetch(`/api/deviations/${params.id}/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || { comments }),
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setError(d.error || 'Action failed'); return; }
    setComments(''); reload();
  }

  async function submitOverride() {
    if (overrideForm.reason.trim().length < 20) {
      setError('Override reason must be at least 20 characters.'); return;
    }
    await postAction('override-risk', overrideForm);
    setShowOverride(false);
    setOverrideForm({ new_score: 'MEDIUM', reason: '' });
  }

  async function submitDraft() {
    setBusy(true); setError('');
    const r = await fetch(`/api/deviations/${params.id}/submit`, { method: 'POST' });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setError(d.error || 'Submit failed'); return; }
    reload();
  }

  async function executeIt() {
    setBusy(true); setError('');
    const r = await fetch(`/api/deviations/${params.id}/execute`, { method: 'POST' });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setError(d.error || 'Execute failed'); return; }
    reload();
  }

  if (!dev || !me) return <><TopBar /><div className="p-6 text-slate-500">Loading…</div></>;

  const isOwner = dev.requestor_id === me.id;
  const isApprover = APPROVER_ROLES.includes(me.role);
  const canAct = isApprover && dev.current_approver_role === me.role &&
                 ['UNDER_REVIEW', 'INFO_REQUESTED'].includes(dev.state) &&
                 dev.requestor_id !== me.id;
  const canComplianceVeto = me.role === 'COMPLIANCE_APPROVER' &&
                            ['UNDER_REVIEW','INFO_REQUESTED','APPROVED_L1','APPROVED_L2'].includes(dev.state) &&
                            (dev.ai_risk_score === 'HIGH' || ['DT_KYC_DF','DT_CONTENT'].includes(dev.deviation_type));

  return (
    <>
      <TopBar />
      <main className="max-w-6xl mx-auto p-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="text-slate-500 text-sm">{dev.deviation_type}</div>
            <h1 className="text-2xl font-bold">{dev.reference}</h1>
            <div className="text-slate-500 text-sm mt-1">
              For <strong>{dev.customer_name}</strong> ({dev.customer_code}) · {dev.customer_tier}
            </div>
          </div>
          <div className="text-right">
            <span className={`badge ${dev.state === 'FINAL_APPROVED' || dev.state === 'EXECUTED' ? 'badge-final' : 'badge-state'}`}>
              {STATE_LABELS[dev.state] || dev.state}
            </span>
            {dev.ai_risk_score && (
              <div className="mt-2"><span className={`badge-${dev.ai_risk_score.toLowerCase()}`}>Risk: {dev.ai_risk_score}</span></div>
            )}
            {dev.current_approver_role && (
              <div className="mt-2 text-xs text-slate-500">Awaiting <strong>{dev.current_approver_role}</strong></div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column - request data */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h2 className="font-semibold mb-3">Request Detail</h2>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <Field label="Requestor" value={dev.requestor_name} />
                <Field label="Created" value={new Date(dev.created_at).toLocaleString()} />
                {dev.amount != null && <Field label="Amount" value={`${dev.currency} ${dev.amount.toLocaleString()}`} />}
                {dev.duration_days != null && <Field label="Duration" value={`${dev.duration_days} days`} />}
                {dev.service_type && <Field label="Service" value={`${dev.service_type} · ${dev.bandwidth_mbps}Mbps · ${dev.sla_tier}`} />}
                <Field label="KYC Status" value={dev.kyc_status} />
                {dev.sla_deadline && <Field label="SLA Deadline" value={new Date(dev.sla_deadline).toLocaleString()} />}
              </div>
              <div className="mt-4">
                <div className="label">Requested Action</div>
                <div className="bg-slate-50 p-3 rounded">{dev.requested_action}</div>
              </div>
              <div className="mt-4">
                <div className="label">Justification</div>
                <div className="bg-slate-50 p-3 rounded whitespace-pre-wrap">{dev.justification}</div>
              </div>
            </div>

            {/* AI risk factors */}
            {dev.ai_risk_factors && Array.isArray(dev.ai_risk_factors) && dev.ai_risk_factors.length > 0 && (
              <div className="card">
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  <span>AI Risk Assessment</span>
                  <span className={`badge-${(dev.ai_risk_score || 'medium').toLowerCase()}`}>{dev.ai_risk_score}</span>
                </h2>
                <ul className="space-y-1 text-sm">
                  {dev.ai_risk_factors.map((f, i) => (
                    <li key={i} className="flex justify-between border-b border-slate-100 py-1">
                      <span className="text-slate-700">{f.factor}</span>
                      <span className="text-slate-500 text-xs">weight {f.weight} · {f.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action history */}
            <div className="card">
              <h2 className="font-semibold mb-3">Action History</h2>
              {actions.length === 0 ? (
                <p className="text-slate-400 text-sm">No actions yet.</p>
              ) : (
                <ul className="space-y-3">
                  {actions.map(a => (
                    <li key={a.id} className="border-l-2 border-[#635bff] pl-3 py-1">
                      <div className="text-sm">
                        <strong>{a.actor_name}</strong> <span className="text-slate-400">({a.actor_role})</span>
                        {' '}<span className="text-[#635bff]">{a.action}</span>
                        {' '}<span className="text-slate-400">{a.from_state} → {a.to_state}</span>
                      </div>
                      {a.comments && <div className="text-sm text-slate-600 mt-1">{a.comments}</div>}
                      {a.risk_override_reason && (
                        <div className="text-xs mt-1 bg-amber-50 text-amber-700 p-2 rounded">
                          <strong>Override reason:</strong> {a.risk_override_reason}
                        </div>
                      )}
                      <div className="text-xs text-slate-400 mt-1">{new Date(a.created_at).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right column - AI panels + actions */}
          <div className="space-y-6">
            {(isApprover || me.role === 'AUDITOR') && (
              <>
                <div className="card">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="font-semibold">AI Context Summary</h2>
                    {!summary && <button onClick={loadSummary} disabled={aiBusy.summary} className="text-xs text-[#635bff]">
                      {aiBusy.summary ? '…' : 'Load'}</button>}
                  </div>
                  {summary ? (
                    <p className="text-sm text-slate-700">{summary}</p>
                  ) : (
                    <p className="text-sm text-slate-400">{aiBusy.summary ? 'Generating…' : 'Click "Load" to generate a summary.'}</p>
                  )}
                </div>

                <div className="card">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="font-semibold">Relevant Policies</h2>
                    <button onClick={loadPolicy} disabled={aiBusy.policy} className="text-xs text-[#635bff]">
                      {aiBusy.policy ? '…' : (policy ? 'Reload' : 'Load')}</button>
                  </div>
                  {policy && policy.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {policy.map((p, i) => (
                        <li key={i} className="border border-slate-200 rounded p-2">
                          <div className="font-medium">{p.policy_code} — {p.title}</div>
                          <div className="text-xs text-slate-600 mt-1">{p.snippet}</div>
                          <div className="text-xs text-slate-400 mt-1">relevance {Math.round((p.relevance || 0) * 100)}%</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-400">{aiBusy.policy ? 'Generating…' : 'Click "Load" to fetch citations.'}</p>
                  )}
                </div>
              </>
            )}

            {/* Submit draft */}
            {dev.state === 'DRAFT' && isOwner && (
              <div className="card">
                <h2 className="font-semibold mb-3">Submit for Approval</h2>
                <p className="text-sm text-slate-600 mb-3">This will run AI risk scoring and route to L1 approver.</p>
                <button onClick={submitDraft} disabled={busy} className="btn-primary w-full">
                  {busy ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            )}

            {/* Approve actions */}
            {(canAct || canComplianceVeto) && (
              <div className="card">
                <h2 className="font-semibold mb-3">Approver Actions</h2>
                <textarea className="input mb-3" rows="3" placeholder="Add a mandatory comment (min 5 chars)…"
                          value={comments} onChange={e => setComments(e.target.value)} />
                <div className="flex flex-col gap-2">
                  {canAct && (
                    <>
                      <button onClick={() => postAction('approve')} disabled={busy} className="btn-success">Approve</button>
                      <button onClick={() => postAction('request-info')} disabled={busy} className="btn-ghost">Request Info</button>
                    </>
                  )}
                  <button onClick={() => postAction('reject')} disabled={busy} className="btn-danger">
                    {me.role === 'COMPLIANCE_APPROVER' ? 'Veto / Reject' : 'Reject'}
                  </button>
                  <button onClick={() => setShowOverride(s => !s)} className="text-xs text-[#635bff] mt-2">
                    {showOverride ? 'Cancel override' : 'Override AI risk score'}
                  </button>
                  {showOverride && (
                    <div className="border border-amber-200 bg-amber-50 p-3 rounded mt-2">
                      <select className="input mb-2" value={overrideForm.new_score} onChange={e => setOverrideForm(o => ({ ...o, new_score: e.target.value }))}>
                        <option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option>
                      </select>
                      <textarea className="input mb-2" rows="2" placeholder="Reason (min 20 chars)…" value={overrideForm.reason} onChange={e => setOverrideForm(o => ({ ...o, reason: e.target.value }))} />
                      <button onClick={submitOverride} disabled={busy} className="btn-primary w-full">Save Override</button>
                    </div>
                  )}
                </div>
                {error && <div className="text-rose-600 text-sm mt-2">{error}</div>}
              </div>
            )}

            {/* Execute final-approved */}
            {dev.state === 'FINAL_APPROVED' && (isOwner || me.role === 'ADMIN') && (
              <div className="card">
                <h2 className="font-semibold mb-3">Execute</h2>
                <p className="text-sm text-slate-600 mb-3">All approvals received. Confirm downstream action has been completed.</p>
                <button onClick={executeIt} disabled={busy} className="btn-primary w-full">Mark Executed</button>
              </div>
            )}

            {/* Audit shortcut */}
            <a href={`/audit?id=${dev.id}`} className="text-sm text-[#635bff] block text-center">View full audit trail →</a>
          </div>
        </div>
      </main>
    </>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
