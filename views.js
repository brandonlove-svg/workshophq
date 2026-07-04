// Server-rendered templates for Workshop HQ.

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const LOGO = `
<a href="/invite" class="brand" aria-label="Workshop HQ home">
  <img src="/badge-small.png" width="46" height="46" alt="">
  <span class="brand-word">Workshop HQ</span>
</a>`;

// The uploaded brand badge (swoosh removed), cropped with a soft edge fade.
function badge(size = 220) {
  return `<img src="/badge.png" width="${size}" height="${size}" alt="Workshop HQ badge" style="margin:0 auto">`;
}

function layout({ title, body, bodyClass = 'public', headerMeta = null }) {
  const meta =
    headerMeta === null
      ? `<div class="meta"><strong>August 6&ndash;8, 2026</strong><br>Rogers, Arkansas</div>`
      : headerMeta;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)} — Workshop HQ</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Archivo:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
</head>
<body class="${esc(bodyClass)}">
<header class="site-header">${LOGO}${meta}</header>
${body}
<footer class="site-footer">
  <span class="tagline">Learn<b>.</b> Grow<b>.</b> Lead<b>.</b></span>
  <span>Workshop HQ by Marcus &amp; Malik Monk &middot; Private, invitation-only</span>
</footer>
</body>
</html>`;
}

/* ---------------- public: invite gate ---------------- */

function invitePage({ error = '', values = {} } = {}) {
  const body = `
<main class="gate">
  <div class="narrow gate-card gate-center">
    <div class="gate-badge">${badge(200)}</div>
    <p class="eyebrow">Workshop HQ &middot; By Marcus &amp; Malik Monk</p>
    <h1 class="display one-line">You&rsquo;ve Been Invited.</h1>
    <div class="blade" aria-hidden="true"></div>
    <p class="sub">Enter the player&rsquo;s name and invitation code to continue.</p>
    ${error ? `<div class="error-box" role="alert">${esc(error)}</div>` : ''}
    <form method="post" action="/invite/verify" autocomplete="off">
      <label for="first_name">Player first name</label>
      <input type="text" id="first_name" name="first_name" required value="${esc(values.first_name || '')}">
      <label for="last_name">Player last name</label>
      <input type="text" id="last_name" name="last_name" required value="${esc(values.last_name || '')}">
      <label for="code">Invitation code</label>
      <input type="text" id="code" name="code" required placeholder="WHQ-XXXX-XXXX" value="${esc(values.code || '')}" style="text-transform:uppercase">
      <button class="btn block" type="submit">Continue</button>
    </form>
  </div>
</main>`;
  return layout({ title: 'You\u2019ve Been Invited', body });
}

/* ---------------- public: private invitation page ---------------- */

function section(eyebrow, heading, paragraphsHtml) {
  return `
<section class="section">
  <div class="wrap">
    <p class="eyebrow">${esc(eyebrow)}</p>
    <h2 class="display">${esc(heading)}</h2>
    <div class="body">${paragraphsHtml}</div>
  </div>
</section>`;
}

function invitationPage(p) {
  const alreadyResponded = p.response_status !== 'Pending';

  const respondBlock = alreadyResponded
    ? `
<section class="respond" id="respond">
  <div class="wrap">
    <p class="eyebrow">Your Response</p>
    <h2 class="display">Response Received.</h2>
    <div class="blade" aria-hidden="true"></div>
    <p class="lede">This invitation has already been ${esc(p.response_status.toLowerCase())}. If anything needs to change, contact our staff and we&rsquo;ll take care of it.</p>
  </div>
</section>`
    : `
