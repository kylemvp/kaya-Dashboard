/**
 * Publish — triggers a rebuild + deploy of the static site.
 *
 * The dashboard writes to the database, but the public site is a static export,
 * so changes only go live when the site is rebuilt. The Publish button calls
 * this function, which dispatches the GitHub Actions deploy workflow.
 *
 * This exists as an Edge Function rather than a direct call from the browser
 * because dispatching a workflow needs a repo-scoped GitHub token. Anything the
 * browser could read would be in the shipped bundle for anyone to extract and
 * use against the repository. Here the token stays server-side and the caller
 * is verified first.
 *
 * Deploy:
 *   supabase functions deploy publish
 *   supabase secrets set GITHUB_TOKEN=ghp_… GITHUB_REPO=owner/repo
 *
 * GITHUB_TOKEN needs a fine-grained token with "Actions: read and write" on
 * that repository only.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ ok: false, error: 'Not signed in.' }, 401)

  // Resolve the caller from their JWT, using the anon key plus their own token
  // so RLS applies exactly as it would in the dashboard.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return json({ ok: false, error: 'Not signed in.' }, 401)

  // Only staff may publish. Reading the role through the caller's own session
  // means a revoked or downgraded account loses the ability immediately.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !['admin', 'editor'].includes(profile.role)) {
    return json({ ok: false, error: 'You do not have permission to publish.' }, 403)
  }

  const token = Deno.env.get('GITHUB_TOKEN')
  const repo = Deno.env.get('GITHUB_REPO')
  const workflow = Deno.env.get('GITHUB_WORKFLOW') ?? 'deploy.yml'
  const ref = Deno.env.get('GITHUB_REF') ?? 'main'

  if (!token || !repo) {
    return json(
      { ok: false, error: 'Publishing is not configured. Set GITHUB_TOKEN and GITHUB_REPO.' },
      500,
    )
  }

  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref }),
    },
  )

  // GitHub answers 204 No Content on a successful dispatch.
  if (res.status !== 204) {
    const detail = await res.text()
    return json(
      { ok: false, error: `GitHub refused the rebuild (${res.status}). ${detail.slice(0, 200)}` },
      502,
    )
  }

  return json({ ok: true, publishedBy: user.email })
})
