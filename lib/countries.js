/**
 * The countries Kaya operates in — one list, used everywhere.
 *
 * This used to live in two places that disagreed on spelling: doctors were
 * filed under 'OMAN' while clinics and enquiries used 'Oman'. Nothing compared
 * the two, so the mismatch stayed invisible until content had to be filtered by
 * country. 'Oman' won because three of the four datasets already used it.
 *
 * `currency` is the default for prices entered against that country.
 */
export const COUNTRIES = [
  { id: 'UAE', label: 'United Arab Emirates', short: 'UAE', currency: 'AED' },
  { id: 'KSA', label: 'Saudi Arabia', short: 'KSA', currency: 'SAR' },
  { id: 'Oman', label: 'Oman', short: 'Oman', currency: 'OMR' },
]

export const COUNTRY_IDS = COUNTRIES.map(c => c.id)

/** id -> full label, for headings and selects. */
export const COUNTRY_LABELS = Object.fromEntries(COUNTRIES.map(c => [c.id, c.label]))

/** id -> default currency code. */
export const COUNTRY_CURRENCY = Object.fromEntries(COUNTRIES.map(c => [c.id, c.currency]))

/**
 * Normalise a stored value onto a canonical id, so records written before the
 * lists were unified still resolve. Returns '' for anything unrecognised
 * rather than guessing.
 */
export function normaliseCountry(value) {
  if (!value) return ''
  const v = String(value).trim().toLowerCase()
  return COUNTRY_IDS.find(id => id.toLowerCase() === v) || ''
}

/** Blank per-country price map: { UAE: { price: '', currency: 'AED' }, … }. */
export function emptyPricing() {
  return Object.fromEntries(
    COUNTRIES.map(c => [c.id, { price: '', currency: c.currency }]),
  )
}

/**
 * Fill in any country missing from a stored pricing map, so a record written
 * before a country existed still renders every field in the form.
 */
export function normalisePricing(stored) {
  const out = emptyPricing()
  if (!stored || typeof stored !== 'object') return out

  for (const c of COUNTRIES) {
    const row = stored[c.id]
    if (!row || typeof row !== 'object') continue
    out[c.id] = {
      price: row.price == null ? '' : String(row.price),
      currency: row.currency || c.currency,
    }
  }
  return out
}
