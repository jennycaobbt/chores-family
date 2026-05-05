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
  onPick: (personId: string) => void
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
        {people.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No people yet — add one in Admin first.
          </div>
        )}
      </div>
    </Modal>
  )
}
