import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, PartyPopper } from 'lucide-react'
import { ChoreCard } from '../components/ChoreCard'
import { WhoDidItModal } from '../components/WhoDidItModal'
import { Avatar } from '../components/Avatar'
import {
  useChores,
  useCompleteChore,
  useUndoCompletion,
  useCompletions,
  useLocations,
  usePeople,
} from '../lib/queries'
import { isDueNow, currentPeriod } from '../lib/dueLogic'
import type { Chore, Completion } from '../lib/database.types'

function latestInPeriod(chore: Chore, completions: Completion[], now: Date): Completion | undefined {
  const { start } = currentPeriod(chore, now)
  return completions
    .filter((c) => new Date(c.completed_at) >= start && new Date(c.completed_at) <= now)
    .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0]
}

export function ByPerson() {
  const { data: people = [] } = usePeople()
  const { data: locations = [] } = useLocations()
  const { data: chores = [] } = useChores()
  const { data: completions = [] } = useCompletions()
  const completeMut = useCompleteChore()
  const undoMut = useUndoCompletion()

  const [picking, setPicking] = useState<Chore | null>(null)
  const [selectedId, setSelectedId] = useState<string | 'unassigned' | null>(null)
  const [showDone, setShowDone] = useState(false)

  const peopleById = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people])
  const locationsById = useMemo(
    () => Object.fromEntries(locations.map((l) => [l.id, l])),
    [locations],
  )
  const completionsByChore = useMemo(() => {
    const m = new Map<string, Completion[]>()
    for (const c of completions) {
      const arr = m.get(c.chore_id) ?? []
      arr.push(c)
      m.set(c.chore_id, arr)
    }
    return m
  }, [completions])

  const now = useMemo(() => new Date(), [])

  const sortedPeople = useMemo(
    () => [...people].sort((a, b) => a.sort_order - b.sort_order),
    [people],
  )

  // Default to first person once data loads
  const effectiveId = selectedId ?? sortedPeople[0]?.id ?? 'unassigned'

  const unassignedCount = useMemo(
    () => chores.filter((c) => c.default_person_id === null).length,
    [chores],
  )

  const filteredChores = useMemo(() => {
    if (effectiveId === 'unassigned') return chores.filter((c) => c.default_person_id === null)
    return chores.filter((c) => c.default_person_id === effectiveId)
  }, [chores, effectiveId])

  const due = useMemo(
    () =>
      filteredChores
        .filter((c) => isDueNow(c, completionsByChore.get(c.id) ?? [], now))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [filteredChores, completionsByChore, now],
  )

  const done = useMemo(
    () =>
      filteredChores.filter((c) => {
        if (isDueNow(c, completionsByChore.get(c.id) ?? [], now)) return false
        return !!latestInPeriod(c, completionsByChore.get(c.id) ?? [], now)
      }),
    [filteredChores, completionsByChore, now],
  )

  const selectedPerson =
    effectiveId !== 'unassigned' ? (peopleById[effectiveId] ?? null) : null

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-8">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-5">By Person</h2>

      {/* Person selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 mb-6">
        {sortedPeople.map((person) => {
          const isSelected = effectiveId === person.id
          return (
            <button
              key={person.id}
              onClick={() => {
                setSelectedId(person.id)
                setShowDone(false)
              }}
              className={`flex flex-col items-center gap-1.5 shrink-0 px-3 pt-2.5 pb-2 rounded-2xl transition ${
                isSelected
                  ? 'bg-violet-100 ring-2 ring-violet-400'
                  : 'bg-white/50 hover:bg-white/80'
              }`}
            >
              <Avatar person={person} size="lg" />
              <span
                className={`text-xs font-bold whitespace-nowrap ${
                  isSelected ? 'text-violet-700' : 'text-gray-600'
                }`}
              >
                {person.name}
              </span>
            </button>
          )
        })}
        {unassignedCount > 0 && (
          <button
            onClick={() => {
              setSelectedId('unassigned')
              setShowDone(false)
            }}
            className={`flex flex-col items-center gap-1.5 shrink-0 px-3 pt-2.5 pb-2 rounded-2xl transition ${
              effectiveId === 'unassigned'
                ? 'bg-violet-100 ring-2 ring-violet-400'
                : 'bg-white/50 hover:bg-white/80'
            }`}
          >
            <Avatar person={null} size="lg" />
            <span
              className={`text-xs font-bold whitespace-nowrap ${
                effectiveId === 'unassigned' ? 'text-violet-700' : 'text-gray-600'
              }`}
            >
              Unassigned
            </span>
          </button>
        )}
      </div>

      {/* Selected person header */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar person={selectedPerson} size="md" />
        <div>
          <h3 className="font-extrabold text-xl text-gray-800">
            {selectedPerson ? selectedPerson.name : 'Unassigned'}
          </h3>
          <p className="text-sm text-violet-500 font-semibold">
            {due.length} due · {done.length} done this period
          </p>
        </div>
      </div>

      {/* Chore list */}
      <div className="space-y-3">
        {due.length === 0 && done.length === 0 && (
          <div className="bg-white/80 backdrop-blur rounded-3xl p-10 text-center border border-white shadow-lg">
            <PartyPopper className="h-10 w-10 mx-auto text-amber-400 mb-3" />
            <div className="font-extrabold text-lg text-gray-700">No chores assigned</div>
          </div>
        )}

        {due.length === 0 && done.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 text-center">
            <PartyPopper className="h-7 w-7 mx-auto text-emerald-500 mb-1.5" />
            <div className="font-extrabold text-sm text-emerald-700">All done for this period!</div>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {due.map((c) => (
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

        {done.length > 0 && (
          <div className="pt-1">
            <button
              onClick={() => setShowDone((v) => !v)}
              className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition mb-2"
            >
              {showDone ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {done.length} completed this period
            </button>
            <AnimatePresence>
              {showDone && (
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {done.map((c) => {
                      const periodComp = latestInPeriod(
                        c,
                        completionsByChore.get(c.id) ?? [],
                        now,
                      )
                      return (
                        <ChoreCard
                          key={c.id}
                          chore={c}
                          location={c.location_id ? locationsById[c.location_id] : null}
                          defaultPerson={
                            c.default_person_id ? peopleById[c.default_person_id] : null
                          }
                          onUncomplete={
                            periodComp ? () => undoMut.mutate(periodComp.id) : undefined
                          }
                          dimmed
                          trailing={
                            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                              Done
                            </span>
                          }
                        />
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <WhoDidItModal
        chore={picking}
        people={people}
        onPick={(personId) => {
          if (!picking) return
          completeMut.mutate({
            choreId: picking.id,
            personId,
            points: personId === null ? 0 : picking.points,
          })
          setTimeout(() => setPicking(null), 350)
        }}
        onClose={() => setPicking(null)}
      />
    </div>
  )
}
