'use client'
'use no memo'

import { LawJourney } from './LawJourney'
import { dpdp } from './content/laws/dpdp'

/** The journey through the DPDP pack only, so its page carries no other law's text. */
export function DpdpJourney() {
  return <LawJourney law={dpdp} />
}
