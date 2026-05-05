/**
 * Renders an icon that is either an emoji string or a remote image URL.
 * Wrap in a sized container to control dimensions for image icons.
 */
export function IconDisplay({
  icon,
  className = '',
}: {
  icon?: string | null
  className?: string
}) {
  if (!icon) return null
  if (icon.startsWith('http') || icon.startsWith('data:') || icon.startsWith('blob:')) {
    return (
      <img
        src={icon}
        alt=""
        className={`object-cover rounded-lg w-full h-full ${className}`}
        draggable={false}
      />
    )
  }
  return (
    <span aria-hidden className={className}>
      {icon}
    </span>
  )
}
