// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { Component, Suspense, lazy, type ReactNode } from 'react'
import { markStageLost } from './stageStatus'

/**
 * Three.js is the heaviest thing on the page and none of the written
 * explanation depends on it, so it is split into its own chunk and requested
 * only after the document has painted.
 */
const Stage = lazy(() => import('./Stage').then((m) => ({ default: m.Stage })))

/** If the chunk fails to load or the stage throws, the flat figures take over. */
class StageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    markStageLost()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

export function LazyStage() {
  return (
    <StageBoundary>
      <Suspense fallback={null}>
        <Stage />
      </Suspense>
    </StageBoundary>
  )
}
