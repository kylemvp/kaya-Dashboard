'use client'
import { COUNTRIES, COUNTRY_CURRENCY, normalisePricing } from '@/lib/countries'

/**
 * Which markets offer a record, and what it costs in each.
 *
 * Availability is stored as a list of country ids, and an EMPTY list means
 * "everywhere". That way a newly created service is live in all markets rather
 * than silently invisible until someone remembers to tick three boxes — the
 * safer default for a catalogue that is mostly shared.
 */
export default function CountryFields({ countries, pricing, onChange, showPricing = true }) {
  const selected = Array.isArray(countries) ? countries : []
  const prices = normalisePricing(pricing)
  const everywhere = selected.length === 0

  function toggle(id) {
    const next = selected.includes(id)
      ? selected.filter(c => c !== id)
      : [...selected, id]
    onChange({ countries: next, pricing: prices })
  }

  function setPrice(id, field, value) {
    onChange({
      countries: selected,
      pricing: { ...prices, [id]: { ...prices[id], [field]: value } },
    })
  }

  return (
    <div className="ad-country-fields">
      <label className="ad-field">
        <span className="ad-field-label">Available in</span>
        <div className="ad-check-row">
          {COUNTRIES.map(c => (
            <label key={c.id} className="ad-check">
              <input
                type="checkbox"
                checked={everywhere || selected.includes(c.id)}
                onChange={() => toggle(c.id)}
              />
              {c.short}
            </label>
          ))}
        </div>
        <span className="ad-field-hint">
          {everywhere
            ? 'Available in every country. Tick specific countries to limit it.'
            : `Shown only in ${selected.join(', ')}.`}
        </span>
      </label>

      {showPricing && (
        <div className="ad-field">
          <span className="ad-field-label">Price per country</span>
          <div className="ad-price-grid">
            {COUNTRIES.map(c => {
              const off = !everywhere && !selected.includes(c.id)
              return (
                <div key={c.id} className={`ad-price-row${off ? ' is-off' : ''}`}>
                  <span className="ad-price-country">{c.short}</span>
                  <input
                    className="ad-input ad-price-input"
                    type="text"
                    inputMode="decimal"
                    placeholder="—"
                    value={prices[c.id].price}
                    onChange={e => setPrice(c.id, 'price', e.target.value)}
                    disabled={off}
                  />
                  <input
                    className="ad-input ad-price-cur"
                    type="text"
                    value={prices[c.id].currency || COUNTRY_CURRENCY[c.id]}
                    onChange={e => setPrice(c.id, 'currency', e.target.value)}
                    disabled={off}
                    aria-label={`${c.short} currency`}
                  />
                </div>
              )
            })}
          </div>
          <span className="ad-field-hint">
            Leave a price blank to hide it in that country rather than showing
            another market&apos;s figure.
          </span>
        </div>
      )}
    </div>
  )
}
