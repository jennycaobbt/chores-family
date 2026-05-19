import { Fragment, useMemo } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Home, Users, MapPin, Zap, CalendarClock, History, Trophy, Settings, ArrowLeftRight } from 'lucide-react'
import { useTrades } from '../lib/queries'

const NAV_GROUPS = [
  {
    label: 'Chores',          // shown as a prefix on desktop + outline on mobile
    items: [
      { to: '/', label: 'Today', icon: Home },
      { to: '/by-person', label: 'People', icon: Users },
      { to: '/by-location', label: 'Rooms', icon: MapPin },
      { to: '/as-needed', label: 'Anytime', icon: Zap },
    ],
  },
  {
    label: null,
    items: [
      { to: '/upcoming', label: 'Upcoming', icon: CalendarClock },
      { to: '/history', label: 'History', icon: History },
      { to: '/trade', label: 'Trade', icon: ArrowLeftRight },
      { to: '/leaderboard', label: 'Scores', icon: Trophy },
    ],
  },
  {
    label: null,
    items: [
      { to: '/admin', label: 'Admin', icon: Settings },
    ],
  },
]

// Total item count used to compute proportional flex-basis on mobile so
// all tab icons remain equal-width despite the group wrapper divs.
const TOTAL_ITEMS = NAV_GROUPS.reduce((s, g) => s + g.items.length, 0)

export function Layout() {
  const { data: trades = [] } = useTrades()
  const pendingTradeCount = useMemo(
    () => trades.filter((t) => t.status === 'pending').length,
    [trades],
  )

  return (
    <div className="flex flex-col min-h-svh">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/60 border-b border-white/40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="text-2xl">🧹</div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-pink-500 to-amber-500 bg-clip-text text-transparent">
            Chores
          </h1>

          {/* ── Desktop nav ─────────────────────────────────────────────────── */}
          {/* Each group floats in its own pill. The "Chores" group shows its   */}
          {/* label as a small prefix followed by a hairline divider.           */}
          <nav className="ml-auto hidden md:flex items-center gap-2">
            {NAV_GROUPS.map((group, gi) => (
              <div
                key={gi}
                className="flex items-center gap-0.5 bg-white/70 backdrop-blur rounded-full px-1 py-1 shadow-sm border border-white/60"
              >
                {group.label && (
                  <>
                    <span className="pl-2 pr-1 text-[10px] font-extrabold uppercase tracking-widest text-violet-400 select-none whitespace-nowrap">
                      {group.label}
                    </span>
                    <div className="w-px h-4 bg-violet-200 shrink-0 mr-0.5" aria-hidden />
                  </>
                )}
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `relative px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                        isActive
                          ? 'bg-violet-600 text-white shadow-md'
                          : 'text-violet-700 hover:bg-violet-100'
                      }`
                    }
                  >
                    {item.label}
                    {item.to === '/trade' && pendingTradeCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center leading-none">
                        {pendingTradeCount > 9 ? '9+' : pendingTradeCount}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 pb-24 md:pb-8">
        <Outlet />
      </main>

      {/* ── Mobile / tablet bottom tab bar ──────────────────────────────────── */}
      {/* Groups share space proportional to item count (flex-basis = N/total)  */}
      {/* so every icon gets exactly the same width. The "Chores" group gets a  */}
      {/* subtle violet outline to distinguish it.                               */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-t border-white/60 px-2 py-1.5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)' }}
      >
        <div className="flex items-stretch">
          {NAV_GROUPS.map((group, gi) => (
            <Fragment key={gi}>
              {gi > 0 && (
                <div className="w-px self-stretch bg-gray-200 shrink-0 mx-0.5" aria-hidden />
              )}

              {/* Group wrapper — proportional width keeps all icons equal-sized */}
              <div
                className={`flex items-center ${
                  group.label
                    ? 'rounded-xl ring-1 ring-violet-200 bg-violet-50/60 px-0.5 py-0.5'
                    : ''
                }`}
                style={{
                  flexBasis: `${(group.items.length / TOTAL_ITEMS) * 100}%`,
                  flexShrink: 0,
                }}
              >
                {group.items.map((item) => {
                  const Icon = item.icon
                  const hasBadge = item.to === '/trade' && pendingTradeCount > 0
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) =>
                        `flex-1 flex flex-col items-center gap-0.5 py-1 rounded-lg text-[10px] font-semibold transition min-w-0 ${
                          isActive ? 'text-violet-600' : 'text-gray-400'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div className="relative">
                            <Icon
                              className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'scale-110' : ''} transition`}
                            />
                            {hasBadge && (
                              <span className="absolute -top-1.5 -right-2 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center leading-none">
                                {pendingTradeCount > 9 ? '9+' : pendingTradeCount}
                              </span>
                            )}
                          </div>
                          <span className="truncate w-full text-center leading-tight">
                            {item.label}
                          </span>
                        </>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </Fragment>
          ))}
        </div>
      </nav>
    </div>
  )
}
