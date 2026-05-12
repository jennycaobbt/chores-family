import { useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { Avatar } from '../components/Avatar'
import {
  useChores,
  useCompletions,
  useLocations,
  usePeople,
} from '../lib/queries'
import {
  formatFrequency,
  formatTimeUntil,
  isDueNow,
  nextDueAt,
} from '../lib/dueLogic'
import { locationEmoji } from '../lib/style'

export function Upcoming() {
  const { data: people = [] } = usePeople()
  const { data: locations = [] } = useLocations()
  const { data: chores = [] } = useChores()
  const { data: completions = [] } = useCompletions()

  const peopleById = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people])
  const locationsById = useMemo(
    () => Object.fromEntries(locations.map((l) => [l.id, l])),
    [locations],
  )

  const completionsByChore = useMemo(() => {
    const m = new Map<string, typeof completions>()
    for (const c of completions) {
      const arr = m.get(c.chore_id) ?? []
      arr.push(c)
      m.set(c.chore_id, arr)
    }
    return m
  }, [completions])

  const upcoming = useMemo(() => {
    const now = new Date()
    return chores
      .filter((c) => c.frequency_type !== 'as_needed')
      .filter((c) => !isDueNow(c, completionsByChore.get(c.id) ?? [], now))
      .map((c) => ({ chore: c, nextDue: nextDueAt(c, now) }))
      .sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime())
  }, [chores, completionsByChore])

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-8 space-y-3">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-3">Upcoming</h2>

      {upcoming.length === 0 ? (
        <div className="bg-white/80 rounded-3xl p-8 text-center text-gray-500">
          Nothing upcoming — every chore is due now or unscheduled.
        </div>
      ) : (
        upcoming.map(({ chore, nextDue }) => {
          const loc = chore.location_id ? locationsById[chore.location_id] : null
          const person = chore.default_person_id ? peopleById[chore.default_person_id] : null
          return (
            <div
              key={chore.id}
              className="bg-white/85 backdrop-blur rounded-3xl shadow-md border border-white p-4 flex items-center gap-3"
            >
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center text-xl shadow-sm shrink-0">
                {locationEmoji(loc?.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-800 truncate">{chore.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {loc ? `${loc.name} · ` : ''}
                  {formatFrequency(chore.frequency_type, chore.frequency_n)}
                </div>
              </div>
              <div className="flex items-center gap-2 text-right">
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-violet-500">
                    Due
                  </div>
                  <div className="font-bold text-gray-700">
                    {formatTimeUntil(nextDue, new Date())}
                  </div>
                </div>
                <span className="inline-flex items-center gap-0.5 text-amber-600 font-extrabold text-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  {chore.points}
                </span>
                <Avatar person={person ?? null} size="sm" />
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
