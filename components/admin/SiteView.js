'use client'
import { useMemo, useState } from 'react'
import { useAdmin } from './AdminContext'
import ContentEditor from './ContentEditor'
import { SITE_GROUPS, seedSite } from '@/lib/admin/content'

/** Site-wide content: the footer, and the brand/contact details reused everywhere. */
export default function SiteView() {
  const { site, updateSiteSection, allowed } = useAdmin()
  const [tab, setTab] = useState(SITE_GROUPS[0].id)

  // Kept for the per-section "Revert" action, which restores the original copy.
  const seeded = useMemo(() => seedSite(), [])

  const group = SITE_GROUPS.find(g => g.id === tab) || SITE_GROUPS[0]

  return (
    <div className="ad-view">
      <div className="ad-view-head">
        <div>
          <h1 className="ad-view-title">Footer &amp; Global</h1>
          <p className="ad-view-sub">Content that appears on every page of the site.</p>
        </div>
      </div>

      <div className="ad-cf-tabs">
        {SITE_GROUPS.map(g => (
          <button key={g.id}
            className={`ad-cf-tab${tab === g.id ? ' active' : ''}`}
            onClick={() => setTab(g.id)}>
            <span aria-hidden="true">{g.icon}</span> {g.label}
          </button>
        ))}
      </div>

      <ContentEditor
        group={group}
        values={site[group.id]}
        seed={seeded[group.id]}
        canEdit={allowed('edit')}
        onSave={(sectionId, sectionValues) => updateSiteSection(group.id, sectionId, sectionValues)}
      >
        <span className="ad-cf-count">{group.hint}</span>
      </ContentEditor>
    </div>
  )
}
