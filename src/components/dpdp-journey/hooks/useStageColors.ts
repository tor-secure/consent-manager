// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useState } from 'react'

/**
 * The design tokens the 3D layer draws with, read from the live CSS custom
 * properties so the stage and the page can never disagree about a colour.
 */
export interface StageColors {
  data: string
  grant: string
  withdraw: string
  purpose: string
  ink: string
  inkSoft: string
  inkMuted: string
  hairline: string
  paper: string
  paperRaised: string
}

const tokens: Record<keyof StageColors, string> = {
  data: '--c-data',
  grant: '--c-grant',
  withdraw: '--c-withdraw',
  purpose: '--c-purpose',
  ink: '--ink',
  inkSoft: '--ink-soft',
  inkMuted: '--ink-muted',
  hairline: '--hairline-strong',
  paper: '--paper',
  paperRaised: '--paper-raised',
}

function read(): StageColors {
  // The tokens are scoped to the explainer's wrapper, not the document root.
  const style = getComputedStyle(document.querySelector('.fyd') ?? document.documentElement)
  const out = {} as StageColors
  for (const key of Object.keys(tokens) as (keyof StageColors)[]) {
    out[key] = style.getPropertyValue(tokens[key]).trim() || '#808080'
  }
  return out
}

export function useStageColors(): StageColors {
  // One light scheme, as on the rest of the site: read once.
  const [colors] = useState(read)
  return colors
}
