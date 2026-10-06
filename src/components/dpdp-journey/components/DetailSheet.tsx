// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { chapters } from '../content/chapters'
import type { Chapter } from '../content/types'
import { stations } from '../content/stations'
import { pauseScroll } from '../hooks/useJourneyScroll'
import { useChoices } from '../state/journey'

const chapterById = new Map(chapters.map((c) => [c.id, c]))

/**
 * The full text behind a station: every chapter it condenses, as written from
 * the source, with definitions, conditions and cautions. A native modal
 * dialog, so focus is contained and Escape closes it; focus returns to the
 * button that opened it, and page scrolling pauses while it is open.
 */
export function DetailSheet() {
  const details = useChoices((s) => s.details)
  const openDetails = useChoices((s) => s.openDetails)
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const [shown, setShown] = useState<string | null>(null)
  const station = stations.find((s) => s.id === (details ?? shown))

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (details) {
      opener.current = document.activeElement as HTMLElement | null
      // eslint-disable-next-line react-hooks/set-state-in-effect -- The sheet keeps the last station shown while it animates out.
      setShown(details)
      if (!d.open) d.showModal()
      pauseScroll(true)
      document.documentElement.classList.add('is-modal')
    }
  }, [details])

  const close = () => openDetails(null)

  const afterExit = () => {
    dialog.current?.close()
    setShown(null)
    pauseScroll(false)
    document.documentElement.classList.remove('is-modal')
    opener.current?.focus({ preventScroll: true })
  }

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-labelledby="sheet-title"
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => {
        // A click on the backdrop (the dialog itself, outside the panel) closes it.
        if (e.target === dialog.current) close()
      }}
    >
      <AnimatePresence onExitComplete={afterExit}>
        {details && station ? (
          <motion.div
            key={station.id}
            className="sheet__panel"
            initial={{ opacity: 0, y: 40, x: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          >
            <header className="sheet__header">
              <p className="sheet__eyebrow">
                <span>{station.number}</span> {station.label} · in detail
              </p>
              <h2 className="sheet__title" id="sheet-title">
                {station.title}
              </h2>
              <button className="sheet__close" type="button" onClick={close} aria-label="Close details" autoFocus>
                <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </header>
            <div className="sheet__body">
              {station.chapters.map((id) => {
                const chapter = chapterById.get(id)
                return chapter ? <ChapterDetail key={id} chapter={chapter} /> : null
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </dialog>
  )
}

function ChapterDetail({ chapter }: { chapter: Chapter }) {
  const definition = (term: string) => chapter.terms?.find((t) => t.term === term)?.definition
  return (
    <section className="detail" aria-labelledby={`detail-${chapter.id}`}>
      <p className="detail__kicker">{chapter.kicker}</p>
      <h3 className="detail__title" id={`detail-${chapter.id}`}>
        {chapter.title}
      </h3>
      <p className="detail__takeaway">{chapter.takeaway}</p>

      {chapter.moments?.length ? (
        <ol className="detail__moments">
          {chapter.moments.map((m) => (
            <li key={m.id}>
              {m.tag ? <span className="detail__tag">{m.tag}</span> : null}
              <h4>{m.term ?? m.title}</h4>
              {m.term && definition(m.term) ? <p className="detail__definition">{definition(m.term)}</p> : null}
              <p>{m.plain}</p>
            </li>
          ))}
        </ol>
      ) : null}

      {chapter.brief.map((p) => (
        <p key={p} className="detail__brief">
          {p}
        </p>
      ))}

      {chapter.depth ? (
        <div className="detail__depth">
          <h4>{chapter.depth.summary}</h4>
          <ul>
            {chapter.depth.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {chapter.caution ? <p className="detail__caution">{chapter.caution}</p> : null}
      <p className="detail__source">Source: ConsentGuru DPDP guide, {chapter.source}</p>
    </section>
  )
}
