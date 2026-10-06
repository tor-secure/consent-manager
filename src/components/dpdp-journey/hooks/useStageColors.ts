// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useEffect, useState } from 'react'

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

/** The tokens, or null while the explainer's stylesheet is not applied yet. */
function read(): StageColors | null {
  // The tokens are scoped to the explainer's wrapper, not the document root.
  const wrapper = document.querySelector('.fyd')
  if (!wrapper) return null
  const style = getComputedStyle(wrapper)
  const out = {} as StageColors
  for (const key of Object.keys(tokens) as (keyof StageColors)[]) {
    const value = style.getPropertyValue(tokens[key]).trim()
    if (!value) return null
    out[key] = value
  }
  return out
}

/**
 * One light scheme, as on the rest of the site: read once, but only once the
 * tokens exist. On a client-side return to the page the 3D chunk is already
 * cached, so the stage can mount before Next has re-applied the route's CSS;
 * reading then would bake grey fallbacks into every material.
 */
export function useStageColors(): StageColors | null {
  const [colors, setColors] = useState(read)

  useEffect(() => {
    if (colors) return
    let raf = 0
    const poll = () => {
      const next = read()
      if (next) setColors(next)
      else raf = requestAnimationFrame(poll)
    }
    raf = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(raf)
  }, [colors])

  return colors
}
