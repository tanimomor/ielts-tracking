# IELTS Tracker

A small, invite-only web app for a study group practising with the Cambridge IELTS books.
Log every attempt (`c17t1p2`-style codes, scores, bands, mistake tags), browse and filter the
history, see analytics, compare students and export everything to Excel.

- **Next.js 16** (App Router, Server Components, Server Actions, `proxy.ts`)
- **Neon Postgres** via `@neondatabase/serverless` + **Drizzle ORM** / drizzle-kit migrations
- Simple **username + password** login for two hardcoded accounts, with database sessions
- **Tailwind CSS 4** + shadcn/ui-style components on Radix, lucide icons, Geist
- **Recharts** for charts, **ExcelJS** for `.xlsx`, **Zod** for validation, **Vitest** for tests

## Accounts

The two accounts are hardcoded in `src/server/users.ts`:

| Username | Password |
| --- | --- |
| `tanim` | `Test#123` |
| `habiba` | `habiba@123` |

Passwords are stored as **scrypt hashes**, not plain text. To change one, run
`pnpm hash-password 'new password'` and paste the output into `src/server/users.ts`. To add
someone, add another entry. Sessions are rows in the `sessions` table: deleting a row signs that
device out, and removing a user from `users.ts` locks them out even with a live cookie.

> Anyone who can read this repository can see these usernames, and weak passwords can be guessed
> from their hashes. Keep the GitHub repo **private**, and change the passwords if it isn't.

---

## Features

| Page | What it does |
| --- | --- |
| **Quick entry** (button in the sidebar, floating **+** on mobile, or press **N**) | A four-step dialog: 1 Practice (skill, date) → 2 Book & test (book, volume, test, part) → 3 Result (score or band, live band preview) → 4 optional Details (time, tags, notes). **Save & add another** keeps it open and moves to the next part. |
| **Books** | Cambridge comes with volumes 1–21. Anyone can **add a book** (e.g. Makkar) from the Book dropdown: a name, a short code (`mk` → codes like `mk2t5` / `mkt5`), numbered volumes or a single book, and tests per book. The pencil next to the dropdown edits it (e.g. when Cambridge 22 comes out). |
| **Attempts** (`/attempts`) | Grouped by date, filterable (date presets / custom, students, skills, book or a single volume, tags, search), sortable, paginated server-side. Edit / delete your own rows. A **Grid** view mirrors the old Google Sheet. **Export** downloads exactly the filtered list as `.xlsx` (Attempts + Grid sheets). |
| **Dashboard** (`/dashboard`) | One student or everyone; month, year, all time or custom range. Shows the **latest saved snapshot** and only recomputes on **Sync & refresh**. Headline band, per-skill cards, insights, band trend vs target, skill radar, weekly volume, practice calendar, L/R by section, mistake tags, per-book breakdown. Export to `.xlsx`. |
| **Scoreboard** (`/scoreboard`) | Everyone ranked by estimated overall band, category champions (most practice, streak, most improved, best per skill), a head-to-head table and a weekly practice race (snapshot-based). **Compare on** a book, volume, test, part and/or skill to switch to a live head-to-head on that material: ranked cards (wins, best band, average %) and every item side by side with the leader marked; exports to `.xlsx`. |
| **Students** (`/students`, `/students/[id]`) | Profiles with target vs current, progress timeline, milestones, next goals, full history, export and profile editing (your own). |
| **Import** (`/import`) | One-time CSV import of the Google Sheet "Log" tab with Person → student mapping, preview, error list and duplicate check. Book can be a Cambridge number, a book name ("Makkar", "Cambridge 18") or a code. |
| **Notes** (`/notes`) | Google Keep–style cards: "Take a note…" box, pastel colours, pin, search. Notes are private unless you switch them to **Shared with group**; others see shared notes read-only. |
| **Live updates** | When someone logs, edits or deletes an attempt, adds a book, shares a note or imports, everyone else gets a toast and the open page updates in place (Server-Sent Events from `/api/events`, paused while the tab is hidden). The sidebar shows **Live**. |
| **Theme** | Light (default) or dark. Switch it from the user menu or the login page; the choice is remembered per browser. |

### Rules worth knowing

- **Bands.** Listening/Reading full tests (out of 40) get a band from the tables in
  `src/lib/scoring.ts`. Partial tests store score and % only. Writing/Speaking bands are picked
  from a list. The overall band is the IELTS-rounded mean of the four skills: `.25` rounds up to `.5`,
  and `.75` rounds up to the next whole band.
- **Permissions.** Every signed-in student can see everyone's data. You can only create, edit or
  delete your own attempts. This is enforced inside every Server Action, not just in the UI.
  The importer follows the same rule: each student imports their own rows, and duplicates are
  skipped, so it's safe for both of you to upload the same file.
- **Dates** are calendar dates in **Asia/Dhaka**. "Today", week/month presets and streaks all use
  that zone. Weeks start on Monday.
- **Reports are snapshots.** The first time a view (scope + period) is opened it is computed and
  saved; after that it only changes when someone presses *Sync & refresh*, which runs a set of
  `GROUP BY` queries in Postgres, shapes the result (`src/lib/reports`) and stores it in
  `report_snapshots`. Only the newest 10 snapshots are kept per scope and period.

