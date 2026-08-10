# Kaya CMS

The content dashboard for the Kaya Clinic website — treatments, doctors,
reviews, vouchers, clinic locations, page copy and the enquiry inbox.

This is a standalone app. The public website lives in its own project; see
[docs/connecting-the-website.md](docs/connecting-the-website.md) for the two
pieces of wiring that join them.

## Quick start

```bash
npm install
npm run dev        # http://localhost:1000
```

**No setup needed to look around.** Without Supabase credentials the dashboard
runs in **preview mode**: it loads the real site content from `lib/seed-data/`
into your browser's storage, and every screen, form, filter and save works
normally. Pick one of the two sample accounts on the login screen — sign in as
the Content Editor to see how permissions hide destructive actions.

Preview mode is labelled in the topbar, and edits stay in that browser. To make
it real:

```bash
cp .env.local.example .env.local   # Supabase URL + keys
npm run seed                       # one-time: import content into the database
```

Full instructions — creating the Supabase project, the schema, user accounts and
the Publish pipeline — are in [SETUP.md](SETUP.md).

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Dev server on :1000 |
| `npm run build` | Static export to `out/` |
| `npm run seed` | Import `lib/seed-data/` into Supabase |
| `npm run lint` | ESLint |

## Sections

| Group | Screens |
|---|---|
| — | Overview |
| Enquiries | Requests inbox, with a detail panel for working each enquiry |
| Catalogue | Treatments & Services, Verticals, Doctors, Indulgence, Reviews |
| Website | Pages, Locations, Footer & Global |
| Settings | Users & Roles |

Every list supports create, edit, delete, reorder, search and filtering.
Two roles: **Administrator** (everything) and **Content Editor** (no deleting).
Permissions are enforced by the database's row-level security, not only hidden
in the interface.

## Layout

```
app/                 layout, globals, the dashboard page, admin.css
components/admin/    every dashboard screen and form
lib/
  admin/             store (Supabase + preview backends), auth, form options,
                     page-copy schema, demo seed
  supabase/          client + row/record mappers
  seed-data/         the site's original content — seeds the database and
                     backs preview mode
  taxonomy.js        the four treatment categories
  site.js            where the public site lives (NEXT_PUBLIC_SITE_URL)
scripts/             one-time Supabase seed
supabase/            schema.sql, publish Edge Function
docs/                how to connect the public website
```

## Deployment

Static export (`output: 'export'`), so any static host works — Vercel picks it
up with no configuration. The dashboard is served at the root.

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
`NEXT_PUBLIC_SITE_URL` in the host's environment variables. Without the Supabase
pair the deployed dashboard stays in preview mode — which has **no password**,
so don't leave a public deployment that way once it holds real data.
