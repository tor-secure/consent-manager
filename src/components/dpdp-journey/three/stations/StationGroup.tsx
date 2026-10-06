// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { PresentationControls } from '@react-three/drei'
import type { Group } from 'three'
import { useNarrow } from '../../hooks/useNarrow'
import { useChoices } from '../../state/journey'
import { damp } from '../../utils/math'
import { Plate, StationContext } from '../kit'
import { placements, viewOf } from '../layout'
import { stage } from '../presence'

const PLATE = 5

/**
 * Places a station on the helix, gives its parts their station, and stands it
 * on its plate. With a mouse, the active station can be turned by dragging;
 * it springs back when let go, so the framing is never lost.
 *
 * On a phone the stage is only the screen's width, so the plate sits under
 * whatever the camera frames and is no wider than that, rather than running
 * off the screen's edges.
 */
export function StationGroup({ index, children, drag }: { index: number; children: ReactNode; drag: boolean }) {
  const p = placements[index]
  const active = useChoices((s) => s.active === index)
  const narrow = useNarrow()
  const plate = useRef<Group>(null)
  useFrame((_, dt) => {
    const g = plate.current
    if (!g) return
    const view = viewOf(p, useChoices.getState().selection, narrow)
    const x = narrow ? view.center[0] : 0
    const scale = narrow ? Math.min(1, (view.radius * 1.9) / PLATE) : 1
    g.position.x = stage.still ? x : damp(g.position.x, x, 6, dt)
    g.scale.setScalar(stage.still ? scale : damp(g.scale.x, scale, 6, dt))
  })
  return (
    <StationContext.Provider value={{ index, id: p.id }}>
      <group position={p.position} rotation={[0, p.angle, 0]}>
        <PresentationControls
          enabled={drag && active}
          global={false}
          cursor={drag && active}
          snap
          speed={1.4}
          polar={[-0.12, 0.2]}
          azimuth={[-0.55, 0.55]}
        >
          <group ref={plate}>
            <Plate y={p.floor} size={PLATE} />
          </group>
          {children}
        </PresentationControls>
      </group>
    </StationContext.Provider>
  )
}
