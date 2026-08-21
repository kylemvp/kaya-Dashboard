import { normalisePricing } from '@/lib/countries'

/**
 * Row <-> record mapping.
 *
 * The dashboard's forms and views were written against a specific record shape
 * (see lib/admin/seed.js). Rather than rewrite every view, these functions
 * translate between that shape and the database columns.
 *
 * Most columns are named identically to their record key, so the only real work
 * here is the handful of camelCase keys (yearsExp, badgeStyle, mapQ, createdAt,
 * treatmentArea) and defaulting nullable columns back to '' / [] so the forms
 * never receive a null into a controlled input.
 *
 * `pricing` is normalised on the way in so a record written before a country
 * existed still renders every field in the form.
 *
 * `sort` is not part of the record shape — it lives only in the database to
 * preserve display order, and is assigned from array position on save.
 */

const str = v => (v == null ? '' : String(v))
const arr = v => (Array.isArray(v) ? v : [])

// ── Verticals ───────────────────────────────────────────────
export const verticalFromRow = r => ({
  id: str(r.id),
  label: str(r.label),
  hint: str(r.hint),
  color: str(r.color) || '#6E5A96',
})

export const verticalToRow = (v, sort = 0) => ({
  id: str(v.id),
  label: str(v.label),
  hint: str(v.hint),
  color: str(v.color) || '#6E5A96',
  sort,
})

// ── Services ────────────────────────────────────────────────
export const serviceFromRow = r => ({
  slug: str(r.slug),
  name: str(r.name),
  image: str(r.image),
  verticals: arr(r.verticals),
  thumb: str(r.thumb),
  badge: str(r.badge),
  category: str(r.category),
  countries: arr(r.countries).map(str),
  pricing: normalisePricing(r.pricing),
  sub: str(r.sub),
  what: str(r.what),
  mechanism: str(r.mechanism),
  expect: {
    duration: str(r.expect?.duration),
    sessions: str(r.expect?.sessions),
    interval: str(r.expect?.interval),
  },
  downtime: {
    level: str(r.downtime?.level),
    desc: str(r.downtime?.desc),
  },
  benefits: arr(r.benefits).map(b => ({
    i: str(b?.i) || '✦',
    t: str(b?.t),
    d: str(b?.d),
  })),
  suitable: arr(r.suitable).map(str),
})

export const serviceToRow = (s, sort = 0) => ({
  slug: str(s.slug),
  name: str(s.name),
  image: str(s.image),
  thumb: str(s.thumb),
  badge: str(s.badge),
  category: str(s.category),
  countries: arr(s.countries).map(str),
  pricing: normalisePricing(s.pricing),
  sub: str(s.sub),
  what: str(s.what),
  mechanism: str(s.mechanism),
  expect: {
    duration: str(s.expect?.duration),
    sessions: str(s.expect?.sessions),
    interval: str(s.expect?.interval),
  },
  downtime: {
    level: str(s.downtime?.level),
    desc: str(s.downtime?.desc),
  },
  benefits: arr(s.benefits).map(b => ({
    i: str(b?.i) || '✦',
    t: str(b?.t),
    d: str(b?.d),
  })),
  suitable: arr(s.suitable).map(str),
  verticals: arr(s.verticals).map(str),
  sort,
})

// ── Doctors ─────────────────────────────────────────────────
export const doctorFromRow = r => ({
  slug: str(r.slug),
  name: str(r.name),
  image: str(r.image),
  specialist: str(r.specialist),
  tagline: str(r.tagline),
  bio: str(r.bio),
  yearsExp: str(r.years_exp),
  verticals: arr(r.verticals).map(str),
  languages: arr(r.languages).map(str),
  countries: arr(r.countries).map(str),
  clinics: arr(r.clinics).map(str),
  treatments: arr(r.treatments).map(str),
})

export const doctorToRow = (d, sort = 0) => ({
  slug: str(d.slug),
  name: str(d.name),
  image: str(d.image),
  specialist: str(d.specialist),
  tagline: str(d.tagline),
  bio: str(d.bio),
  years_exp: str(d.yearsExp),
  verticals: arr(d.verticals).map(str),
  languages: arr(d.languages).map(str),
  countries: arr(d.countries).map(str),
  clinics: arr(d.clinics).map(str),
  treatments: arr(d.treatments).map(str),
  sort,
})

