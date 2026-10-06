// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { useEffect } from 'react'
import Lenis from 'lenis'
import { endShowcase, journey, useChoices, wakeJourney } from '../state/journey'
import { clamp01 } from '../utils/math'

/**
 * When the camera travels between two stations, as a share of the scroll from
 * one station's top to the next. Before `HOLD` the station holds still for
 * reading; by `ARRIVE` the next one is framed.
 */
const HOLD = 0.32
const ARRIVE = 0.9

let lenis: Lenis | null = null

/** Scrolls to a station (or −1 for the top), smoothly unless motion is reduced. */
export function scrollToStation(index: number) {
  const target = index < 0 ? document.getElementById('top') : document.querySelectorAll<HTMLElement>('[data-station]')[index]
  if (!target) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (lenis && !reduced) lenis.scrollTo(target, { duration: 1.4 })
  else target.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' })
}

/** While a modal is open the page behind it holds still. */
export function pauseScroll(paused: boolean) {
  if (paused) lenis?.stop()
  else lenis?.start()
}

/**
 * Native scrolling → the stage's position. Section tops are measured only
 * when layout changes; each scroll event does a short search and a few
 * arithmetic operations, and React hears only when the active station changes.
 *
 * On a desktop with a mouse, Lenis smooths the wheel. It moves the real
 * document scroll, so keyboard, scrollbar, find-in-page and anchors still
 * work; it is off for touch and for reduced motion.
 */
export function useJourneyScroll() {
  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (finePointer && !reduced) {
      lenis = new Lenis({ autoRaf: true, lerp: 0.11, wheelMultiplier: 0.9 })
    }

    const meter = document.querySelector<HTMLElement>('[data-progress]')
    const frame = document.querySelector<HTMLElement>('.stage-window')
    const heroFrame = document.querySelector<HTMLElement>('.hero__visual')
    const heroWords = document.querySelector<HTMLElement>('.hero__inner')
    let anchors: number[] = []
    /** Where each station's card starts, in document pixels. */
    let cardTops: number[] = []
    const phone = window.matchMedia('(max-width: 767.98px)')
    const root = document.documentElement
    let raf = 0

    const measure = () => {
      const hero = document.getElementById('top')
      const sections = document.querySelectorAll<HTMLElement>('[data-station]')
      anchors = [hero, ...Array.from(sections)].map((el) => (el ? el.getBoundingClientRect().top + window.scrollY : 0))
      cardTops = Array.from(sections, (el, i) => anchors[i + 1] + parseFloat(getComputedStyle(el).paddingTop))
      if (frame) {
        const r = frame.getBoundingClientRect()
        journey.window = { x: r.left, y: r.top, width: Math.max(1, r.width), height: Math.max(1, r.height) }
      }
      const h = heroFrame?.getBoundingClientRect()
      journey.hero = h && h.width > 1 && h.height > 1
        ? { x: h.left, y: h.top + window.scrollY, width: h.width, height: h.height }
        : { x: 0, y: 0, width: 0, height: 0 }
      journey.viewport = { width: window.innerWidth, height: window.innerHeight }
      update()
    }

    const update = () => {
      raf = 0
      const y = window.scrollY
      journey.scrollY = y
      let k = 0
      while (k < anchors.length - 1 && y >= anchors[k + 1]) k++
      let position = k - 1
      if (k < anchors.length - 1) {
        const f = (y - anchors[k]) / Math.max(1, anchors[k + 1] - anchors[k])
        const t = clamp01((f - HOLD) / (ARRIVE - HOLD))
        position += t * t * (3 - 2 * t)
      }
      journey.position = position
      const active = Math.round(position)

      // On a phone the title is full width: it steps aside as it rises,
      // before station 01 assembles beside where it was (only when there is
      // a stage to give way to).
      if (heroWords && anchors.length > 1) {
        const stageOn = document.documentElement.dataset.stage === 'available'
        const heroH = anchors[1] - anchors[0]
        const fade = stageOn ? clamp01((y - anchors[0] - heroH * 0.03) / (heroH * 0.2)) : 0
        heroWords.style.opacity = fade > 0 ? String(1 - fade) : ''
      }

      // On a phone the card is see-through and scrolls up over its model.
      // While its words are over the model, the model's labels step back so
      // the two do not tangle; the model itself stays in view.
      const reading = phone.matches && active >= 0 && cardTops[active] - y < journey.window.y + journey.window.height - 24
      if (reading !== root.hasAttribute('data-reading')) root.toggleAttribute('data-reading', reading)

      const total = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      journey.progress = clamp01(y / total)
      if (meter) meter.style.transform = `scaleX(${journey.progress})`

      if (active !== useChoices.getState().active) useChoices.getState().setActive(active)
      wakeJourney()
    }

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      journey.pointerX = (event.clientX / window.innerWidth) * 2 - 1
      journey.pointerY = 1 - (event.clientY / window.innerHeight) * 2
      wakeJourney()
    }

    // A showcase is mirrored on the root for the CSS, and gives way at once
    // to a tap anywhere or a real scroll.
    let showcaseFrom = 0
    const unsubscribe = useChoices.subscribe((state, prev) => {
      if (state.showcase === prev.showcase) return
      root.toggleAttribute('data-showcase', state.showcase)
      showcaseFrom = window.scrollY
    })
    const onShowcaseTap = () => endShowcase()
    const onShowcaseScroll = () => {
      if (Math.abs(window.scrollY - showcaseFrom) > 40) endShowcase()
    }

    const observer = new ResizeObserver(measure)
    observer.observe(document.body)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', measure)
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('pointerdown', onShowcaseTap, { passive: true })
    window.addEventListener('scroll', onShowcaseScroll, { passive: true })
    measure()

    return () => {
      if (raf) cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', measure)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerdown', onShowcaseTap)
      window.removeEventListener('scroll', onShowcaseScroll)
      unsubscribe()
      endShowcase()
      lenis?.destroy()
      lenis = null
    }
  }, [])
}
