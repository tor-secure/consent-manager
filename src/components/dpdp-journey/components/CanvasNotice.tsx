// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

/**
 * Shown in place of the 3D layer when WebGL is unavailable. It is a short note,
 * not an error: the written story is complete on its own, so there is nothing to
 * apologise for and nothing to recover.
 */
export function CanvasNotice() {
  return (
    <aside className="canvas-notice">
      <p>
        Interactive 3D is unavailable in this browser, so each chapter describes
        its visual in words instead. The explanation is complete either way.
      </p>
    </aside>
  )
}
