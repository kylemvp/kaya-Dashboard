/**
 * localStorage-backed store — the preview backend.
 *
 * Used when Supabase credentials are absent, so the dashboard is fully usable
 * for design review and testing before a database exists: every list, form,
 * filter and save works, the data just lives in the browser.
 *
 * It implements the same API as store-supabase.js, so lib/admin/store.js can
 * swap between them and nothing upstream knows which is in play.
 */
import {
  seedServices, seedVerticals, seedDoctors, seedReviews, seedVouchers,
  seedRequests, seedLocations, seedPages, seedSite, seedUsers,
} from './demo-seed'

const KEYS = {
  services: 'kaya_admin_services_v4',
  verticals: 'kaya_admin_verticals_v4',
  doctors: 'kaya_admin_doctors_v2',
  reviews: 'kaya_admin_reviews_v2',
  vouchers: 'kaya_admin_vouchers_v2',
  requests: 'kaya_admin_requests_v2',
  locations: 'kaya_admin_locations_v2',
  users: 'kaya_admin_users_v1',
  pages: 'kaya_admin_pages_v2',
  site: 'kaya_admin_site_v2',
  session: 'kaya_admin_session_v1',
  // Marks storage as belonging to this build. Without it, a collection left
  // empty by an earlier version is indistinguishable from one the user
  // deliberately emptied — see load() below.
  seeded: 'kaya_admin_seeded_v1',
}

const isBrowser = () => typeof window !== 'undefined'

function read(key, fallback) {
  if (!isBrowser()) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota or private-mode errors are not worth breaking the UI over */
  }
}

/**
 * True once this build has written its own seed. Storage left by an earlier
 * version has no marker, so it is replaced rather than trusted.
 *
 * The answer is snapshotted on first use and held for the rest of the page
 * load. Re-reading it would be wrong: seeding the first collection writes the
 * marker, which would then vouch for every other stale collection loaded
 * afterwards — exactly the empty dashboard this is meant to prevent.
 */
let storageWasOurs = null

function storageIsOurs() {
  if (storageWasOurs === null) storageWasOurs = read(KEYS.seeded, null) === true
  return storageWasOurs
}

/**
 * Load a collection, seeding it on first run.
 *
 * Two kinds of bad state have to be handled, and they need different tests:
 *
 * · A shape the current code doesn't expect (an object where a list belongs,
 *   records missing fields the views read) crashes the render, and a crash
 *   during hydration leaves a blank page with no way back — the Reset button
 *   is inside the tree that just vanished.
 *
 * · An EMPTY list is structurally valid, so it survives that check and leaves
 *   the dashboard showing nothing at all. Emptiness alone can't be treated as
 *   corruption though: deleting the last record is a legitimate thing to do.
 *   The marker settles it — empty storage this build never wrote is stale and
 *   gets reseeded; empty storage it did write is the user's own doing and is
 *   left alone.
 */
function load(key, seed) {
  const existing = read(KEYS[key], null)
  const usable = Array.isArray(existing)
    && existing.every(r => r && typeof r === 'object')
    && (existing.length > 0 || storageIsOurs())

  if (usable) return existing

  const seeded = seed()
  write(KEYS[key], seeded)
  write(KEYS.seeded, true)
  return seeded
}

/**
 * Overlay stored content on a fresh seed, three levels deep, so a field the
 * schema has since gained is back-filled rather than missing. Mirrors the
 * merge in store-supabase.js.
 */
function mergeContent(seed, stored) {
  if (!stored || typeof stored !== 'object') return seed
  const out = { ...seed }
  for (const groupId of Object.keys(seed)) {
    const storedGroup = stored[groupId]
    if (!storedGroup || typeof storedGroup !== 'object') continue
    const group = { ...seed[groupId] }
    for (const sectionId of Object.keys(group)) {
      const storedSection = storedGroup[sectionId]
      if (!storedSection || typeof storedSection !== 'object') continue
      const section = { ...group[sectionId] }
      for (const k of Object.keys(section)) {
        if (storedSection[k] !== undefined) section[k] = storedSection[k]
      }
      group[sectionId] = section
    }
    out[groupId] = group
  }
  return out
}

function loadTree(key, seed) {
  const merged = mergeContent(seed(), read(KEYS[key], null))
  write(KEYS[key], merged)
  return merged
}

// A touch of latency so loading states are visible in preview rather than
// flashing past — the real backend is never instant either.
const settle = value => new Promise(resolve => setTimeout(() => resolve(value), 180))

