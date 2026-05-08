import type { UserRole } from '@/types'

const ROLE_COLOR: Record<UserRole, string> = {
  photographer: 'bg-sky-500/20 text-sky-400',
  model:        'bg-rose-500/20 text-rose-400',
}

const ROLE_DOT: Record<UserRole, string> = {
  photographer: 'bg-sky-500',
  model:        'bg-rose-500',
}

interface ProfileAvatarProps {
  avatarUrl: string | null
  role: UserRole
  size?: number
}

export function ProfileAvatar({ avatarUrl, role, size = 64 }: ProfileAvatarProps) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className={[
          'relative w-full h-full rounded-2xl overflow-hidden flex items-center justify-center font-semibold',
          avatarUrl ? 'bg-neutral-800' : ROLE_COLOR[role],
        ].join(' ')}
        style={{ fontSize: size * 0.38 }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="Avatar" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <span>{role === 'photographer' ? 'F' : 'M'}</span>
        )}
      </div>

      {/* Dot ruolo */}
      <span
        className={[
          'absolute bottom-0 right-0 translate-x-0.5 translate-y-0.5 rounded-full border-2 border-neutral-950',
          ROLE_DOT[role],
        ].join(' ')}
        style={{ width: size * 0.28, height: size * 0.28 }}
      />
    </div>
  )
}
