import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(__dirname, '../../data');
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, 'sukoon.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db: DatabaseType = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run schema
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);

// Migrations for existing databases — add new columns safely
function addColumnIfNotExists(table: string, column: string, definition: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`[Sukoon] Added column ${table}.${column}`);
  }
}

// User medical history fields
addColumnIfNotExists('users', 'known_disorders', "TEXT DEFAULT '[]'");
addColumnIfNotExists('users', 'current_medications', "TEXT DEFAULT '[]'");

// Enhanced session summary fields
addColumnIfNotExists('sessions', 'root_cause_analysis', 'TEXT');
addColumnIfNotExists('sessions', 'trigger_points', "TEXT DEFAULT '[]'");
addColumnIfNotExists('sessions', 'family_history', 'TEXT');
addColumnIfNotExists('sessions', 'patient_medical_context', 'TEXT');
addColumnIfNotExists('sessions', 'frequency_patterns', 'TEXT');

console.log('[Sukoon] SQLite database initialized');

export default db;
