/**
 * Authentication + roles, backed by Supabase Auth.
 *
 * Sessions are real JWTs issued by Supabase and refreshed automatically by the
 * client. A user's role lives in public.profiles and is the same value the RLS
 * policies read, so `can()` below and the database agree by construction.
 *
 * IMPORTANT: `can()` is a UI convenience — it hides buttons a role shouldn't
 * press. It is NOT the security boundary. Deletes are refused by the
 * admin-only RLS policies in supabase/schema.sql even if the UI is bypassed.
 */
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { loadSession, saveSession, clearSession, demoUsers } from './store'

export const ROLE_LABELS = {
  admin: 'Administrator',
  editor: 'Content Editor',
}

/** Permissions per role. Admins can do everything; editors can't delete or manage users. */
export const PERMISSIONS = {
  admin: { create: true, edit: true, delete: true, manageUsers: true },
  editor: { create: true, edit: true, delete: false, manageUsers: false },
}

export function can(user, action) {
  if (!user) return false
  return Boolean(PERMISSIONS[user.role]?.[action])
}

/**
 * Build the app-level user object the dashboard renders from an auth session
 * plus the matching profile row.
 */
function toUser(authUser, profile) {
  return {
    id: authUser.id,
    email: authUser.email || '',
    name: profile?.name || (authUser.email || '').split('@')[0],
    title: profile?.title || ROLE_LABELS[profile?.role] || '',
    role: profile?.role || 'editor',
  }
}

/** Fetch the profile row for a signed-in auth user. */
async function fetchProfile(supabase, id) {
  const { data, error } = await supabase
    .from('profiles')
    .select('name, title, role')
    .eq('id', id)
    .maybeSingle()
  if (error) return null
  return data
}

/**
 * Sign in with email + password.
 * Returns { ok: true, user } or { ok: false, error }.
 */
export async function signIn(email, password) {
  // Preview mode: pick whichever demo account was entered. There is no password
  // check because there is no account to protect — this path is unreachable
  // once NEXT_PUBLIC_SUPABASE_* are set.
  if (!isSupabaseConfigured) {
    const wanted = String(email).trim().toLowerCase()
    const users = demoUsers()
    const found = users.find(u => u.email.toLowerCase() === wanted) || users[0]
    if (!found) return { ok: false, error: 'No demo accounts available.' }
    saveSession(found)
    return { ok: true, user: found }
  }

  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'Supabase is not configured.' }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email).trim(),
    password,
  })

  if (error) {
    // Supabase returns "Invalid login credentials" for both a wrong password
    // and an unknown email — deliberately, so the form can't be used to probe
    // which addresses have accounts. Pass that through unchanged.
    return { ok: false, error: error.message || 'Could not sign in.' }
  }

  const profile = await fetchProfile(supabase, data.user.id)
  return { ok: true, user: toUser(data.user, profile) }
}

export async function signOut() {
  if (!isSupabaseConfigured) {
    clearSession()
    return
  }
  const supabase = getSupabase()
  if (supabase) await supabase.auth.signOut()
}

/**
 * Resolve the currently stored session into a user, or null when signed out.
 * Called on mount so a refresh doesn't bounce the user back to the login screen.
 */
export async function getCurrentUser() {
  if (!isSupabaseConfigured) return loadSession()

  const supabase = getSupabase()
  if (!supabase) return null

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null

  const profile = await fetchProfile(supabase, session.user.id)
  return toUser(session.user, profile)
}

/**
 * Subscribe to sign-in / sign-out / token-refresh events so the dashboard
 * follows the session (e.g. signing out in another tab signs out here too).
 * Returns an unsubscribe function.
 */
export function onAuthChange(handler) {
  // Nothing to follow in preview mode — the session only changes through
  // signIn/signOut in this tab, which update state directly.
  if (!isSupabaseConfigured) return () => {}

  const supabase = getSupabase()
  if (!supabase) return () => {}

  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (!session?.user) {
      handler(null)
      return
    }
    const profile = await fetchProfile(supabase, session.user.id)
    handler(toUser(session.user, profile))
  })

  return () => data?.subscription?.unsubscribe()
}
