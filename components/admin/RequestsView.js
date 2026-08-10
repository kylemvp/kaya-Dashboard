'use client'
import { useMemo, useState } from 'react'
import { useAdmin } from './AdminContext'
import ConfirmDialog from './ConfirmDialog'
import { siteUrl } from '@/lib/site'
import {
  REQUEST_STATUS_OPTIONS,
  REQUEST_SOURCE_OPTIONS,
  REQUEST_STATUS_LABELS,
  REQUEST_SOURCE_LABELS,
} from '@/lib/admin/seed'

function StatusPill({ status }) {
  return (
    <span className={`ad-status ad-status--${status}`}>
      <span className="ad-status-dot" />
      {REQUEST_STATUS_LABELS[status] || status}
    </span>
  )
}

// "23 Jul 2026, 08:12" — compact and locale-stable enough for the demo.
function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// "3 hours ago" / "2 days ago" relative to now — a light freshness cue.
function timeAgo(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const mins = Math.round((Date.now() - then) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`
  const days = Math.round(hrs / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export default function RequestsView() {
  const { requests, setRequestStatus, updateRequest, deleteRequest, allowed } = useAdmin()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [openId, setOpenId] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const canDelete = allowed('delete')

  const counts = useMemo(() => {
    const c = { new: 0, contacted: 0, booked: 0, closed: 0 }
    requests.forEach(r => { if (c[r.status] != null) c[r.status] += 1 })
    return c
  }, [requests])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return requests
      .filter(r => {
        if (status && r.status !== status) return false
        if (source && r.source !== source) return false
        if (q) {
          const hay = `${r.name} ${r.mobile} ${r.email} ${r.city} ${r.treatmentArea} ${r.treatment} ${r.doctor} ${(r.concerns || []).join(' ')}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      // Newest first.
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [requests, query, status, source])

  const open = openId ? requests.find(r => r.id === openId) : null

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Requests</h1>
          <p className="ad-view-sub">
            {requests.length} enquiries from the site · {counts.new} new
          </p>
        </div>
      </div>

      {/* Status summary chips (also act as quick filters) */}
      <div className="ad-req-summary">
        {REQUEST_STATUS_OPTIONS.map(s => (
          <button
            key={s}
            className={`ad-req-stat ad-req-stat--${s}${status === s ? ' active' : ''}`}
            onClick={() => setStatus(status === s ? '' : s)}
          >
            <span className="ad-req-stat-num">{counts[s]}</span>
            <span className="ad-req-stat-lbl">{REQUEST_STATUS_LABELS[s]}</span>
          </button>
        ))}
      </div>

      <div className="ad-toolbar">
        <input
          className="ad-input ad-search"
          placeholder="Search by name, phone, treatment, doctor…"
          value={query} onChange={e => setQuery(e.target.value)}
        />
        <select className="ad-input ad-filter" value={source} onChange={e => setSource(e.target.value)}>
          <option value="">All sources</option>
          {REQUEST_SOURCE_OPTIONS.map(s => (
            <option key={s} value={s}>{REQUEST_SOURCE_LABELS[s]}</option>
          ))}
        </select>
        <select className="ad-input ad-filter" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {REQUEST_STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{REQUEST_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>Consumer</th>
              <th>Interest</th>
              <th>Location</th>
              <th>Received</th>
              <th>Status</th>
              <th className="ad-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className={r.status === 'new' ? 'ad-row-unread' : ''}>
                <td>
                  <div className="ad-cell-name">{r.name}</div>
                  <div className="ad-cell-slug">{r.mobile}</div>
                </td>
                <td>
                  <span className={`ad-source-pill ad-source-pill--${r.source}`}>
                    {r.source === 'consultation' ? 'Consultation' : 'Concern finder'}
                  </span>
                  <div className="ad-req-interest">
                    {r.treatment || r.treatmentArea || <span className="ad-muted">—</span>}
                    {r.doctor && <span className="ad-req-doc"> · {r.doctor}</span>}
                  </div>
                </td>
                <td>
                  <div>{r.city || <span className="ad-muted">—</span>}</div>
                  <div className="ad-cell-slug">{r.country}</div>
                </td>
                <td>
                  <div>{timeAgo(r.createdAt)}</div>
                </td>
                <td><StatusPill status={r.status} /></td>
                <td className="ad-td-actions">
                  <button className="ad-btn ad-btn--soft ad-btn--sm" onClick={() => setOpenId(r.id)}>
                    View
                  </button>
                  {canDelete && (
                    <button className="ad-btn ad-btn--danger ad-btn--sm" onClick={() => setConfirm(r)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="ad-empty">No requests match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail drawer */}
      {open && (
        <div className="ad-drawer-scrim" onClick={() => setOpenId(null)}>
          <div className="ad-drawer ad-drawer--sm" onClick={e => e.stopPropagation()}>
            <div className="ad-drawer-head">
              <div>
                <div className="ad-drawer-title">{open.name}</div>
                <div className="ad-cell-slug">
                  {REQUEST_SOURCE_LABELS[open.source]} · {formatDate(open.createdAt)}
                </div>
              </div>
              <button className="ad-icon-btn" onClick={() => setOpenId(null)} aria-label="Close">✕</button>
            </div>

            <div className="ad-drawer-body">
              {/* Status changer */}
              <div className="ad-field">
                <span className="ad-field-label">Status</span>
                <div className="ad-status-row">
                  {REQUEST_STATUS_OPTIONS.map(s => (
                    <button
                      key={s}
                      className={`ad-status-btn ad-status-btn--${s}${open.status === s ? ' active' : ''}`}
                      onClick={() => setRequestStatus(open.id, s)}
                    >
                      {REQUEST_STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div className="ad-req-detail">
                <div className="ad-req-row">
                  <span className="ad-req-key">Mobile</span>
                  <a className="ad-req-val ad-req-link" href={`tel:${open.mobile.replace(/\s/g, '')}`}>{open.mobile}</a>
                </div>
                <div className="ad-req-row">
                  <span className="ad-req-key">Email</span>
                  {open.email
                    ? <a className="ad-req-val ad-req-link" href={`mailto:${open.email}`}>{open.email}</a>
                    : <span className="ad-req-val ad-muted">Not provided</span>}
                </div>
                <div className="ad-req-row">
                  <span className="ad-req-key">Gender</span>
                  <span className="ad-req-val">{open.gender || '—'}</span>
                </div>
                <div className="ad-req-row">
                  <span className="ad-req-key">Location</span>
                  <span className="ad-req-val">{[open.city, open.country].filter(Boolean).join(', ') || '—'}</span>
                </div>
              </div>

              {/* Interest */}
              <div className="ad-req-detail">
                <div className="ad-req-row">
                  <span className="ad-req-key">Area</span>
                  <span className="ad-req-val">{open.treatmentArea || '—'}</span>
                </div>
                <div className="ad-req-row">
                  <span className="ad-req-key">Treatment</span>
                  <span className="ad-req-val">{open.treatment || <span className="ad-muted">No preference</span>}</span>
                </div>
                <div className="ad-req-row">
                  <span className="ad-req-key">Doctor</span>
                  <span className="ad-req-val">{open.doctor || <span className="ad-muted">No preference</span>}</span>
                </div>
                {open.concerns && open.concerns.length > 0 && (
                  <div className="ad-req-row">
                    <span className="ad-req-key">Concerns</span>
                    <span className="ad-req-val">
                      <span className="ad-req-tags">
                        {open.concerns.map(c => <span key={c} className="ad-badge">{c}</span>)}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {open.message && (
                <div className="ad-field">
                  <span className="ad-field-label">Message from consumer</span>
                  <p className="ad-req-message">{open.message}</p>
                </div>
              )}

              {/* Internal note */}
              <div className="ad-field">
                <label className="ad-field-label" htmlFor="ad-req-note">Internal note</label>
                <textarea
                  id="ad-req-note"
                  className="ad-input ad-textarea"
                  rows={3}
                  placeholder="Add a note for the team…"
                  value={open.notes || ''}
                  onChange={e => updateRequest(open.id, { notes: e.target.value })}
                />
              </div>
            </div>

            <div className="ad-drawer-foot">
              {open.source === 'consultation' || open.treatment
                ? (
                  <a
                    className="ad-btn ad-btn--ghost"
                    href={siteUrl(`/booking?${new URLSearchParams({
                      ...(open.treatment ? { treatment: open.treatment } : {}),
                      ...(open.doctor ? { doctor: open.doctor } : {}),
                    }).toString()}`)}
                    target="_blank" rel="noreferrer"
                  >
                    Open booking ↗
                  </a>
                )
                : <span />}
              <button className="ad-btn ad-btn--primary" onClick={() => setOpenId(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirm && (
        <ConfirmDialog
          title="Delete enquiry?"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            deleteRequest(confirm.id)
            if (openId === confirm.id) setOpenId(null)
            setConfirm(null)
          }}
        >
          This will remove the enquiry from <strong>{confirm.name}</strong>, including
          any notes your team has added.
        </ConfirmDialog>
      )}
    </div>
  )
}
