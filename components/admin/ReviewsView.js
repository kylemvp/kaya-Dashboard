'use client'
import { useMemo, useState } from 'react'
import { useAdmin } from './AdminContext'
import ConfirmDialog from './ConfirmDialog'
import ReorderCell from './ReorderCell'
import { emptyReview } from '@/lib/admin/seed'
import ReviewForm from './ReviewForm'

export default function ReviewsView() {
  const { reviews, verticals, deleteReview, allowed } = useAdmin()
  const [query, setQuery] = useState('')
  const [vertical, setVertical] = useState('')
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const verticalMeta = useMemo(() => {
    const map = {}
    verticals.forEach(v => { map[v.id] = v })
    return map
  }, [verticals])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return reviews.filter(r => {
      if (vertical && r.vertical !== vertical) return false
      if (q && !(`${r.name} ${r.treatment} ${r.location}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [reviews, query, vertical])

  const isFiltered = Boolean(query.trim() || vertical)
  const canDelete = allowed('delete')
  const canCreate = allowed('create')

  if (editing) {
    return (
      <ReviewForm initial={editing.initial} isNew={editing.isNew} onClose={() => setEditing(null)} />
    )
  }

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Reviews</h1>
          <p className="ad-view-sub">{reviews.length} testimonials · showing {filtered.length}</p>
        </div>
        {canCreate && (
          <button className="ad-btn ad-btn--primary"
            onClick={() => setEditing({ initial: emptyReview(), isNew: true })}>
            + New review
          </button>
        )}
      </div>

      <div className="ad-toolbar">
        <input className="ad-input ad-search" placeholder="Search by name, treatment, or location…"
          value={query} onChange={e => setQuery(e.target.value)} />
        <select className="ad-input ad-filter" value={vertical} onChange={e => setVertical(e.target.value)}>
          <option value="">All verticals</option>
          {verticals.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
        </select>
      </div>

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th className="ad-th-order">Order</th>
              <th>Patient</th>
              <th>Treatment</th>
              <th>Vertical</th>
              <th>Media</th>
              <th className="ad-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                <td className="ad-td-order">
                  <ReorderCell
                    collection="reviews"
                    itemKey={r.id}
                    index={reviews.indexOf(r)}
                    total={reviews.length}
                    disabled={isFiltered}
                  />
                </td>
                <td>
                  <div className="ad-cell-name">{r.name}</div>
                  <div className="ad-cell-slug">{r.location || '—'}</div>
                </td>
                <td>{r.treatment || <span className="ad-muted">—</span>}</td>
                <td>
                  {r.vertical
                    ? (
                      <span className="ad-vpill">
                        <span className="ad-vpill-dot" style={{ background: verticalMeta[r.vertical]?.color || '#999' }} />
                        {verticalMeta[r.vertical]?.label || r.vertical}
                      </span>
                    )
                    : <span className="ad-muted">—</span>}
                </td>
                <td>
                  {r.before || r.after
                    ? <span className="ad-badge">before / after</span>
                    : <span className="ad-muted">quote only</span>}
                </td>
                <td className="ad-td-actions">
                  <button className="ad-btn ad-btn--soft ad-btn--sm"
                    onClick={() => setEditing({ initial: r, isNew: false })}>Edit</button>
                  {canDelete && (
                    <button className="ad-btn ad-btn--danger ad-btn--sm"
                      onClick={() => setConfirm(r.id)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="ad-empty">
                {reviews.length === 0 ? 'No reviews yet. Add one to show it on treatment pages.' : 'No reviews match your filters.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {confirm && (
        <ConfirmDialog
          title="Delete review?"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { deleteReview(confirm); setConfirm(null) }}
        >
          This will remove <strong>{confirm}</strong> from the treatment pages it
          appears on.
        </ConfirmDialog>
      )}
    </div>
  )
}
