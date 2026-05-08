import { motion } from 'framer-motion'
import { RotateCcw, Sparkles } from 'lucide-react'
import type { Chore, Location, Person } from '../lib/database.types'
import { formatFrequency } from '../lib/dueLogic'
import { locationIcon } from '../lib/style'
import { Avatar } from './Avatar'
import { IconDisplay } from './IconDisplay'

export function ChoreCard({
  chore,
  location,
  defaultPerson,
  onComplete,
  onUncomplete,
  trailing,
  dimmed,
  completeVariant = 'icon',
  highlighted = false,
}: {
  chore: Chore
  location?: Location | null
  defaultPerson?: Person | null
  onComplete?: () => void
  onUncomplete?: () => void
  trailing?: React.ReactNode
  dimmed?: boolean
  completeVariant?: 'icon' | 'pill'
  highlighted?: boolean
}) {
  const canComplete = !!onComplete
  const canUncomplete = !!onUncomplete

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: dimmed ? 0.6 : 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className={`group bg-white/90 backdrop-blur rounded-3xl p-4 flex items-center gap-4 ${
        highlighted
          ? 'border-2 border-violet-300 shadow-[0_8px_30px_rgba(124,58,237,0.15)]'
          : 'border border-white shadow-[0_8px_30px_rgba(124,58,237,0.08)]'
      }`}
    >
      {/* Left action button */}
      {canComplete ? (
        completeVariant === 'pill' ? (
          <button
            onClick={onComplete}
            className="pop shrink-0 h-10 px-4 rounded-full flex items-center font-bold text-sm bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-md shadow-violet-300/50 hover:shadow-lg hover:shadow-violet-300/50 active:shadow-sm transition"
            aria-label="Mark complete"
          >
            Complete
          </button>
        ) : (
          <button
            onClick={onComplete}
            className="pop relative h-14 w-14 rounded-full shrink-0 flex items-center justify-center font-bold transition bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-300/40 hover:shadow-xl active:shadow-md"
            aria-label="Mark complete"
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="3.5">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )
      ) : canUncomplete ? (
        <button
          onClick={onUncomplete}
          className="pop group/undo relative h-14 w-14 rounded-full shrink-0 flex items-center justify-center font-bold transition bg-emerald-50 border-2 border-emerald-200 text-emerald-500 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500"
          aria-label="Undo completion"
          title="Tap to undo"
        >
          {/* Checkmark fades out on hover, undo icon fades in */}
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6 absolute transition-opacity duration-150 group-hover/undo:opacity-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <RotateCcw className="h-5 w-5 absolute opacity-0 transition-opacity duration-150 group-hover/undo:opacity-100" />
        </button>
      ) : (
        <div className="relative h-14 w-14 rounded-full shrink-0 flex items-center justify-center bg-gray-100 text-gray-300">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="3.5">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {chore.icon && (
            <span className="text-xl leading-none shrink-0 inline-flex items-center justify-center h-6 w-6">
              <IconDisplay icon={chore.icon} className="text-xl" />
            </span>
          )}
          <div className="font-bold text-base sm:text-lg text-gray-800 truncate">{chore.name}</div>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 mt-0.5 flex-wrap">
          {location && (
            <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 rounded-full px-2 py-0.5 font-semibold">
              <span aria-hidden>{locationIcon(location)}</span>
              <span className="truncate max-w-[120px]">{location.name}</span>
            </span>
          )}
          <span className="hidden sm:inline">·</span>
          <span className="font-medium">{formatFrequency(chore.frequency_type, chore.frequency_n)}</span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end gap-1">
          <span className="inline-flex items-center gap-0.5 text-amber-600 font-extrabold text-sm">
            <Sparkles className="h-3.5 w-3.5" />
            {chore.points}
          </span>
          {trailing}
        </div>
        <Avatar person={defaultPerson ?? null} size="md" />
      </div>
    </motion.div>
  )
}
