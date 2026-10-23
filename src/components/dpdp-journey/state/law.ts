// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { createContext, useContext } from 'react'
import { defaultsOf, type Law } from '../content/law'
import type { StationId } from '../content/stations'
import { useChoices } from './journey'

/**
 * The law being explained. Provided around the page and again inside the
 * canvas (see `Stage`), so the models read the same words as the cards.
 */
export const LawContext = createContext<Law | null>(null)

export function useLaw() {
  const law = useContext(LawContext)
  if (!law) throw new Error('The journey has no law to explain')
  return law
}

/**
 * The store holds only what the reader has picked, so the server and the
 * first client render agree; anything not yet picked is the law's default.
 */
export function useSelected(id: StationId): string | null {
  const law = useLaw()
  const picked = useChoices((s) => s.selection[id])
  return picked === undefined ? defaultsOf(law).selection[id] : picked
}

export function usePurpose(id: string): boolean {
  const law = useLaw()
  const picked = useChoices((s) => s.purposes[id])
  return picked ?? defaultsOf(law).purposes[id] ?? false
}

export function usePurposes(): Record<string, boolean> {
  const law = useLaw()
  const picked = useChoices((s) => s.purposes)
  return { ...defaultsOf(law).purposes, ...picked }
}
