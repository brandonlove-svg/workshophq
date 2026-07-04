# How to Put Workshop HQ on the Internet (the simple version)

Right now the app is like a lemonade stand packed in a box. It works, but it's
sitting in your garage. To let families use it, you need to set the stand up on
a street corner that everyone can visit — that "street corner" is a hosting
service. We'll use **Railway** (railway.com). It costs about $5/month and does
almost everything for you.

## Part 1 — Put your code on GitHub (the shelf where Railway finds it)

1. Go to **github.com** and make a free account.
2. Click the **+** in the top right → **New repository**. Name it `workshop-hq`.
   Set it to **Private**. Click **Create repository**.
3. On the new repo page, click **"uploading an existing file"**.
4. Unzip `workshop-hq.zip` on your computer, then drag ALL the files and folders
   inside the `workshop-hq` folder into the GitHub page. Click **Commit changes**.

## Part 2 — Turn it on with Railway

1. Go to **railway.com** and sign up **with your GitHub account** (one click).
2. Click **New Project** → **Deploy from GitHub repo** → pick `workshop-hq`.
3. Railway will start building it. While it does, click your service, then the
   **Variables** tab, and add these four (like filling in name tags):

   | Name | What to type |
   |---|---|
   | `ADMIN_USER` | the username you want, e.g. `marcus` |
   | `ADMIN_PASS` | a strong password only staff know |
   | `SESSION_SECRET` | mash the keyboard — 40+ random characters |
   | `DB_PATH` | `/data/workshop-hq.db` |

4. Add a **Volume** (this is the app's filing cabinet so player info doesn't
   disappear when the app restarts): right-click the service → **Attach Volume**
   → set the mount path to `/data`.
5. Click the **Settings** tab → **Networking** → **Generate Domain**. Railway
   gives you a web address like `workshop-hq-production.up.railway.app`.
   That's your live site. (Later you can attach a custom domain like
   `workshophq.com` in the same place.)

That's it. The app creates your admin account automatically the first time it
starts, using the ADMIN_USER and ADMIN_PASS you typed.

## Part 3 — Load your players (the back end)

1. Go to `https://YOUR-ADDRESS/admin/login`
2. Log in with your ADMIN_USER and ADMIN_PASS.
3. Add players one of two ways:
   - **One at a time:** click **+ Add invited player**, fill in the name, save.
     The app instantly gives that player a secret code like `WHQ-7KDM-P3XN`.
   - **All at once:** click **CSV import** and upload a spreadsheet saved as
     CSV. It only *needs* two columns — `first_name` and `last_name` — and the
     app makes a code for every row automatically. (Export from Excel or
     Google Sheets with File → Download → CSV.)

## Part 4 — Invite the families

Each player's row on your dashboard shows their code. Text or email each
family something like:

> You're invited to Workshop HQ, Aug 6–8 in Rogers. Go to
> **https://YOUR-ADDRESS/invite** and enter Jalen, Carter, and code
> **WHQ-7KDM-P3XN** to see your private invitation and respond.

They can only see their own page — the name and code have to match exactly.
When they accept or decline, it shows up on your dashboard in real time,
along with gear sizes, shipping address, and RSVP.

## If something goes wrong

- **Forgot the admin password?** In Railway, change `ADMIN_PASS`... actually
  that only works before the first boot. Easiest fix: open the service's
  terminal in Railway ("...", then Shell) and run
  `ADMIN_USER=marcus ADMIN_PASS=newpassword npm run seed` — that resets it.
- **A family says their code doesn't work?** Check the spelling of the name on
  their dashboard row — it must match what they type (capitals don't matter,
  spelling does). Or open their detail page and generate a fresh code.
- **A family made a mistake on the form?** Open their detail page → **Reset
  invitation response** → they can submit again.
