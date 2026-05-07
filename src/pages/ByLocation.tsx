import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ChoreCard } from '../components/ChoreCard'
import { WhoDidItModal } from '../components/WhoDidItModal'
import {
  useChores,
  useCompleteChore,
  useUndoCompletion,
  useCompletions,
  useLocations,
  usePeople,
} from '../lib/queries'
import { isDueNow, currentPeriod } from '../lib/dueLogic'
import type { Chore, Completion, Location } from '../lib/database.types'
import { locationIcon } from '../lib/style'
import { IconDisplay } from '../components/IconDisplay'

function latestInPeriod(chore: Chore, completions: Completion[], now: Date): Completion | undefined {
  const { start } = currentPeriod(chore, now)
  return completions
    .filter((c) => new Date(c.completed_at) >= start && new Date(c.completed_at) <= now)
    .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0]
}

export function ByLocation() {
  const { data: people = [] } = usePeople()
  const { data: locations = [] } = useLocations()
  const { data: chores = [] } = useChores()
  const { data: completions = [] } = useCompletions()
  const completeMut = useCompleteChore()
  const undoMut = useUndoCompletion()

  const [picking, setPicking] = useState<Chore | null>(null)

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

  const groups: Array<{ location: Location | null; chores: Chore[] }> = useMemo(() => {
    const map = new Map<string | null, Chore[]>()
    for (const l of locations) map.set(l.id, [])
    map.set(null, [])
    for (const c of chores) {
      const k = c.location_id ?? null
      const arr = map.get(k) ?? []
      arr.push(c)
      map.set(k, arr)
    }
    const sortedLocs = [...locations].sort((a, b) => a.sort_order - b.sort_order)
    return [
      ...sortedLocs.map((l) => ({ location: l, chores: map.get(l.id) ?? [] })),
      { location: null, chores: map.get(null) ?? [] },
    ]
  }, [locations, chores])

  const now = new Date()

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-8 space-y-8">
      <h2 className="text-3xl font-extrabold text-gray-800">By Room</h2>

      {groups.map(({ location, chores: list }) => {
        if (list.length === 0) return null
        return (
          <section key={location?.id ?? 'none'}>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center text-2xl shadow-sm overflow-hidden">
                <IconDisplay icon={locationIcon(location)} />
              </div>
              <div>
                <h3 className="font-bold text-xl text-gray-800">
                  {location ? location.name : 'No room'}
                </h3>
                <div className="text-sm font-semibold text-violet-500">
                  {list.length} chore{list.length === 1 ? '' : 's'}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {list
                  .slice()
                  .sort((a, b) => {
                    const aDue = isDueNow(a, completionsByChore.get(a.id) ?? [], now) ? 0 : 1
                    const bDue = isDueNow(b, completionsByChore.get(b.id) ?? [], now) ? 0 : 1
                    if (aDue !== bDue) return aDue - bDue
                    return a.name.localeCompare(b.name)
                  })
                  .map((chore) => {
                    const choreCompletions = completionsByChore.get(chore.id) ?? []
                    const dueNow = isDueNow(chore, choreCompletions, now)
                    const periodComp = dueNow
                      ? undefined
                      : latestInPeriod(chore, choreCompletions, now)

                    return (
                      <ChoreCard
                        key={chore.id}
                        chore={chore}
                        location={chore.location_id ? locationsById[chore.location_id] : null}
                        defaultPerson={
                          chore.default_person_id ? peopleById[chore.default_person_id] : null
                        }
                        onComplete={dueNow ? () => setPicking(chore) : undefined}
                        onUncomplete={
                          periodComp ? () => undoMut.mutate(periodComp.id) : undefined
                        }
                        dimmed={!dueNow}
                        trailing={
                          dueNow ? (
                            <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-600">
                              Due
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                              Done
                            </span>
                          )
                        }
                      />
                    )
                  })}
              </AnimatePresence>
            </div>
          </section>
        )
      })}

      <WhoDidItModal
        chore={picking}
        people={people}
        onPick={(personId) => {
          if (!picking) return
          completeMut.mutate({ choreId: picking.id, personId, points: personId === null ? 0 : picking.points })
          setTimeout(() => setPicking(null), 350)
        }}
        onClose={() => setPicking(null)}
      />
    </div>
  )
}
