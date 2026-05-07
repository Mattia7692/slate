import type { UserRole } from '@/types'

const ROLE_BADGE: Record<UserRole, string> = {
  photographer: '📷',
  model: '🧍',
}

interface ProfileAvatarProps {
  avatarUrl: string | null
  role: UserRole
  size?: number
}

export function ProfileAvatar({ avatarUrl, role, size = 64 }: ProfileAvatarProps) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {/* Avatar */}
      <div
        className="relative w-full h-full rounded-2xl bg-neutral-800 overflow-hidden flex items-center justify-center"
        style={{ fontSize: size * 0.45 }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="Avatar"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <span>{ROLE_BADGE[role]}</span>
        )}
      </div>

      {/* Badge ruolo */}
      {avatarUrl && (
        <span
          className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 flex items-center justify-center rounded-full bg-neutral-900 border border-neutral-700"
          style={{ width: size * 0.42, height: size * 0.42, fontSize: size * 0.24 }}
        >
          {ROLE_BADGE[role]}
        </span>
      )}
    </div>
  )
}
