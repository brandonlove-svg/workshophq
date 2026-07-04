// Uses Node's built-in SQLite (node:sqlite, Node 22.13+). No native compilation needed.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const crypto = require('crypto');

const db = new DatabaseSync(process.env.DB_PATH || path.join(__dirname, 'workshop-hq.db'));
db.exec('PRAGMA journal_mode = WAL;');

// Simple transaction helper matching the better-sqlite3 API shape.
db.transaction = function (fn) {
  return (...args) => {
    db.exec('BEGIN');
    try {
      const out = fn(...args);
      db.exec('COMMIT');
      return out;
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  };
};

db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT DEFAULT '',
  grad_year TEXT DEFAULT '',
  grade TEXT DEFAULT '',
  school TEXT DEFAULT '',
  current_team TEXT DEFAULT '',
  parent_name TEXT DEFAULT '',
  parent_phone TEXT DEFAULT '',
  parent_email TEXT DEFAULT '',
  invitation_code TEXT UNIQUE NOT NULL,
  invite_status TEXT DEFAULT 'Not Sent',        -- Not Sent | Sent
  response_status TEXT DEFAULT 'Pending',       -- Pending | Accepted | Declined
  responded_at TEXT DEFAULT '',
  camp_rsvp TEXT DEFAULT '',                    -- Yes | No | ''
  camp_days TEXT DEFAULT '',
  jersey_size TEXT DEFAULT '',
  shorts_size TEXT DEFAULT '',
  shoe_size TEXT DEFAULT '',
  shipping_address TEXT DEFAULT '',
  video_watched INTEGER DEFAULT 0,
  parent_questions TEXT DEFAULT '',
  gear_complete INTEGER DEFAULT 0,
  address_complete INTEGER DEFAULT 0,
  follow_up_date TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now'))
);
`);

function normalizeName(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function generateCode() {
  // Format: WHQ-XXXX-XXXX, unambiguous alphabet (no 0/O/1/I)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const block = () =>
    Array.from(crypto.randomBytes(4))
      .map((b) => alphabet[b % alphabet.length])
      .join('');
  let code;
  do {
    code = `WHQ-${block()}-${block()}`;
  } while (db.prepare('SELECT 1 FROM players WHERE invitation_code = ?').get(code));
  return code;
}

function touch(id) {
  db.prepare("UPDATE players SET updated_at = datetime('now') WHERE id = ?").run(id);
}

function findInvite(firstName, lastName, code) {
  const f = normalizeName(firstName);
  const l = normalizeName(lastName);
  const c = String(code || '').trim().toUpperCase();
  if (!f || !l || !c) return null;
  const row = db
    .prepare('SELECT * FROM players WHERE UPPER(invitation_code) = ?')
    .get(c);
  if (!row) return null;
  if (normalizeName(row.first_name) !== f || normalizeName(row.last_name) !== l) return null;
  return row;
}

function recomputeCompleteness(id) {
  const p = db.prepare('SELECT * FROM players WHERE id = ?').get(id);
  if (!p) return;
  const gear = p.jersey_size.trim() && p.shorts_size.trim() && p.shoe_size.trim() ? 1 : 0;
  const addr = p.shipping_address.trim() ? 1 : 0;
  db.prepare('UPDATE players SET gear_complete = ?, address_complete = ? WHERE id = ?').run(gear, addr, id);
}

module.exports = { db, normalizeName, generateCode, findInvite, recomputeCompleteness, touch };
