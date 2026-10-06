// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

/**
 * Tells the page the stage has gone, after it had been available: the 3D
 * chunk failed to load, or the browser took the WebGL context away. The page
 * responds through CSS (`[data-stage='lost']`): the flat figures appear where
 * the stage was, in place, without collapsing the scroll tracks under the
 * reader's thumb.
 */
export function markStageLost() {
  document.documentElement.dataset.stage = 'lost'
  delete document.documentElement.dataset.stageReady
}
