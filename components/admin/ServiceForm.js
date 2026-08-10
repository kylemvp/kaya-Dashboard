'use client'
import { useState } from 'react'
import { useAdmin } from './AdminContext'
import { THUMB_OPTIONS, BADGE_OPTIONS } from '@/lib/admin/seed'
import { TREATMENT_CATEGORIES } from '@/lib/taxonomy'

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// structuredClone isn't available everywhere; fall back to JSON clone.
function cloneSafe(obj) {
  if (typeof structuredClone === 'function') return structuredClone(obj)
  return JSON.parse(JSON.stringify(obj))
}

export default function ServiceForm({ initial, isNew, onClose }) {
  const { verticals, upsertService, services } = useAdmin()
  const [form, setForm] = useState(() => ({ image: '', ...cloneSafe(initial) }))
  const [error, setError] = useState('')
  const originalSlug = isNew ? null : initial.slug

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }
  function setNested(group, field, value) {
    setForm(f => ({ ...f, [group]: { ...f[group], [field]: value } }))
  }
  function toggleVertical(id) {
    setForm(f => ({
      ...f,
      verticals: f.verticals.includes(id)
        ? f.verticals.filter(v => v !== id)
        : [...f.verticals, id],
    }))
  }

  function handleImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => set('image', reader.result)
    reader.readAsDataURL(file)
  }

  // ── Benefits (repeatable) ──
  function addBenefit() {
    setForm(f => ({ ...f, benefits: [...f.benefits, { i: '✦', t: '', d: '' }] }))
  }
  function updateBenefit(idx, key, value) {
    setForm(f => ({
      ...f,
      benefits: f.benefits.map((b, i) => (i === idx ? { ...b, [key]: value } : b)),
    }))
  }
  function removeBenefit(idx) {
    setForm(f => ({ ...f, benefits: f.benefits.filter((_, i) => i !== idx) }))
  }

  // ── Suitable (list of strings) ──
  function updateSuitable(idx, value) {
    setForm(f => ({ ...f, suitable: f.suitable.map((s, i) => (i === idx ? value : s)) }))
  }
  function addSuitable() {
    setForm(f => ({ ...f, suitable: [...f.suitable, ''] }))
  }
  function removeSuitable(idx) {
    setForm(f => ({ ...f, suitable: f.suitable.filter((_, i) => i !== idx) }))
  }

  function submit(e) {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return setError('Name is required.')

    const slug = form.slug.trim() || slugify(name)
    const clash = services.some(s => s.slug === slug && s.slug !== originalSlug)
    if (clash) return setError(`The slug "${slug}" is already in use.`)

    const record = {
      ...form,
      name,
      slug,
      benefits: form.benefits.filter(b => b.t.trim() || b.d.trim()),
      suitable: form.suitable.map(s => s.trim()).filter(Boolean),
    }
    upsertService(record, originalSlug)
    onClose()
  }

  return (
    <form className="ad-editor" onSubmit={submit}>
      <div className="ad-editor-head">
        <button type="button" className="ad-back" onClick={onClose}>← Back</button>
        <div className="ad-editor-titles">
          <h1 className="ad-view-title">{isNew ? 'New service' : 'Edit service'}</h1>
          <p className="ad-view-sub">
            {isNew ? 'Create a treatment for the site.' : form.slug}
          </p>
        </div>
        <div className="ad-editor-actions">
          <button type="button" className="ad-btn ad-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="ad-btn ad-btn--primary">
            {isNew ? 'Create service' : 'Save changes'}
          </button>
        </div>
      </div>

      {error && <div className="ad-form-error ad-editor-error">{error}</div>}

      <div className="ad-editor-body">
        <fieldset className="ad-fieldset">
          <legend>Basics</legend>
          <div className="ad-grid2">
            <label className="ad-field">
              <span className="ad-field-label">Name *</span>
              <input className="ad-input" value={form.name}
                onChange={e => set('name', e.target.value)} />
            </label>
            <label className="ad-field">
              <span className="ad-field-label">Slug</span>
              <input className="ad-input" value={form.slug}
                placeholder={slugify(form.name) || 'auto-generated'}
                onChange={e => set('slug', e.target.value)} />
            </label>
          </div>
          <label className="ad-field">
            <span className="ad-field-label">Short description (sub)</span>
            <textarea className="ad-input ad-textarea" rows={2} value={form.sub}
              onChange={e => set('sub', e.target.value)} />
          </label>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Image</legend>
          <div className="ad-image-field">
            <div className="ad-image-preview">
              {form.image
                ? <img src={form.image} alt="" />
                : (
                  <div className="ad-image-ph">
                    <span className="ad-image-ph-icon" aria-hidden="true">🖼</span>
                    <span>No image yet</span>
                  </div>
                )}
            </div>
            <div className="ad-image-actions">
              <label className="ad-btn ad-btn--soft ad-file-btn">
                {form.image ? 'Replace image' : 'Upload image'}
                <input type="file" accept="image/*" onChange={handleImage} hidden />
              </label>
              {form.image && (
                <button type="button" className="ad-btn ad-btn--ghost" onClick={() => set('image', '')}>
                  Remove
                </button>
              )}
              <label className="ad-field ad-image-url">
                <span className="ad-field-label">or paste an image URL / path</span>
                <input className="ad-input" value={form.image?.startsWith('data:') ? '' : (form.image || '')}
                  placeholder="/Assets/my-image.jpg"
                  onChange={e => set('image', e.target.value)} />
              </label>
            </div>
          </div>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Classification</legend>
          <div className="ad-field">
            <span className="ad-field-label">Verticals</span>
            <div className="ad-check-grid">
              {verticals.map(v => (
                <label key={v.id} className={`ad-check${form.verticals.includes(v.id) ? ' active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={form.verticals.includes(v.id)}
                    onChange={() => toggleVertical(v.id)}
                  />
                  <span className="ad-check-dot" style={{ background: v.color }} />
                  {v.label}
                </label>
              ))}
            </div>
          </div>
          <label className="ad-field">
            <span className="ad-field-label">Treatment category</span>
            <select className="ad-input" value={form.category || ''}
              onChange={e => set('category', e.target.value)}>
              <option value="">— none —</option>
              {TREATMENT_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <span className="ad-field-hint">
              Decides which Treatments page this service appears on, and the tag
              shown on its cards. A service with no category is hidden from the
              treatments pages.
            </span>
          </label>
          <div className="ad-grid2">
            <label className="ad-field">
              <span className="ad-field-label">Thumbnail style</span>
              <select className="ad-input" value={form.thumb}
                onChange={e => set('thumb', e.target.value)}>
                {THUMB_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="ad-field">
              <span className="ad-field-label">Badge</span>
              <select className="ad-input" value={form.badge}
                onChange={e => set('badge', e.target.value)}>
                {BADGE_OPTIONS.map(b => <option key={b || 'none'} value={b}>{b || '— none —'}</option>)}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Content</legend>
          <label className="ad-field">
            <span className="ad-field-label">What it is</span>
            <textarea className="ad-input ad-textarea" rows={4} value={form.what}
              onChange={e => set('what', e.target.value)} />
          </label>
          <label className="ad-field">
            <span className="ad-field-label">How it works (mechanism)</span>
            <textarea className="ad-input ad-textarea" rows={3} value={form.mechanism}
              onChange={e => set('mechanism', e.target.value)} />
          </label>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>What to expect</legend>
          <div className="ad-grid3">
            <label className="ad-field">
              <span className="ad-field-label">Duration</span>
              <input className="ad-input" value={form.expect.duration}
                onChange={e => setNested('expect', 'duration', e.target.value)} />
            </label>
            <label className="ad-field">
              <span className="ad-field-label">Sessions</span>
              <input className="ad-input" value={form.expect.sessions}
                onChange={e => setNested('expect', 'sessions', e.target.value)} />
            </label>
            <label className="ad-field">
              <span className="ad-field-label">Interval</span>
              <input className="ad-input" value={form.expect.interval}
                onChange={e => setNested('expect', 'interval', e.target.value)} />
            </label>
          </div>
          <div className="ad-grid2">
            <label className="ad-field">
              <span className="ad-field-label">Downtime level</span>
              <input className="ad-input" value={form.downtime.level}
                onChange={e => setNested('downtime', 'level', e.target.value)}
                placeholder="e.g. Minimal" />
            </label>
            <label className="ad-field">
              <span className="ad-field-label">Downtime description</span>
              <input className="ad-input" value={form.downtime.desc}
                onChange={e => setNested('downtime', 'desc', e.target.value)} />
            </label>
          </div>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Benefits</legend>
          {form.benefits.map((b, i) => (
            <div key={i} className="ad-repeat-row">
              <input className="ad-input ad-input--icon" value={b.i}
                onChange={e => updateBenefit(i, 'i', e.target.value)} aria-label="Icon" />
              <div className="ad-repeat-main">
                <input className="ad-input" value={b.t} placeholder="Title"
                  onChange={e => updateBenefit(i, 't', e.target.value)} />
                <input className="ad-input" value={b.d} placeholder="Description"
                  onChange={e => updateBenefit(i, 'd', e.target.value)} />
              </div>
              <button type="button" className="ad-icon-btn" onClick={() => removeBenefit(i)}
                aria-label="Remove benefit">✕</button>
            </div>
          ))}
          <button type="button" className="ad-btn ad-btn--soft" onClick={addBenefit}>+ Add benefit</button>
        </fieldset>

        <fieldset className="ad-fieldset">
          <legend>Suitable for</legend>
          {form.suitable.map((s, i) => (
            <div key={i} className="ad-repeat-row">
              <input className="ad-input" value={s}
                onChange={e => updateSuitable(i, e.target.value)} />
              <button type="button" className="ad-icon-btn" onClick={() => removeSuitable(i)}
                aria-label="Remove item">✕</button>
            </div>
          ))}
          <button type="button" className="ad-btn ad-btn--soft" onClick={addSuitable}>+ Add item</button>
        </fieldset>
      </div>
    </form>
  )
}
