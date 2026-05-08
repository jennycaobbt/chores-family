import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

const COLORS = ['#7c3aed', '#6366f1', '#f59e0b', '#10b981', '#ec4899', '#f97316', '#3b82f6']

interface Particle {
  id: number
  x: number
  y: number
  rotate: number
  color: string
  w: number
  h: number
  delay: number
}

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
    const dist = 80 + Math.random() * 220
    return {
      id: i,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      rotate: Math.random() * 720 - 360,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      w: 6 + Math.random() * 9,
      h: 6 + Math.random() * 9,
      delay: Math.random() * 0.08,
    }
  })
}

interface Props {
  active: boolean
  onDone: () => void
}

export function ConfettiBurst({ active, onDone }: Props) {
  const [particles, setParticles] = useState<Particle[]>([])
  // Keep a stable ref so the timeout doesn't get cancelled by re-renders
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  // Generate a fresh random burst every time it becomes active
  useEffect(() => {
    if (active) {
      setParticles(makeParticles(28))
      const t = setTimeout(() => onDoneRef.current(), 1100)
      return () => clearTimeout(t)
    }
  }, [active]) // intentionally omit onDone — we use the ref instead

  return (
    <AnimatePresence>
      {active && (
        <div className="fixed inset-0 pointer-events-none z-[200] flex items-center justify-center overflow-hidden">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
              animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.4, rotate: p.rotate }}
              transition={{ duration: 0.85, delay: p.delay, ease: [0.15, 0.85, 0.35, 1] }}
              style={{
                position: 'absolute',
                width: p.w,
                height: p.h,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                backgroundColor: p.color,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}
