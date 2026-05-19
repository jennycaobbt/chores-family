import { useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Sparkles, PartyPopper, ChevronDown, ChevronUp, ArrowLeftRight, ChevronRight } from 'lucide-react'
import { Avatar } from '../components/Avatar'
import { ChoreCard } from '../components/ChoreCard'
import { WhoDidItModal } from '../components/WhoDidItModal'
import { UndoToast } from '../components/UndoToast'
import {
  useChores,
  useCompleteChore,
  useUndoCompletion,
  useCompletions,
  useLocations,
  usePeople,
  useTrades,
} from '../lib/queries'
import { isDueNow, latestCompletionForUndo } from '../lib/dueLogic'
import type { Chore, Completion } from '../lib/database.types'

interface UndoState {
  completionId: string
  choreName: string
}


export function Dashboard() {
  const { data: people = [] } = usePeople()
  const { data: locations = [] } = useLocations()
  const { data: chores = [] } = useChores()
  const { data: completions = [] } = useCompletions()
  const { data: trades = [] } = useTrades()
  const completeMut = useCompleteChore()
  const undoMut = useUndoCompletion()

  const pendingTradeCount = useMemo(
    () => trades.filter((t) => t.status === 'pending').length,
    [trades],
  )

  const [picking, setPicking] = useState<Chore | null>(null)
  const [undoState, setUndoState] = useState<UndoState | null>(null)
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

  const due = useMemo(
    () => {
      const now = new Date()
      return chores
        .filter((c) => c.frequency_type !== 'as_needed')
        .filter((c) => isDueNow(c, completionsByChore.get(c.id) ?? [], now))
        .sort((a, b) => {
          const aHas = a.default_person_id ? 0 : 1
          const bHas = b.default_person_id ? 0 : 1
          if (aHas !== bHas) return aHas - bHas
          if (a.points !== b.points) return b.points - a.points
          return a.name.localeCompare(b.name)
        })
    },
    [chores, completionsByChore],
  )

  const doneThisPeriod = useMemo(
    () => {
      const now = new Date()
      return chores.filter((c) => {
        if (c.frequency_type === 'as_needed') return false
        if (isDueNow(c, completionsByChore.get(c.id) ?? [], now)) return false
        return !!latestCompletionForUndo(c, completionsByChore.get(c.id) ?? [], now)
      })
    },
    [chores, completionsByChore],
  )

  /** Points earned today, keyed by person_id (null / "Other" completions excluded) */
  const todayPersonPts = useMemo(() => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const map = new Map<string, number>()
    for (const c of completions) {
      if (!c.person_id) continue
      if (new Date(c.completed_at) < startOfToday) continue
      map.set(c.person_id, (map.get(c.person_id) ?? 0) + c.points_awarded)
    }
    return map
  }, [completions])

  /** People who have scored today, sorted by points descending */
  const personPointsList = useMemo(
    () =>
      [...people]
        .filter((p) => (todayPersonPts.get(p.id) ?? 0) > 0)
        .sort((a, b) => (todayPersonPts.get(b.id) ?? 0) - (todayPersonPts.get(a.id) ?? 0)),
    [people, todayPersonPts],
  )

  const handleUndo = useCallback(() => {
    if (!undoState) return
    undoMut.mutate(undoState.completionId)
    setUndoState(null)
  }, [undoState, undoMut])

  const handleUncomplete = useCallback(
    (chore: Chore) => {
      const comp = latestCompletionForUndo(chore, completionsByChore.get(chore.id) ?? [], new Date())
      if (comp) {
        undoMut.mutate(comp.id)
      }
    },
    [completionsByChore, undoMut],
  )

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-8">
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-sm text-gray-500 font-semibold">
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </div>
          <h2 className="text-3xl font-extrabold text-gray-800">Today's chores</h2>
        </div>
        {/* Per-person points earned today — one compact chip per person */}
        <div className="flex items-center gap-1.5">
          {personPointsList.length === 0 ? (
            <div className="flex items-center gap-1 bg-gradient-to-br from-amber-300 to-orange-400 text-white rounded-full px-3 py-1.5 font-bold shadow-md shadow-orange-200">
              <Sparkles className="h-3.5 w-3.5" />
              <span>0</span>
            </div>
          ) : (
            personPointsList.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-1 bg-gradient-to-br from-amber-300 to-orange-400 text-white rounded-full pl-0.5 pr-2.5 py-0.5 shadow-md shadow-orange-200"
                title={`${p.name}: ${todayPersonPts.get(p.id)} pts`}
              >
                <Avatar person={p} size="xs" ring={false} />
                <span className="flex items-center gap-0.5 font-extrabold text-sm">
                  <Sparkles className="h-3 w-3" />
                  {todayPersonPts.get(p.id)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pending trade indicator */}
      {pendingTradeCount > 0 && (
        <Link
          to="/trade"
          className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-2xl px-4 py-3 mb-4 text-sm font-semibold text-violet-700 hover:bg-violet-100 transition"
        >
          <ArrowLeftRight className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            {pendingTradeCount} trade offer{pendingTradeCount !== 1 ? 's' : ''} waiting
          </span>
          <ChevronRight className="h-4 w-4 text-violet-400" />
        </Link>
      )}

      {due.length === 0 && doneThisPeriod.length === 0 ? (
        <div className="bg-white/80 backdrop-blur rounded-3xl p-10 text-center border border-white shadow-lg">
          <PartyPopper className="h-12 w-12 mx-auto text-amber-400 mb-3" />
          <div className="font-extrabold text-xl text-gray-800">All done for today!</div>
          <div className="text-gray-500 mt-1">Take a break, you earned it.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {due.length === 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center">
              <PartyPopper className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
              <div className="font-extrabold text-base text-emerald-700">All due chores complete!</div>
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

          {/* Completed section */}
          {doneThisPeriod.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => setShowDone((v) => !v)}
                className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition mb-2"
              >
                {showDone ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {doneThisPeriod.length} completed this period
              </button>
              <AnimatePresence>
                {showDone && (
                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {doneThisPeriod.map((c) => (
                        <ChoreCard
                          key={c.id}
                          chore={c}
                          location={c.location_id ? locationsById[c.location_id] : null}
                          defaultPerson={
                            c.default_person_id ? peopleById[c.default_person_id] : null
                          }
                          onUncomplete={() => handleUncomplete(c)}
                          dimmed
                          trailing={
                            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                              Done
                            </span>
                          }
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Who did it modal */}
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

      {/* Undo toast */}
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
