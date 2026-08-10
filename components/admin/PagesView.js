'use client'
import { useMemo, useState } from 'react'
import { useAdmin } from './AdminContext'
import ContentEditor from './ContentEditor'
import { PAGES, seedPages } from '@/lib/admin/content'
import { siteUrl } from '@/lib/site'

export default function PagesView() {
  const { pages, updatePageSection, allowed } = useAdmin()
  const [openId, setOpenId] = useState(null)

  // Kept for the per-section "Revert" action, which restores the original copy.
  const seeded = useMemo(() => seedPages(), [])

  const page = PAGES.find(p => p.id === openId)

  if (page) {
    return (
      <div className="ad-view">
        <div className="ad-editor-head">
          <button type="button" className="ad-back" onClick={() => setOpenId(null)}>← All pages</button>
          <div className="ad-editor-titles">
            <h1 className="ad-view-title">{page.label}</h1>
            <p className="ad-view-sub">{page.hint}</p>
          </div>
          <a href={siteUrl(page.path)} className="ad-btn ad-btn--ghost" target="_blank" rel="noreferrer">
            View page ↗
          </a>
        </div>

        <ContentEditor
          group={page}
          values={pages[page.id]}
          seed={seeded[page.id]}
          canEdit={allowed('edit')}
          onSave={(sectionId, sectionValues) => updatePageSection(page.id, sectionId, sectionValues)}
        >
          <span className="ad-cf-path">{page.path}</span>
          <span className="ad-cf-count">
            {page.sections.length} {page.sections.length === 1 ? 'section' : 'sections'}
          </span>
        </ContentEditor>
      </div>
    )
  }

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Pages</h1>
          <p className="ad-view-sub">
            Headings, body copy, and imagery for each page on the site. Treatments, doctors,
            vouchers, and reviews are managed in their own sections.
          </p>
        </div>
      </div>

      <div className="ad-page-grid">
        {PAGES.map(p => (
          <button key={p.id} className="ad-page-card" onClick={() => setOpenId(p.id)}>
            <span className="ad-page-icon" aria-hidden="true">{p.icon}</span>
            <span className="ad-page-body">
              <span className="ad-page-label">{p.label}</span>
              <span className="ad-page-hint">{p.hint}</span>
              <span className="ad-page-meta">
                <span className="ad-page-path">{p.path}</span>
                <span className="ad-page-count">{p.sections.length} sections</span>
              </span>
            </span>
            <span className="ad-page-arrow" aria-hidden="true">→</span>
          </button>
        ))}
      </div>
    </div>
  )
}
