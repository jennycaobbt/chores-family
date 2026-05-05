/**
 * Per-person color rings, cycled by sort_order.
 * Used to give each family member a distinct color in the UI.
 */
const PERSON_PALETTE = [
  { ring: 'ring-pink-400', bg: 'bg-pink-100', text: 'text-pink-700', dot: 'bg-pink-400', solid: 'bg-pink-500' },
  { ring: 'ring-sky-400', bg: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-400', solid: 'bg-sky-500' },
  { ring: 'ring-emerald-400', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-400', solid: 'bg-emerald-500' },
  { ring: 'ring-amber-400', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-400', solid: 'bg-amber-500' },
  { ring: 'ring-violet-400', bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-400', solid: 'bg-violet-500' },
  { ring: 'ring-rose-400', bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-400', solid: 'bg-rose-500' },
  { ring: 'ring-teal-400', bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-400', solid: 'bg-teal-500' },
  { ring: 'ring-orange-400', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-400', solid: 'bg-orange-500' },
]

export function personColor(sortOrder: number) {
  const idx = ((sortOrder - 1) % PERSON_PALETTE.length + PERSON_PALETTE.length) % PERSON_PALETTE.length
  return PERSON_PALETTE[idx]
}

const LOCATION_EMOJI_MAP: Record<string, string> = {
  Kitchen: '🍳',
  'Living Room': '🛋️',
  'Art Room': '🎨',
  'Play Room': '🧸',
  'Rynny Room': '🛏️',
  'Levi Room': '🛏️',
  'Jenny Office': '💼',
  'Ryan Office': '💻',
  'Guest Room': '🛌',
  Yard: '🌳',
  'Master Bath': '🛁',
  'Hallway Bath': '🚽',
  'Downstairs Bath': '🚿',
  'Whole House': '🏠',
}

export function locationEmoji(name?: string | null): string {
  if (!name) return '📍'
  return LOCATION_EMOJI_MAP[name] ?? '📍'
}

/**
 * Returns the display icon for a location, preferring the stored `icon` field
 * over the static name-based fallback map.
 */
export function locationIcon(loc: { name: string; icon?: string | null } | null | undefined): string {
  if (!loc) return '📍'
  if (loc.icon) return loc.icon
  return LOCATION_EMOJI_MAP[loc.name] ?? '📍'
}
