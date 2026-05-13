import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
const { destroySession } = require('@/lib/auth');

export async function POST() {
  const token = cookies().get('sda_session')?.value;
  destroySession(token);
  cookies().set('sda_session', '', { httpOnly: true, path: '/', expires: new Date(0) });
  return NextResponse.json({ ok: true });
}
