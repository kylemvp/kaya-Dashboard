'use client'
import { useEffect } from 'react'
import { useAdmin } from './AdminContext'

/**
 * Destructive-action confirmation.
 *
 * Shared so the consequence is described accurately in one place: with a
 * database connected a delete is permanent, whereas in preview mode it only
 * affects this browser and "Reset sample data" brings it back.
 */
export default function ConfirmDialog({
  title,
  children,
  confirmLabel = 'Delete',
  onCancel,
  onConfirm,
}) {
  const { demoMode } = useAdmin()

  // Escape closes — a destructive dialog should never be a trap.
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="ad-drawer-scrim" onClick={onCancel}>
      <div
        className="ad-confirm"
        role="alertdialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="ad-confirm-title">{title}</h3>
        <p className="ad-confirm-text">
          {children}{' '}
          {demoMode
            ? 'This is preview data — “Reset sample data” restores it.'
            : 'This cannot be undone.'}
        </p>
        <div className="ad-confirm-actions">
          <button className="ad-btn ad-btn--ghost" onClick={onCancel}>Cancel</button>
          <button className="ad-btn ad-btn--danger" onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
