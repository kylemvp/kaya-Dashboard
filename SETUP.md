# Kaya CMS — setup

The dashboard is backed by a real Supabase database: content persists, staff
sign in with real accounts, and enquiries from the public site arrive in the
inbox.

This guide takes a fresh clone to a working dashboard. About 15 minutes.

---

## Looking around first (no setup)

```bash
npm install && npm run dev
```

Open <http://localhost:1000> and pick one of the sample accounts.

With no credentials the dashboard runs in **preview mode** — the real site
content is loaded into your browser's storage and every screen works: creating,
editing, deleting, reordering, filtering, the enquiry inbox, roles. It's
labelled *Preview mode* in the topbar, and "Reset sample data" in the sidebar
puts everything back.

Sign in as the **Content Editor** to see permissions in action: delete buttons
disappear, because that role can't delete.

Nothing in preview mode touches the live site. The rest of this guide connects
it to a real database.

---

## How it fits together

```
  This app                Supabase                Public website
 ┌──────────┐        ┌──────────────┐          ┌────────────────┐
 │ Kaya CMS │ ─────► │  Postgres    │ ◄─────── │  reads at      │
 │          │        │  + Auth      │  build   │  build time    │
 └──────────┘        │  + Storage   │          └────────────────┘
       │             └──────────────┘                   ▲
       │                    ▲                           │
       │  Publish           │ enquiries                 │ rebuild
       │                    │                           │
       │             ┌──────────────┐          ┌────────────────┐
       └───────────► │ Edge Function│ ───────► │ website deploy │
                     │   publish    │ dispatch │    workflow    │
                     └──────────────┘          └────────────────┘
```

The website is a static export with no Node runtime, so it cannot query the
database at request time. Instead:

- **Content** (treatments, doctors, reviews, vouchers) is edited here and stored
  in Supabase. The public website reads it at *build* time and rebuilds when the
  **Publish** button is pressed — see
  [docs/connecting-the-website.md](docs/connecting-the-website.md).
- **Enquiries** are live in both directions. The booking form writes straight to
  Supabase, and the dashboard inbox subscribes to changes, so a submission
  appears without a rebuild or even a refresh.

---

## 1. Create the Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a project.
   Pick a region close to the GCC (Frankfurt or Mumbai) for lower latency.
2. Save the database password somewhere safe.

## 2. Create the schema

In the Supabase dashboard, open **SQL Editor → New query**, paste the whole of
[`supabase/schema.sql`](supabase/schema.sql), and run it.

This creates the tables, the row-level security policies, the `media` storage
bucket, and a trigger that gives every new auth user a profile. It is
idempotent, so you can re-run it safely after a schema change.

## 3. Add credentials

Copy the example file and fill it in from **Settings → API** in Supabase:

```bash
cp .env.local.example .env.local
```

| Variable | Where to find it | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API → Project URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API → anon public | Public — safe in the browser bundle; RLS is what protects the data |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → service_role | **Secret.** Bypasses RLS. Only used by `npm run seed`. Never commit it, never prefix it with `NEXT_PUBLIC_` |

## 4. Import the existing content

```bash
npm install
npm run seed
```

This reads the original hardcoded content from `lib/seed-data/` and writes it
into the database: 24 services, 7 doctors, 12 reviews, 4 vouchers, 15 clinic
locations, and all the page copy.

Re-running is safe — rows that already exist are left alone, so it can never
revert an editor's work. Use `npm run seed -- --force` if you deliberately want
to overwrite existing rows back to the original content.

## 5. Create your login

**Authentication → Users → Add user**. Enter an email and password, and tick
*Auto Confirm User*.

The **first** account created becomes the administrator. Everyone added after
that becomes an editor. To change someone's role later, edit their row in the
`profiles` table.

| Role | Can |
|---|---|
| Administrator | Everything, including deleting records |
| Content Editor | Create and edit, but not delete |

Roles are enforced by the database policies, not just hidden in the UI.

## 6. Run it

```bash
npm run dev
```

Open <http://localhost:1000> and sign in.

---

## Publishing to the live site

Content edits are saved instantly but the public site is static, so it shows the
content captured at its last build. The **Publish to site** button in the
sidebar triggers a rebuild and deploy.

It needs two things wired up.

### The website's build secrets

The rebuild happens in the **website** repository, so its Supabase secrets go
there — not here. See
[docs/connecting-the-website.md](docs/connecting-the-website.md).

### The Edge Function

The Publish button calls a Supabase Edge Function, which holds the GitHub token
server-side — a token in the browser bundle could be extracted and used against
the repository.

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy publish
supabase secrets set GITHUB_TOKEN=ghp_xxx GITHUB_REPO=owner/repo
```

`GITHUB_TOKEN` should be a fine-grained personal access token scoped to just
that repository with **Actions: read and write**.

Until this is deployed, everything else works — Publish simply reports that
publishing isn't configured, and you can still deploy by pushing to `main`.

---

## Everyday commands

| Command | Does |
|---|---|
| `npm run dev` | Start the dev server on :1000 |
| `npm run build` | Build and export to `out/` |
| `npm run seed` | Import `lib/seed-data/` into Supabase (skips existing rows) |
| `npm run seed -- --force` | Same, but overwrite existing rows |

---

## Where things live

| Path | What |
|---|---|
| `supabase/schema.sql` | Tables, RLS policies, storage bucket |
| `supabase/functions/publish/` | Edge Function behind the Publish button |
| `lib/supabase/client.js` | Shared browser client |
| `lib/supabase/mappers.js` | Database row ↔ dashboard record translation |
| `lib/admin/store.js` | All reads and writes |
| `lib/admin/auth.js` | Sign-in, session, roles |
| `lib/seed-data/` | The original hardcoded content — seed source and offline fallback |
| `scripts/seed-supabase.mjs` | `lib/seed-data/` → database |
| `docs/connecting-the-website.md` | What the public website needs |

---

## Troubleshooting

**The dashboard still says "Preview mode" after adding credentials.**
`.env.local` is missing or incomplete, or the dev server wasn't restarted —
Next only reads env files at startup, and `NEXT_PUBLIC_*` values are baked in at
build time.

**"Invalid login credentials".**
The user doesn't exist or the password is wrong. Add users under
Authentication → Users, and tick *Auto Confirm User* or the account can't sign
in until the confirmation email is clicked.

**Saving fails with a permissions error.**
Editors can't delete — that's enforced by the RLS policies. Either sign in as an
administrator, or change the role in the `profiles` table.

**Published changes aren't on the live site.**
Publishing starts a GitHub Actions run that takes a few minutes. Check the
Actions tab — if nothing started, the Edge Function or its secrets aren't set up
(see above).

---

## What this does not cover

The dashboard's **Pages** and **Footer & Global** sections save correctly to the
database, but the public components still have that copy written inline — they
were built that way and never read from `lib/`. So editing page copy in the
dashboard stores it without changing the site.

Wiring those up means threading the content tree through roughly 30 components,
which is a separate piece of work. The catalogue (treatments, doctors, reviews,
vouchers, clinic locations) and the enquiry inbox are fully connected.
