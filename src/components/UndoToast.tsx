import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw, X } from 'lucide-react'

interface UndoToastProps {
  choreName: string
  onUndo: () => void
  onDismiss: () => void
}

const DURATION = 5000

export function UndoToast({ choreName, onUndo, onDismiss }: UndoToastProps) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const start = Date.now()
    const id = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.max(0, 100 - (elapsed / DURATION) * 100)
      setProgress(pct)
      if (pct === 0) {
        clearInterval(id)
        onDismiss()
      }
    }, 50)
    return () => clearInterval(id)
  }, [onDismiss])

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[min(380px,calc(100vw-2rem))]"
    >
      <div className="bg-gray-900/95 backdrop-blur text-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="text-emerald-400 font-bold text-lg">✓</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate">{choreName}</div>
            <div className="text-xs text-gray-400">Marked as done</div>
          </div>
          <button
            onClick={onUndo}
            className="pop flex items-center gap-1.5 bg-white/15 hover:bg-white/25 rounded-full px-3 py-1.5 text-sm font-bold transition shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Undo
          </button>
          <button
            onClick={onDismiss}
            className="p-1 text-gray-400 hover:text-white transition shrink-0"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-emerald-400 transition-[width] duration-[50ms] ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </motion.div>
  )
}
