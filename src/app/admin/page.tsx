import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLevelName, yearsFromStartYear } from '@/lib/xp'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar'
import { RoleBadge } from '@/components/profile/RoleBadge'
import type { ProfileStatus, Profile } from '@/types'

const STATUS_FILTER_OPTIONS: { label: string; value: ProfileStatus | 'all' }[] = [
  { label: 'In attesa', value: 'pending' },
  { label: 'Approvati', value: 'approved' },
  { label: 'Sospesi', value: 'suspended' },
  { label: 'Tutti', value: 'all' },
]

const STATUS_BADGE: Record<ProfileStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  suspended: 'bg-red-500/15 text-red-400 border-red-500/20',
}

const STATUS_LABEL: Record<ProfileStatus, string> = {
  pending: 'In attesa',
  approved: 'Approvato',
  suspended: 'Sospeso',
}

interface AdminPageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireAdmin()

  const { status = 'pending' } = await searchParams
  const admin = createAdminClient()

  let query = admin
    .from('profiles')
    .select('id, full_name, role, city, xp, level, status, created_at, years_in_industry, career_start_year, avatar_url')
    .order('created_at', { ascending: false })

  if (status !== 'all') {
    query = query.eq('status', status as ProfileStatus)
  }

  const { data: profiles, error } = await query

  // Conteggi per i tab
  const { data: counts } = await admin
    .from('profiles')
    .select('status')

  const countMap = { pending: 0, approved: 0, suspended: 0, all: counts?.length ?? 0 }
  counts?.forEach((p) => {
    if (p.status in countMap) countMap[p.status as ProfileStatus]++
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Profili utente</h1>
      </div>

      {/* Tab filtro status */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_FILTER_OPTIONS.map(({ label, value }) => (
          <Link
            key={value}
            href={`/admin?status=${value}`}
            className={[
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              status === value
                ? 'bg-white text-neutral-900 border-white'
                : 'text-neutral-400 border-neutral-700 hover:border-neutral-500 hover:text-neutral-200',
            ].join(' ')}
          >
            {label}
            <span className={['ml-1.5', status === value ? 'text-neutral-500' : 'text-neutral-600'].join(' ')}>
              {countMap[value]}
            </span>
          </Link>
        ))}
      </div>

      {/* Errore */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error.message}
        </div>
      )}

      {/* Lista */}
      {!profiles?.length ? (
        <p className="text-sm text-neutral-500 py-12 text-center">Nessun profilo in questa categoria.</p>
      ) : (
        <div className="space-y-2">
          {profiles.map((profile) => (
            <Link
              key={profile.id}
              href={`/admin/${profile.id}`}
              className="flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900/50 px-5 py-4 hover:border-neutral-700 hover:bg-neutral-900 transition-colors"
            >
              <ProfileAvatar avatarUrl={(profile as unknown as Profile).avatar_url ?? null} role={(profile as unknown as Profile).role} size={40} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile.full_name}</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  <RoleBadge role={profile.role as 'photographer' | 'model'} />
                  {profile.city ? ` · ${profile.city}` : ''}
                  {' · '}
                  {getLevelName(profile.level)} ({profile.xp} XP)
                  {' · '}
                  {(profile as unknown as { career_start_year?: number | null }).career_start_year
                    ? yearsFromStartYear((profile as unknown as { career_start_year: number }).career_start_year)
                    : profile.years_in_industry} anni esperienza
                </p>
              </div>

              {/* Status badge */}
              <span
                className={[
                  'shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  STATUS_BADGE[profile.status as ProfileStatus],
                ].join(' ')}
              >
                {STATUS_LABEL[profile.status as ProfileStatus]}
              </span>

              {/* Data iscrizione */}
              <span className="shrink-0 text-xs text-neutral-600 hidden sm:block">
                {new Date(profile.created_at).toLocaleDateString('it-IT')}
              </span>

              <span className="text-neutral-600 shrink-0">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