<section class="respond" id="respond">
  <div class="wrap">
    <p class="eyebrow">Respond to Your Invitation</p>
    <h2 class="display">Accept or Decline</h2>
    <div class="blade" aria-hidden="true"></div>
    <form method="post" action="/invitation/respond">
      <div class="choice" role="radiogroup" aria-label="Invitation decision">
        <span>
          <input type="radio" id="dec-accept" name="decision" value="accept" required>
          <label class="opt" for="dec-accept">Accept Invitation</label>
        </span>
        <span>
          <input type="radio" id="dec-decline" name="decision" value="decline">
          <label class="opt" for="dec-decline">Decline Invitation</label>
        </span>
      </div>

      <div class="grid2">
        <div>
          <label for="player_name">Player name</label>
          <input type="text" id="player_name" value="${esc(p.first_name + ' ' + p.last_name)}" readonly>
        </div>
        <div>
          <label for="parent_name">Parent/guardian name</label>
          <input type="text" id="parent_name" name="parent_name" value="${esc(p.parent_name)}">
        </div>
        <div>
          <label for="parent_phone">Parent/guardian phone</label>
          <input type="tel" id="parent_phone" name="parent_phone" value="${esc(p.parent_phone)}">
        </div>
        <div>
          <label for="parent_email">Parent/guardian email</label>
          <input type="email" id="parent_email" name="parent_email" value="${esc(p.parent_email)}">
        </div>
        <div>
          <label for="camp_rsvp">Camp RSVP</label>
          <select id="camp_rsvp" name="camp_rsvp">
            <option value="">Select&hellip;</option>
            <option value="Yes">Yes &mdash; attending camp</option>
            <option value="No">No &mdash; not attending camp</option>
          </select>
        </div>
        <div>
          <label for="camp_days">Camp days attending</label>
          <select id="camp_days" name="camp_days">
            <option value="">Select&hellip;</option>
            <option>All three days (Aug 6&ndash;8)</option>
            <option>Aug 6 &amp; 7</option>
            <option>Aug 7 &amp; 8</option>
            <option>Aug 6 only</option>
            <option>Aug 7 only</option>
            <option>Aug 8 only</option>
          </select>
        </div>
        <div>
          <label for="jersey_size">Jersey / top size</label>
          <select id="jersey_size" name="jersey_size">
            <option value="">Select&hellip;</option>
            <option>YM</option><option>YL</option><option>YXL</option>
            <option>Adult S</option><option>Adult M</option><option>Adult L</option>
            <option>Adult XL</option><option>Adult XXL</option>
          </select>
        </div>
        <div>
          <label for="shorts_size">Shorts / bottom size</label>
          <select id="shorts_size" name="shorts_size">
            <option value="">Select&hellip;</option>
            <option>YM</option><option>YL</option><option>YXL</option>
            <option>Adult S</option><option>Adult M</option><option>Adult L</option>
            <option>Adult XL</option><option>Adult XXL</option>
          </select>
        </div>
        <div>
          <label for="shoe_size">Shoe size</label>
          <input type="text" id="shoe_size" name="shoe_size" placeholder="e.g. Men&rsquo;s 10.5">
        </div>
      </div>

      <label for="shipping_address">Shipping address</label>
      <textarea id="shipping_address" name="shipping_address" placeholder="Street, city, state, ZIP"></textarea>

      <div class="check">
        <input type="checkbox" id="video_watched" name="video_watched" value="1">
        <span><label for="video_watched" style="all:unset;cursor:pointer">We watched the full invitation video.</label></span>
      </div>

      <label for="parent_questions">Parent questions or notes</label>
      <textarea id="parent_questions" name="parent_questions" placeholder="Anything our staff should know"></textarea>

      <button class="btn block" type="submit" style="margin-top:28px">Submit Response</button>
    </form>
  </div>
</section>`;

  const body = `
