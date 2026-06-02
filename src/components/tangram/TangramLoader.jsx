import React, { useState, useEffect, useRef } from 'react'
import { FIGURES, lerpPoints } from './tangramConfig'

const TOTAL = 5000
const HOLD = 800
const MORPH = 800
const CYCLE = HOLD + MORPH

const COLORS = [
  '#0F82F2', '#CD0E66', '#FD8C00', '#009EA6',
  '#22AB24', '#EB4726', '#6D3BBF'
]

export default function TangramLoader({ onComplete }) {
  const [points, setPoints] = useState(() =>
    FIGURES[0].pieces.map(p => [...p])
  )
  const startRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    startRef.current = performance.now()

    const tick = () => {
      const elapsed = performance.now() - startRef.current

      if (elapsed >= TOTAL) {
        if (onComplete) onComplete()
        return
      }

      const cyclePos = elapsed % (CYCLE * 3)
      const cycleIdx = Math.floor(cyclePos / CYCLE) % 3
      const phaseTime = cyclePos % CYCLE

      const from = FIGURES[cycleIdx]
      const to = FIGURES[(cycleIdx + 1) % 3]

      let t = 0
      if (phaseTime >= HOLD) {
        t = (phaseTime - HOLD) / MORPH
        t = 1 - Math.pow(1 - t, 3)
      }

      const next = from.pieces.map((fromPts, i) =>
        lerpPoints(fromPts, to.pieces[i], t)
      )

      setPoints(next)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [onComplete])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg, #f6f0e6)',
        zIndex: 99999,
      }}
    >
      <svg
        viewBox="0 0 400 400"
        width="300"
        height="300"
        style={{ display: 'block' }}
      >
        {points.map((pts, i) => (
          <polygon
            key={i}
            points={pts.map(p => p.join(',')).join(' ')}
            fill={COLORS[i]}
          />
        ))}
      </svg>
    </div>
  )
}
