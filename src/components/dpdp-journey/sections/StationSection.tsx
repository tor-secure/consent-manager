// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { Arrow } from '../components/Arrow'
import { AssemblyFigure } from '../components/AssemblyFigure'
import { ChildrenFigure } from '../components/ChildrenFigure'
import { ConsentFigure } from '../components/ConsentFigure'
import { GroundsFigure } from '../components/GroundsFigure'
import { RightsFigure } from '../components/RightsFigure'
import { RolesFigure } from '../components/RolesFigure'
import { SplitFigure } from '../components/SplitFigure'
import { StationControl } from '../components/StationControl'
import { WithdrawalFigure } from '../components/WithdrawalFigure'
import { stations, type Station, type StationId } from '../content/stations'
import { scrollToStation } from '../hooks/useJourneyScroll'
import { useChoices } from '../state/journey'

/** Flat stand-ins, shown only when the stage cannot exist. */
const figures: Record<StationId, ReactNode> = {
  people: <RolesFigure highlight="all" />,
  reason: <GroundsFigure step="all" />,
  consent: <ConsentFigure step="all" />,
  purposes: <SplitFigure step="all" />,
  withdrawal: <WithdrawalFigure step="all" />,
  rights: <RightsFigure step="all" />,
  stricter: <ChildrenFigure step="all" />,
  system: <AssemblyFigure step="all" />,
}

const ease = [0.22, 0.61, 0.36, 1] as const

/**
 * One station: a short card beside its model. The card is the explanation;
 * the model is its picture, and the control drives both.
 */
export function StationSection({ station, index }: { station: Station; index: number }) {
  const openDetails = useChoices((s) => s.openDetails)
  const last = index === stations.length - 1
  const titleId = `${station.id}-title`

  return (
    <section className="station" id={station.id} data-station={station.id} aria-labelledby={titleId}>
      <motion.article
        className="card"
        initial={{ opacity: 0, y: 48 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ amount: 0.25, margin: '0px 0px -10% 0px' }}
        transition={{ duration: 0.7, ease }}
      >
        <div className="card__figure">{figures[station.id]}</div>
        <p className="card__eyebrow">
          <span className="card__number">{station.number}</span>
          <span className="card__of">/ 0{stations.length}</span>
          <span className="card__label">{station.label}</span>
        </p>
        <h2 className="card__title" id={titleId}>
          {station.title}
        </h2>
        <p className="card__takeaway">{station.takeaway}</p>
        <ul className="card__points">
          {station.points.map((point, i) => (
            <motion.li
              key={point.title}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ amount: 0.6 }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.5, ease }}
            >
              <strong>{point.title}.</strong> {point.body}
            </motion.li>
          ))}
        </ul>

        <StationControl station={station} />

        <div className="card__actions">
          <button className="button button--primary" type="button" aria-haspopup="dialog" onClick={() => openDetails(station.id)}>
            Read the details <Arrow diagonal />
          </button>
          {last ? (
            <button className="button button--quiet" type="button" onClick={() => scrollToStation(-1)}>
              Back to the start <Arrow back />
            </button>
          ) : (
            <button className="button button--quiet" type="button" onClick={() => scrollToStation(index + 1)}>
              Next: {stations[index + 1].label} <Arrow />
            </button>
          )}
        </div>
      </motion.article>
    </section>
  )
}
