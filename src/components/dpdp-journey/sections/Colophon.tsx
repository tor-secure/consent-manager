// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

export function Colophon() {
  return (
    <footer className="colophon">
      <div className="colophon__inner">
        <h2 className="colophon__title">About this explainer</h2>
        <p>
          A plain-language walkthrough of India&rsquo;s Digital Personal Data
          Protection Act, 2023, written for people who have never read it. The 3D
          layer illustrates the text beside it; every explanation is also written
          in the page, so nothing is lost without it.
        </p>
        <p className="colophon__legal">
          This is a general explanation, not legal advice, a legal opinion, or a
          compliance certification. Duties, exemptions, timelines, notice format,
          breach intimation, children&rsquo;s-data verification, Consent Manager
          registration and penalties depend on the Act, the Rules, government
          notifications and guidance from the Data Protection Board. Some
          obligations take effect on dates the Central Government notifies. Read
          the official text, and obtain advice from qualified counsel for your own
          processing.
        </p>
      </div>
    </footer>
  )
}
