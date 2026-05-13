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

export default function DashboardPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/reports/dashboard').then(r => r.json()).then(setData).catch(() => {});
  }, []);

  if (!data) return <><TopBar /><div className="p-6 text-slate-500">Loading dashboard…</div></>;
  const t = data.totals || {};

  return (
    <>
      <TopBar />
      <main className="max-w-7xl mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-slate-500 text-sm">Operational deviation workflow at a glance.</p>
          </div>
          <a href="/api/reports/export" className="btn-ghost">Download CSV</a>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Tile label="Total Requests"   value={t.total ?? 0} accent="text-slate-700" />
          <Tile label="Pending"          value={t.pending ?? 0} accent="text-amber-600" />
          <Tile label="Final Approved"   value={t.approved ?? 0} accent="text-emerald-600" />
          <Tile label="High Risk"        value={t.high_risk ?? 0} accent="text-rose-600" />
          <Tile label="Executed"         value={t.executed ?? 0} accent="text-indigo-600" />
          <Tile label="Rejected"         value={t.rejected ?? 0} accent="text-slate-500" />
          <Tile label="Overdue (SLA)"    value={t.overdue ?? 0} accent="text-orange-600" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="card lg:col-span-2">
            <h2 className="font-semibold mb-4">Recent Deviations</h2>
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-xs uppercase">
                <tr><th className="text-left py-2">Reference</th><th className="text-left">Type</th><th className="text-left">Customer</th><th className="text-left">Risk</th><th className="text-left">State</th></tr>
              </thead>
              <tbody>
                {(data.recent || []).map(d => (
                  <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="py-2"><Link href={`/deviations/${d.id}`} className="text-[#635bff] font-medium">{d.reference}</Link></td>
                    <td>{d.deviation_type}</td>
                    <td>{d.customer_name}</td>
                    <td>{d.ai_risk_score ? <span className={`badge-${(d.ai_risk_score || 'medium').toLowerCase()}`}>{d.ai_risk_score}</span> : '—'}</td>
                    <td><span className="badge-state">{STATE_LABELS[d.state] || d.state}</span></td>
                  </tr>
                ))}
                {(data.recent || []).length === 0 && (
                  <tr><td colSpan="5" className="py-8 text-center text-slate-400">No deviations yet. Create one to get started.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="card">
            <h2 className="font-semibold mb-4">By Deviation Type</h2>
            <ul className="space-y-2">
              {(data.byType || []).map(b => (
                <li key={b.deviation_type} className="flex justify-between">
                  <span className="text-slate-600">{b.deviation_type}</span>
                  <span className="font-medium">{b.n}</span>
                </li>
              ))}
              {(data.byType || []).length === 0 && <li className="text-slate-400">No data.</li>}
            </ul>
          </div>
        </div>
      </main>
    </>
  );
}

function Tile({ label, value, accent }) {
  return (
    <div className="card">
      <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${accent}`}>{value}</div>
    </div>
  );
}
