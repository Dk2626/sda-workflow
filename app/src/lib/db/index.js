// Database connection — better-sqlite3 (sync, fast, simple for demo).
// Migration to PostgreSQL: swap to pg/Prisma; schema is portable.
const Database = require('better-sqlite3');
const path = require('path');

let db = null;

function getDb() {
  if (!db) {
    const file = process.env.DATABASE_FILE || path.join(process.cwd(), 'sda.db');
    db = new Database(file);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

module.exports = { getDb };
