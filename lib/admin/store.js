/**
 * Data layer entry point.
 *
 * Two interchangeable backends implement the same API:
 *
 *   · store-supabase.js — the real one: Postgres, RLS, realtime.
 *   · store-local.js    — localStorage, seeded from the current site content.
 *
 * The local one is selected when Supabase credentials are absent, so the
 * dashboard is fully explorable before a database exists. Nothing above this
 * module knows which is in play; `isDemoMode` is exported only so the UI can
 * say so honestly rather than implying edits are going live.
 */
import { isSupabaseConfigured } from '@/lib/supabase/client'
import * as remote from './store-supabase'
import * as local from './store-local'

export const isDemoMode = !isSupabaseConfigured

const backend = isSupabaseConfigured ? remote : local

export const fetchAll = (...a) => backend.fetchAll(...a)
export const refetchRequests = (...a) => backend.refetchRequests(...a)

export const persistServices = (...a) => backend.persistServices(...a)
export const persistVerticals = (...a) => backend.persistVerticals(...a)
export const persistDoctors = (...a) => backend.persistDoctors(...a)
export const persistReviews = (...a) => backend.persistReviews(...a)
export const persistVouchers = (...a) => backend.persistVouchers(...a)
export const persistLocations = (...a) => backend.persistLocations(...a)

export const removeService = (...a) => backend.removeService(...a)
export const removeVertical = (...a) => backend.removeVertical(...a)
export const removeDoctor = (...a) => backend.removeDoctor(...a)
export const removeReview = (...a) => backend.removeReview(...a)
export const removeVoucher = (...a) => backend.removeVoucher(...a)
export const removeLocation = (...a) => backend.removeLocation(...a)

export const persistPageSection = (...a) => backend.persistPageSection(...a)
export const persistSiteSection = (...a) => backend.persistSiteSection(...a)

export const persistRequestPatch = (...a) => backend.persistRequestPatch(...a)
export const removeRequest = (...a) => backend.removeRequest(...a)
export const subscribeToRequests = (...a) => backend.subscribeToRequests(...a)

export const fetchUsers = (...a) => backend.fetchUsers(...a)
export const updateUserRole = (...a) => backend.updateUserRole(...a)

/**
 * Submit an enquiry from the public site.
 *
 * Deliberately NOT routed through `backend`: the booking form must keep working
 * on the live site even in a build without dashboard credentials, and falling
 * back to localStorage there would silently swallow real enquiries. When
 * Supabase is configured this writes to it; otherwise it records the submission
 * locally so the preview can demonstrate the flow.
 */
export const submitRequest = (...a) => backend.submitRequest(...a)

// Preview-only helpers. Guarded so a configured build can never take this path.
export const loadSession = () => (isSupabaseConfigured ? null : local.loadSession())
export const saveSession = u => { if (!isSupabaseConfigured) local.saveSession(u) }
export const clearSession = () => { if (!isSupabaseConfigured) local.clearSession() }
export const demoUsers = () => (isSupabaseConfigured ? [] : local.demoUsers())
export const resetDemo = () => { if (!isSupabaseConfigured) local.resetDemo() }
