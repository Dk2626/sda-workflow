#!/usr/bin/env node
// Initializes the schema. Run once before seeding.
const { getDb } = require('../src/lib/db');
const { SCHEMA } = require('../src/lib/db/schema');

const db = getDb();
db.exec(SCHEMA);
console.log('Database schema initialized.');
