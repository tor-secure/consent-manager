// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import type { CSSProperties } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Station } from '../content/stations'
import { startShowcase, useChoices } from '../state/journey'

/**
 * The station's one interactive idea, as real buttons. Clicking the matching
 * part of the model makes the same choice: both write the same state, so the
 * text below always says what the stage shows.
 *
 * Nothing about a button says it moves a 3D model, so the control says so:
 * a live tag by its prompt, and a light running round each option's outline
 * until the reader has made a choice here (on a button or on the model).
 * On a phone a choice also brings the model forward to play it out.
 */
export function StationControl({ station }: { station: Station }) {
  const { control } = station
  const selected = useChoices((s) => s.selection[station.id])
  const purposes = useChoices((s) => s.purposes)
  const pick = useChoices((s) => s.choose)
  const choose = (station: Station['id'], option: string) => {
    pick(station, option)
    startShowcase()
  }
  const untried = useChoices((s) => s.pulse[station.id] === 0)
  const promptId = `${station.id}-prompt`
  const prompt = (
    <p className="control__prompt" id={promptId}>
      <span>{control.prompt}</span>
      <span className="control__live" aria-hidden="true">
        <span className="control__dot" />
        moves the model
      </span>
    </p>
  )
  const order = (i: number) => ({ '--i': i }) as CSSProperties

  if (control.kind === 'toggle') {
    const declined = control.options.filter((o) => !purposes[o.id]).map((o) => o.label.toLowerCase())
    return (
      <div className="control" data-untried={untried || undefined}>
        {prompt}
        <div className="switches" role="group" aria-labelledby={promptId}>
          {control.options.map((option, i) => {
            const locked = control.locked?.find((l) => l.id === option.id)
            const on = Boolean(purposes[option.id])
            return (
              <button
                key={option.id}
                className="switch"
                style={order(i)}
                type="button"
                role="switch"
                aria-checked={on}
                aria-disabled={locked ? true : undefined}
                title={locked?.reason}
                data-on={on || undefined}
                onClick={() => (locked ? undefined : choose(station.id, option.id))}
              >
                <span className="switch__track" aria-hidden="true">
                  <motion.span className="switch__thumb" layout transition={{ type: 'spring', stiffness: 600, damping: 32 }} />
                </span>
                {option.label}
                {locked ? <span className="switch__note">always on</span> : null}
              </button>
            )
          })}
        </div>
        <p className="control__result" role="status" data-tone={declined.length ? 'neutral' : 'grant'}>
          {declined.length
            ? `Declined: ${declined.join(' and ')}. Its stream stays open but stops before its vendor, which stays dark. Declining is a supported answer.`
            : 'Everything allowed: each stream reaches its vendor. Switch one off to decline just that purpose.'}
        </p>
      </div>
    )
  }

  const current = control.options.find((o) => o.id === selected)
  return (
    <div className="control" data-untried={untried || undefined}>
      {prompt}
      <div className="chips" role="group" aria-labelledby={promptId} data-count={control.options.length}>
        {control.options.map((option, i) => {
          const on = option.id === selected
          return (
            <button
              key={option.id}
              className="chip"
              style={order(i)}
              type="button"
              aria-pressed={on}
              data-tone={option.tone}
              onClick={() => choose(station.id, option.id)}
            >
              {on ? <motion.span className="chip__fill" layoutId={`${station.id}-chip`} transition={{ type: 'spring', stiffness: 500, damping: 38 }} /> : null}
              <span className="chip__label">{option.label}</span>
            </button>
          )
        })}
      </div>
      <div className="control__result-wrap" role="status">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={current?.id ?? 'none'}
            className="control__result"
            data-tone={current?.tone ?? 'neutral'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
          >
            {current ? current.result : 'Pick one to send it down the thread and watch where it stops.'}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}
