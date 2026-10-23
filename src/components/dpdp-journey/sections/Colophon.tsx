// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useLaw } from '../state/law'

export function Colophon() {
  const { colophon } = useLaw()
  return (
    <footer className="colophon">
      <div className="colophon__inner">
        <h2 className="colophon__title">About this explainer</h2>
        <p>{colophon.about}</p>
        <p className="colophon__legal">{colophon.legal}</p>
      </div>
    </footer>
  )
}
