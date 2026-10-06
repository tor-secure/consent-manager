// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useEffect, useState } from 'react'

/** The phone layout's breakpoint: below it the model sits above the card. */
export const NARROW_QUERY = '(max-width: 767.98px)'

/** Whether the phone layout is in use, and keeps tracking it across resizes. */
export function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(NARROW_QUERY).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(NARROW_QUERY)
    const onChange = () => setNarrow(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return narrow
}