<main>
  <section class="hero">
    <div class="wrap">
      <p class="eyebrow">Private Invitation &middot; August 6&ndash;8, 2026 &middot; Rogers, Arkansas</p>
      <h1 class="display player-name">${esc(p.first_name)}<br>${esc(p.last_name)}</h1>
      ${p.grad_year ? `<p class="grad">Class of ${esc(p.grad_year)}</p>` : ''}
      <div class="blade" aria-hidden="true"></div>

      <div class="video-ph" role="img" aria-label="Video message from Marcus Monk — coming soon">
        <div>
          <div class="play" aria-hidden="true"></div>
          <p class="vp-label">A Message From Marcus Monk</p>
          <p class="vp-sub">Watch the full invitation video before responding below.</p>
        </div>
      </div>
    </div>
  </section>

  ${section('01 — The Environment', 'What This Is', `
    <p>Workshop HQ is a private, invitation-only basketball experience built for players who are ready to be challenged.</p>
    <p class="hit">This is not an open camp.<br>This is not a showcase.</p>
    <p>This is not a weekend built around lines, drills, and photos.</p>
    <p>This is a high-standard training environment where selected players will work directly with NBA players, professional trainers, and basketball minds who understand what the next level actually requires.</p>
    <p>The goal is simple:</p>
    <p class="hit">Put serious players in the room with people who have lived it, trained it, and know how to teach it.</p>
  `)}

  ${section('02 — The Selection', 'Why You Were Invited', `
    <p>You were invited because someone believes you belong in this environment.</p>
    <p>That does not mean anything is guaranteed.</p>
    <p>It means there is something worth taking a closer look at.</p>
    <p>Talent matters. But so does how you listen. How you compete. How you respond to coaching. How you handle discomfort. How quickly you adjust. How serious you are when the room gets real.</p>
    <p>This experience is designed to reveal that.</p>
    <p class="hit">Not just who can play.<br>Who can learn.<br>Who can grow.<br>Who can handle the standard.</p>
  `)}

  ${section('03 — The Work', 'What Players Will Experience', `
    <p>Players will train, compete, learn, and be evaluated in an environment built to feel different from anything they normally experience.</p>
    <p>They will work with NBA players, professional trainers, and coaches who know what elite development looks like up close.</p>
    <p>The sessions will be competitive. The teaching will be detailed. The pace will be intentional.</p>
    <p class="hit">This is not about doing more drills.</p>
    <p>It is about learning how great players think, prepare, move, compete, and respond.</p>
    <p>Players will leave with a clearer understanding of where they are, what separates them, and what has to improve next.</p>
  `)}

  ${section('04 — The Family', 'What Families Will Learn', `
    <p>Families will get a closer look at what real basketball development requires.</p>
    <p class="hit">Not hype.<br>Not promises.<br>Not the usual language around exposure.</p>
    <p>The goal is to help families better understand the player pathway, the training process, the standard at higher levels, and the decisions that shape a player&rsquo;s future.</p>
    <p>You will hear from people who have seen the game from the inside.</p>
    <p>You will learn what matters, what gets misunderstood, and what families should be paying attention to as their player continues to grow.</p>
  `)}

  ${section('05 — The Response', 'What Happens Next', `
    <p>Below, you will be able to accept or decline the invitation and complete the required player and family information.</p>
    <p>If you accept, our staff will follow up with the full schedule, arrival details, gear information, and next steps.</p>
    <p class="hit">Space is intentionally limited.</p>
    <p>This experience was designed for a small group.</p>
    <p>Please respond as soon as possible so we can finalize the roster and prepare the environment the right way.</p>
    ${p.response_status === 'Pending' ? '<p><a class="btn" href="#respond">Respond Now</a></p>' : ''}
  `)}

  ${respondBlock}
</main>`;
  return layout({ title: `Invitation — ${p.first_name} ${p.last_name}`, body });
}

/* ---------------- public: confirmation ---------------- */

function confirmationPage(status) {
  const accepted = status === 'Accepted';
  const body = `
