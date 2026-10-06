// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

/** A small arrow for buttons and links: forward, back, or up-right (opens something). */
export function Arrow({ back, diagonal }: { back?: boolean; diagonal?: boolean }) {
  const rotate = diagonal ? -45 : back ? 180 : 0
  return (
    <svg className="arrow" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false" style={{ transform: `rotate(${rotate}deg)` }}>
      <path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
