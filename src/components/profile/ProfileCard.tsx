import Link from 'next/link'
import type { Profile, PortfolioItem } from '@/types'

const LEVEL_BADGE: Record<number, { label: string; bg: string }> = {
  1: { label: 'Newcomer',    bg: 'bg-neutral-500' },
  2: { label: 'Rising',      bg: 'bg-blue-600' },
  3: { label: 'Established', bg: 'bg-violet-600' },
  4: { label: 'Pro',         bg: 'bg-amber-500' },
  5: { label: 'Master',      bg: 'bg-rose-500' },
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface ProfileCardProps {
  profile: Profile
  coverImage?: PortfolioItem | null
}

export function ProfileCard({ profile, coverImage }: ProfileCardProps) {
  const badge = LEVEL_BADGE[profile.level] ?? LEVEL_BADGE[1]
  const hasBio = !!profile.bio

  return (
    <Link
      href={`/profile/${profile.id}`}
      className="group block rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all duration-200 ease-out hover:scale-[1.02]"
    >
      {/* Immagine + overlay */}
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-800" style={{ maxHeight: '220px' }}>

        {/* Cover o placeholder iniziali */}
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImage.image_url}
            alt={profile.full_name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl font-bold text-neutral-600 select-none tracking-tight">
              {getInitials(profile.full_name)}
            </span>
          </div>
        )}

        {/* Gradiente fisso dal basso */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

        {/* Stato normale: nome + badge */}
        <div
          className={[
            'absolute inset-0 transition-opacity duration-200 ease-out',
            hasBio ? 'group-hover:opacity-0' : '',
          ].join(' ')}
        >
          <div className="absolute bottom-3 left-3 right-14">
            <p className="text-sm font-semibold text-white leading-tight line-clamp-1">
              {profile.full_name}
            </p>
          </div>
          <div className="absolute bottom-3 right-3">
            <span className={['text-[11px] font-semibold text-white px-2 py-0.5 rounded-full', badge.bg].join(' ')}>
              Lv.{profile.level}
            </span>
          </div>
        </div>

        {/* Hover: bio slide-up dal basso */}
        {hasBio && (
          <div className="absolute inset-x-0 bottom-0 bg-black/80 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-out">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-sm font-semibold text-white leading-tight truncate">
                {profile.full_name}
              </p>
              <span className={['text-[11px] font-semibold text-white px-2 py-0.5 rounded-full shrink-0', badge.bg].join(' ')}>
                Lv.{profile.level}
              </span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed line-clamp-3">
              {profile.bio}
            </p>
          </div>
        )}
      </div>

      {/* Footer: ruolo · città */}
      <div className="px-3 py-2.5">
        <p className="text-xs text-neutral-500 truncate">
          {profile.role === 'photographer' ? 'Fotografo' : 'Modella / Modello'}
          {profile.city ? ` · ${profile.city}` : ''}
        </p>
      </div>
    </Link>
  )
}