// ── Reads ───────────────────────────────────────────────────
export async function fetchAll() {
  return settle({
    services: load('services', seedServices),
    verticals: load('verticals', seedVerticals),
    doctors: load('doctors', seedDoctors),
    reviews: load('reviews', seedReviews),
    vouchers: load('vouchers', seedVouchers),
    requests: load('requests', seedRequests),
    locations: load('locations', seedLocations),
    pages: loadTree('pages', seedPages),
    site: loadTree('site', seedSite),
  })
}

export async function refetchRequests() {
  return load('requests', seedRequests)
}

// ── Writes ──────────────────────────────────────────────────
const persist = key => async list => { write(KEYS[key], list) }

export const persistServices = persist('services')
export const persistVerticals = persist('verticals')
export const persistDoctors = persist('doctors')
export const persistReviews = persist('reviews')
export const persistVouchers = persist('vouchers')
export const persistLocations = persist('locations')

/**
 * Remove one record. The dashboard always persists the surviving list straight
 * afterwards, so this only has to drop the row.
 */
const remove = (key, field) => async value => {
  write(KEYS[key], load(key, () => []).filter(r => r[field] !== value))
}

export const removeService = remove('services', 'slug')
export const removeVertical = remove('verticals', 'id')
export const removeDoctor = remove('doctors', 'slug')
export const removeReview = remove('reviews', 'id')
export const removeVoucher = remove('vouchers', 'id')
export const removeLocation = remove('locations', 'id')

export async function persistPageSection(pageId, sectionId, data) {
  const tree = loadTree('pages', seedPages)
  write(KEYS.pages, { ...tree, [pageId]: { ...tree[pageId], [sectionId]: data } })
}

export async function persistSiteSection(groupId, sectionId, data) {
  const tree = loadTree('site', seedSite)
  write(KEYS.site, { ...tree, [groupId]: { ...tree[groupId], [sectionId]: data } })
}

export async function persistRequestPatch(id, patch) {
  const list = load('requests', seedRequests)
  write(KEYS.requests, list.map(r => (r.id === id ? { ...r, ...patch } : r)))
}

export async function removeRequest(id) {
  write(KEYS.requests, load('requests', seedRequests).filter(r => r.id !== id))
}

/**
 * Record an enquiry from the public site. In preview mode this only reaches the
 * same browser's storage — enough to demonstrate the flow end to end.
 */
export async function submitRequest(record) {
  if (!isBrowser()) return { ok: false, error: 'Not available server-side.' }
  const list = load('requests', seedRequests)
  const id = `req-${Math.random().toString(36).slice(2, 10)}`
  write(KEYS.requests, [
    { ...record, id, status: 'new', notes: '', createdAt: new Date().toISOString() },
    ...list,
  ])
  return { ok: true }
}

// ── Users ───────────────────────────────────────────────────
export async function fetchUsers() {
  return settle(load('users', seedUsers))
}

export async function updateUserRole(id, role) {
  write(KEYS.users, load('users', seedUsers).map(u => (u.id === id ? { ...u, role } : u)))
}

// ── Realtime ────────────────────────────────────────────────
/**
 * Mirror the realtime inbox by listening for storage events, so a booking
 * submitted in another tab still appears without a refresh.
 */
export function subscribeToRequests(onChange) {
  if (!isBrowser()) return () => {}
  const handler = e => {
    if (e.key === null || e.key === KEYS.requests) onChange()
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

// ── Preview session ─────────────────────────────────────────
// Stands in for Supabase Auth: any of the demo accounts signs in, with no
// password check. Only ever reachable when Supabase is not configured.

/**
 * A session stored by an earlier build may be missing fields the shell renders
 * (`user.name.charAt(0)` in the topbar, for one). Treat anything that isn't a
 * complete record as signed-out — showing the login screen is recoverable,
 * crashing on a half-built user is not.
 */
export function loadSession() {
  const s = read(KEYS.session, null)
  if (!s || typeof s !== 'object') return null
  if (typeof s.name !== 'string' || typeof s.role !== 'string') return null
  return s
}

export function saveSession(user) {
  write(KEYS.session, user)
}

export function clearSession() {
  if (isBrowser()) window.localStorage.removeItem(KEYS.session)
}

export function demoUsers() {
  return load('users', seedUsers)
}

/** Reset every preview collection back to its seed. */
export function resetDemo() {
  if (!isBrowser()) return
  for (const key of Object.keys(KEYS)) {
    if (key === 'session') continue
    window.localStorage.removeItem(KEYS[key])
  }
  // Storage is no longer ours until the next seed writes the marker again;
  // without this the snapshot above would keep vouching for what we just wiped.
  storageWasOurs = false
}
