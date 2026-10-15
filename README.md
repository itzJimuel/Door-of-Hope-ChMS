# Door of Hope ChMS

A simple, phone-friendly Church Management System for **Door of Hope Assembly of God**:
member records, fast check-in (tap names or scan QR cards), automatic activity status,
and a pastor's dashboard that shows who needs a follow-up call.

**Stack:** Next.js (web app) + Supabase (database, login, photo storage) on Vercel.
**Cost:** ₱0/month on the free tiers for a church of this size.

---

## How it works (the short version)

| Piece | Where |
|---|---|
| Database tables, security rules, status logic | `supabase/schema.sql` |
| 30 fake members to try it out | `supabase/seed.sql` |
| Pages (dashboard, members, check-in…) | `src/app/(app)/…` |
| Login | `src/app/login` |
| Weekly backup | `.github/workflows/backup.yml` |

**Activity status** is calculated from attendance at *any* church activity (Sunday service,
small group, prayer meeting, events):

- **Active**: 3 or more times in the last 4 weeks
- **Irregular**: 1–2 times in the last 4 weeks
- **Inactive**: no attendance in 4+ weeks
- **New**: within 90 days of their first visit
- Children are not given a status and never appear in follow-up lists.

Admins can change these numbers on **Settings**.
**Needs follow-up** lists people whose status dropped to Irregular or Inactive in the last 30 days.

**Who can see what** is enforced by the database itself (Row Level Security), not just by hiding buttons:

| Role | Can do |
|---|---|
| Admin | Everything, including user accounts, settings, the audit log and permanent deletion |
| Pastor | All members, dashboard, add/edit members, groups, services |
| Group leader | Only the members of groups they lead; check-in for their own group meetings |
| Usher | Check-in only for Sunday services and prayer meetings. Sees names, not phone numbers or addresses |
| Member | No access yet (self-service portal is Phase 3) |

---

## 1. One-time setup (about 30 minutes)

### a) Install the tools
1. Install **Node.js LTS** from <https://nodejs.org> (the big green button).
2. Create free accounts on **GitHub**, **Supabase** (<https://supabase.com>) and **Vercel** (<https://vercel.com>). Sign up to Supabase and Vercel *with* your GitHub account.

### b) Create the database
1. In Supabase click **New project**. Name: `doh-chms`. Region: **Southeast Asia (Singapore)**. Save the database password somewhere safe.
2. Open **SQL Editor → New query**, paste the whole of `supabase/schema.sql`, click **Run**.
3. (Optional, for testing) New query → paste `supabase/seed.sql` → **Run**. The result shows how many people are in each status.
4. **Turn off public sign-ups:** Authentication → Sign In / Providers → Email → disable **"Allow new users to sign up"**. Accounts are created by the admin inside the app.

### c) Create the first admin
1. Supabase → **Authentication → Users → Add user → Create new user**. Enter your email and a strong password and tick *Auto confirm*.
2. SQL Editor, run (with your email):
   ```sql
   update profiles set role = 'admin', full_name = 'Your Name'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

### d) Run it on your computer
1. Copy `.env.local.example` to `.env.local` and fill in the 3 values from Supabase → **Project Settings → API**.
2. In this folder run:
   ```
   npm install
   npm run dev
   ```
3. Open <http://localhost:3000> and sign in.

---

## 2. Deploy for free (Vercel)

1. Put this folder on GitHub as a **private** repository:
   ```
   git remote add origin https://github.com/YOUR-NAME/doh-chms.git
   git push -u origin main
   ```
2. In Vercel: **Add New → Project** → import the repo.
3. Under **Environment Variables** add the same 3 values from `.env.local`.
4. Click **Deploy**. You get a secure `https://doh-chms.vercel.app` address (HTTPS is automatic, which the QR camera needs).
5. In Supabase → Authentication → **URL Configuration**, set *Site URL* to your Vercel address.
6. On each leader's and usher's phone, open the address and use **Add to Home Screen** so it works like an app.

Every time you `git push`, Vercel updates the live site automatically.

Free-tier notes:
- Supabase pauses a free project after **7 days with no activity**. Weekly Sunday check-ins keep it awake. If it ever pauses, click *Restore* in Supabase.
- Supabase's free plan has **no automatic backups**, so set up the backup below.
- A custom domain (e.g. `chms.doorofhope.ph`) costs about ₱700/year and can be added in Vercel → Domains.

## 3. Backups (free, weekly, encrypted)

1. GitHub repo → Settings → Secrets and variables → Actions → **New repository secret**:
   - `SUPABASE_DB_URL`: Supabase → Project Settings → Database → Connection string → **URI** (Session pooler), with your DB password filled in.
   - `BACKUP_PASSPHRASE`: a long random phrase. **Write it down and keep it offline**; without it the backups cannot be opened.
2. Actions tab → *Weekly database backup* → **Run workflow** to test it.
3. To restore: download the artifact, then
   `openssl enc -d -aes-256-cbc -pbkdf2 -in chms-DATE.sql.gz.enc -out chms.sql.gz` → `gunzip` → run in the SQL Editor.

Also consider a monthly copy to an offline USB drive kept by the senior pastor.

---

## 4. Using it day to day

- **Sunday morning (usher):** open the app → *Check-in* → **Start today's Sunday Service** → tap names, or switch to **Scan QR** and hold up each member's card.
- **New visitor:** a pastor/admin adds them via *Members → Add member* (consent is required), and they can be checked in right away.
- **Printing QR cards:** *Members → QR cards → Print*. Each card fits a standard ID-card sleeve.
- **Small group leader:** *Services → New → Small Group meeting*, then check in your members. Your *Groups* page shows who is drifting.
- **Pastor:** the *Home* dashboard. Call the people in **Needs follow-up**.

## 5. Data privacy (Philippine Data Privacy Act of 2012)

What the system already does:
- Records each person's **consent and its date**. A member record can't be saved without it.
- Database-level role restrictions; ushers never see contact details.
- **Audit log** of every view, creation, edit and deletion of a member record (Settings → Audit log). It records which fields changed, not the values.
- **Archive** someone who moved away, or (admin) **permanently delete** a record on request.
- Photos are stored in a private bucket and shown only through short-lived links.
- Passwords are hashed by Supabase Auth, and all traffic is HTTPS.

What the church should do (not software):
- Appoint a **Data Protection Officer** (can be the church admin) and post a short privacy notice.
- Use a paper or digital consent form that says what is collected and why (pastoral care and attendance).
- Give accounts only to people who need them, and remove access when someone steps down.
- Keep the service-role key and backup passphrase secret.

## Roadmap

- **Phase 2:** follow-up assignments and outcomes, visitor→member pipeline, prayer requests and pastoral notes (pastors only), birthday SMS/email greetings.
- **Phase 3:** event registration, volunteer scheduling, broadcasts, giving records (finance role only), member self-service portal.
