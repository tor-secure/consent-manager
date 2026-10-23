'use client'
'use no memo'

import { LawJourney } from './LawJourney'
import { gdpr } from './content/laws/gdpr'

/** The journey through the GDPR pack only, so its page carries no other law's text. */
export function GdprJourney() {
  return <LawJourney law={gdpr} />
}
