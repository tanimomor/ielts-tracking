# IELTS Tracker

A small, invite-only web app for a study group practising with the Cambridge IELTS books.
Log every attempt (`c17t1p2`-style codes, scores, bands, mistake tags), browse and filter the
history, see analytics, compare students and export everything to Excel.

- **Next.js 16** (App Router, Server Components, Server Actions, `proxy.ts`)
- **Neon Postgres** via `@neondatabase/serverless` + **Drizzle ORM** / drizzle-kit migrations
- **Better Auth** (stable) with **Google** as the only sign-in method, database sessions
- **Tailwind CSS 4** + shadcn/ui-style components on Radix, lucide icons, Geist
- **Recharts** for charts, **ExcelJS** for `.xlsx`, **Zod** for validation, **Vitest** for tests

> Auth library: the original plan named Auth.js v5, which is still only published as a beta.
> Better Auth is its stable successor (the Auth.js project joined it) and gives the same
> behaviour here: Google-only sign-in, a Drizzle adapter, and revocable database sessions.

---

## Features

| Page | What it does |
| --- | --- |
| **Log** (`/log`) | Mobile-first form: skill, date, Cambridge book dropdown, test number, part chips, score / band, time, mistake tags (create new on the fly), notes. Live band preview. The form stays open after saving and moves on to the next part. |
| **Attempts** (`/attempts`) | Grouped by date, filterable (date presets / custom, students, skills, book, tags, search), sortable, paginated server-side. Edit / delete your own rows. A **Grid** view mirrors the old Google Sheet (dates × students × skills, cells like `c17t1 (7.5)`). **Export** downloads exactly the filtered list as `.xlsx` (Attempts + Grid sheets). |
| **Dashboard** (`/dashboard`) | One student or everyone; month, year, all time or a custom range. Shows the **latest saved snapshot** and only recomputes when you press **Sync & refresh**. Headline band, per-skill cards with ▲/▼ vs the previous period, insights, band trend vs target, skill radar, weekly volume, practice calendar, L/R by section, mistake tags, Cambridge book breakdown. Export a snapshot to `.xlsx` (Summary, Insights, Weekly, Detail, one sheet per skill). |
| **Compare** (`/compare`) | Pick 2+ students and a period: overlaid trends in each student's colour, side-by-side radars, a per-metric table with the leader and spread highlighted, volume comparison. Snapshot-based, same as the dashboard. |
| **Students** (`/students`, `/students/[id]`) | Profiles with target vs current, progress timeline, milestones (first 7.0 in Reading, 50 attempts, …), next goals, full history, export and profile editing (your own). |
| **Import** (`/import`) | One-time CSV import of the Google Sheet "Log" tab with Person → student mapping, preview, error list and duplicate check. |

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
- **Reports are never computed on page load.** *Sync & refresh* runs a set of `GROUP BY` queries
  in Postgres, shapes the result (`src/lib/reports`) and stores it in `report_snapshots`. Only
  the newest 10 snapshots are kept per scope and period.

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

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (provided by `vc i neon`) |
| `AUTH_SECRET` | Random secret for signing session cookies. Generate one with `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth client (see below) |
| `ALLOWED_EMAILS` | Comma-separated Google emails allowed to sign in, e.g. `you@gmail.com,friend@gmail.com` |
| `AUTH_URL` | Optional. Public base URL. Defaults to `http://localhost:3000` locally and the production domain on Vercel. Set it if you use a custom domain. |

Anyone not in `ALLOWED_EMAILS` sees **"This account isn't invited"**. Removing an email
blocks that person's next sign-in. To sign someone out everywhere, delete their rows from
`sessions`.

### Scripts

| Command | |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm typecheck` · `pnpm lint` · `pnpm test` | Checks (`pnpm check` runs all three) |
| `pnpm db:generate` | Create a migration after editing `src/server/db/schema.ts` |
| `pnpm db:migrate` | Apply migrations to `DATABASE_URL` |
| `pnpm db:seed` | Seed sample data for the first two `ALLOWED_EMAILS` (or `SEED_EMAILS`) |
| `pnpm db:studio` | Drizzle Studio |

---

## Google Cloud Console setup

1. Go to <https://console.cloud.google.com/> and create (or pick) a project.
2. **APIs & Services → OAuth consent screen**
   - User type: **External**.
   - App name, support email and developer contact email. Scopes: the defaults
     (`openid`, `email`, `profile`) are all that's needed.
   - Leave **Publishing status: Testing**.
   - Under **Test users**, add **both students' Google addresses**. While the app is in Testing
     mode, only these accounts can complete the Google sign-in.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**.
   - **Authorized JavaScript origins**: `http://localhost:3000` and `https://<your-domain>`
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://<your-domain>/api/auth/callback/google`
4. Copy the client ID and secret into `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

`<your-domain>` is your production domain, e.g. `ielts-tracker.vercel.app`. Vercel preview URLs
change on every deploy, so Google sign-in only works on the domains you register here.

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
3. **Add environment variables** under **Settings → Environment Variables**, for Production and
   Preview:
   - `AUTH_SECRET`: output of `openssl rand -base64 32`
   - `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`: from Google Cloud (see above)
   - `ALLOWED_EMAILS`: e.g. `you@gmail.com,friend@gmail.com`
   - `AUTH_URL`: only needed for a custom domain, e.g. `https://ielts.example.com`
4. **Register the domain with Google.** Add `https://<project>.vercel.app` as an authorized
   JavaScript origin and `https://<project>.vercel.app/api/auth/callback/google` as a redirect URI.
5. **Redeploy** (Deployments → ⋯ → Redeploy). The build log should show
   `migrations applied successfully` before `next build`.
6. **Sign in** with each student's Google account. A student row with a matching email is linked
   automatically. Otherwise a short onboarding asks for name, target band and colour.
7. *(Optional)* **Seed or import.** Upload the old sheet on **Import**, or seed sample data from your
   machine with `vercel env pull .env.local && pnpm db:seed`. The seed replaces the first two
   students' attempts, so only use it on an empty or dev database. Then press **Sync & refresh** on the
   dashboard.

Preview deployments get a new URL every time, and Google only accepts registered redirect URIs.
That means sign-in works on the production domain, not on previews.

## Project structure

```
src/
  proxy.ts                    # redirects signed-out users to /login?callbackUrl=…
  app/
    login, not-invited, onboarding
    (app)/                    # signed-in shell (sidebar / bottom tabs)
      log, attempts, dashboard, compare, students, students/[id], import
    api/auth/[...all]         # Better Auth
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
    auth.ts, session.ts       # Better Auth config, requireStudent/authorizeStudent
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
