const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');

const { db, findInvite, generateCode, recomputeCompleteness } = require('./db');
const csv = require('./lib/csv');
const V = require('./views');

const app = express();
app.set('trust proxy', 1); // required for secure session cookies behind hosting proxies (Railway, Render, etc.)
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 4, // 4 hours
      secure: process.env.NODE_ENV === 'production' && process.env.INSECURE_COOKIES !== '1',
    },
  })
);

/* ---------------- rate limiting (invite verification) ---------------- */
// Simple in-memory limiter: max 10 attempts per IP per 15 minutes.
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function rateLimit(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const rec = attempts.get(ip) || { count: 0, start: now };
  if (now - rec.start > WINDOW_MS) {
    rec.count = 0;
    rec.start = now;
  }
  rec.count += 1;
  attempts.set(ip, rec);
  if (rec.count > MAX_ATTEMPTS) {
    return res
      .status(429)
      .send(
        V.invitePage({
          error:
            'Too many attempts. Please wait a few minutes and try again with the name and code exactly as they appear on your invite.',
        })
      );
  }
  next();
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of attempts) if (now - rec.start > WINDOW_MS * 2) attempts.delete(ip);
}, WINDOW_MS).unref();

/* ---------------- helpers ---------------- */
const GENERIC_INVITE_ERROR =
  'We couldn\u2019t verify that invitation. Please check the name and code exactly as they appear on your invite.';

function requireInvite(req, res, next) {
  if (!req.session.inviteId) return res.redirect('/invite');
  const p = db.prepare('SELECT * FROM players WHERE id = ?').get(req.session.inviteId);
  if (!p) {
    req.session.inviteId = null;
    return res.redirect('/invite');
  }
  req.invite = p;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.adminId) return res.redirect('/admin/login');
  next();
}

const clean = (v, max = 500) => String(v == null ? '' : v).trim().slice(0, max);

/* ================= PUBLIC ================= */

app.get('/', (req, res) => res.redirect('/invite'));

app.get('/invite', (req, res) => res.send(V.invitePage()));

app.post('/invite/verify', rateLimit, (req, res) => {
  const { first_name, last_name, code } = req.body;
  const match = findInvite(first_name, last_name, code);
  if (!match) {
    return res
      .status(200)
      .send(V.invitePage({ error: GENERIC_INVITE_ERROR, values: { first_name, last_name } }));
  }
  req.session.regenerate((err) => {
    if (err) return res.status(500).send('Something went wrong. Please try again.');
    req.session.inviteId = match.id;
    res.redirect('/invitation');
  });
});

app.get('/invitation', requireInvite, (req, res) => {
  res.send(V.invitationPage(req.invite));
});

app.post('/invitation/respond', requireInvite, (req, res) => {
  const p = req.invite;

  // Prevent duplicate submissions unless an admin resets the invite.
  if (p.response_status !== 'Pending') {
    return res.redirect('/confirmation?s=' + encodeURIComponent(p.response_status));
  }

  const decision = req.body.decision === 'accept' ? 'Accepted' : req.body.decision === 'decline' ? 'Declined' : null;
  if (!decision) return res.redirect('/invitation#respond');

  db.prepare(
    `UPDATE players SET
      response_status = ?,
      responded_at = datetime('now'),
      parent_name = ?,
      parent_phone = ?,
      parent_email = ?,
      camp_rsvp = ?,
      camp_days = ?,
      jersey_size = ?,
      shorts_size = ?,
      shoe_size = ?,
      shipping_address = ?,
      video_watched = ?,
      parent_questions = ?,
      updated_at = datetime('now')
    WHERE id = ?`
  ).run(
    decision,
    clean(req.body.parent_name, 120),
    clean(req.body.parent_phone, 40),
    clean(req.body.parent_email, 160),
    ['Yes', 'No'].includes(req.body.camp_rsvp) ? req.body.camp_rsvp : '',
    decision === 'Accepted' ? 'All three days (Aug 6\u20138)' : '',
    clean(req.body.jersey_size, 20),
    clean(req.body.shorts_size, 20),
    clean(req.body.shoe_size, 30),
    clean(req.body.shipping_address, 400),
    req.body.video_watched ? 1 : 0,
    clean(req.body.parent_questions, 2000),
    p.id
  );
  recomputeCompleteness(p.id);
  req.session.inviteId = null; // close the private session after responding
  res.redirect('/confirmation?s=' + encodeURIComponent(decision));
});

app.get('/confirmation', (req, res) => {
  const s = req.query.s === 'Accepted' ? 'Accepted' : 'Declined';
  res.send(V.confirmationPage(s));
});

/* ================= ADMIN ================= */

app.get('/admin/login', (req, res) => {
  if (req.session.adminId) return res.redirect('/admin');
  res.send(V.adminLoginPage());
});

