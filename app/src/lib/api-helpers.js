// API helpers — session resolution and JSON responses.
const { cookies } = require('next/headers');
const { NextResponse } = require('next/server');
const { getSessionUser } = require('./auth');

function getUserFromRequest() {
  const token = cookies().get('sda_session')?.value;
  return getSessionUser(token);
}

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

function requireUser(roles = null) {
  const user = getUserFromRequest();
  if (!user) return { error: json({ error: 'Not authenticated' }, 401) };
  if (roles && !roles.includes(user.role)) return { error: json({ error: 'Forbidden' }, 403) };
  return { user };
}

module.exports = { getUserFromRequest, json, requireUser };
