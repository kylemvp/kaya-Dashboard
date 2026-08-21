/**
 * Supabase-backed data layer for the dashboard.
 *
 * This replaces the original localStorage store. The contract is deliberately
 * unchanged in shape — the views still hand over a whole ordered list and the
 * store persists it — so ServicesView, DoctorsView and friends did not need
 * rewriting. What changed is that every function is now genuinely async and
 * reports failure, because a network call can fail where a localStorage write
 * could not.
 *
 * Ordering: the record shapes have no `sort` field, so display order is taken
 * from array position and written to the `sort` column on every list save.
 *
 * Concurrency: a list save upserts every row in the list. With two editors
 * working simultaneously on the same collection, the last save wins for the
 * fields of any row both touched. That is acceptable for a catalogue this size;
 * moving to per-row saves would be the fix if the team grows.
 */
import { getSupabase } from '@/lib/supabase/client'
import {
  verticalFromRow, verticalToRow,
  serviceFromRow, serviceToRow,
  doctorFromRow, doctorToRow,
  reviewFromRow, reviewToRow,
  voucherFromRow, voucherToRow,
  locationFromRow, locationToRow,
  requestFromRow, requestToRow, requestPatchToRow,
} from '@/lib/supabase/mappers'
import { seedPages, seedSite } from './content'

/** Throw with a readable message so the UI can surface it verbatim. */
function fail(context, error) {
  const detail = error?.message || 'Unknown error'
  throw new Error(`${context}: ${detail}`)
}

function client() {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

// ── Table registry ──────────────────────────────────────────
// Each collection maps to a table, a primary-key column and its two mappers.
const COLLECTIONS = {
  verticals: { table: 'verticals', pk: 'id', from: verticalFromRow, to: verticalToRow },
  services: { table: 'services', pk: 'slug', from: serviceFromRow, to: serviceToRow },
  doctors: { table: 'doctors', pk: 'slug', from: doctorFromRow, to: doctorToRow },
  reviews: { table: 'reviews', pk: 'id', from: reviewFromRow, to: reviewToRow },
  vouchers: { table: 'vouchers', pk: 'id', from: voucherFromRow, to: voucherToRow },
  locations: { table: 'locations', pk: 'id', from: locationFromRow, to: locationToRow },
}

/** Read one collection, ordered, and map it back to dashboard record shape. */
async function fetchCollection(key) {
  const { table, from } = COLLECTIONS[key]
  const { data, error } = await client()
    .from(table)
    .select('*')
    .order('sort', { ascending: true })
  if (error) fail(`Could not load ${key}`, error)
  return (data || []).map(from)
}

/**
 * Persist a whole ordered collection. `sort` comes from array position, so
 * reordering in the UI is saved by simply passing the reordered array.
 */
async function persistCollection(key, records) {
  const { table, to, pk } = COLLECTIONS[key]
  // Deleting the last row leaves nothing to reorder; an empty upsert is a
  // pointless round trip that PostgREST rejects outright.
  if (!records.length) return
  const rows = records.map((r, i) => to(r, i))
  const { error } = await client().from(table).upsert(rows, { onConflict: pk })
  if (error) fail(`Could not save ${key}`, error)
}

/** Delete one row by primary key. Refused by RLS for non-admins. */
async function removeFrom(key, id) {
  const { table, pk } = COLLECTIONS[key]
  const { error } = await client().from(table).delete().eq(pk, id)
  if (error) fail(`Could not delete from ${key}`, error)
}

// ── Content tree (pages + site copy) ────────────────────────
/**
 * Overlay stored content on the freshly built seed, three levels deep
 * (group → section → field).
 *
 * The seed defines the shape at every level, so a field the schema has since
 * gained is back-filled with its default, and anything the database still holds
 * that the schema has dropped is discarded rather than carried forward forever.
 * (Same behaviour as the original localStorage store.)
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
      for (const key of Object.keys(section)) {
        if (storedSection[key] !== undefined) section[key] = storedSection[key]
      }
      group[sectionId] = section
    }
    out[groupId] = group
  }
  return out
}

/** Turn flat content rows into the { groupId: { sectionId: {...} } } tree. */
function rowsToTree(rows) {
  const tree = {}
  for (const row of rows) {
    if (!tree[row.group_id]) tree[row.group_id] = {}
    tree[row.group_id][row.section_id] = row.data || {}
  }
  return tree
}

/** Fetch both content trees in one query and merge each onto its seed. */
async function fetchContentTrees() {
  const { data, error } = await client()
    .from('content')
    .select('scope, group_id, section_id, data')
  if (error) fail('Could not load website content', error)

  const rows = data || []
  return {
    pages: mergeContent(seedPages(), rowsToTree(rows.filter(r => r.scope === 'page'))),
    site: mergeContent(seedSite(), rowsToTree(rows.filter(r => r.scope === 'site'))),
  }
}

/** Persist a single content section — one row, one write. */
async function persistContentSection(scope, groupId, sectionId, data) {
  const { error } = await client()
    .from('content')
    .upsert(
      { scope, group_id: groupId, section_id: sectionId, data },
      { onConflict: 'scope,group_id,section_id' },
    )
  if (error) fail('Could not save content', error)
}

export const persistPageSection = (pageId, sectionId, data) =>
  persistContentSection('page', pageId, sectionId, data)

export const persistSiteSection = (groupId, sectionId, data) =>
  persistContentSection('site', groupId, sectionId, data)

// ── Requests (inbound enquiries) ────────────────────────────
async function fetchRequests() {
  const { data, error } = await client()
    .from('requests')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) fail('Could not load requests', error)
  return (data || []).map(requestFromRow)
}

