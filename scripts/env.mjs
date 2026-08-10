/**
 * Minimal .env loader for the standalone build scripts.
 *
 * Next.js loads .env.local automatically, but `node scripts/…` does not, and
 * `--env-file` is awkward to depend on because it errors when the file is
 * absent (a fresh clone, or CI where the values come from real environment
 * variables instead).
 *
 * Import this first — real environment variables always win, so CI secrets are
 * never overwritten by a stray local file.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

for (const file of ['.env.local', '.env']) {
  let text
  try {
    text = readFileSync(join(ROOT, file), 'utf8')
  } catch {
    continue // not present — perfectly normal
  }

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const eq = line.indexOf('=')
    if (eq === -1) continue

    const key = line.slice(0, eq).trim()
    if (!key || process.env[key] !== undefined) continue

    let value = line.slice(eq + 1).trim()
    // Strip one layer of matching quotes, if present.
    const quoted = value.length >= 2 && (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
    if (quoted) value = value.slice(1, -1)

    process.env[key] = value
  }
}