<main class="confirm">
  <div>
    <div style="margin:0 auto 34px;display:flex;justify-content:center">${badge(160)}</div>
    <p class="eyebrow">Workshop HQ &middot; August 6&ndash;8, 2026 &middot; Rogers, Arkansas</p>
    <h1 class="display">${accepted ? 'You&rsquo;re In.' : 'Thank You.'}</h1>
    <div class="blade" aria-hidden="true"></div>
    <p>${
      accepted
        ? 'Thank you for accepting the invitation. Our staff has received your response and will follow up with next steps.'
        : 'Thank you for letting us know. Our staff has received your response.'
    }</p>
  </div>
</main>`;
  return layout({ title: accepted ? 'You\u2019re In' : 'Thank You', body });
}

/* ---------------- admin ---------------- */

function adminHeaderMeta() {
  return `<div class="meta"><strong>Staff Dashboard</strong><br><a href="/admin" style="color:var(--olive)">Roster</a> &middot; <a href="/admin/players/new" style="color:var(--olive)">Add player</a> &middot; <form method="post" action="/admin/logout" style="display:inline"><button type="submit" class="btn ghost small" style="font-size:12px;padding:3px 10px">Log out</button></form></div>`;
}

function adminLoginPage(error = '') {
  const body = `
<main class="login-shell">
  <div class="login-card">
    <p class="eyebrow">Staff Only</p>
    <h1 class="page-title" style="margin-top:6px">Admin Login</h1>
    ${error ? `<div class="flash err" role="alert" style="margin-top:16px">${esc(error)}</div>` : ''}
    <form method="post" action="/admin/login">
      <label for="username">Username</label>
      <input type="text" id="username" name="username" required autocomplete="username">
      <label for="password">Password</label>
      <input type="password" id="password" name="password" required autocomplete="current-password">
      <button class="btn block" type="submit" style="margin-top:26px">Log In</button>
    </form>
  </div>
</main>`;
  return layout({ title: 'Admin Login', body, bodyClass: 'admin', headerMeta: '<div class="meta"><strong>Staff Dashboard</strong></div>' });
}

function pill(kind, text) {
  return `<span class="pill ${kind}">${esc(text)}</span>`;
}

function statusPill(p) {
  if (p.response_status === 'Accepted') return pill('accepted', 'Accepted');
  if (p.response_status === 'Declined') return pill('declined', 'Declined');
  return pill('pending', 'Pending');
}

function adminDashboardPage({ stats, players, filters, flash = '' }) {
  const card = (num, lbl, href, cls = '') =>
    `<div class="card ${cls}"><a href="${href}"><div class="num">${num}</div><div class="lbl">${esc(lbl)}</div></a></div>`;

  const rows = players
    .map(
      (p) => `<tr>
  <td class="name"><a href="/admin/players/${p.id}">${esc(p.first_name)} ${esc(p.last_name)}</a></td>
  <td>${esc(p.gender)}</td>
  <td>${esc(p.grad_year)}</td>
  <td>${esc(p.grade)}</td>
  <td>${esc(p.school)}</td>
  <td>${esc(p.current_team)}</td>
  <td>${esc(p.parent_name)}</td>
  <td>${esc(p.parent_phone)}</td>
  <td>${esc(p.parent_email)}</td>
  <td><span class="code-chip">${esc(p.invitation_code)}</span></td>
  <td>${p.invite_status === 'Sent' ? pill('sent', 'Sent') : pill('notsent', 'Not Sent')}</td>
  <td>${statusPill(p)}</td>
  <td>${p.camp_rsvp ? pill(p.camp_rsvp === 'Yes' ? 'yes' : 'no', p.camp_rsvp) : '<span class="dot-miss"></span>'}</td>
  <td>${p.gear_complete ? '<span class="dot-ok">Gear</span>' : '<span class="dot-miss">Gear</span>'}</td>
  <td>${p.address_complete ? '<span class="dot-ok">Addr</span>' : '<span class="dot-miss">Addr</span>'}</td>
  <td>${p.video_watched ? '<span class="dot-ok">Video</span>' : '<span class="dot-miss">Video</span>'}</td>
  <td>${esc(p.follow_up_date)}</td>
  <td title="${esc(p.notes)}">${esc(p.notes ? p.notes.slice(0, 28) + (p.notes.length > 28 ? '…' : '') : '')}</td>
  <td>${esc((p.updated_at || '').slice(0, 16))}</td>
