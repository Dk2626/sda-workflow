import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
const { getUserByUsername, verifyPassword, createSession } = require('@/lib/auth');
const { logAudit } = require('@/lib/workflow');

export async function POST(req) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }
  const user = getUserByUsername(username);
  if (!user || !verifyPassword(user, password)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  const { token, expires } = createSession(user.id);
  cookies().set('sda_session', token, {
    httpOnly: true, sameSite: 'lax', path: '/',
    expires: new Date(expires),
  });
  logAudit(null, user.id, 'LOGIN', { username });
  return NextResponse.json({
    user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
  });
}
