'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/TopBar';

const TYPES = [
  { code: 'DT_BILL_CR', label: 'Billing Credit Beyond Limit',     hasAmount: true,  hasDuration: false },
  { code: 'DT_DATA_BW', label: 'Temporary Bandwidth Boost',       hasAmount: false, hasDuration: true  },
  { code: 'DT_SLA_WV',  label: 'SLA Waiver',                      hasAmount: false, hasDuration: true  },
  { code: 'DT_CONTENT', label: 'Content Access Exception',        hasAmount: false, hasDuration: true  },
  { code: 'DT_KYC_DF',  label: 'KYC Deferral',                    hasAmount: false, hasDuration: true  },
];

export default function NewDeviationPage() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({
    deviation_type: 'DT_BILL_CR',
    customer_id: '', service_id: '',
    requested_action: '', amount: '', duration_days: '',
    justification: '',
  });
  const [aiBusy, setAiBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(d => setCustomers(d.customers || []));
  }, []);

  const typeMeta = TYPES.find(t => t.code === form.deviation_type) || TYPES[0];
  const customer = customers.find(c => c.id === Number(form.customer_id));
  const services = customer?.services || [];

  function update(field, val) { setForm(f => ({ ...f, [field]: val })); }

  async function generateJustification() {
    setAiBusy(true); setError('');
    try {
      const r = await fetch('/api/ai/justification', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: Number(form.customer_id) || null,
          service_id: Number(form.service_id) || null,
          deviation_type: form.deviation_type,
          requested_action: form.requested_action,
          amount: form.amount ? Number(form.amount) : null,
          duration_days: form.duration_days ? Number(form.duration_days) : null,
        }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'AI request failed'); }
      else { setForm(f => ({ ...f, justification: data.justification || '' })); }
    } catch (e) { setError('Network error.'); }
    setAiBusy(false);
  }

  async function submit(submitImmediately) {
    if (!form.customer_id || !form.requested_action || !form.justification) {
      setError('Please complete customer, action, and justification.'); return;
    }
    if (form.justification.length < 50) {
      setError('Justification must be at least 50 characters.'); return;
    }
    setSubmitting(true); setError('');
    try {
      const r = await fetch('/api/deviations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          customer_id: Number(form.customer_id),
          service_id: form.service_id ? Number(form.service_id) : null,
          amount: form.amount ? Number(form.amount) : null,
          duration_days: form.duration_days ? Number(form.duration_days) : null,
        }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'Failed to save'); setSubmitting(false); return; }
      if (submitImmediately) {
        await fetch(`/api/deviations/${data.id}/submit`, { method: 'POST' });
      }
      router.push(`/deviations/${data.id}`);
    } catch (e) { setError('Network error.'); setSubmitting(false); }
  }

  return (
    <>
      <TopBar />
      <main className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-1">New Deviation Request</h1>
        <p className="text-slate-500 text-sm mb-6">Use the AI Justification helper to draft, then review and submit for approval.</p>

        <div className="card space-y-5">
          <div>
            <label className="label">Deviation Type</label>
            <select className="input" value={form.deviation_type} onChange={e => update('deviation_type', e.target.value)}>
              {TYPES.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Customer</label>
              <select className="input" value={form.customer_id} onChange={e => { update('customer_id', e.target.value); update('service_id', ''); }}>
                <option value="">— Select customer —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.customer_code} — {c.name} ({c.tier})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Service (optional)</label>
              <select className="input" value={form.service_id} onChange={e => update('service_id', e.target.value)}>
                <option value="">— None —</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.service_type} · {s.bandwidth_mbps}Mbps · {s.sla_tier}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Requested Action</label>
            <input className="input" placeholder="e.g., Credit $4,500 to account for outage compensation"
                   value={form.requested_action} onChange={e => update('requested_action', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {typeMeta.hasAmount && (
              <div>
                <label className="label">Amount (USD)</label>
                <input type="number" min="0" step="0.01" className="input" value={form.amount} onChange={e => update('amount', e.target.value)} />
              </div>
            )}
            {typeMeta.hasDuration && (
              <div>
                <label className="label">Duration (days)</label>
                <input type="number" min="1" className="input" value={form.duration_days} onChange={e => update('duration_days', e.target.value)} />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-end justify-between mb-1">
              <label className="label mb-0">Justification</label>
              <button type="button" onClick={generateJustification} disabled={aiBusy || !form.customer_id}
                      className="text-sm px-3 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
                {aiBusy ? '✨ Generating…' : '✨ Generate with AI'}
              </button>
            </div>
            <textarea className="input" rows="6" placeholder="50-4000 characters. Cite reason and any compliance considerations."
                      value={form.justification} onChange={e => update('justification', e.target.value)} />
            <div className="text-xs text-slate-400 mt-1">{form.justification.length} characters</div>
          </div>

          {error && <div className="text-rose-600 text-sm">{error}</div>}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button type="button" onClick={() => submit(false)} disabled={submitting} className="btn-ghost">Save Draft</button>
            <button type="button" onClick={() => submit(true)} disabled={submitting} className="btn-primary">
              {submitting ? 'Saving…' : 'Save & Submit for Approval'}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
