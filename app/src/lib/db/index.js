/**
 * Database layer — node-sqlite3-wasm (pure WebAssembly SQLite, zero native deps).
 *
 * Drop-in replacement for better-sqlite3. The public API is identical:
 *   db.prepare(sql).get(...params)   → first row object or undefined
 *   db.prepare(sql).all(...params)   → array of row objects
 *   db.prepare(sql).run(...params)   → { changes, lastInsertRowid }
 *   db.exec(sql)                     → run multi-statement SQL
 *   db.pragma(str)                   → run PRAGMA statement
 *
 * No compilation step required — works on any Node.js 16+ without build tools.
 *
 * Migration to PostgreSQL: swap to pg/Prisma; schema is portable.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { Database: WasmDatabase } = require('node-sqlite3-wasm');

let _db     = null;
let _dbFile = null;

// ---------------------------------------------------------------------------
// Statement — wraps node-sqlite3-wasm to match better-sqlite3's API.
//
// Key difference: better-sqlite3 statements are reusable (can call .run()
// many times on the same prepared statement). node-sqlite3-wasm statements
// are finalized after use. We solve this by storing the SQL string and
// re-preparing on every call — matches better-sqlite3 semantics exactly.
// ---------------------------------------------------------------------------

class Statement {
  constructor (wasmDb, sql) {
    this._wasmDb = wasmDb;
    this._sql    = sql;
  }

  /** Returns first matching row as a plain object, or undefined. */
  get (...args) {
    const params = args.flat();
    const stmt   = this._wasmDb.prepare(this._sql);
    const row    = stmt.get(params.length ? params : undefined);
    stmt.finalize();
    return row ?? undefined;
  }

  /** Returns all matching rows as an array of plain objects. */
  all (...args) {
    const params = args.flat();
    const stmt   = this._wasmDb.prepare(this._sql);
    const rows   = stmt.all(params.length ? params : undefined);
    stmt.finalize();
    return rows;
  }

  /**
   * Executes a write statement.
   * Returns { changes, lastInsertRowid } — same shape as better-sqlite3.
   */
  run (...args) {
    const params = args.flat();
    const stmt   = this._wasmDb.prepare(this._sql);
    const result = stmt.run(params.length ? params : undefined);
    stmt.finalize();
    return result;
  }
}

// ---------------------------------------------------------------------------
// Database — wraps node-sqlite3-wasm Database to match better-sqlite3 API
// ---------------------------------------------------------------------------

class Database {
  constructor (wasmDb) {
    this._db = wasmDb;
  }

  prepare (sql) {
    return new Statement(this._db, sql);
  }

  /** Runs arbitrary SQL (DDL, bulk deletes, multi-statement scripts). */
  exec (sql) {
    this._db.exec(sql);
  }

  /** Runs a PRAGMA statement. e.g. db.pragma('journal_mode = WAL') */
  pragma (str) {
    this._db.exec(`PRAGMA ${str}`);
  }
}

// ---------------------------------------------------------------------------
// Singleton accessor — drop-in replacement for the original getDb()
// ---------------------------------------------------------------------------

function getDb () {
  if (_db) return new Database(_db);

  _dbFile = process.env.DATABASE_FILE || path.join(process.cwd(), 'sda.db');
  // node-sqlite3-wasm opens/creates the file directly — no fs.readFileSync needed.
  _db = new WasmDatabase(_dbFile);

  return new Database(_db);
}

module.exports = { getDb };
