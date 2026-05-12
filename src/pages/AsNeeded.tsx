import { useMemo, useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Zap } from 'lucide-react'
import { ChoreCard } from '../components/ChoreCard'
import { WhoDidItModal } from '../components/WhoDidItModal'
import { UndoToast } from '../components/UndoToast'
import {
  useChores,
  useCompleteChore,
  useUndoCompletion,
  useLocations,
  usePeople,
} from '../lib/queries'
import type { Chore } from '../lib/database.types'

interface UndoState {
  completionId: string
  choreName: string
}

export function AsNeeded() {
  const { data: people = [] } = usePeople()
  const { data: locations = [] } = useLocations()
  const { data: chores = [] } = useChores()
  const completeMut = useCompleteChore()
  const undoMut = useUndoCompletion()

  const [picking, setPicking] = useState<Chore | null>(null)
  const [undoState, setUndoState] = useState<UndoState | null>(null)

  const peopleById = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people])
  const locationsById = useMemo(
    () => Object.fromEntries(locations.map((l) => [l.id, l])),
    [locations],
  )

  const asNeededChores = useMemo(
    () =>
      chores
        .filter((c) => c.frequency_type === 'as_needed')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [chores],
  )

  const handleUndo = useCallback(() => {
    if (!undoState) return
    undoMut.mutate(undoState.completionId)
    setUndoState(null)
  }, [undoState, undoMut])

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-8">
      <div className="mb-5">
        <h2 className="text-3xl font-extrabold text-gray-800">As-Needed Chores</h2>
        <p className="text-sm text-gray-500 mt-1">
          No schedule — do these whenever they need doing. Anyone can complete them any number of times.
        </p>
      </div>

      {asNeededChores.length === 0 ? (
        <div className="bg-white/80 backdrop-blur rounded-3xl p-10 text-center border border-white shadow-lg">
          <Zap className="h-12 w-12 mx-auto text-amber-400 mb-3" />
          <div className="font-extrabold text-xl text-gray-800">No as-needed chores yet</div>
          <div className="text-gray-500 mt-1">
            Add chores with the "As needed" frequency in Admin.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {asNeededChores.map((c) => (
              <ChoreCard
                key={c.id}
                chore={c}
                location={c.location_id ? locationsById[c.location_id] : null}
                defaultPerson={c.default_person_id ? peopleById[c.default_person_id] : null}
                onComplete={() => setPicking(c)}
                completeVariant="pill"
                highlighted
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <WhoDidItModal
        chore={picking}
        people={people}
        onPick={(personId) => {
          if (!picking) return
          const { id: choreId, points, name: choreName } = picking
          completeMut.mutate(
            { choreId, personId, points: personId === null ? 0 : points },
            {
              onSuccess: (completion) => {
                setUndoState({ completionId: completion.id, choreName })
              },
            },
          )
          setTimeout(() => setPicking(null), 350)
        }}
        onClose={() => setPicking(null)}
      />

      <AnimatePresence>
        {undoState && (
          <UndoToast
            key={undoState.completionId}
            choreName={undoState.choreName}
            onUndo={handleUndo}
            onDismiss={() => setUndoState(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
