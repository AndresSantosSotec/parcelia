import { useState } from 'react'
import { User } from '@phosphor-icons/react'
import { getMediaUrl } from '@/utils/imageUrl'

interface SafeAvatarProps {
  src?: string | null
  alt?: string
  className?: string
  iconSize?: number
  fallbackClassName?: string
}

export function SafeAvatar({
  src,
  alt = 'Avatar',
  className = 'w-10 h-10 rounded-full object-cover',
  iconSize = 20,
  fallbackClassName = 'w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary'
}: SafeAvatarProps) {
  const [hasError, setHasError] = useState(false)
  const resolvedUrl = getMediaUrl(src)

  if (!resolvedUrl || hasError) {
    return (
      <div className={fallbackClassName}>
        <User size={iconSize} />
      </div>
    )
  }

  return (
    <img
      src={resolvedUrl}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  )
}
