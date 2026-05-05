# Chores — Family Chore Tracker PWA

## Stack

- **React 19** + **TypeScript** + **Vite 8**
- **Tailwind CSS v4** (`@tailwindcss/vite` plugin; use `@import "tailwindcss"` + `@theme {}` in CSS, not tailwind.config.js)
- **vite-plugin-pwa** (installed with `--legacy-peer-deps` — only declares Vite ≤7 but works fine on Vite 8)
- **Supabase** — PostgreSQL + Storage (person photos in `person-photos` bucket)
- **@tanstack/react-query** — all data fetching/mutation; staleTime 30s
- **React Router v6** — BrowserRouter, nested Layout + Outlet
- **framer-motion** — card animations, modals, burst effects
- **date-fns** — date math
- **lucide-react** — icons
- **Quicksand** font (Google Fonts, loaded in index.html)

## Running locally

```bash
# Use Git Bash, not PowerShell (npm.ps1 is blocked by execution policy)
export PATH="/c/Program Files/nodejs:$PATH"
npm run dev
```

Dev server: http://localhost:5173

## Environment variables

Stored in `.env.local` (not committed):

```
VITE_SUPABASE_URL=https://fqjcyzmbeslmslocsmtb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

## Key architecture decisions

### "Due now" logic (`src/lib/dueLogic.ts`)

Day rolls over at **4am** (not midnight). Each chore has a *current period* based on its frequency. A chore is due if there's no completion recorded within `[periodStart, now]`. Overdue chores do **not** stack — each period resets independently.

- `daily` → period is the current logical day (4am→4am)
- `weekly` → period is Sun 4am → next Sun 4am; shows due every day until completed
- `monthly` → period is 1st of month 4am → 1st of next month 4am
- `every_n_days` / `every_n_weeks` → rolling period from last completion (or chore creation if never completed)

### Points defaults (`defaultPoints` in `dueLogic.ts`)

| Frequency | Default points |
|-----------|---------------|
| daily | 1 |
| weekly | 3 |
| monthly | 5 |
| every_n_days | n × 1 |
| every_n_weeks | n × 3 |

Customizable per chore in Admin. "Reset to default" button recalculates.

### Data fetching pattern

All hooks live in `src/lib/queries.ts`. Mutations call `queryClient.invalidateQueries` so UI stays fresh. No optimistic updates — family use on LAN latency is fine.

### Who did it?

No login. Completions use a `person_id` FK. The "Who did it?" modal (`WhoDidItModal.tsx`) appears after tapping the checkmark — anyone can claim any chore.

### Photo uploads

`uploadPersonPhoto(file)` in `queries.ts` uploads to Supabase Storage `person-photos` bucket and returns a public URL stored on the `people` row.

## Supabase schema (summary)

```
people(id, name, photo_url, sort_order, created_at)
locations(id, name, sort_order, created_at)
chores(id, title, frequency_type, frequency_n, location_id, default_person_id, points, sort_order, created_at)
completions(id, chore_id, person_id, completed_at, points_awarded)
```

RLS: open anon read/write (intentional for family use — no auth). Add a PIN gate before sharing URL publicly.

## File map

```
src/
  lib/
    supabase.ts          Supabase client (typed)
    database.types.ts    Generated DB types + convenience re-exports
    dueLogic.ts          Period/due calculations, formatTimeUntil, defaultPoints
    queries.ts           All React Query hooks and mutations
    style.ts             personColor(sortOrder), locationEmoji(name)
  components/
    Avatar.tsx           Person photo/initial circle, sizes xs–xl
    ChoreCard.tsx        Animated chore card with checkmark, points, badges
    Layout.tsx           Sticky header + desktop nav + mobile bottom tab bar
    Modal.tsx            Backdrop + spring modal wrapper
    WhoDidItModal.tsx    Person picker shown after marking a chore done
  pages/
    Dashboard.tsx        Today's due chores (4am rollover), party popper when all done
    ByPerson.tsx         Chores grouped by default_person_id
    ByLocation.tsx       Chores grouped by location with emoji headers
    Upcoming.tsx         Non-due chores sorted by next due date
    Leaderboard.tsx      All-time/monthly/yearly with prev/next navigation
    Admin.tsx            CRUD for chores, people, locations
```

## Claude Preview MCP

The Preview server must be launched with Node directly (not npm.cmd — it's not on Preview's PATH):

```json
// .claude/launch.json
{
  "configurations": [{
    "name": "vite",
    "runtimeExecutable": "C:\\Program Files\\nodejs\\node.exe",
    "runtimeArgs": ["node_modules/vite/bin/vite.js"],
    "port": 5173
  }]
}
```

## Deployment (Vercel — not yet done)

This app is entirely static (no serverless functions). Vercel cold-start latency is **not a concern** — only Edge Functions/Serverless Functions have cold starts; static assets are served from CDN instantly.

```bash
vercel deploy
# Set env vars in Vercel dashboard:
# VITE_SUPABASE_URL
# VITE_SUPABASE_PUBLISHABLE_KEY
```

## PWA notes

- Currently uses an SVG icon only. For best Android install experience, add 192×512 PNG icons (requires `sharp` or manual export).
- Service worker registered with `autoUpdate` strategy.
- `navigateFallbackDenylist: [/^\/api/]` prevents SW from intercepting API routes.

## Known gaps / future work

- **PIN gate**: RLS is open. Add app-level PIN before publishing URL outside the home.
- **PNG icons**: SVG works in Chrome but PNG improves Android homescreen icon quality.
- **Undo completion**: No undo button yet — delete via Supabase dashboard if needed.
- **Default person assignments**: Seeded chores have no `default_person_id` — assign via Admin.
- **Vercel deploy**: Run `vercel deploy` and set the two env vars.
