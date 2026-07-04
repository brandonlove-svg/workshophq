// Seed script: creates (or resets) the admin account and adds sample players.
// Usage:
//   node seed.js                          -> admin / (random printed password), 3 sample players
//   ADMIN_USER=marcus ADMIN_PASS=secret node seed.js

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db, generateCode } = require('./db');

const username = process.env.ADMIN_USER || 'admin';
const password = process.env.ADMIN_PASS || crypto.randomBytes(6).toString('base64url');
const hash = bcrypt.hashSync(password, 10);

const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(username);
if (existing) {
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, existing.id);
  console.log(`Updated admin password for "${username}".`);
} else {
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, hash);
  console.log(`Created admin "${username}".`);
}
console.log(`Admin login -> username: ${username}   password: ${password}`);

if (process.env.SKIP_SAMPLES !== '1') {
  const count = db.prepare('SELECT COUNT(*) n FROM players').get().n;
  if (count === 0) {
    const insert = db.prepare(
      `INSERT INTO players (first_name, last_name, gender, grad_year, grade, school, current_team,
        parent_name, parent_phone, parent_email, invitation_code, invite_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const samples = [
      ['Jalen', 'Carter', 'Boys', '2029', '9th', 'Rogers High School', 'Woodz Elite 15U', 'T. Carter', '(479) 555-0142', 'tcarter@example.com'],
      ['Maya', 'Brooks', 'Girls', '2028', '10th', 'Bentonville West', 'NWA Flight', 'D. Brooks', '(479) 555-0177', 'dbrooks@example.com'],
      ['Deuce', 'Williams', 'Boys', '2030', '8th', 'Elmwood Middle', 'Team Thrill AR', 'K. Williams', '(479) 555-0163', 'kwilliams@example.com'],
    ];
    for (const s of samples) {
      const code = generateCode();
      insert.run(...s, code, 'Not Sent');
      console.log(`Sample player: ${s[0]} ${s[1]}  ->  code ${code}`);
    }
  } else {
    console.log(`Players table already has ${count} record(s); skipping samples.`);
  }
}
