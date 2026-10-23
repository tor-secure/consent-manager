'use client'
'use no memo'

import { useEffect } from 'react'
import { MotionConfig } from 'motion/react'
import { CanvasNotice } from './components/CanvasNotice'
import { DetailSheet } from './components/DetailSheet'
import { StationNav } from './components/StationNav'
import type { Law } from './content/law'
import { defaultsOf } from './content/law'
import { useJourneyScroll } from './hooks/useJourneyScroll'
import { useWebGLSupport } from './hooks/useWebGLSupport'
import { Colophon } from './sections/Colophon'
import { Hero } from './sections/Hero'
import { StationSection } from './sections/StationSection'
import { useChoices } from './state/journey'
import { LawContext } from './state/law'
import { LazyStage } from './three/LazyStage'

/**
 * Follow Your Data: a privacy law in eight stations, with one 3D stage fixed
 * behind the page. The site's navbar sits above it (see the /dpdp-act,
 * /gdpr-guide and /ccpa-guide pages, each mounting its law's entry).
 */
export function LawJourney({ law }: { law: Law }) {
  return (
    <LawContext.Provider value={law}>
      <MotionConfig reducedMotion="user">
        <Journey law={law} />
      </MotionConfig>
    </LawContext.Provider>
  )
}

function Journey({ law }: { law: Law }) {
  const webgl = useWebGLSupport()

  // Start from this law's defaults; leaving, forget the reader's choices so
  // the next law visited starts clean too. Before the scroll driver mounts,
  // which sets the active station.
  useEffect(() => {
    const { begin } = useChoices.getState()
    begin(defaultsOf(law))
    return () => begin(defaultsOf(law))
  }, [law])

  useJourneyScroll()

  // Exposed to CSS so the flat figures stand in exactly when the stage cannot.
  useEffect(() => {
    document.documentElement.dataset.stage = webgl
  }, [webgl])

  // The page's state lives on the root element; leave none of it behind when
  // the visitor navigates elsewhere in the site.
  useEffect(
    () => () => {
      const root = document.documentElement
      delete root.dataset.stage
      delete root.dataset.stageReady
      root.removeAttribute('data-reading')
      root.removeAttribute('data-showcase')
      root.classList.remove('is-modal')
      document.body.style.cursor = ''
    },
    [],
  )

  return (
    <div className="fyd">
      <a className="skip-link" href="#people">
        Skip to the guide
      </a>

      {webgl === 'available' ? <LazyStage /> : null}
      {/* The part of the screen the stage frames its subject in. CSS places it
          per layout; the camera fits each model to it. */}
      <div className="stage-window" aria-hidden="true" />

      <StationNav />

      <main id="story">
        <Hero />
        {webgl === 'unavailable' ? <CanvasNotice /> : null}
        {law.stations.map((station, index) => (
          <StationSection key={station.id} station={station} index={index} />
        ))}
      </main>

      <Colophon />
      <DetailSheet />
    </div>
  )
}