</tr>`
    )
    .join('');

  const sel = (name, val) => (filters[name] === val ? 'selected' : '');

  const body = `
<main class="admin-wrap">
  ${flash ? `<div class="flash">${esc(flash)}</div>` : ''}
  <div class="admin-bar">
    <h1 class="page-title">Invite Roster</h1>
    <div class="actions">
      <a class="btn small" href="/admin/players/new">+ Add invited player</a>
      <a class="btn ghost small" href="/admin/import">CSV import</a>
      <a class="btn ghost small" href="/admin/export.csv">CSV export</a>
    </div>
  </div>

  <div class="cards">
    ${card(stats.total, 'Total invited players', '/admin')}
    ${card(stats.sent, 'Invites sent', '/admin?invite=Sent', 'quiet')}
    ${card(stats.accepted, 'Accepted', '/admin?status=Accepted')}
    ${card(stats.declined, 'Declined', '/admin?status=Declined', 'quiet')}
    ${card(stats.pending, 'Pending response', '/admin?status=Pending', 'quiet')}
    ${card(stats.rsvpYes, 'Camp RSVP yes', '/admin?rsvp=Yes')}
    ${card(stats.gearMissing, 'Gear info missing', '/admin?missing=gear', stats.gearMissing ? 'warn' : 'quiet')}
    ${card(stats.addressMissing, 'Address missing', '/admin?missing=address', stats.addressMissing ? 'warn' : 'quiet')}
    ${card(stats.videoNotWatched, 'Video not watched', '/admin?missing=video', 'quiet')}
    ${card(stats.followupsToday, 'Follow-ups due today', '/admin?followup=today', stats.followupsToday ? 'warn' : 'quiet')}
  </div>

  <form class="filters" method="get" action="/admin">
    <div class="f"><label for="q">Search</label><input type="text" id="q" name="q" value="${esc(filters.q || '')}" placeholder="Name, school, team, code"></div>
    <div class="f"><label for="status">Response</label>
      <select id="status" name="status">
        <option value="">All</option>
        <option ${sel('status', 'Pending')}>Pending</option>
        <option ${sel('status', 'Accepted')}>Accepted</option>
        <option ${sel('status', 'Declined')}>Declined</option>
      </select></div>
    <div class="f"><label for="invite">Invite</label>
      <select id="invite" name="invite">
        <option value="">All</option>
        <option ${sel('invite', 'Sent')}>Sent</option>
        <option value="Not Sent" ${sel('invite', 'Not Sent')}>Not Sent</option>
      </select></div>
    <div class="f"><label for="rsvp">Camp RSVP</label>
      <select id="rsvp" name="rsvp">
        <option value="">All</option>
        <option ${sel('rsvp', 'Yes')}>Yes</option>
        <option ${sel('rsvp', 'No')}>No</option>
      </select></div>
    <div class="f"><label for="missing">Missing</label>
      <select id="missing" name="missing">
        <option value="">—</option>
        <option value="gear" ${sel('missing', 'gear')}>Gear info</option>
        <option value="address" ${sel('missing', 'address')}>Address</option>
        <option value="video" ${sel('missing', 'video')}>Video not watched</option>
      </select></div>
    <div class="f"><label for="followup">Follow-up</label>
      <select id="followup" name="followup">
        <option value="">—</option>
        <option value="today" ${sel('followup', 'today')}>Due today</option>
        <option value="overdue" ${sel('followup', 'overdue')}>Overdue</option>
      </select></div>
    <button class="btn small" type="submit">Filter</button>
    <a class="btn ghost small" href="/admin">Clear</a>
  </form>

  <div class="table-scroll">
    <table class="roster">
      <thead><tr>
        <th>Player</th><th>Gender</th><th>Grad</th><th>Grade</th><th>School</th><th>Team</th>
        <th>Parent</th><th>Phone</th><th>Email</th><th>Code</th>
        <th>Invite</th><th>Response</th><th>RSVP</th><th>Gear</th><th>Address</th><th>Video</th>
        <th>Follow-up</th><th>Notes</th><th>Updated</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="19" style="padding:28px;text-align:center;color:#8a7a5f">No players match these filters. Add an invited player to get started.</td></tr>'}</tbody>
    </table>
  </div>
  <p class="help" style="margin-top:10px">Shipping addresses are not shown here. Open a player&rsquo;s detail page to view their address.</p>
