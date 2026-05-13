import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

const COLORS = ['#7c3aed', '#c026d3', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f97316']

interface Particle {
  id: number
  x: number
  y: number
  rotate: number
  color: string
  w: number
  h: number
  delay: number
  /** Fixed at particle-creation time so the shape doesn't change on re-render */
  round: boolean
}

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    // Spread evenly around the circle with a small random jitter per particle
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.9
    const dist = 80 + Math.random() * 230

    const round = Math.random() > 0.45
    const base = 6 + Math.random() * 8

    return {
      id: i,
      // Add a downward gravity drift so pieces "fall" realistically
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist + Math.random() * 90,
      rotate: Math.random() * 720 - 360,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      w: round ? base : base * 1.9,
      h: round ? base : base * 0.5,
      delay: Math.random() * 0.09,
      round,
    }
  })
}

interface Props {
  /** Whether the burst is currently playing */
  active: boolean
  /** Called after the animation finishes so the parent can reset `active` */
  onDone: () => void
}

/**
 * Full-viewport confetti burst.  Renders a fixed overlay of coloured particles
 * that scatter outward from the centre of the screen and fade out.
 *
 * Usage:
 *   const [burst, setBurst] = useState(false)
 *   <ConfettiBurst active={burst} onDone={() => setBurst(false)} />
 */
export function ConfettiBurst({ active, onDone }: Props) {
  const [particles, setParticles] = useState<Particle[]>([])
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    if (!active) return
    setParticles(makeParticles(40))
    const t = setTimeout(() => onDoneRef.current(), 1200)
    return () => clearTimeout(t)
  }, [active])

  return (
    // pointer-events-none so the animation never blocks taps underneath.
    // z-[200] sits above the modal (z-50) and nav (z-30).
    <AnimatePresence>
      {active && (
        <div className="fixed inset-0 pointer-events-none z-[200] flex items-center justify-center overflow-hidden">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
              animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3, rotate: p.rotate }}
              transition={{ duration: 0.9, delay: p.delay, ease: [0.15, 0.85, 0.35, 1] }}
              style={{
                position: 'absolute',
                width: p.w,
                height: p.h,
                borderRadius: p.round ? '50%' : 3,
                backgroundColor: p.color,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}
