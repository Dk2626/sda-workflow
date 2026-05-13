'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('alice');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'Login failed'); setLoading(false); return; }
      router.push('/');
    } catch (err) { setError('Network error'); setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a2540] to-[#162b48] p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0a2540]">SDA Workflow</h1>
          <p className="text-slate-500 text-sm mt-1">AI-Assisted Service Deviation & Approval</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="label">Username</label>
            <input className="input" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <div className="text-rose-600 text-sm">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <div className="mt-8 pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-500 mb-2">Demo accounts (all password <code className="text-[#635bff]">demo123</code>):</p>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div><code>alice</code> Requestor</div>
            <div><code>bob</code> L1 Approver</div>
            <div><code>finn</code> Finance</div>
            <div><code>nina</code> Network</div>
            <div><code>carol</code> Compliance</div>
            <div><code>aud</code> Auditor</div>
            <div><code>admin</code> Admin</div>
          </div>
        </div>
      </div>
    </div>
  );
}
