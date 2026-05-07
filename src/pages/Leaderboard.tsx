import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Crown, Sparkles, Trophy } from 'lucide-react'
import { Avatar } from '../components/Avatar'
import { useCompletions, usePeople } from '../lib/queries'
import { personColor } from '../lib/style'

type Mode = 'all' | 'monthly' | 'yearly'

const MODES: { id: Mode; label: string }[] = [
  { id: 'all', label: 'All time' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
]

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function Leaderboard() {
  const { data: people = [] } = usePeople()
  const { data: completions = [] } = useCompletions()

  const [mode, setMode] = useState<Mode>('all')
  // Anchor for month/year navigation. Defaults to current.
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-11

  const peopleById = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people])

  const filtered = useMemo(() => {
    if (mode === 'all') return completions
    if (mode === 'yearly') {
      return completions.filter((c) => new Date(c.completed_at).getFullYear() === year)
    }
    // monthly
    return completions.filter((c) => {
      const d = new Date(c.completed_at)
      return d.getFullYear() === year && d.getMonth() === month
    })
  }, [completions, mode, year, month])

  const ranked = useMemo(() => {
    const totals = new Map<string, { points: number; count: number }>()
    for (const c of filtered) {
      if (!c.person_id) continue
      const cur = totals.get(c.person_id) ?? { points: 0, count: 0 }
      cur.points += c.points_awarded
      cur.count += 1
      totals.set(c.person_id, cur)
    }
    return [...totals.entries()]
      .map(([id, v]) => ({ person: peopleById[id], ...v }))
      .filter((r) => r.person)
      .sort((a, b) => b.points - a.points)
  }, [filtered, peopleById])

  const title =
    mode === 'all'
      ? 'All-time leaderboard'
      : mode === 'yearly'
        ? `${year} leaderboard`
        : `${MONTH_NAMES[month]} ${year}`

  const goPrev = () => {
    if (mode === 'monthly') {
      if (month === 0) {
        setMonth(11)
        setYear(year - 1)
      } else setMonth(month - 1)
    } else if (mode === 'yearly') {
      setYear(year - 1)
    }
  }
  const goNext = () => {
    if (mode === 'monthly') {
      if (month === 11) {
        setMonth(0)
        setYear(year + 1)
      } else setMonth(month + 1)
    } else if (mode === 'yearly') {
      setYear(year + 1)
    }
  }

  const max = ranked[0]?.points ?? 1

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">
      <div className="flex justify-center gap-2 mb-4">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`pop px-4 py-1.5 rounded-full text-sm font-bold transition ${
              mode === m.id
                ? 'bg-violet-600 text-white shadow-md'
                : 'bg-white/70 text-violet-700 hover:bg-violet-100'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="bg-white/85 backdrop-blur rounded-3xl shadow-xl border border-white p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          {mode !== 'all' ? (
            <button
              onClick={goPrev}
              className="pop h-10 w-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center hover:bg-violet-200 transition"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : (
            <div className="h-10 w-10" />
          )}
          <div className="flex items-center gap-2 text-center">
            <Trophy className="h-6 w-6 text-amber-500" />
            <h2 className="text-2xl font-extrabold text-gray-800">{title}</h2>
          </div>
          {mode !== 'all' ? (
            <button
              onClick={goNext}
              className="pop h-10 w-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center hover:bg-violet-200 transition"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <div className="h-10 w-10" />
          )}
        </div>

        {ranked.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No points {mode !== 'all' ? 'in this period' : 'yet'} — get to it!
          </div>
        ) : (
          <ol className="space-y-2">
            {ranked.map((r, i) => {
              const c = personColor(r.person.sort_order)
              const widthPct = Math.max(8, Math.round((r.points / max) * 100))
              return (
                <motion.li
                  key={r.person.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative overflow-hidden rounded-2xl bg-gray-50/70 p-3 flex items-center gap-3"
                >
                  <div
                    className={`absolute inset-y-0 left-0 ${c.bg} opacity-50`}
                    style={{ width: `${widthPct}%` }}
                  />
                  <div className="relative z-10 flex items-center gap-3 flex-1">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center font-extrabold text-sm ${
                        i === 0
                          ? 'bg-amber-400 text-white'
                          : i === 1
                            ? 'bg-gray-300 text-white'
                            : i === 2
                              ? 'bg-orange-300 text-white'
                              : 'bg-white text-gray-500'
                      }`}
                    >
                      {i === 0 ? <Crown className="h-4 w-4" /> : i + 1}
                    </div>
                    <Avatar person={r.person} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-gray-800 truncate">
                        {r.person.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {r.count} chore{r.count === 1 ? '' : 's'} done
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-1 text-amber-600 font-extrabold text-lg">
                      <Sparkles className="h-4 w-4" />
                      {r.points}
                    </div>
                  </div>
                </motion.li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
