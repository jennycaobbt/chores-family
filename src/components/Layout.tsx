import { NavLink, Outlet } from 'react-router-dom'
import { Home, Users, MapPin, CalendarClock, Zap, Trophy, Settings } from 'lucide-react'

const NAV = [
  { to: '/', label: 'Today', icon: Home },
  { to: '/by-person', label: 'People', icon: Users },
  { to: '/by-location', label: 'Rooms', icon: MapPin },
  { to: '/upcoming', label: 'Upcoming', icon: CalendarClock },
  { to: '/as-needed', label: 'Anytime', icon: Zap },
  { to: '/leaderboard', label: 'Scores', icon: Trophy },
  { to: '/admin', label: 'Admin', icon: Settings },
] as const

export function Layout() {
  return (
    <div className="flex flex-col min-h-svh">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/60 border-b border-white/40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="text-2xl">🧹</div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-pink-500 to-amber-500 bg-clip-text text-transparent">
            Chores
          </h1>
          <nav className="ml-auto hidden md:flex gap-1">
            {NAV.map((item) => (
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
        <div className="grid grid-cols-7 gap-1">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-1.5 rounded-2xl text-[11px] font-semibold transition ${
                    isActive ? 'text-violet-600' : 'text-gray-500'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`h-5 w-5 ${isActive ? 'scale-110' : ''} transition`} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
