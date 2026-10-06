// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Color, Fog } from 'three'
import type { StageColors } from '../hooks/useStageColors'
import { onJourneyChange } from '../state/journey'
import { ColorsContext } from './kit'
import { Rig } from './Rig'
import { DataToken, Thread } from './Thread'
import { Consent } from './stations/Consent'
import { People } from './stations/People'
import { Purposes } from './stations/Purposes'
import { Reason } from './stations/Reason'
import { Rights } from './stations/Rights'
import { StationGroup } from './stations/StationGroup'
import { Stricter } from './stations/Stricter'
import { System } from './stations/System'
import { Withdrawal } from './stations/Withdrawal'

const MODELS = [People, Reason, Consent, Purposes, Withdrawal, Rights, Stricter, System]

/**
 * The whole world: eight station models on their helix, the thread through
 * them, and your data travelling it. The rig is mounted first so its frame
 * callback (which sets the shared position) runs before anything reads it.
 */
export function World({ colors, reducedMotion, drag }: { colors: StageColors; reducedMotion: boolean; drag: boolean }) {
  const scene = useThree((s) => s.scene)
  const invalidate = useThree((s) => s.invalidate)

  // The stage is paper: distant stations fade into the page colour.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- The scene is three.js state, not React state.
    scene.background = new Color(colors.paper)
    scene.fog = new Fog(colors.paper, 20, 40)
    invalidate()
  }, [scene, colors.paper, invalidate])

  useEffect(() => onJourneyChange(invalidate), [invalidate])

  return (
    <ColorsContext.Provider value={colors}>
      <Rig reducedMotion={reducedMotion} />

      <hemisphereLight args={['#ffffff', '#8a94a3', 0.9]} />
      <directionalLight position={[6, 10, 8]} intensity={1.4} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 6, 6]} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-8, 2, -2]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer form="ring" intensity={1.6} color={colors.data} position={[8, -2, 4]} scale={3} />
      </Environment>

      <Thread />
      {MODELS.map((Model, index) => (
        <StationGroup key={index} index={index} drag={drag}>
          <Model />
        </StationGroup>
      ))}
      <DataToken />
    </ColorsContext.Provider>
  )
}
