# Workshop HQ — Private Invite System

Invitation-only landing page and response system for **Workshop HQ by Marcus & Malik Monk**.
August 6–8, 2026 · Rogers, Arkansas · *Learn. Grow. Lead.*

## What's inside

- **Invite gate** (`/invite`) — families enter player first name, last name, and invitation code. Names are normalized (trimmed, case-insensitive). Failures show one generic error that never reveals which field was wrong. IP rate limiting (10 attempts / 15 min) blocks code guessing.
- **Private invitation page** (`/invitation`) — session-gated. Player name, grad year, Marcus Monk video placeholder, all five story sections, and the accept/decline form.
- **Response form** — parent/guardian contact, camp RSVP + days, gear sizes, shipping address, video-watched checkbox, parent questions. Saves response status + timestamp, auto-flags gear/address completeness, and blocks duplicate submissions until an admin resets the invite.
- **Confirmation pages** — "You're In." / "Thank You."
- **Admin dashboard** (`/admin`) — login-protected. 10 summary cards (each one clicks through to a filtered view), full player table, filters + search, player detail pages, add/edit players, code generation, mark-sent, response reset, follow-up dates, notes, CSV import/export.
- **Privacy** — no medical, payment, or document collection. Shipping addresses appear only on the admin player detail page, never on the roster table. The invite gate is the only public surface.

## Requirements

Node.js **22.13 or newer** (uses Node's built-in SQLite — no native builds, no external database).

## Setup

```bash
npm install
ADMIN_USER=admin ADMIN_PASS=your-strong-password npm run seed
npm start
```

- Family flow: http://localhost:3000/invite
- Staff login: http://localhost:3000/admin/login

The seed script creates the admin account and, on an empty database, three sample players (their codes are printed to the console so you can test the flow). Set `SKIP_SAMPLES=1` to seed only the admin. Run seed again anytime to reset the admin password.

## Configuration

| Env var | Purpose | Default |
|---|---|---|
| `PORT` | Server port | `3000` |
| `SESSION_SECRET` | Session signing key — **set this in production** | random per boot |
| `ADMIN_USER` / `ADMIN_PASS` | Seed script credentials | `admin` / random |
| `NODE_ENV=production` | Enables secure cookies (requires HTTPS) | — |

## CSV import format

Header row (order doesn't matter, extras ignored). Only `first_name` and `last_name` are required:

```
first_name,last_name,gender,grad_year,grade,school,current_team,parent_name,parent_phone,parent_email,invitation_code,invite_status,follow_up_date,notes
```

Leave `invitation_code` blank to auto-generate. A row matching an existing code updates that player instead of creating a duplicate.

## Deploying

Any Node host works (Railway, Render, Fly.io, a VPS). Data lives in `workshop-hq.db` next to the app — make sure the host gives you a persistent disk, and back that file up. Put the app behind HTTPS and set `SESSION_SECRET` and `NODE_ENV=production`.

## Project layout

```
server.js    routes, auth, rate limiting, CSV import/export
db.js        schema + invite matching + code generation
views.js     all server-rendered pages (public + admin)
seed.js      admin account + sample players
lib/csv.js   dependency-free CSV parse/stringify
public/      stylesheet (earth-tone design system)
```
