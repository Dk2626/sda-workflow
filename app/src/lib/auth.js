// Simple session management — cookie-based, server-side token store.
// Production: replace with NextAuth / OIDC.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getDb } = require('./db');

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8h

function createSession(userId) {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires);
  return { token, expires };
}

function getSessionUser(token) {
  if (!token) return null;
  const db = getDb();
  const row = db.prepare(`
    SELECT u.* FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP AND u.active = 1
  `).get(token);
  return row || null;
}

function destroySession(token) {
  if (!token) return;
  getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

function verifyPassword(user, password) {
  return bcrypt.compareSync(password, user.password_hash);
}

function getUserByUsername(username) {
  return getDb().prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);
}

module.exports = { createSession, getSessionUser, destroySession, verifyPassword, getUserByUsername };
