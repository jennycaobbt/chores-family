import type { Chore, Completion, FrequencyType } from './database.types'

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS

/**
 * Day rolls over at 4am local time. So 1am Tuesday is still "Monday" for chore purposes.
 * Returns the start of the logical day containing `at` (always 4am local time).
 */
export function logicalDayStart(at: Date = new Date()): Date {
  const d = new Date(at)
  if (d.getHours() < 4) d.setDate(d.getDate() - 1)
  d.setHours(4, 0, 0, 0)
  return d
}

/** Sunday 4am that begins the logical week containing `at`. */
export function logicalWeekStart(at: Date = new Date()): Date {
  const dayStart = logicalDayStart(at)
  const dow = dayStart.getDay() // 0 = Sunday
  const start = new Date(dayStart)
  start.setDate(start.getDate() - dow)
  return start
}

/** 1st-of-month 4am that begins the logical month containing `at`. */
export function logicalMonthStart(at: Date = new Date()): Date {
  const dayStart = logicalDayStart(at)
  return new Date(dayStart.getFullYear(), dayStart.getMonth(), 1, 4, 0, 0, 0)
}

// ─── Rolling period helpers ───────────────────────────────────────────────────
//
// For all frequencies except `daily`, chores use a *rolling* period anchored
// to the last completion rather than fixed calendar boundaries.
//
//   weekly      → last completion + 7 days
//   monthly     → last completion + 1 calendar month  (e.g. May 15 → Jun 15)
//   every_n_days  → last completion + n × 1 day
//   every_n_weeks → last completion + n × 7 days
//
// This ensures a weekly chore done on Saturday is due again next Saturday
// (not the very next Sunday), and a monthly chore done on the 29th is due
// on the 29th of the following month (not the 1st, two days later).

/**
 * Returns the timestamp at which `chore` becomes due again, rolling
 * forward exactly one period from `from`.
 */
function nextDueFrom(chore: Chore, from: Date): Date {
  switch (chore.frequency_type) {
    case 'weekly':
      return new Date(from.getTime() + WEEK_MS)
    case 'every_n_weeks':
      return new Date(from.getTime() + (chore.frequency_n ?? 1) * WEEK_MS)
    case 'every_n_days':
      return new Date(from.getTime() + (chore.frequency_n ?? 1) * DAY_MS)
    case 'monthly': {
      const d = new Date(from)
      d.setMonth(d.getMonth() + 1)
      return d
    }
    default:
      return from // daily / as_needed handled elsewhere
  }
}

/** Finds the most recent completion timestamp (ms since epoch), or 0. */
function latestMs(completions: Completion[]): number {
  return completions.reduce((max, c) => Math.max(max, new Date(c.completed_at).getTime()), 0)
}

// ─── currentPeriod (daily only) ──────────────────────────────────────────────
//
// For `daily` chores the "period" is still the current calendar day
// (4am → 4am).  All other frequencies use rolling logic in isDueNow /
// nextDueAt / latestCompletionForUndo directly.

/**
 * Returns the [start, end) window of the current period for a DAILY chore.
 * End is exclusive.  For non-daily chores this still works but the rolling
 * helpers above are used instead.
 */
export function currentPeriod(chore: Chore, at: Date = new Date()): { start: Date; end: Date } {
  switch (chore.frequency_type) {
    case 'daily': {
      const start = logicalDayStart(at)
      return { start, end: new Date(start.getTime() + DAY_MS) }
    }
    // The cases below are kept for backward compatibility (e.g. latestInPeriod
    // callers that have not yet been migrated).  They use calendar anchors and
    // are NOT used for isDueNow / nextDueAt logic any more.
    case 'weekly': {
      const start = logicalWeekStart(at)
      return { start, end: new Date(start.getTime() + WEEK_MS) }
    }
    case 'monthly': {
      const start = logicalMonthStart(at)
      return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 1, 4, 0, 0, 0) }
    }
    case 'every_n_days': {
      const n = chore.frequency_n ?? 1
      const anchor = logicalDayStart(new Date(chore.created_at))
      const dayStart = logicalDayStart(at)
      const daysSince = Math.floor((dayStart.getTime() - anchor.getTime()) / DAY_MS)
      const idx = Math.floor(daysSince / n)
      const start = new Date(anchor.getTime() + idx * n * DAY_MS)
      return { start, end: new Date(start.getTime() + n * DAY_MS) }
    }
    case 'every_n_weeks': {
      const n = chore.frequency_n ?? 1
      const anchorWeek = logicalWeekStart(new Date(chore.created_at))
      const curWeek = logicalWeekStart(at)
      const weeksSince = Math.round((curWeek.getTime() - anchorWeek.getTime()) / WEEK_MS)
      const idx = Math.floor(weeksSince / n)
      const start = new Date(anchorWeek.getTime() + idx * n * WEEK_MS)
      return { start, end: new Date(start.getTime() + n * WEEK_MS) }
    }
    case 'as_needed':
      return { start: new Date(0), end: new Date(8640000000000000) }
  }
}

