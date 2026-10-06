// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { motion } from 'motion/react'
import { stations } from '../content/stations'
import { scrollToStation } from '../hooks/useJourneyScroll'
import { useChoices } from '../state/journey'

/**
 * The route at a glance, on the right edge from tablet up: one mark per
 * station, the current one filled. Each is a link to its station.
 */
export function StationNav() {
  const active = useChoices((s) => s.active)
  return (
    <nav className="route" aria-label="Stations">
      <ol>
        {stations.map((station, index) => (
          <li key={station.id}>
            <a
              href={`#${station.id}`}
              aria-current={active === index ? 'step' : undefined}
              onClick={(e) => {
                e.preventDefault()
                scrollToStation(index)
                history.replaceState(null, '', `#${station.id}`)
              }}
            >
              <span className="route__label">{station.label}</span>
              <span className="route__dot" aria-hidden="true">
                {active === index ? <motion.span className="route__fill" layoutId="route-fill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} /> : null}
              </span>
              <span className="visually-hidden">{`Station ${station.number}`}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
