// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import Link from 'next/link'
import { LAW_GUIDE_COOKIE, LAW_GUIDES, type LawGuideId } from '@/lib/regulations/journey-route'
import { useLaw } from '../state/law'

const ORDER: LawGuideId[] = ['dpdp', 'gdpr', 'ccpa']

/** Remember the reader's pick, so /privacy-law sends them here next time. */
function remember(id: LawGuideId) {
  document.cookie = `${LAW_GUIDE_COOKIE}=${id}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}

/**
 * The same journey under each law. The visitor may have been sent here by
 * their location, which can be wrong, so the other laws are one tap away.
 */
export function LawSwitch() {
  const { id: current } = useLaw()
  return (
    <nav className="law-switch" aria-label="Choose a privacy law">
      <span className="law-switch__label">Law</span>
      <ul className="law-switch__list">
        {ORDER.map((id) => {
          const guide = LAW_GUIDES[id]
          const active = id === current
          return (
            <li key={id}>
              <Link
                className="law-switch__item"
                href={guide.path}
                aria-current={active ? 'page' : undefined}
                onClick={() => remember(id)}
              >
                {guide.short}
                <span className="law-switch__where">{guide.where}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