</main>`;
  return layout({ title: 'Admin — Roster', body, bodyClass: 'admin', headerMeta: adminHeaderMeta() });
}

function playerFormPage({ player = null, error = '', flash = '' }) {
  const p = player || {};
  const isEdit = !!player;
  const v = (k) => esc(p[k] || '');
  const selOpt = (k, val) => (p[k] === val ? 'selected' : '');
  const body = `
<main class="admin-wrap" style="max-width:860px">
  ${flash ? `<div class="flash">${esc(flash)}</div>` : ''}
  ${error ? `<div class="flash err" role="alert">${esc(error)}</div>` : ''}
  <div class="admin-bar">
    <h1 class="page-title">${isEdit ? `Edit — ${v('first_name')} ${v('last_name')}` : 'Add Invited Player'}</h1>
    <div class="actions">${isEdit ? `<a class="btn ghost small" href="/admin/players/${p.id}">Back to detail</a>` : '<a class="btn ghost small" href="/admin">Back to roster</a>'}</div>
  </div>

  <form method="post" action="${isEdit ? `/admin/players/${p.id}` : '/admin/players'}">
    <div class="panel">
      <h3>Player</h3>
      <div class="grid3">
        <div><label for="first_name">First name *</label><input type="text" id="first_name" name="first_name" required value="${v('first_name')}"></div>
        <div><label for="last_name">Last name *</label><input type="text" id="last_name" name="last_name" required value="${v('last_name')}"></div>
        <div><label for="gender">Gender</label>
          <select id="gender" name="gender">
            <option value=""></option>
            <option ${selOpt('gender', 'Boys')}>Boys</option>
            <option ${selOpt('gender', 'Girls')}>Girls</option>
          </select></div>
        <div><label for="grad_year">Grad year</label><input type="text" id="grad_year" name="grad_year" value="${v('grad_year')}" placeholder="2029"></div>
        <div><label for="grade">Grade</label><input type="text" id="grade" name="grade" value="${v('grade')}" placeholder="9th"></div>
        <div><label for="school">School</label><input type="text" id="school" name="school" value="${v('school')}"></div>
        <div><label for="current_team">Current team</label><input type="text" id="current_team" name="current_team" value="${v('current_team')}"></div>
      </div>
    </div>

    <div class="panel">
      <h3>Parent / Guardian</h3>
      <div class="grid3">
        <div><label for="parent_name">Name</label><input type="text" id="parent_name" name="parent_name" value="${v('parent_name')}"></div>
        <div><label for="parent_phone">Phone</label><input type="tel" id="parent_phone" name="parent_phone" value="${v('parent_phone')}"></div>
        <div><label for="parent_email">Email</label><input type="email" id="parent_email" name="parent_email" value="${v('parent_email')}"></div>
      </div>
    </div>

    <div class="panel">
      <h3>Staff Tracking</h3>
      <div class="grid3">
        <div><label for="invite_status">Invite status</label>
          <select id="invite_status" name="invite_status">
            <option value="Not Sent" ${selOpt('invite_status', 'Not Sent')}>Not Sent</option>
            <option ${selOpt('invite_status', 'Sent')}>Sent</option>
          </select></div>
        <div><label for="follow_up_date">Follow-up date</label><input type="date" id="follow_up_date" name="follow_up_date" value="${v('follow_up_date')}"></div>
        <div></div>
      </div>
      <label for="notes">Staff notes</label>
      <textarea id="notes" name="notes">${v('notes')}</textarea>
      ${isEdit ? `<p class="help">Invitation code: <span class="code-chip">${v('invitation_code')}</span> — regenerate from the detail page if needed.</p>` : '<p class="help">A unique invitation code is generated automatically when you save.</p>'}
    </div>

    <div class="inline-actions">
      <button class="btn" type="submit">${isEdit ? 'Save changes' : 'Add player & generate code'}</button>
    </div>
  </form>
