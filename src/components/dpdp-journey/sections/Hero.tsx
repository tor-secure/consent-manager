// Written for plain React: the React Compiler is off for the explainer, whose
// 3D code mutates per-frame state in place, as React Three Fiber intends.
'use no memo'

import { motion } from 'motion/react'
import { Arrow } from '../components/Arrow'
import { PrologueFigure } from '../components/PrologueFigure'
import { stations } from '../content/stations'
import { scrollToStation } from '../hooks/useJourneyScroll'

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.15 + i * 0.09, duration: 0.7, ease: [0.22, 0.61, 0.36, 1] as const } }),
}

/**
 * The title screen. `.hero__visual` is the space left for the picture (above
 * the words on a phone, beside them on a desktop): the stage frames your data
 * there, alone and large, before the reader sets off down the route.
 */
export function Hero() {
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero__visual" aria-hidden="true" />
      <div className="hero__inner">
        <PrologueFigure highlight="all" />
        <motion.p className="hero__eyebrow" initial="hidden" animate="show" custom={0} variants={rise}>
          <span>Digital Personal Data Protection Act</span>
          <span className="hero__year">2023</span>
        </motion.p>
        <motion.h1 className="hero__title" id="hero-title" initial="hidden" animate="show" custom={1} variants={rise}>
          Follow <span className="hero__title-em">your&nbsp;data</span>
        </motion.h1>
        <motion.p className="hero__lead" initial="hidden" animate="show" custom={2} variants={rise}>
          India&rsquo;s data protection law in eight stops. Follow one piece of
          personal data, try each idea on the model, and open the details when
          you want the full text.
        </motion.p>
        <motion.div className="hero__actions" initial="hidden" animate="show" custom={3} variants={rise}>
          <button className="button button--primary" type="button" onClick={() => scrollToStation(0)}>
            Start the journey <Arrow />
          </button>
          <span className="hero__meta">{stations.length} stations · about 5 minutes</span>
        </motion.div>
        <p className="hero__disclaimer">An explainer, not legal advice.</p>
      </div>
    </section>
  )
}
