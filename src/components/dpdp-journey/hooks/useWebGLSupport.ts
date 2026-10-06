// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useEffect, useState } from 'react'

export type WebGLSupport = 'probing' | 'available' | 'unavailable'

let cached: WebGLSupport | null = null

function probe(): WebGLSupport {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl')
    if (!gl) return 'unavailable'
    // Release the probe context immediately so it does not count against the
    // browser's small per-page context budget.
    const lose = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')
    lose?.loseContext()
    return 'available'
  } catch {
    return 'unavailable'
  }
}

/**
 * Detects WebGL once per session. Returns 'probing' on the first paint so the
 * document renders its semantic content before any GL work is attempted.
 */
export function useWebGLSupport(): WebGLSupport {
  const [support, setSupport] = useState<WebGLSupport>(cached ?? 'probing')

  useEffect(() => {
    if (cached) return
    cached = probe()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- The probe needs the DOM, so it runs after the first paint.
    setSupport(cached)
  }, [])

  return support
}
