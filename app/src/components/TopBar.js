'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function TopBar() {
  const [user, setUser] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) { router.push('/login'); return; }
        setUser(d.user);
      });
  }, [router]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (!user) return <div className="p-6 text-slate-500">Loading…</div>;

  const links = [
    { href: '/',            label: 'Dashboard' },
    { href: '/deviations',  label: 'Deviations' },
  ];
  if (user.role === 'REQUESTOR' || user.role === 'ADMIN') {
    links.push({ href: '/deviations/new', label: 'New Deviation' });
  }
  if (['AUDITOR', 'ADMIN', 'COMPLIANCE_APPROVER'].includes(user.role)) {
    links.push({ href: '/audit', label: 'Audit' });
  }

  return (
    <header className="bg-[#0a2540] text-white">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-bold text-lg">SDA Workflow</Link>
          <nav className="flex gap-1">
            {links.map(l => (
              <Link key={l.href} href={l.href}
                    className={`px-3 py-1.5 rounded text-sm ${pathname === l.href ? 'bg-[#635bff]' : 'hover:bg-white/10'}`}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right">
            <div className="font-medium">{user.full_name}</div>
            <div className="text-xs opacity-70">{user.role}</div>
          </div>
          <button onClick={logout} className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-sm">Logout</button>
        </div>
      </div>
    </header>
  );
}

export function useCurrentUser() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => d && setUser(d.user));
  }, []);
  return user;
}