app.post('/admin/login', (req, res) => {
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(clean(req.body.username, 80));
  const ok = admin && bcrypt.compareSync(String(req.body.password || ''), admin.password_hash);
  if (!ok) return res.status(401).send(V.adminLoginPage('Invalid username or password.'));
  req.session.regenerate((err) => {
    if (err) return res.status(500).send('Something went wrong. Please try again.');
    req.session.adminId = admin.id;
    res.redirect('/admin');
  });
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

function computeStats() {
  const one = (sql) => db.prepare(sql).get().n;
  const today = new Date().toISOString().slice(0, 10);
  return {
    total: one('SELECT COUNT(*) n FROM players'),
    sent: one("SELECT COUNT(*) n FROM players WHERE invite_status = 'Sent'"),
    accepted: one("SELECT COUNT(*) n FROM players WHERE response_status = 'Accepted'"),
    declined: one("SELECT COUNT(*) n FROM players WHERE response_status = 'Declined'"),
    pending: one("SELECT COUNT(*) n FROM players WHERE response_status = 'Pending'"),
    rsvpYes: one("SELECT COUNT(*) n FROM players WHERE camp_rsvp = 'Yes'"),
    gearMissing: one("SELECT COUNT(*) n FROM players WHERE response_status = 'Accepted' AND gear_complete = 0"),
    addressMissing: one("SELECT COUNT(*) n FROM players WHERE response_status = 'Accepted' AND address_complete = 0"),
    videoNotWatched: one("SELECT COUNT(*) n FROM players WHERE response_status != 'Pending' AND video_watched = 0"),
    followupsToday: db.prepare('SELECT COUNT(*) n FROM players WHERE follow_up_date = ?').get(today).n,
  };
}

app.get('/admin', requireAdmin, (req, res) => {
  const filters = {
    q: clean(req.query.q, 80),
    status: clean(req.query.status, 20),
    invite: clean(req.query.invite, 20),
    rsvp: clean(req.query.rsvp, 5),
    missing: clean(req.query.missing, 10),
    followup: clean(req.query.followup, 10),
  };

  const where = [];
  const args = [];
  if (filters.q) {
    where.push(
      "(first_name || ' ' || last_name LIKE ? OR school LIKE ? OR current_team LIKE ? OR invitation_code LIKE ? OR parent_name LIKE ?)"
    );
    const like = `%${filters.q}%`;
    args.push(like, like, like, like, like);
  }
  if (['Pending', 'Accepted', 'Declined'].includes(filters.status)) {
    where.push('response_status = ?');
    args.push(filters.status);
  }
  if (['Sent', 'Not Sent'].includes(filters.invite)) {
    where.push('invite_status = ?');
    args.push(filters.invite);
  }
  if (['Yes', 'No'].includes(filters.rsvp)) {
    where.push('camp_rsvp = ?');
    args.push(filters.rsvp);
  }
  if (filters.missing === 'gear') where.push("response_status = 'Accepted' AND gear_complete = 0");
  if (filters.missing === 'address') where.push("response_status = 'Accepted' AND address_complete = 0");
  if (filters.missing === 'video') where.push("response_status != 'Pending' AND video_watched = 0");
  const today = new Date().toISOString().slice(0, 10);
  if (filters.followup === 'today') {
    where.push('follow_up_date = ?');
    args.push(today);
  }
  if (filters.followup === 'overdue') {
    where.push("follow_up_date != '' AND follow_up_date < ?");
    args.push(today);
  }

  const sql = `SELECT * FROM players ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY last_name, first_name`;
  const players = db.prepare(sql).all(...args);
  res.send(V.adminDashboardPage({ stats: computeStats(), players, filters, flash: req.query.flash || '' }));
});

/* ----- add / edit players ----- */

app.get('/admin/players/new', requireAdmin, (req, res) => res.send(V.playerFormPage({})));

function playerFieldsFromBody(body) {
  return {
    first_name: clean(body.first_name, 80),
    last_name: clean(body.last_name, 80),
    gender: ['Boys', 'Girls'].includes(body.gender) ? body.gender : '',
    grad_year: clean(body.grad_year, 10),
    grade: clean(body.grade, 20),
    school: clean(body.school, 120),
    current_team: clean(body.current_team, 120),
    parent_name: clean(body.parent_name, 120),
    parent_phone: clean(body.parent_phone, 40),
    parent_email: clean(body.parent_email, 160),
    invite_status: body.invite_status === 'Sent' ? 'Sent' : 'Not Sent',
    follow_up_date: clean(body.follow_up_date, 10),
    notes: clean(body.notes, 4000),
  };
}

app.post('/admin/players', requireAdmin, (req, res) => {
  const f = playerFieldsFromBody(req.body);
  if (!f.first_name || !f.last_name) {
    return res.status(400).send(V.playerFormPage({ error: 'First and last name are required.' }));
  }
  const code = generateCode();
  const info = db
    .prepare(
      `INSERT INTO players (first_name, last_name, gender, grad_year, grade, school, current_team,
        parent_name, parent_phone, parent_email, invitation_code, invite_status, follow_up_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      f.first_name, f.last_name, f.gender, f.grad_year, f.grade, f.school, f.current_team,
      f.parent_name, f.parent_phone, f.parent_email, code, f.invite_status, f.follow_up_date, f.notes
    );
  res.redirect(`/admin/players/${info.lastInsertRowid}?flash=${encodeURIComponent('Player added. Invitation code: ' + code)}`);
});

function loadPlayerOr404(req, res) {
  const p = db.prepare('SELECT * FROM players WHERE id = ?').get(Number(req.params.id));
  if (!p) {
    res.status(404).send('Player not found. <a href="/admin">Back to roster</a>');
    return null;
  }
  return p;
}

app.get('/admin/players/:id', requireAdmin, (req, res) => {
  const p = loadPlayerOr404(req, res);
  if (!p) return;
  res.send(V.playerDetailPage({ p, flash: req.query.flash || '' }));
});

app.get('/admin/players/:id/edit', requireAdmin, (req, res) => {
  const p = loadPlayerOr404(req, res);
  if (!p) return;
  res.send(V.playerFormPage({ player: p }));
});

app.post('/admin/players/:id', requireAdmin, (req, res) => {
  const p = loadPlayerOr404(req, res);
  if (!p) return;
  const f = playerFieldsFromBody(req.body);
  if (!f.first_name || !f.last_name) {
    return res.status(400).send(V.playerFormPage({ player: p, error: 'First and last name are required.' }));
  }
  db.prepare(
    `UPDATE players SET first_name=?, last_name=?, gender=?, grad_year=?, grade=?, school=?, current_team=?,
      parent_name=?, parent_phone=?, parent_email=?, invite_status=?, follow_up_date=?, notes=?,
      updated_at=datetime('now') WHERE id=?`
  ).run(
    f.first_name, f.last_name, f.gender, f.grad_year, f.grade, f.school, f.current_team,
    f.parent_name, f.parent_phone, f.parent_email, f.invite_status, f.follow_up_date, f.notes, p.id
  );
  res.redirect(`/admin/players/${p.id}?flash=${encodeURIComponent('Player saved.')}`);
});

app.post('/admin/players/:id/quick', requireAdmin, (req, res) => {
  const p = loadPlayerOr404(req, res);
  if (!p) return;
  db.prepare("UPDATE players SET follow_up_date=?, notes=?, updated_at=datetime('now') WHERE id=?").run(
    clean(req.body.follow_up_date, 10),
    clean(req.body.notes, 4000),
    p.id
  );
  res.redirect(`/admin/players/${p.id}?flash=${encodeURIComponent('Saved.')}`);
});

app.post('/admin/players/:id/mark-sent', requireAdmin, (req, res) => {
  const p = loadPlayerOr404(req, res);
  if (!p) return;
  db.prepare("UPDATE players SET invite_status='Sent', updated_at=datetime('now') WHERE id=?").run(p.id);
  res.redirect(`/admin/players/${p.id}?flash=${encodeURIComponent('Invite marked as sent.')}`);
});

app.post('/admin/players/:id/generate-code', requireAdmin, (req, res) => {
  const p = loadPlayerOr404(req, res);
  if (!p) return;
  const code = generateCode();
  db.prepare("UPDATE players SET invitation_code=?, updated_at=datetime('now') WHERE id=?").run(code, p.id);
  res.redirect(`/admin/players/${p.id}?flash=${encodeURIComponent('New code generated: ' + code)}`);
});

app.post('/admin/players/:id/reset', requireAdmin, (req, res) => {
  const p = loadPlayerOr404(req, res);
  if (!p) return;
  db.prepare(
    `UPDATE players SET response_status='Pending', responded_at='', camp_rsvp='', camp_days='',
      jersey_size='', shorts_size='', shoe_size='', shipping_address='', video_watched=0,
      parent_questions='', gear_complete=0, address_complete=0, updated_at=datetime('now')
     WHERE id=?`
  ).run(p.id);
  res.redirect(`/admin/players/${p.id}?flash=${encodeURIComponent('Response reset. The family can submit again.')}`);
});

/* ----- CSV export / import ----- */

const EXPORT_COLUMNS = [
  'first_name', 'last_name', 'gender', 'grad_year', 'grade', 'school', 'current_team',
  'parent_name', 'parent_phone', 'parent_email', 'invitation_code', 'invite_status',
  'response_status', 'responded_at', 'camp_rsvp', 'camp_days', 'jersey_size', 'shorts_size',
  'shoe_size', 'shipping_address', 'video_watched', 'parent_questions', 'gear_complete',
  'address_complete', 'follow_up_date', 'notes', 'updated_at',
];

app.get('/admin/export.csv', requireAdmin, (req, res) => {
  const players = db.prepare('SELECT * FROM players ORDER BY last_name, first_name').all();
  const rows = [EXPORT_COLUMNS, ...players.map((p) => EXPORT_COLUMNS.map((c) => p[c]))];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="workshop-hq-roster.csv"');
  res.send(csv.stringify(rows));
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

const IMPORT_COLUMNS = [
  'first_name', 'last_name', 'gender', 'grad_year', 'grade', 'school', 'current_team',
  'parent_name', 'parent_phone', 'parent_email', 'invitation_code', 'invite_status',
  'follow_up_date', 'notes',
];

app.get('/admin/import', requireAdmin, (req, res) => res.send(V.importPage()));

app.post('/admin/import', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send(V.importPage({ error: 'Choose a CSV file to import.' }));
  let rows;
  try {
    rows = csv.parse(req.file.buffer.toString('utf8'));
  } catch {
    return res.status(400).send(V.importPage({ error: 'That file couldn\u2019t be read as CSV.' }));
  }
  if (!rows.length) return res.status(400).send(V.importPage({ error: 'The CSV appears to be empty.' }));

  const header = rows[0].map((h) => String(h).trim().toLowerCase().replace(/\s+/g, '_'));
  const idx = {};
  IMPORT_COLUMNS.forEach((c) => (idx[c] = header.indexOf(c)));
  if (idx.first_name === -1 || idx.last_name === -1) {
    return res
      .status(400)
      .send(V.importPage({ error: 'The header row must include first_name and last_name columns.' }));
  }

  let created = 0, updated = 0, skipped = 0;
  const insert = db.prepare(
    `INSERT INTO players (first_name, last_name, gender, grad_year, grade, school, current_team,
      parent_name, parent_phone, parent_email, invitation_code, invite_status, follow_up_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const tx = db.transaction((dataRows) => {
    for (const r of dataRows) {
      const get = (c, max = 200) => (idx[c] >= 0 ? clean(r[idx[c]], max) : '');
      const first = get('first_name', 80);
      const last = get('last_name', 80);
      if (!first || !last) { skipped++; continue; }
      const rowCode = get('invitation_code', 30).toUpperCase();
      const inviteStatus = get('invite_status', 20) === 'Sent' ? 'Sent' : 'Not Sent';
      const vals = [
        first, last,
        ['Boys', 'Girls'].includes(get('gender', 10)) ? get('gender', 10) : '',
        get('grad_year', 10), get('grade', 20), get('school', 120), get('current_team', 120),
        get('parent_name', 120), get('parent_phone', 40), get('parent_email', 160),
      ];
      if (rowCode) {
        const existing = db.prepare('SELECT id FROM players WHERE UPPER(invitation_code)=?').get(rowCode);
        if (existing) {
          db.prepare(
            `UPDATE players SET first_name=?, last_name=?, gender=?, grad_year=?, grade=?, school=?,
              current_team=?, parent_name=?, parent_phone=?, parent_email=?, invite_status=?,
              follow_up_date=?, notes=?, updated_at=datetime('now') WHERE id=?`
          ).run(...vals, inviteStatus, get('follow_up_date', 10), get('notes', 4000), existing.id);
          updated++;
          continue;
        }
        insert.run(...vals, rowCode, inviteStatus, get('follow_up_date', 10), get('notes', 4000));
        created++;
      } else {
        insert.run(...vals, generateCode(), inviteStatus, get('follow_up_date', 10), get('notes', 4000));
        created++;
      }
    }
  });

  try {
    tx(rows.slice(1));
  } catch (e) {
    return res.status(400).send(V.importPage({ error: 'Import failed: ' + e.message }));
  }
  res.send(V.importPage({ result: { created, updated, skipped } }));
});

/* ---------------- 404 ---------------- */
app.use((req, res) => res.status(404).redirect('/invite'));

/* ---------------- first boot: create admin from env if none exists ---------------- */
const adminCount = db.prepare('SELECT COUNT(*) n FROM admins').get().n;
if (adminCount === 0) {
  if (process.env.ADMIN_USER && process.env.ADMIN_PASS) {
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(
      process.env.ADMIN_USER,
      bcrypt.hashSync(process.env.ADMIN_PASS, 10)
    );
    console.log(`Created admin account "${process.env.ADMIN_USER}" from environment variables.`);
  } else {
    console.log('NOTE: No admin account exists yet. Set ADMIN_USER and ADMIN_PASS environment');
    console.log('variables and restart, or run: npm run seed');
  }
}

app.listen(PORT, () => {
  console.log(`Workshop HQ running at http://localhost:${PORT}`);
  console.log('Family flow:  /invite     Staff:  /admin/login');
});
