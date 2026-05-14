#!/usr/bin/env node
// Initialises the SQLite schema. Run once before seeding.
// Works with the sql.js-based db layer (no native deps required).
const { getDb }   = require('../src/lib/db');
const { SCHEMA }  = require('../src/lib/db/schema');

const db = getDb();
db.exec(SCHEMA);
console.log('Database schema initialised.');