</main>`;
  return layout({ title: isEdit ? 'Edit player' : 'Add player', body, bodyClass: 'admin', headerMeta: adminHeaderMeta() });
}

function playerDetailPage({ p, flash = '' }) {
  const yn = (b) => (b ? 'Yes' : 'No');
  const body = `
<main class="admin-wrap" style="max-width:960px">
  ${flash ? `<div class="flash">${esc(flash)}</div>` : ''}
  <div class="admin-bar">
    <h1 class="page-title">${esc(p.first_name)} ${esc(p.last_name)}</h1>
    <div class="actions">
      <a class="btn ghost small" href="/admin">Back to roster</a>
      <a class="btn small" href="/admin/players/${p.id}/edit">Edit player</a>
    </div>
  </div>

  <div class="panel">
    <h3>Invitation</h3>
    <dl class="kv">
      <dt>Invitation code</dt><dd><span class="code-chip">${esc(p.invitation_code)}</span></dd>
      <dt>Invite status</dt><dd>${p.invite_status === 'Sent' ? pill('sent', 'Sent') : pill('notsent', 'Not Sent')}</dd>
      <dt>Response status</dt><dd>${statusPill(p)}</dd>
      <dt>Responded at</dt><dd>${esc(p.responded_at) || '—'}</dd>
      <dt>Invite link</dt><dd>Families verify at <span class="code-chip">/invite</span> with the player&rsquo;s name + code.</dd>
    </dl>
    <div class="inline-actions">
      ${p.invite_status !== 'Sent' ? `<form method="post" action="/admin/players/${p.id}/mark-sent"><button class="btn small" type="submit">Mark invite sent</button></form>` : ''}
      <form method="post" action="/admin/players/${p.id}/generate-code" onsubmit="return confirm('Generate a new code? The old code will stop working.')"><button class="btn ghost small" type="submit">Generate new code</button></form>
      ${p.response_status !== 'Pending' ? `<form method="post" action="/admin/players/${p.id}/reset" onsubmit="return confirm('Reset this response? The family will be able to submit the form again.')"><button class="btn ghost small" type="submit">Reset invitation response</button></form>` : ''}
    </div>
  </div>

  <div class="panel">
    <h3>Player</h3>
    <dl class="kv">
      <dt>Gender</dt><dd>${esc(p.gender) || '—'}</dd>
      <dt>Grad year</dt><dd>${esc(p.grad_year) || '—'}</dd>
      <dt>Grade</dt><dd>${esc(p.grade) || '—'}</dd>
      <dt>School</dt><dd>${esc(p.school) || '—'}</dd>
      <dt>Current team</dt><dd>${esc(p.current_team) || '—'}</dd>
    </dl>
  </div>

  <div class="panel">
    <h3>Family & Response</h3>
    <dl class="kv">
      <dt>Parent name</dt><dd>${esc(p.parent_name) || '—'}</dd>
      <dt>Parent phone</dt><dd>${esc(p.parent_phone) || '—'}</dd>
      <dt>Parent email</dt><dd>${esc(p.parent_email) || '—'}</dd>
      <dt>Camp RSVP</dt><dd>${esc(p.camp_rsvp) || '—'}</dd>
      <dt>Camp days</dt><dd>${esc(p.camp_days) || '—'}</dd>
      <dt>Video watched</dt><dd>${yn(p.video_watched)}</dd>
      <dt>Parent questions</dt><dd>${esc(p.parent_questions) || '—'}</dd>
    </dl>
  </div>

  <div class="panel">
    <h3>Gear & Shipping</h3>
    <dl class="kv">
      <dt>Jersey / top</dt><dd>${esc(p.jersey_size) || '—'}</dd>
      <dt>Shorts / bottom</dt><dd>${esc(p.shorts_size) || '—'}</dd>
      <dt>Shoe size</dt><dd>${esc(p.shoe_size) || '—'}</dd>
      <dt>Gear complete</dt><dd>${yn(p.gear_complete)}</dd>
      <dt>Shipping address</dt><dd style="white-space:pre-line">${esc(p.shipping_address) || '—'}</dd>
      <dt>Address complete</dt><dd>${yn(p.address_complete)}</dd>
    </dl>
  </div>

  <div class="panel">
    <h3>Staff</h3>
    <dl class="kv">
      <dt>Follow-up date</dt><dd>${esc(p.follow_up_date) || '—'}</dd>
      <dt>Notes</dt><dd style="white-space:pre-line">${esc(p.notes) || '—'}</dd>
      <dt>Last updated</dt><dd>${esc(p.updated_at)}</dd>
    </dl>
    <hr class="rule">
    <form method="post" action="/admin/players/${p.id}/quick">
      <div class="grid2a">
        <div><label for="follow_up_date">Set follow-up date</label><input type="date" id="follow_up_date" name="follow_up_date" value="${esc(p.follow_up_date)}"></div>
        <div><label for="notes">Add / edit notes</label><textarea id="notes" name="notes">${esc(p.notes)}</textarea></div>
      </div>
      <div class="inline-actions"><button class="btn small" type="submit">Save</button></div>
    </form>
  </div>