---

## Local setup

Requirements: Node 20+ (22 recommended) and pnpm 10.

```bash
pnpm install
cp .env.example .env.local     # then fill it in (see below)
pnpm db:migrate                # create the tables
pnpm db:seed                   # optional: 2 students × ~3 months of sample practice
pnpm dev                       # http://localhost:3000
```

### Database

**Option A: Neon through Vercel (recommended).** In your Vercel project:

```bash
npm i -g vercel
vercel link                    # link this folder to a Vercel project
vc i neon                      # installs Neon from the Vercel Marketplace and sets DATABASE_URL
vercel env pull .env.local     # copies DATABASE_URL (and other vars) locally
```

Consider creating a separate Neon **branch** for local development so the seed script never
touches production data.

**Option B: a local Postgres.** Any `postgres://…@localhost/…` URL works. `src/server/db/client.ts`
switches to `node-postgres` for localhost and uses Neon's serverless driver everywhere else.

### Environment variables

Only one: `DATABASE_URL`, the Postgres connection string (`vc i neon` sets it on Vercel).

### Scripts

| Command | |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm typecheck` · `pnpm lint` · `pnpm test` | Checks (`pnpm check` runs all three) |
| `pnpm db:generate` | Create a migration after editing `src/server/db/schema.ts` |
| `pnpm db:migrate` | Apply migrations to `DATABASE_URL` |
| `pnpm db:seed` | Seed ~3 months of sample practice for `tanim` and `habiba` |
| `pnpm hash-password '<pw>'` | Hash a new password for `src/server/users.ts` |
| `pnpm db:studio` | Drizzle Studio |

---

## Deploying to Vercel (Hobby)

`vercel.json` pins the build: `pnpm install --frozen-lockfile`, then `pnpm run vercel-build`
(`drizzle-kit migrate && next build`, so the database schema is migrated on every deploy). It also
runs functions in **Singapore (`sin1`)**, the closest Vercel region to Dhaka, and adds basic
security headers. Create the Neon database in the same area (**AWS ap-southeast-1, Singapore**)
so each query stays local.

1. **Import the repo.** In Vercel, go to **Add New → Project**, pick this GitHub repo and keep the
   detected Next.js settings. `vercel.json` overrides the commands. The first build fails without
   a database, which is expected.
2. **Add Neon.** In the project, open **Storage → Create Database → Neon** (Marketplace), choose
   region *Singapore* and connect it to the Production and Preview environments. This sets
   `DATABASE_URL`. From a terminal, `vercel link && vc i neon` does the same.
3. **Redeploy** (Deployments → ⋯ → Redeploy). The build log should show
   `migrations applied successfully` before `next build`. No other environment variables are needed.
4. **Log in** as `tanim` or `habiba`. The first login asks for a display name, target band and
   chart colour (prefilled), unless the seed already created that student.
5. *(Optional)* **Seed or import.** Upload the old sheet on **Import**, or seed sample data from your
   machine with `vercel env pull .env.local && pnpm db:seed`. The seed replaces both students'
   attempts, so only use it on an empty or dev database. Then press **Sync & refresh** on the
   dashboard.

Old variables from the Google sign-in setup (`AUTH_SECRET`, `AUTH_GOOGLE_ID`,
`AUTH_GOOGLE_SECRET`, `ALLOWED_EMAILS`, `AUTH_URL`) are no longer used and can be deleted.

## Project structure

```
src/
  proxy.ts                    # redirects logged-out users to /login?callbackUrl=…
  app/
    login, onboarding
    (app)/                    # signed-in shell (sidebar / bottom tabs)
      log, attempts, dashboard, compare, students, students/[id], import
    api/export/attempts       # filtered list → .xlsx
    api/export/snapshots/[id] # dashboard/compare snapshot → .xlsx
  components/                 # ui/ (shadcn-style), attempts/, charts/, reports/, students/, import/
  lib/                        # pure, unit-tested logic
    scoring.ts                # band tables, IELTS rounding, overall band
    dates.ts                  # Asia/Dhaka calendar helpers, streaks
    code.ts, parts.ts         # c17t1p2 codes, part ranges
    filters.ts, grid.ts       # attempts filters ⇄ URL, sheet-style grid
    reports/                  # period logic, snapshot assembly, insights
    csv-import.ts, milestones.ts, validation.ts
  server/                     # server-only
    db/                       # Drizzle schema + client
    users.ts                  # the hardcoded accounts (scrypt hashes)
    auth.ts, session.ts       # DB sessions + cookie, requireStudent/authorizeStudent
    actions/                  # Server Actions (Zod + auth + ownership checks)
    queries/                  # paginated reads
    reports/compute.ts        # SQL aggregates for snapshots
    excel/                    # ExcelJS workbook builders
scripts/seed.ts
drizzle/                      # migrations
```

## Tests

```bash
pnpm test
```

Covers every Listening/Reading table boundary and the rounding rule, Asia/Dhaka date handling,
code parsing, filter round-tripping, the grid model, report assembly and insights, milestones
and the CSV importer.
