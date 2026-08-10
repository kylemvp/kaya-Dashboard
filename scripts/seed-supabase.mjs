/**
 * One-time import of the existing site content into Supabase.
 *
 * Reads the original hardcoded content from lib/seed-data/ (plus the page-copy
 * defaults from lib/admin/content.js) and writes it to the tables created by
 * supabase/schema.sql.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY: the RLS policies only allow signed-in
 * staff to write, and this runs without a user session. That key bypasses RLS,
 * so it lives in .env.local and must never be committed or exposed to the
 * browser.
 *
 * Safe to re-run — every write is an upsert keyed on the primary key, so it
 * repairs missing rows without duplicating anything. It does NOT delete rows
 * that are no longer in the seed, and it does not touch `requests`.
 *
 *   npm run seed           # import
 *   npm run seed -- --force  # also overwrite rows that already exist
 */
import './env.mjs'
import { createClient } from '@supabase/supabase-js'

import {
  SERVICES, VERTICALS, VERTICAL_SERVICES, SVC_THUMB, SVC_BADGE, TREATMENT_SERVICES,
} from '../lib/seed-data/services.js'
import { DOCTORS } from '../lib/seed-data/doctors.js'
import { REVIEWS } from '../lib/seed-data/reviews.js'
import { VOUCHERS } from '../lib/seed-data/vouchers.js'
import { seedPages, seedSite, seedLocations } from '../lib/admin/content.js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error(`
  ✗ Missing credentials.

    This script needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
    in .env.local. Find both in your Supabase project under
    Settings → API. See SETUP.md.
`)
  process.exit(1)
}

const force = process.argv.includes('--force')
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

/** slug -> [vertical ids]; a service can sit under several verticals. */
const verticalsOf = {}
for (const [vertical, slugs] of Object.entries(VERTICAL_SERVICES)) {
  for (const slug of slugs) (verticalsOf[slug] ||= []).push(vertical)
}

/** slug -> treatment category. */
const categoryOf = {}
for (const [category, slugs] of Object.entries(TREATMENT_SERVICES)) {
  for (const slug of slugs) categoryOf[slug] = category
}

/** service name -> its first vertical, for the review records. */
const nameToVertical = {}
for (const [slug, s] of Object.entries(SERVICES)) {
  nameToVertical[(s.name || '').toLowerCase()] = (verticalsOf[slug] || [])[0] || ''
}

const rows = {
  verticals: VERTICALS.map((v, i) => ({
    id: v.id, label: v.label, hint: v.hint || '', color: v.color || '#6E5A96', sort: i,
  })),

  services: Object.entries(SERVICES).map(([slug, s], i) => ({
    slug,
    name: s.name || '',
    image: '',
    thumb: SVC_THUMB[slug] || '',
    badge: SVC_BADGE[slug] || '',
    category: categoryOf[slug] || '',
    sub: s.sub || '',
    what: s.what || '',
    mechanism: s.mechanism || '',
    expect: s.expect || { duration: '', sessions: '', interval: '' },
    downtime: s.downtime || { level: '', desc: '' },
    benefits: s.benefits || [],
    suitable: s.suitable || [],
    verticals: verticalsOf[slug] || [],
    sort: i,
  })),

  doctors: Object.values(DOCTORS).map((d, i) => ({
    slug: d.slug,
    name: d.name || '',
    image: d.image || '',
    specialist: d.specialist || '',
    tagline: d.tagline || '',
    bio: d.bio || '',
    years_exp: String(d.yearsExp ?? ''),
    verticals: d.verticals || [],
    languages: d.languages || [],
    countries: d.countries || [],
    clinics: d.clinics || [],
    treatments: d.treatments || [],
    sort: i,
  })),

  reviews: REVIEWS.map((r, i) => ({
    id: r.id,
    name: r.name || '',
    location: r.location || '',
    treatment: r.treatment || '',
    // The dashboard classifies reviews by vertical; the site's treatment
    // category is derived back from the treatment name at snapshot time.
    vertical: nameToVertical[(r.treatment || '').toLowerCase()] || '',
    quote: r.quote || '',
    before: r.before || '',
    after: r.after || '',
    sort: i,
  })),

  vouchers: VOUCHERS.map((v, i) => ({
    id: v.id,
    title: v.title || '',
    subtitle: v.subtitle || '',
    type: v.category || '',
    badge: v.badge || '',
    badge_style: v.badgeStyle || '',
    price: String(v.price ?? ''),
    currency: v.currency || 'AED',
    img: v.img || '',
    sort: i,
  })),

  locations: seedLocations().map((l, i) => ({
    id: l.id,
    country: l.country || 'UAE',
    name: l.name || '',
    city: l.city || '',
    addr: l.addr || '',
    tel: l.tel || '',
    hours: l.hours || '',
    map_q: l.mapQ || '',
    sort: i,
  })),
}

/** Flatten both content trees into content rows. */
function contentRows() {
  const out = []
  for (const [scope, tree] of [['page', seedPages()], ['site', seedSite()]]) {
    for (const [groupId, sections] of Object.entries(tree)) {
      for (const [sectionId, data] of Object.entries(sections)) {
        out.push({ scope, group_id: groupId, section_id: sectionId, data })
      }
    }
  }
  return out
}

const PK = {
  verticals: 'id', services: 'slug', doctors: 'slug',
  reviews: 'id', vouchers: 'id', locations: 'id',
}

async function seedTable(table, data, conflict) {
  if (!data.length) return

  // Without --force, leave rows that already exist untouched so a re-run can
  // never silently revert an editor's work.
  const options = { onConflict: conflict }
  if (!force) options.ignoreDuplicates = true

  const { error } = await supabase.from(table).upsert(data, options)
  if (error) throw new Error(`${table}: ${error.message}`)
  console.log(`  ✓ ${table.padEnd(10)} ${String(data.length).padStart(3)} rows`)
}

async function main() {
  console.log(`\n  Seeding Supabase${force ? ' (--force: existing rows will be overwritten)' : ''}…\n`)

  // Verticals first — services reference their ids.
  await seedTable('verticals', rows.verticals, PK.verticals)
  for (const table of ['services', 'doctors', 'reviews', 'vouchers', 'locations']) {
    await seedTable(table, rows[table], PK[table])
  }
  await seedTable('content', contentRows(), 'scope,group_id,section_id')

  console.log(`
  Done. Next:
    1. Create your first user — Supabase dashboard → Authentication → Add user.
       The first account created becomes the administrator.
    2. npm run dev, then sign in at /admin
`)
}

main().catch(e => {
  console.error(`\n  ✗ Seed failed: ${e.message}\n`)
  process.exit(1)
})
