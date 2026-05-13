'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopBar from '@/components/TopBar';

const STATE_LABELS = {
  DRAFT: 'Draft', SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under Review',
  INFO_REQUESTED: 'Info Requested', APPROVED_L1: 'Approved L1', APPROVED_L2: 'Approved L2',
  FINAL_APPROVED: 'Final Approved', EXECUTED: 'Executed', REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn', EXPIRED: 'Expired',
};

export default function DeviationListPage() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/deviations').then(r => r.json()).then(d => setList(d.deviations || []));
  }, []);

  const filtered = list.filter(d => {
    if (filter !== 'ALL' && d.state !== filter) return false;
    if (search && !d.reference.toLowerCase().includes(search.toLowerCase())
       && !(d.customer_name || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <TopBar />
      <main className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Deviation Requests</h1>
            <p className="text-slate-500 text-sm">{filtered.length} of {list.length} requests</p>
          </div>
          <Link href="/deviations/new" className="btn-primary">+ New Deviation</Link>
        </div>

        <div className="card">
          <div className="flex gap-3 mb-4">
            <input className="input flex-1" placeholder="Search by reference or customer…" value={search} onChange={e => setSearch(e.target.value)} />
            <select className="input w-56" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="ALL">All states</option>
              {Object.entries(STATE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <table className="w-full text-sm">
            <thead className="text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left py-2">Reference</th>
                <th className="text-left">Type</th>
                <th className="text-left">Customer</th>
                <th className="text-left">Amount</th>
                <th className="text-left">Risk</th>
                <th className="text-left">State</th>
                <th className="text-left">Awaiting</th>
                <th className="text-left">Requestor</th>
                <th className="text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="py-2"><Link href={`/deviations/${d.id}`} className="text-[#635bff] font-medium">{d.reference}</Link></td>
                  <td>{d.deviation_type}</td>
                  <td>{d.customer_name}<div className="text-xs text-slate-400">{d.customer_tier}</div></td>
                  <td>{d.amount ? `${d.currency} ${d.amount.toLocaleString()}` : '—'}</td>
                  <td>{d.ai_risk_score ? <span className={`badge-${d.ai_risk_score.toLowerCase()}`}>{d.ai_risk_score}</span> : '—'}</td>
                  <td><span className="badge-state">{STATE_LABELS[d.state] || d.state}</span></td>
                  <td className="text-xs text-slate-600">{d.current_approver_role || '—'}</td>
                  <td className="text-xs">{d.requestor_name}</td>
                  <td className="text-xs text-slate-500">{new Date(d.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="9" className="py-8 text-center text-slate-400">No matching deviations.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
