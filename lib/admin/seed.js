/**
 * Option lists and blank records for the dashboard forms.
 *
 * Records themselves now come from Supabase (see lib/admin/store.js). What
 * remains here is the fixed vocabulary the forms offer — thumbnail keys, badge
 * styles, enquiry statuses — plus the empty records the "create" forms start
 * from. The original demo content moved to lib/seed-data/, and the one-time
 * import into the database lives in scripts/seed-supabase.mjs.
 */

// Countries Kaya operates in (from the doctor data).
export const COUNTRY_OPTIONS = ['UAE', 'KSA', 'OMAN']

// Voucher classification (the indulgence page filters).
export const VOUCHER_TYPE_OPTIONS = ['discount', 'gift', 'wellness']
// Visual badge styles used on voucher cards.
export const BADGE_STYLE_OPTIONS = ['', 'popular', 'new', 'trending']

// Thumbnail keys used across the site (SVC_THUMB values).
export const THUMB_OPTIONS = ['laser', 'filler', 'antiage', 'hair', 'bodyc', 'iv']

// Badge options (SVC_BADGE values), plus an explicit "none".
export const BADGE_OPTIONS = ['', 'Trending', 'Popular', 'New']

/** An empty doctor record for the "create" form. */
export function emptyDoctor() {
  return {
    slug: '',
    name: '',
    image: '',
    specialist: '',
    tagline: '',
    bio: '',
    yearsExp: '',
    verticals: [],
    languages: [],
    countries: [],
    clinics: [],
    treatments: [],
  }
}

/** An empty service record for the "create" form. */
export function emptyService() {
  return {
    slug: '',
    name: '',
    image: '',
    verticals: [],
    thumb: 'laser',
    badge: '',
    category: 'dermatology',
    sub: '',
    what: '',
    mechanism: '',
    expect: { duration: '', sessions: '', interval: '' },
    downtime: { level: '', desc: '' },
    benefits: [],
    suitable: [],
  }
}

export function emptyReview() {
  return {
    id: '',
    name: '',
    location: '',
    treatment: '',
    vertical: '',
    quote: '',
    before: '',
    after: '',
  }
}

export function emptyVoucher() {
  return {
    id: '',
    title: '',
    subtitle: '',
    type: 'gift',
    badge: '',
    badgeStyle: '',
    price: '',
    currency: 'AED',
    img: '',
  }
}

// ── Requests (consumer submissions) ──────────────────────
// Inbound enquiries from the public site. Two sources feed this list:
//  · 'consultation' — the /booking form (name, treatment area, doctor, city)
//  · 'concern'      — the /tell-us concern finder (area, age, concerns)
// Staff don't create these; they arrive from the site and move through a
// lifecycle: new → contacted → booked → closed.
export const REQUEST_STATUS_OPTIONS = ['new', 'contacted', 'booked', 'closed']
export const REQUEST_SOURCE_OPTIONS = ['consultation', 'concern']

export const REQUEST_STATUS_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  booked: 'Booked',
  closed: 'Closed',
}

export const REQUEST_SOURCE_LABELS = {
  consultation: 'Consultation request',
  concern: 'Concern finder',
}
