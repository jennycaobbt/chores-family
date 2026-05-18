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

Day rolls over at **4am** (not midnight). A chore is due if there's no completion within the current period. Overdue chores do **not** stack — each period resets independently.

All non-daily frequencies use **rolling periods anchored to the last completion** (not calendar boundaries). This ensures a weekly chore done on Saturday isn't due again on Sunday.

| Frequency | Period logic |
|-----------|-------------|
| `daily` | Calendar day, 4am → 4am (fixed window) |
| `weekly` | Last completion + 7 days (rolling) |
| `monthly` | Last completion + 1 calendar month (rolling) |
| `every_n_days` | Last completion + n days (rolling) |
| `every_n_weeks` | Last completion + n × 7 days (rolling) |
| `as_needed` | `isDueNow` always `false`; never appears in Dashboard / By Person / By Room / Upcoming |

Key private helper: `nextDueFrom(chore, from)` — computes the exact next due timestamp from a given date (used by `isDueNow`, `nextDueAt`, and `latestCompletionForUndo`).

### Points defaults (`defaultPoints` in `dueLogic.ts`)

| Frequency | Default points |
|-----------|---------------|
| daily | 1 |
| weekly | 3 |
| monthly | 5 |
| every_n_days | n × 1 |
| every_n_weeks | n × 3 |
| as_needed | 2 |

Customizable per chore in Admin. "Reset to default" button recalculates.

### Data fetching pattern

All hooks live in `src/lib/queries.ts`. Mutations call `queryClient.invalidateQueries` so UI stays fresh. No optimistic updates — family use on LAN latency is fine.

### Who did it?

No login. Completions use a nullable `person_id` FK. The "Who did it?" modal (`WhoDidItModal.tsx`) appears after tapping Complete — anyone can claim any chore. An **Other** option marks the chore complete with 0 points and `person_id = null` (excluded from leaderboard).

`WhoDidItModal` resets its internal `picked` state via `useEffect` whenever the modal opens (`if (open) setPicked(null)`). This is needed because parent pages close the modal with `setTimeout(() => setPicking(null), 350)`, bypassing `onClose`, so without the effect the previously picked person would persist on rapid re-opens.

### Completion / undo pattern

