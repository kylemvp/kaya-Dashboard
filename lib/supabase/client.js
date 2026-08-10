/**
 * Browser Supabase client.
 *
 * A single shared instance — creating more than one auth-enabled client in a
 * page makes them fight over the same session storage key.
 *
 * Both values are NEXT_PUBLIC_ and therefore visible in the shipped bundle.
 * That is expected: the anon key is a public identifier, and every table is
 * protected by the RLS policies in supabase/schema.sql, not by key secrecy.
 * The service-role key must NEVER be referenced from this file.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * False when the project hasn't been wired up yet. The dashboard shows a setup
 * screen instead of failing with an opaque network error, and the public site
 * carries on running off the generated snapshot.
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

let client = null

/** The shared client, or null when env vars are missing. */
export function getSupabase() {
  if (!isSupabaseConfigured) return null
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  }
  return client
}
