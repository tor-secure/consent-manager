// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useStageColors } from '../hooks/useStageColors'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { markStageLost } from './stageStatus'
import { World } from './World'

/**
 * How much the device can afford, decided once from what it says about
 * itself. Phones get a capped pixel ratio and no post-processing; a desktop
 * with a mouse gets bloom on the glowing data states and can turn models.
 */
function capabilities() {
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const fine = window.matchMedia('(pointer: fine)').matches
  const nav = navigator as Navigator & { deviceMemory?: number }
  const frugal = (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) || navigator.hardwareConcurrency <= 4
  return {
    dpr: (coarse ? [1, frugal ? 1.25 : 1.6] : [1, 2]) as [number, number],
    effects: fine && !frugal,
    drag: fine,
  }
}

/**
 * The one and only canvas, fixed behind the page for its whole lifetime.
 * Every explanation is in the HTML; this is the picture of it.
 */
export function Stage() {
  const reducedMotion = usePrefersReducedMotion()
  const colors = useStageColors()
  const [caps] = useState(capabilities)
  const [visible, setVisible] = useState(!document.hidden)
  const [ready, setReady] = useState(false)
  const [lost, setLost] = useState(false)
  const [effects, setEffects] = useState(caps.effects)

  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  if (lost) return null

  return (
    <div className="stage" aria-hidden="true" data-ready={ready || undefined}>
      <Canvas
        // Colours come from the CSS tokens and must render as those colours.
        flat
        dpr={caps.dpr}
        // Under reduced motion nothing animates on its own, so draw only on change.
        frameloop={!visible ? 'never' : reducedMotion ? 'demand' : 'always'}
        gl={{ antialias: !effects, alpha: false, powerPreference: 'high-performance', stencil: false }}
        camera={{ fov: 34, near: 0.1, far: 220, position: [0, 20, 60] }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault()
            markStageLost()
            setLost(true)
          })
          requestAnimationFrame(() => {
            setReady(true)
            document.documentElement.dataset.stageReady = ''
          })
        }}
      >
        <PerformanceMonitor onDecline={() => setEffects(false)} />
        <AdaptiveDpr pixelated={false} />
        <World colors={colors} reducedMotion={reducedMotion} drag={caps.drag} />
        {effects ? (
          <EffectComposer multisampling={4}>
            <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.05} intensity={0.7} />
            <Vignette offset={0.25} darkness={0.35} />
          </EffectComposer>
        ) : null}
      </Canvas>
    </div>
  )
}
