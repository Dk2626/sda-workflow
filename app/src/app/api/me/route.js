import { NextResponse } from 'next/server';
const { requireUser } = require('@/lib/api-helpers');

export async function GET() {
  const { user, error } = requireUser();
  if (error) return error;
  return NextResponse.json({
    user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role, email: user.email },
  });
}
