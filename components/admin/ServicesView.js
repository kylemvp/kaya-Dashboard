'use client'
import { useMemo, useState } from 'react'
import { useAdmin } from './AdminContext'
import ConfirmDialog from './ConfirmDialog'
import ReorderCell from './ReorderCell'
import { emptyService } from '@/lib/admin/seed'
import ServiceForm from './ServiceForm'

export default function ServicesView() {
  const { services, verticals, deleteService, allowed } = useAdmin()
  const [query, setQuery] = useState('')
  const [vertical, setVertical] = useState('')
  const [editing, setEditing] = useState(null)   // { initial, isNew } | null
  const [confirm, setConfirm] = useState(null)    // slug pending delete

  const verticalMeta = useMemo(() => {
    const map = {}
    verticals.forEach(v => { map[v.id] = v })
    return map
  }, [verticals])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return services.filter(s => {
      if (vertical && !(s.verticals || []).includes(vertical)) return false
      if (q && !(`${s.name} ${s.slug}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [services, query, vertical])

  const canDelete = allowed('delete')
  const canCreate = allowed('create')
  const isFiltered = Boolean(query.trim() || vertical)

  // The create/edit form is a full page within the dashboard.
  if (editing) {
    return (
      <ServiceForm
        initial={editing.initial}
        isNew={editing.isNew}
        onClose={() => setEditing(null)}
      />
    )
  }

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Treatments &amp; Services</h1>
          <p className="ad-view-sub">{services.length} services · showing {filtered.length}</p>
        </div>
        {canCreate && (
          <button className="ad-btn ad-btn--primary"
            onClick={() => setEditing({ initial: emptyService(), isNew: true })}>
            + New service
          </button>
        )}
      </div>

      <div className="ad-toolbar">
        <input
          className="ad-input ad-search"
          placeholder="Search by name, slug, or tag…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
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
              <th>Name</th>
              <th>Verticals</th>
              <th>Badge</th>
              <th className="ad-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.slug}>
                <td className="ad-td-order">
                  <ReorderCell
                    collection="services"
                    itemKey={s.slug}
                    index={services.indexOf(s)}
                    total={services.length}
                    disabled={isFiltered}
                  />
                </td>
                <td>
                  <div className="ad-cell-name">{s.name}</div>
                  <div className="ad-cell-slug">{s.slug}</div>
                </td>
                <td>
                  {(s.verticals || []).length ? (
                    <span className="ad-pill-row">
                      {s.verticals.map(vid => (
                        <span key={vid} className="ad-vpill">
                          <span className="ad-vpill-dot" style={{ background: verticalMeta[vid]?.color || '#999' }} />
                          {verticalMeta[vid]?.label || vid}
                        </span>
                      ))}
                    </span>
                  ) : <span className="ad-muted">—</span>}
                </td>
                <td>{s.badge ? <span className="ad-badge">{s.badge}</span> : <span className="ad-muted">—</span>}</td>
                <td className="ad-td-actions">
                  <button className="ad-btn ad-btn--soft ad-btn--sm"
                    onClick={() => setEditing({ initial: s, isNew: false })}>Edit</button>
                  {canDelete && (
                    <button className="ad-btn ad-btn--danger ad-btn--sm"
                      onClick={() => setConfirm(s.slug)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="ad-empty">
                  {services.length === 0
                    ? 'No services yet. Create your first one to see it on the site.'
                    : 'No services match your filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {confirm && (
        <ConfirmDialog
          title="Delete service?"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { deleteService(confirm); setConfirm(null) }}
        >
          This will remove <strong>{confirm}</strong> and take it off every page it
          appears on.
        </ConfirmDialog>
      )}
    </div>
  )
}