- `useCompleteChore` returns the created `Completion` row (with its `id`) so callers can offer an undo.
- Dashboard shows a 5-second `UndoToast` after each completion.
- By Person / By Room / Dashboard all support undoing completions via the undo button on dimmed "done" cards.
- `latestCompletionForUndo(chore, completions, now)` — exported helper in `dueLogic.ts` used by all three pages to find the most recent completion that can still be undone (within the current period for daily; most recent completion if chore isn't due yet for rolling types).

### Confetti burst animation

`ConfettiBurst` component fires a particle burst centered on-screen when a chore is completed by a named person. Wired into `WhoDidItModal` — triggers on person pick (not on "Other", which awards 0 pts).

- 40 particles: mix of circles and thin rectangles, randomized colors, gravity-biased downward drift
- `active`/`onDone` interface: `useEffect` on `active` generates particles, calls `onDone` after 1.2s
- Particle `round: boolean` stored at creation time (not recalculated per render) to avoid borderRadius flicker
- Fixed overlay at `z-[200]`, `pointer-events-none`

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

**Mobile tap-to-complete**: On mobile the complete button is hidden (`hidden sm:flex`). The entire card `motion.div` is tappable (`onClick={onComplete}`) when `canComplete` is true. On desktop the button uses `e.stopPropagation()` to prevent double-firing. This maximizes horizontal space for the chore name on small screens.

### As-needed chores

Chores with `frequency_type === 'as_needed'` are excluded from Dashboard, By Person, By Room, and Upcoming via explicit `.filter((c) => c.frequency_type !== 'as_needed')` guards in each page's `due`/`done` useMemos. They appear only on the **Anytime** page (`/as-needed`), where:
- All as-needed chores are listed alphabetically
- Anyone can complete any of them any number of times for full points
- After completion the card stays (no period lock-out); undo toast is shown for 5 seconds

### Navigation groups (`Layout.tsx`)

Nav is defined as `NAV_GROUPS` — an array of 3 group objects, each with `label: string | null` and `items`. A `TOTAL_ITEMS` constant (sum of all item counts across groups) drives proportional `flex-basis` on mobile so every tab icon occupies equal width regardless of group size.

**Groups:**
1. `label: 'Chores'` — Today, People, Rooms, Anytime (4 items)
2. `label: null` — Upcoming, History, Scores (3 items)
3. `label: null` — Admin (1 item)

**Desktop**: each group is its own rounded-full pill (`bg-white/70 backdrop-blur rounded-full`). The "Chores" group shows its label as a small uppercase prefix + hairline divider before the links.

**Mobile**: groups share `flex` row separated by hairline `w-px` dividers. Each group `<div>` gets `flexBasis: (items.length / TOTAL_ITEMS) * 100%` and `flexShrink: 0`. The "Chores" group has a violet outline (`ring-1 ring-violet-200 bg-violet-50/60 rounded-xl`).

### Chore History page (`/history`)

Displays the last 90 days of completions per person. Uses `useCompletionHistory` (server-side `.gte` filter), grouped by calendar day. Layout mirrors By Person: sticky sidebar (desktop) / horizontal pill scroll (mobile). Tabs include all people plus an "Other" tab if any `person_id = null` completions exist. `dayLabel()` helper produces "Today · May 12", "Yesterday · May 11", or "Monday, May 9". Each row shows chore icon, name, room (if any), time, and points.

### Dashboard points display

Today's points earned are shown as a horizontal row of compact chips (one per person who has scored) in the header area. Each chip shows the person's avatar + a Sparkles icon + point count. If nobody has scored yet, a single `0` chip is shown. Chips are sorted by points descending.

Implementation: `todayPersonPts` (Map<personId, points>) computed from `completions` filtered to today (midnight→now, `person_id` non-null); `personPointsList` is the sorted people array filtered to those with pts > 0.

### Page layouts

- **Dashboard**: flat list of due chores, collapsible "N completed" section below; per-person points chips in header; excludes `as_needed` chores
- **By Person**: sticky sidebar (desktop) / horizontal pill scroll (mobile) to filter by person; excludes `as_needed` chores
- **By Room**: sticky sidebar (desktop) / horizontal pill scroll (mobile) to filter by room; excludes `as_needed` chores
- **Anytime**: lists all `as_needed` chores alphabetically; `completeVariant="pill"` + `highlighted`; repeatable
- **History**: per-person completion log for last 90 days; same sidebar/pill layout as By Person
- All filtered pages default to the first item in the list on load

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
    database.types.ts    Generated DB types + convenience re-exports; frequency_type enum includes 'as_needed'
    dueLogic.ts          Rolling due logic (nextDueFrom, isDueNow, nextDueAt, latestCompletionForUndo),
                         formatTimeUntil, defaultPoints; as_needed short-circuits isDueNow
    queries.ts           All React Query hooks and mutations (incl. useDeleteAllCompletions, useCompletionHistory)
    style.ts             personColor(sortOrder), locationIcon(loc), LOCATION_EMOJI_MAP
  components/
    Avatar.tsx           Person photo/initial circle, sizes xs–xl
    ChoreCard.tsx        Animated chore card; mobile tap-to-complete (card onClick); button hidden sm:flex;
                         supports 'icon'/'pill' complete variant + highlighted prop
    ConfettiBurst.tsx    40-particle confetti overlay; active/onDone interface; fired from WhoDidItModal
    IconDisplay.tsx      Renders emoji string OR <img> depending on icon value
    Layout.tsx           Sticky header + grouped desktop nav pills + grouped mobile bottom tab bar (NAV_GROUPS)
    Modal.tsx            Backdrop + spring modal wrapper
    PinGate.tsx          PIN lock screen + localStorage/sessionStorage helpers
    UndoToast.tsx        5-second countdown toast with undo button shown after completing a chore
    WhoDidItModal.tsx    Person picker after marking a chore done; fires ConfettiBurst on person pick;
                         resets picked+burst state on open via useEffect
  pages/
    Dashboard.tsx        Today's due chores (4am rollover), per-person points chips, undo toast,
                         collapsible done section; excludes as_needed
    ByPerson.tsx         Sidebar/pill filter by person; excludes as_needed chores
    ByLocation.tsx       Sidebar/pill filter by room; excludes as_needed chores
    AsNeeded.tsx         Lists all as_needed chores; repeatable completions with WhoDidItModal + UndoToast
    Upcoming.tsx         Non-due chores sorted by next due date (rolling logic); excludes as_needed
    History.tsx          Per-person completion log (last 90 days); sidebar/pill layout; grouped by day
    Leaderboard.tsx      All-time/monthly/yearly with prev/next navigation; skips null person_id
    Admin.tsx            CRUD for chores/people/locations + Settings (PIN, clear all data); includes as_needed freq
scripts/
  gen-icons.mjs          Generates 4 PNG PWA icons (192/512 × any/maskable) from inline SVG using sharp
public/
  pwa-192.png            PWA icon 192×192 (any)
  pwa-512.png            PWA icon 512×512 (any)
  pwa-192-maskable.png   PWA icon 192×192 (maskable, broom at 78% scale for Android safe zone)
  pwa-512-maskable.png   PWA icon 512×512 (maskable)
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

- PNG icons (192 + 512, both `any` and `maskable`) are generated by `scripts/gen-icons.mjs` using `sharp`. Run `node scripts/gen-icons.mjs` to regenerate if the icon design changes.
- Maskable icons use 78% scale broom so the broom stays within Android's safe-zone circle (80% of icon size).
- The icon SVG uses pure geometric paths (no emoji) because librsvg (used by sharp) doesn't render color emoji.
- Service worker registered with `autoUpdate` strategy.
- `navigateFallbackDenylist: [/^\/api/]` prevents SW from intercepting API routes.

## Known gaps / future work

- **Push notifications**: Could remind family members when chores are overdue.
- **Recurring chore streaks**: Track consecutive periods completed for gamification.