// ── Reviews ─────────────────────────────────────────────────
export const reviewFromRow = r => ({
  id: str(r.id),
  name: str(r.name),
  location: str(r.location),
  treatment: str(r.treatment),
  vertical: str(r.vertical),
  quote: str(r.quote),
  before: str(r.before),
  after: str(r.after),
})

export const reviewToRow = (r, sort = 0) => ({
  id: str(r.id),
  name: str(r.name),
  location: str(r.location),
  treatment: str(r.treatment),
  vertical: str(r.vertical),
  quote: str(r.quote),
  before: str(r.before),
  after: str(r.after),
  sort,
})

// ── Vouchers ────────────────────────────────────────────────
export const voucherFromRow = r => ({
  id: str(r.id),
  title: str(r.title),
  subtitle: str(r.subtitle),
  type: str(r.type),
  badge: str(r.badge),
  badgeStyle: str(r.badge_style),
  price: str(r.price),
  currency: str(r.currency) || 'AED',
  pricing: normalisePricing(r.pricing),
  countries: arr(r.countries).map(str),
  img: str(r.img),
})

export const voucherToRow = (v, sort = 0) => ({
  id: str(v.id),
  title: str(v.title),
  subtitle: str(v.subtitle),
  type: str(v.type),
  badge: str(v.badge),
  badge_style: str(v.badgeStyle),
  price: str(v.price),
  currency: str(v.currency) || 'AED',
  pricing: normalisePricing(v.pricing),
  countries: arr(v.countries).map(str),
  img: str(v.img),
  sort,
})

// ── Locations ───────────────────────────────────────────────
export const locationFromRow = r => ({
  id: str(r.id),
  country: str(r.country) || 'UAE',
  name: str(r.name),
  city: str(r.city),
  addr: str(r.addr),
  tel: str(r.tel),
  hours: str(r.hours),
  mapQ: str(r.map_q),
  opened: str(r.opened),
})

export const locationToRow = (l, sort = 0) => ({
  id: str(l.id),
  country: str(l.country) || 'UAE',
  name: str(l.name),
  city: str(l.city),
  addr: str(l.addr),
  tel: str(l.tel),
  hours: str(l.hours),
  map_q: str(l.mapQ),
  opened: str(l.opened),
  sort,
})

// ── Requests ────────────────────────────────────────────────
export const requestFromRow = r => ({
  id: str(r.id),
  source: str(r.source) || 'consultation',
  status: str(r.status) || 'new',
  name: str(r.name),
  mobile: str(r.mobile),
  email: str(r.email),
  gender: str(r.gender),
  country: str(r.country),
  city: str(r.city),
  treatmentArea: str(r.treatment_area),
  treatment: str(r.treatment),
  doctor: str(r.doctor),
  concerns: arr(r.concerns).map(str),
  message: str(r.message),
  notes: str(r.notes),
  createdAt: r.created_at || new Date().toISOString(),
})

export const requestToRow = r => ({
  source: str(r.source) || 'consultation',
  status: str(r.status) || 'new',
  name: str(r.name),
  mobile: str(r.mobile),
  email: str(r.email),
  gender: str(r.gender),
  country: str(r.country),
  city: str(r.city),
  treatment_area: str(r.treatmentArea),
  treatment: str(r.treatment),
  doctor: str(r.doctor),
  concerns: arr(r.concerns).map(str),
  message: str(r.message),
  notes: str(r.notes),
})

/**
 * Patch mapper for staff edits to an enquiry. Only status and notes are
 * editable from the inbox, so anything else in the patch is ignored rather
 * than blindly forwarded as a column name.
 */
export function requestPatchToRow(patch) {
  const row = {}
  if (patch.status !== undefined) row.status = str(patch.status)
  if (patch.notes !== undefined) row.notes = str(patch.notes)
  return row
}
