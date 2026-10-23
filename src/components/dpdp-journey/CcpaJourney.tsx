'use client'
'use no memo'

import { LawJourney } from './LawJourney'
import { ccpa } from './content/laws/ccpa'

/** The journey through the CCPA pack only, so its page carries no other law's text. */
export function CcpaJourney() {
  return <LawJourney law={ccpa} />
}
