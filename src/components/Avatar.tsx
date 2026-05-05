import type { Person } from '../lib/database.types'
import { personColor } from '../lib/style'

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const SIZES: Record<Size, string> = {
  xs: 'h-7 w-7 text-xs',
  sm: 'h-9 w-9 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-24 w-24 text-3xl',
}

const RINGS: Record<Size, string> = {
  xs: 'ring-2',
  sm: 'ring-2',
  md: 'ring-2',
  lg: 'ring-[3px]',
  xl: 'ring-4',
}

export function Avatar({
  person,
  size = 'md',
  ring = true,
}: {
  person: Person | null | undefined
  size?: Size
  ring?: boolean
}) {
  if (!person) {
    return (
      <div
        className={`${SIZES[size]} rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold shrink-0`}
        aria-hidden
      >
        ?
      </div>
    )
  }
  const c = personColor(person.sort_order)
  const initial = person.name.slice(0, 1).toUpperCase()
  const ringClasses = ring ? `${RINGS[size]} ${c.ring} ring-offset-2 ring-offset-white` : ''
  if (person.photo_url) {
    return (
      <img
        src={person.photo_url}
        alt={person.name}
        className={`${SIZES[size]} rounded-full object-cover ${ringClasses} shrink-0`}
        loading="lazy"
      />
    )
  }
  return (
    <div
      className={`${SIZES[size]} rounded-full ${c.bg} ${c.text} ${ringClasses} flex items-center justify-center font-bold shrink-0`}
      aria-label={person.name}
      title={person.name}
    >
      {initial}
    </div>
  )
}
