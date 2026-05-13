'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import TopBar from '@/components/TopBar';

function AuditContent() {
  const search = useSearchParams();
  const [id, setId] = useState(search.get('id') || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  async function load(devId) {
    if (!devId) return;
    setLoading(true);
    const r = await fetch(`/api/deviations/${devId}/audit`);
    const d = await r.json();
    setData(d.error ? null : d);
    setLoading(false);
  }

  useEffect(() => { if (id) load(id); }, []);

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">Audit Trail</h1>
      <p className="text-slate-500 text-sm mb-6">Immutable log of every state transition and AI invocation.</p>
      <div className="card mb-6">
        <div className="flex gap-3">
          <input className="input flex-1" placeholder="Enter deviation ID (e.g., 1)" value={id} onChange={e => setId(e.target.value)} />
          <button className="btn-primary" onClick={() => load(id)} disabled={loading}>{loading ? 'Loading…' : 'Load'}</button>
        </div>
      </div>

      {data && (
        <>
          <div className="card mb-6">
            <h2 className="font-semibold mb-3">Audit Events ({data.audits?.length || 0})</h2>
            {(data.audits || []).length === 0 ? (
              <p className="text-slate-400 text-sm">No events.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-slate-500 text-xs uppercase">
                  <tr><th className="text-left py-2">When</th><th className="text-left">Actor</th><th className="text-left">Event</th><th className="text-left">Data</th></tr>
                </thead>
                <tbody>
                  {data.audits.map(a => (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="py-2 text-xs">{new Date(a.created_at).toLocaleString()}</td>
                      <td>{a.actor_name || 'system'} <span className="text-xs text-slate-400">{a.actor_role}</span></td>
                      <td><span className="text-[#635bff] font-medium">{a.event_type}</span></td>
                      <td className="text-xs text-slate-600">{a.event_data}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h2 className="font-semibold mb-3">AI Invocations ({data.ai_invocations?.length || 0})</h2>
            {(data.ai_invocations || []).length === 0 ? (
              <p className="text-slate-400 text-sm">No AI activity recorded.</p>
            ) : (
              <ul className="space-y-3">
                {data.ai_invocations.map(a => (
                  <li key={a.id} className="border border-slate-200 rounded p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="badge bg-indigo-100 text-indigo-700">{a.agent_type}</span>
                      <span className="text-xs text-slate-400">{a.model} · {a.duration_ms}ms · {a.tokens_used} tokens · confidence {a.confidence}</span>
                    </div>
                    <div className="text-xs">
                      <div className="text-slate-500">Prompt:</div>
                      <pre className="bg-slate-50 p-2 rounded overflow-x-auto whitespace-pre-wrap">{a.prompt_preview}</pre>
                      <div className="text-slate-500 mt-2">Response:</div>
                      <pre className="bg-slate-50 p-2 rounded overflow-x-auto whitespace-pre-wrap">{a.response_preview}</pre>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </main>
  );
}

export default function AuditPage() {
  return (
    <>
      <TopBar />
      <Suspense fallback={<div className="p-6 text-slate-500">Loading…</div>}>
        <AuditContent />
      </Suspense>
    </>
  );
}
