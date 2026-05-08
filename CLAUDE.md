# Chores — Family Chore Tracker PWA

## Stack

- **React 19** + **TypeScript** + **Vite 8**
- **Tailwind CSS v4** (`@tailwindcss/vite` plugin; use `@import "tailwindcss"` + `@theme {}` in CSS, not tailwind.config.js)
- **vite-plugin-pwa** (installed with `--legacy-peer-deps` — only declares Vite ≤7 but works fine on Vite 8)
- **Supabase** — PostgreSQL + Storage (person photos + icons in `person-photos` bucket)
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

No login. Completions use a nullable `person_id` FK. The "Who did it?" modal (`WhoDidItModal.tsx`) appears after tapping Complete — anyone can claim any chore. An **Other** option marks the chore complete with 0 points and `person_id = null` (excluded from leaderboard).

### Completion / undo pattern

- `useCompleteChore` returns the created `Completion` row (with its `id`) so callers can offer an undo.
- Dashboard shows a 5-second `UndoToast` after each completion.
- By Person / By Room / Dashboard all support undoing completions via the undo button on dimmed "done" cards.
- `latestInPeriod(chore, completions, now)` — helper used in all three pages to find the most recent completion within the current period for undo targeting.

### Icons (chores & locations)

Each chore and location has an optional `icon: string | null` field. The value is either:
- An **emoji string** (e.g. `"🧹"`) — rendered in a `<span>`
- A **URL** starting with `http`, `data:`, or `blob:` — rendered as an `<img>`

`IconDisplay` component handles both cases. `uploadIcon(file)` in `queries.ts` uploads to the `person-photos` Supabase Storage bucket under an `icons/` prefix and returns a public URL.

`locationIcon(loc)` in `style.ts` returns `loc.icon` if set, otherwise falls back to a name-based emoji map.

### PIN gate

- Stored in `localStorage` (`chores_pin`, `chores_pin_enabled`)
- Unlock state stored in `sessionStorage` (`chores_unlocked`) — persists for the browser session only
- Default PIN: `1234`
- Exported helpers: `getStoredPin`, `setStoredPin`, `isPinEnabled`, `setPinEnabled`, `DEFAULT_PIN`
- `setPinEnabled(false)` also writes to sessionStorage so the app unlocks immediately without reload
- `<PinGate>` wraps the entire app in `App.tsx`
- Can be disabled in Admin → Settings

### ChoreCard variants

`ChoreCard` accepts:
- `completeVariant?: 'icon' | 'pill'` — `'icon'` shows the round checkmark button (By Person / By Room); `'pill'` shows a violet→indigo "Complete" text pill (Dashboard and filtered views)
- `highlighted?: boolean` — adds a `border-violet-300` outline and deeper shadow (used on all due cards in filtered views)

### Page layouts

- **Dashboard**: flat list of due chores, collapsible "N completed" section below
- **By Person**: sticky sidebar (desktop) / horizontal pill scroll (mobile) to filter by person; same card style as Dashboard
- **By Room**: sticky sidebar (desktop) / horizontal pill scroll (mobile) to filter by room; same card style as Dashboard
- Both filtered pages default to the first item in the list on load

### Photo uploads

`uploadPersonPhoto(file)` in `queries.ts` uploads to Supabase Storage `person-photos` bucket and returns a public URL stored on the `people` row.

## Supabase schema (summary)

```
people(id, name, photo_url, sort_order, created_at)
locations(id, name, icon, sort_order, created_at)
chores(id, name, frequency_type, frequency_n, location_id, default_person_id, points, icon, archived, created_at)
completions(id, chore_id, person_id [nullable], completed_at, points_awarded)
```

RLS: open anon read/write (intentional for family use — no auth).

## File map

```
src/
  lib/
    supabase.ts          Supabase client (typed)
    database.types.ts    Generated DB types + convenience re-exports
    dueLogic.ts          Period/due calculations, formatTimeUntil, defaultPoints
    queries.ts           All React Query hooks and mutations (incl. useDeleteAllCompletions)
    style.ts             personColor(sortOrder), locationIcon(loc), LOCATION_EMOJI_MAP
  components/
    Avatar.tsx           Person photo/initial circle, sizes xs–xl
    ChoreCard.tsx        Animated chore card; supports 'icon'/'pill' complete variant + highlighted prop
    IconDisplay.tsx      Renders emoji string OR <img> depending on icon value
    Layout.tsx           Sticky header + desktop nav + mobile bottom tab bar
    Modal.tsx            Backdrop + spring modal wrapper
    PinGate.tsx          PIN lock screen + localStorage/sessionStorage helpers
    UndoToast.tsx        5-second countdown toast with undo button shown after completing a chore
    WhoDidItModal.tsx    Person picker after marking a chore done; includes "Other" (0 pts) option
  pages/
    Dashboard.tsx        Today's due chores (4am rollover), undo toast, collapsible done section
    ByPerson.tsx         Sidebar/pill filter by person; Dashboard-style cards
    ByLocation.tsx       Sidebar/pill filter by room; Dashboard-style cards
    Upcoming.tsx         Non-due chores sorted by next due date
    Leaderboard.tsx      All-time/monthly/yearly with prev/next navigation; skips null person_id
    Admin.tsx            CRUD for chores/people/locations + Settings (PIN, clear all data)
```

## Admin panel

Four tabs: **Chores**, **People**, **Locations**, **Settings**.

- **Chores**: sortable by name / location / person. Location and person views show grouped headers. Each chore has an `IconPicker` (emoji grid + custom image upload).
- **People**: add/edit/delete people; photo upload via Supabase Storage.
- **Locations**: add/edit/delete rooms; icon picker same as chores.
- **Settings**:
  - PIN lock toggle + change PIN form
  - **Danger Zone**: "Clear all completion data" with two-step confirmation — resets leaderboard and all history

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

## Deployment (Vercel)

Deployed at **https://chores-family.vercel.app**. GitHub repo: **https://github.com/jennycaobbt/chores-family**.

```bash
# Deploy to production
export PATH="/c/Program Files/nodejs:$PATH"
npx vercel deploy --prod --yes
```

Env vars set in Vercel dashboard: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.

`.npmrc` contains `legacy-peer-deps=true` — required because `vite-plugin-pwa` declares a peer dep on Vite ≤7.

## PWA notes

- Currently uses an SVG icon only. For best Android install experience, add 192×512 PNG icons (requires `sharp` or manual export).
- Service worker registered with `autoUpdate` strategy.
- `navigateFallbackDenylist: [/^\/api/]` prevents SW from intercepting API routes.

## Known gaps / future work

- **PNG icons**: SVG works in Chrome but PNG improves Android homescreen icon quality.
- **Push notifications**: Could remind family members when chores are overdue.
- **Recurring chore streaks**: Track consecutive periods completed for gamification.
