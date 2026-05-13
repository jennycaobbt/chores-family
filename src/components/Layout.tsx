import { Fragment } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Home, Users, MapPin, Zap, CalendarClock, History, Trophy, Settings } from 'lucide-react'

/**
 * Three visual groups:
 *  1. Do   — pages where chores are completed
 *  2. Info — read-only / review pages
 *  3. Admin
 */
const NAV_GROUPS = [
  {
    items: [
      { to: '/', label: 'Today', icon: Home },
      { to: '/by-person', label: 'People', icon: Users },
      { to: '/by-location', label: 'Rooms', icon: MapPin },
      { to: '/as-needed', label: 'Anytime', icon: Zap },
    ],
  },
  {
    items: [
      { to: '/upcoming', label: 'Upcoming', icon: CalendarClock },
      { to: '/history', label: 'History', icon: History },
      { to: '/leaderboard', label: 'Scores', icon: Trophy },
    ],
  },
  {
    items: [
      { to: '/admin', label: 'Admin', icon: Settings },
    ],
  },
]

export function Layout() {
  return (
    <div className="flex flex-col min-h-svh">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/60 border-b border-white/40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="text-2xl">🧹</div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-pink-500 to-amber-500 bg-clip-text text-transparent">
            Chores
          </h1>

          {/* Desktop nav — each group floats in its own pill container */}
          <nav className="ml-auto hidden md:flex items-center gap-2">
            {NAV_GROUPS.map((group, gi) => (
              <div
                key={gi}
                className="flex items-center gap-0.5 bg-white/70 backdrop-blur rounded-full px-1 py-1 shadow-sm border border-white/60"
              >
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                        isActive
                          ? 'bg-violet-600 text-white shadow-md'
                          : 'text-violet-700 hover:bg-violet-100'
                      }`
                    }
                  >
                    {item.label}
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

      {/* Mobile/tablet bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-t border-white/60 px-2 py-1.5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)' }}
      >
        {/* flex so all items share equal width; thin dividers between groups */}
        <div className="flex items-center">
          {NAV_GROUPS.map((group, gi) => (
            <Fragment key={gi}>
              {/* Group separator */}
              {gi > 0 && (
                <div className="w-px self-stretch bg-gray-200 shrink-0 mx-0.5" aria-hidden />
              )}

              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-2xl text-[10px] font-semibold transition min-w-0 ${
                        isActive ? 'text-violet-600' : 'text-gray-400'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'scale-110' : ''} transition`} />
                        <span className="truncate w-full text-center leading-tight">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                )
              })}
            </Fragment>
          ))}
        </div>
      </nav>
    </div>
  )
}