</main>`;
  return layout({ title: `${p.first_name} ${p.last_name}`, body, bodyClass: 'admin', headerMeta: adminHeaderMeta() });
}

function importPage({ result = null, error = '' } = {}) {
  const body = `
<main class="admin-wrap" style="max-width:760px">
  <div class="admin-bar">
    <h1 class="page-title">CSV Import</h1>
    <div class="actions"><a class="btn ghost small" href="/admin">Back to roster</a></div>
  </div>
  ${error ? `<div class="flash err" role="alert">${esc(error)}</div>` : ''}
  ${result ? `<div class="flash">Imported ${result.created} new player${result.created === 1 ? '' : 's'}, updated ${result.updated}, skipped ${result.skipped} row${result.skipped === 1 ? '' : 's'}.</div>` : ''}
  <div class="panel">
    <h3>Upload a CSV</h3>
    <p class="help" style="margin-top:12px">Expected header row (order doesn&rsquo;t matter, extra columns are ignored):</p>
    <p style="margin-top:8px"><span class="code-chip">first_name, last_name, gender, grad_year, grade, school, current_team, parent_name, parent_phone, parent_email, invitation_code, invite_status, follow_up_date, notes</span></p>
    <p class="help" style="margin-top:10px">Only <b>first_name</b> and <b>last_name</b> are required. Leave <b>invitation_code</b> blank to auto-generate one. Rows with an existing code update that player.</p>
    <form method="post" action="/admin/import" enctype="multipart/form-data" style="margin-top:8px">
      <label for="file">CSV file</label>
      <input type="file" id="file" name="file" accept=".csv,text/csv" required>
      <div class="inline-actions"><button class="btn small" type="submit">Import players</button></div>
    </form>
  </div>
</main>`;
  return layout({ title: 'CSV Import', body, bodyClass: 'admin', headerMeta: adminHeaderMeta() });
}

module.exports = {
  esc,
  invitePage,
  invitationPage,
  confirmationPage,
  adminLoginPage,
  adminDashboardPage,
  playerFormPage,
  playerDetailPage,
  importPage,
};
