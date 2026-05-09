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

/** Period start for `every N days` chores, anchored to the chore's `anchor` date. */
function periodStartEveryNDays(at: Date, anchor: Date, n: number): Date {
  const dayStart = logicalDayStart(at)
  const anchorStart = logicalDayStart(anchor)
  const daysSince = Math.floor((dayStart.getTime() - anchorStart.getTime()) / DAY_MS)
  const periodIndex = Math.floor(daysSince / n)
  return new Date(anchorStart.getTime() + periodIndex * n * DAY_MS)
}

/** Period start for `every N weeks` chores, anchored to the chore's `anchor` date. */
function periodStartEveryNWeeks(at: Date, anchor: Date, n: number): Date {
  const weekStart = logicalWeekStart(at)
  const anchorWeek = logicalWeekStart(anchor)
  const weeksSince = Math.round((weekStart.getTime() - anchorWeek.getTime()) / WEEK_MS)
  const periodIndex = Math.floor(weeksSince / n)
  return new Date(anchorWeek.getTime() + periodIndex * n * WEEK_MS)
}

/**
 * Returns the [start, end) window of the current period for this chore,
 * relative to `at` (defaults to now). End is exclusive.
 */
export function currentPeriod(chore: Chore, at: Date = new Date()): { start: Date; end: Date } {
  const anchor = new Date(chore.created_at)
  switch (chore.frequency_type) {
    case 'daily': {
      const start = logicalDayStart(at)
      const end = new Date(start.getTime() + DAY_MS)
      return { start, end }
    }
    case 'weekly': {
      const start = logicalWeekStart(at)
      const end = new Date(start.getTime() + WEEK_MS)
      return { start, end }
    }
    case 'monthly': {
      const start = logicalMonthStart(at)
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1, 4, 0, 0, 0)
      return { start, end }
    }
    case 'every_n_days': {
      const n = chore.frequency_n ?? 1
      const start = periodStartEveryNDays(at, anchor, n)
      const end = new Date(start.getTime() + n * DAY_MS)
      return { start, end }
    }
    case 'every_n_weeks': {
      const n = chore.frequency_n ?? 1
      const start = periodStartEveryNWeeks(at, anchor, n)
      const end = new Date(start.getTime() + n * WEEK_MS)
      return { start, end }
    }
  }
}

/** Is this chore due in the current period (i.e. no completion in [start, end))? */
export function isDueNow(
  chore: Chore,
  completionsForChore: Completion[],
  at: Date = new Date(),
): boolean {
  const { start, end } = currentPeriod(chore, at)
  return !completionsForChore.some((c) => {
    const ts = new Date(c.completed_at)
    return ts >= start && ts < end
  })
}

/** When does the chore's next period begin? (= end of current period) */
export function nextDueAt(chore: Chore, at: Date = new Date()): Date {
  return currentPeriod(chore, at).end
}

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
  }
}
