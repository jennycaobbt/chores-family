import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { Chore, Person } from '../lib/database.types'
import { Avatar } from './Avatar'
import { Modal } from './Modal'

export function WhoDidItModal({
  chore,
  people,
  onPick,
  onClose,
}: {
  chore: Chore | null
  people: Person[]
  onPick: (personId: string | null) => void
  onClose: () => void
}) {
  const [picked, setPicked] = useState<string | null>(null)
  const open = !!chore

  return (
    <Modal
      open={open}
      onClose={() => {
        setPicked(null)
        onClose()
      }}
      title={
        <div className="flex flex-col">
          <span className="text-xs text-violet-500 font-bold uppercase tracking-wider">Who did it?</span>
          <span>{chore?.name}</span>
        </div>
      }
    >
      <div className="space-y-2">
        {people.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setPicked(p.id)
              onPick(p.id)
            }}
            disabled={picked !== null}
            className={`pop w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition ${
              picked === p.id
                ? 'border-emerald-400 bg-emerald-50 burst'
                : 'border-transparent bg-violet-50/60 hover:bg-violet-100 active:bg-violet-200'
            }`}
          >
            <Avatar person={p} size="lg" />
            <div className="text-left flex-1">
              <div className="font-bold text-lg text-gray-800">{p.name}</div>
              <div className="text-sm text-gray-500">Tap to give them the points</div>
            </div>
            {picked === p.id ? (
              <div className="text-emerald-500 font-extrabold text-2xl">✓</div>
            ) : (
              <div className="inline-flex items-center gap-1 text-amber-500 font-extrabold">
                <Sparkles className="h-4 w-4" />
                +{chore?.points ?? 0}
              </div>
            )}
          </button>
        ))}

        {/* Divider */}
        {people.length > 0 && (
          <div className="flex items-center gap-2 py-1">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-semibold">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
        )}

        {/* Other option */}
        <button
          onClick={() => {
            setPicked('__other__')
            onPick(null)
          }}
          disabled={picked !== null}
          className={`pop w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition ${
            picked === '__other__'
              ? 'border-gray-300 bg-gray-50'
              : 'border-transparent bg-gray-50 hover:bg-gray-100 active:bg-gray-200'
          }`}
        >
          <div className="h-12 w-12 rounded-full bg-gray-200 shrink-0 flex items-center justify-center text-gray-400">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-left flex-1">
            <div className="font-bold text-lg text-gray-700">Other</div>
            <div className="text-sm text-gray-400">No points awarded</div>
          </div>
          {picked === '__other__' ? (
            <div className="text-gray-500 font-extrabold text-2xl">✓</div>
          ) : (
            <div className="text-gray-400 font-semibold text-sm">0 pts</div>
          )}
        </button>

        {people.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            No people yet — add one in Admin first.
          </div>
        )}
      </div>
    </Modal>
  )
}