/** Staff edit: only status and notes are writable from the inbox. */
export async function persistRequestPatch(id, patch) {
  const row = requestPatchToRow(patch)
  if (!Object.keys(row).length) return
  const { error } = await client().from('requests').update(row).eq('id', id)
  if (error) fail('Could not update request', error)
}

export async function removeRequest(id) {
  const { error } = await client().from('requests').delete().eq('id', id)
  if (error) fail('Could not delete request', error)
}

/**
 * Submit an enquiry from the PUBLIC site.
 *
 * Called by anonymous visitors, so it goes through the anon key and the
 * insert-only RLS policy. `id` and `created_at` are left to the database — a
 * client-supplied id would let a visitor overwrite nothing useful, but letting
 * the server own both keeps ordering honest across time zones.
 *
 * Returns { ok } rather than throwing: a failed enquiry must never break the
 * booking UI, and the caller decides what to show.
 */
export async function submitRequest(record) {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'Supabase is not configured.' }

  // status/notes are forced rather than taken from the caller — the public
  // insert policy only accepts a genuinely new enquiry with empty staff notes.
  const row = { ...requestToRow(record), status: 'new', notes: '' }

  const { error } = await supabase.from('requests').insert(row)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// ── Public API used by AdminContext ─────────────────────────
/** Load everything the dashboard renders, in parallel. */
export async function fetchAll() {
  const [
    services, verticals, doctors, reviews, vouchers, locations, requests, content,
  ] = await Promise.all([
    fetchCollection('services'),
    fetchCollection('verticals'),
    fetchCollection('doctors'),
    fetchCollection('reviews'),
    fetchCollection('vouchers'),
    fetchCollection('locations'),
    fetchRequests(),
    fetchContentTrees(),
  ])

  return {
    services, verticals, doctors, reviews, vouchers, locations, requests,
    pages: content.pages,
    site: content.site,
  }
}

export const persistServices = list => persistCollection('services', list)
export const persistVerticals = list => persistCollection('verticals', list)
export const persistDoctors = list => persistCollection('doctors', list)
export const persistReviews = list => persistCollection('reviews', list)
export const persistVouchers = list => persistCollection('vouchers', list)
export const persistLocations = list => persistCollection('locations', list)

export const removeService = slug => removeFrom('services', slug)
export const removeVertical = id => removeFrom('verticals', id)
export const removeDoctor = slug => removeFrom('doctors', slug)
export const removeReview = id => removeFrom('reviews', id)
export const removeVoucher = id => removeFrom('vouchers', id)
export const removeLocation = id => removeFrom('locations', id)

/**
 * Country page-copy overrides. Stored as content rows whose scope carries the
 * country, so they sit alongside the base copy and inherit its RLS policies
 * rather than needing a table of their own.
 */
export async function fetchOverrides() {
  const { data, error } = await client()
    .from('content')
    .select('scope, group_id, section_id, data')
    .like('scope', 'country:%')
  if (error) fail('Could not load country overrides', error)

  const out = {}
  for (const row of data || []) {
    const country = row.scope.slice('country:'.length)
    if (!country) continue
    out[country] ||= {}
    out[country][row.group_id] ||= {}
    out[country][row.group_id][row.section_id] = row.data || {}
  }
  return out
}

/**
 * Persist one country's overrides for one section. An empty override deletes
 * the row rather than storing `{}` — otherwise "back to shared copy" would
 * leave behind a record that still counts as an override.
 */
export async function persistOverrideSection(country, groupId, sectionId, data) {
  const scope = `country:${country}`
  const supabase = client()

  if (!data || !Object.keys(data).length) {
    const { error } = await supabase.from('content').delete()
      .eq('scope', scope).eq('group_id', groupId).eq('section_id', sectionId)
    if (error) fail('Could not clear country override', error)
    return
  }

  const { error } = await supabase.from('content').upsert(
    { scope, group_id: groupId, section_id: sectionId, data },
    { onConflict: 'scope,group_id,section_id' },
  )
  if (error) fail('Could not save country override', error)
}

/** Re-read just the enquiry inbox (used by the live subscription + refresh). */
export const refetchRequests = fetchRequests

// ── Users + roles ───────────────────────────────────────────
/**
 * Staff accounts. The RLS policy lets a user read their own profile and an
 * admin read all of them, so a non-admin simply sees a one-row list.
 *
 * Emails live in auth.users, which is not reachable with the anon key — so the
 * list shows names, titles and roles, and the Users view links out to the
 * Supabase dashboard for inviting people.
 */
export async function fetchUsers() {
  const { data, error } = await client()
    .from('profiles')
    .select('id, name, title, role, created_at')
    .order('created_at', { ascending: true })
  if (error) fail('Could not load users', error)
  return (data || []).map(u => ({
    id: u.id,
    name: u.name || '',
    title: u.title || '',
    role: u.role || 'editor',
    email: '',
    createdAt: u.created_at,
  }))
}

/** Change someone's role. Refused by RLS unless the caller is an admin. */
export async function updateUserRole(id, role) {
  const { error } = await client().from('profiles').update({ role }).eq('id', id)
  if (error) fail('Could not update role', error)
}

/**
 * Subscribe to new enquiries arriving while the dashboard is open, so the
 * inbox updates without a refresh. Returns an unsubscribe function.
 */
export function subscribeToRequests(onChange) {
  const supabase = getSupabase()
  if (!supabase) return () => {}

  const channel = supabase
    .channel('requests-inbox')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'requests' },
      () => onChange(),
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}