// ─── isDueNow ─────────────────────────────────────────────────────────────────

/** Is this chore due right now? */
export function isDueNow(
  chore: Chore,
  completionsForChore: Completion[],
  at: Date = new Date(),
): boolean {
  // As-needed chores are never "due" — they live on their own page.
  if (chore.frequency_type === 'as_needed') return false

  // Daily: calendar-day check (a completion anywhere in today's 4am window).
  if (chore.frequency_type === 'daily') {
    const { start, end } = currentPeriod(chore, at)
    return !completionsForChore.some((c) => {
      const ts = new Date(c.completed_at)
      return ts >= start && ts < end
    })
  }

  // All other frequencies: rolling from last completion.
  // A chore that has never been completed is always due.
  if (completionsForChore.length === 0) return true

  const lastTs = latestMs(completionsForChore)
  return at.getTime() >= nextDueFrom(chore, new Date(lastTs)).getTime()
}

// ─── nextDueAt ────────────────────────────────────────────────────────────────

/**
 * When does this chore next become due?
 *
 * For daily: end of the current calendar day (4am tomorrow).
 * For rolling types: last completion + one period.
 * If never completed, returns `at` (already due).
 */
export function nextDueAt(
  chore: Chore,
  completionsForChore: Completion[],
  at: Date = new Date(),
): Date {
  if (chore.frequency_type === 'daily') {
    return currentPeriod(chore, at).end
  }
  if (completionsForChore.length === 0) {
    return at // already due, treat as due now
  }
  return nextDueFrom(chore, new Date(latestMs(completionsForChore)))
}

// ─── latestCompletionForUndo ─────────────────────────────────────────────────

/**
 * Returns the most recent completion that counts as "done this period"
 * — the one that would be targeted by an undo action.
 *
 * – Daily: the most recent completion within today's 4am window.
 * – Rolling types: the most recent completion overall, provided the
 *   chore is not yet due again.  Returns undefined once the chore
 *   becomes due again (nothing left to undo).
 */
export function latestCompletionForUndo(
  chore: Chore,
  completionsForChore: Completion[],
  at: Date = new Date(),
): Completion | undefined {
  if (completionsForChore.length === 0) return undefined

  if (chore.frequency_type === 'daily') {
    const { start, end } = currentPeriod(chore, at)
    return completionsForChore
      .filter((c) => {
        const ts = new Date(c.completed_at)
        return ts >= start && ts < end
      })
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0]
  }

  // Rolling types: most recent completion, but only if still within the period.
  const sorted = [...completionsForChore].sort(
    (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime(),
  )
  const latest = sorted[0]
  const nextDue = nextDueFrom(chore, new Date(latest.completed_at))
  // If we're at or past the next due date, the chore is due again and
  // there's nothing to undo from the last period.
  if (at.getTime() >= nextDue.getTime()) return undefined
  return latest
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

/** Format the time-until in a friendly way: "in 2 days", "tomorrow", "in 3 hrs". */
export function formatTimeUntil(target: Date, now: Date = new Date()): string {
  const ms = target.getTime() - now.getTime()
  if (ms <= 0) return 'now'
  const minutes = Math.round(ms / 60000)
  const hours = Math.round(ms / 3_600_000)
  const days = Math.round(ms / DAY_MS)
  if (minutes < 60) return `in ${minutes} min`
  if (hours < 24) return `in ${hours} hr${hours === 1 ? '' : 's'}`
  if (days === 1) return 'tomorrow'
  if (days < 14) return `in ${days} days`
  const weeks = Math.round(days / 7)
  if (weeks < 8) return `in ${weeks} week${weeks === 1 ? '' : 's'}`
  const months = Math.round(days / 30)
  return `in ${months} month${months === 1 ? '' : 's'}`
}

export function formatFrequency(type: FrequencyType, n: number | null): string {
  switch (type) {
    case 'daily':
      return 'Every day'
    case 'weekly':
      return 'Every week'
    case 'monthly':
      return 'Every month'
    case 'every_n_days':
      return `Every ${n} days`
    case 'every_n_weeks':
      return `Every ${n} weeks`
    case 'as_needed':
      return 'As needed'
  }
}

/** Default points by frequency. Daily=1, weekly=3, monthly=5, scaled in between. */
export function defaultPoints(type: FrequencyType, n: number | null): number {
  switch (type) {
    case 'daily':
      return 1
    case 'weekly':
      return 3
    case 'monthly':
      return 5
    case 'every_n_days':
      if (!n || n <= 1) return 1
      if (n <= 2) return 1
      if (n <= 4) return 2
      if (n <= 6) return 3
      return 4
    case 'every_n_weeks':
      if (!n || n <= 1) return 3
      if (n <= 2) return 4
      if (n <= 3) return 4
      return 5
    case 'as_needed':
      return 2
  }
}
