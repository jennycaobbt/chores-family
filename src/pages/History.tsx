import { useMemo, useState } from 'react'
import { History as HistoryIcon, Sparkles } from 'lucide-react'
import { Avatar } from '../components/Avatar'
import { IconDisplay } from '../components/IconDisplay'
import {
  useChores,
  useCompletionHistory,
  useLocations,
  usePeople,
} from '../lib/queries'
import { locationIcon } from '../lib/style'

/** "Today · May 12", "Yesterday · May 11", or "Monday, May 9" */
function dayLabel(date: Date, now: Date): string {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86_400_000)
  const dateStr = date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
  if (diffDays === 0) return `Today · ${dateStr}`
  if (diffDays === 1) return `Yesterday · ${dateStr}`
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

export function History() {
  const { data: people = [] } = usePeople()
  const { data: chores = [] } = useChores()
  const { data: locations = [] } = useLocations()
  const { data: completions = [], isLoading } = useCompletionHistory()

  const [selectedId, setSelectedId] = useState<string | 'other' | null>(null)

  const sortedPeople = useMemo(
    () => [...people].sort((a, b) => a.sort_order - b.sort_order),
    [people],
  )

  const choresById = useMemo(
    () => Object.fromEntries(chores.map((c) => [c.id, c])),
    [chores],
  )
  const locationsById = useMemo(
    () => Object.fromEntries(locations.map((l) => [l.id, l])),
    [locations],
  )

  const hasOther = useMemo(() => completions.some((c) => c.person_id === null), [completions])

  const sidebarItems = useMemo(
    () => [
      ...sortedPeople.map((p) => ({ id: p.id, person: p as typeof p | null, label: p.name })),
      ...(hasOther ? [{ id: 'other' as const, person: null, label: 'Other' }] : []),
    ],
    [sortedPeople, hasOther],
  )

  const effectiveId = selectedId ?? sidebarItems[0]?.id ?? 'other'

  const selectedPerson =
    effectiveId !== 'other' ? (people.find((p) => p.id === effectiveId) ?? null) : null

  /** Completions for the selected person, newest-first (already ordered by query) */
  const personCompletions = useMemo(
    () =>
      effectiveId === 'other'
        ? completions.filter((c) => c.person_id === null)
        : completions.filter((c) => c.person_id === effectiveId),
    [completions, effectiveId],
  )

  /** Group by calendar day (midnight rollover for display) */
  const groups = useMemo(() => {
    const now = new Date()
    const map = new Map<string, { label: string; items: typeof completions }>()
    for (const comp of personCompletions) {
      const date = new Date(comp.completed_at)
      const key = date.toDateString() // e.g. "Mon May 12 2025"
      if (!map.has(key)) {
        map.set(key, { label: dayLabel(date, now), items: [] })
      }
      map.get(key)!.items.push(comp)
    }
    return [...map.values()]
  }, [personCompletions])

  const totalPoints = useMemo(
    () => personCompletions.reduce((s, c) => s + c.points_awarded, 0),
    [personCompletions],
  )

  const SidebarButton = ({
    id,
    label,
    person,
    mobile,
  }: {
    id: string
    label: string
    person: (typeof sortedPeople)[0] | null
    mobile?: boolean
  }) => {
    const isSelected = effectiveId === id
    if (mobile) {
      return (
        <button
          onClick={() => setSelectedId(id)}
          className={`flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-full text-sm font-bold transition ${
            isSelected
              ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
              : 'bg-white/60 text-gray-600 hover:bg-white'
          }`}
        >
          <Avatar person={person} size="xs" />
          <span>{label}</span>
        </button>
      )
    }
    return (
      <button
        onClick={() => setSelectedId(id)}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-left transition ${
          isSelected
            ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
            : 'text-gray-600 hover:bg-white/80'
        }`}
      >
        <Avatar person={person} size="xs" />
        <span className="truncate">{label}</span>
      </button>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-8">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-5">Chore History</h2>

      {/* Mobile: horizontal person scroll */}
      <div className="sm:hidden flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 mb-5">
        {sidebarItems.map((item) => (
          <SidebarButton key={item.id} id={item.id} label={item.label} person={item.person} mobile />
        ))}
      </div>

      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <div className="hidden sm:block w-44 shrink-0">
          <div className="space-y-1 sticky top-24">
            {sidebarItems.map((item) => (
              <SidebarButton key={item.id} id={item.id} label={item.label} person={item.person} />
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Person header */}
          <div className="flex items-center gap-3 mb-5">
            <Avatar person={selectedPerson} size="md" />
            <div>
              <h3 className="font-extrabold text-xl text-gray-800">
                {selectedPerson ? selectedPerson.name : 'Other'}
              </h3>
              <p className="text-sm text-violet-500 font-semibold">
                {isLoading
                  ? 'Loading…'
                  : `${personCompletions.length} completion${personCompletions.length !== 1 ? 's' : ''} · ${totalPoints} pts in the last 90 days`}
              </p>
            </div>
          </div>

          {/* History */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-white/50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="bg-white/80 backdrop-blur rounded-3xl p-10 text-center border border-white shadow-lg">
              <HistoryIcon className="h-10 w-10 mx-auto text-gray-300 mb-3" />
              <div className="font-extrabold text-lg text-gray-700">No history yet</div>
              <div className="text-gray-400 mt-1 text-sm">
                Completed chores will appear here.
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {groups.map((group) => (
                <section key={group.label}>
                  {/* Date heading */}
                  <div className="text-[11px] uppercase tracking-widest font-bold text-gray-400 mb-2 px-1">
                    {group.label}
                  </div>

                  {/* Completion rows */}
                  <div className="bg-white/85 backdrop-blur rounded-2xl shadow-sm border border-white overflow-hidden">
                    {group.items.map((comp, idx) => {
                      const chore = choresById[comp.chore_id]
                      const loc = chore?.location_id ? locationsById[chore.location_id] : null
                      const icon = chore?.icon ?? locationIcon(loc)
                      const time = new Date(comp.completed_at).toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                      })

                      return (
                        <div
                          key={comp.id}
                          className={`flex items-center gap-3 px-4 py-3 ${
                            idx < group.items.length - 1 ? 'border-b border-gray-100' : ''
                          }`}
                        >
                          {/* Chore icon */}
                          <div className="h-9 w-9 shrink-0 rounded-xl bg-violet-50 flex items-center justify-center overflow-hidden">
                            <IconDisplay icon={icon} className="text-lg" />
                          </div>

                          {/* Chore name */}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-800 truncate">
                              {chore?.name ?? 'Deleted chore'}
                            </div>
                            {loc && (
                              <div className="text-xs text-gray-400 truncate">{loc.name}</div>
                            )}
                          </div>

                          {/* Time + points */}
                          <div className="text-right shrink-0">
                            <div className="text-xs text-gray-400 font-medium">{time}</div>
                            {comp.points_awarded > 0 ? (
                              <div className="inline-flex items-center gap-0.5 text-amber-500 font-bold text-xs">
                                <Sparkles className="h-3 w-3" />
                                +{comp.points_awarded}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-300 font-medium">0 pts</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
