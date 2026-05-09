import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProfileEditForm } from './ProfileEditForm'
import type { Genre } from '@/types'
import type { PhotoExif } from '@/lib/exif'
import { getLevelProgress, getLevelName } from '@/lib/xp'
import { isFounder } from '@/lib/founder'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar'
import { AppNav } from '@/components/layout/AppNav'
import { RoleBadge } from '@/components/profile/RoleBadge'
import type { Profile, PortfolioItem, Notification } from '@/types'

const LEVEL_BAR_COLOR: Record<number, string> = {
  1: 'bg-neutral-500',
  2: 'bg-blue-500',
  3: 'bg-violet-500',
  4: 'bg-amber-500',
  5: 'bg-orange-500',
}

export default async function ProfileEditPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()
  const [[{ data: profile }, { data: portfolioItems }], { data: rawNotifications }, { data: rawProjects }, { data: rawGenres }, { data: rawProfileGenres }] = await Promise.all([
    Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('portfolio_items').select('*').eq('profile_id', user.id).order('order_index'),
    ]),
    adminClient.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
    supabase.from('projects')
      .select('id, status')
      .or(`photographer_id.eq.${user.id},model_id.eq.${user.id}`)
      .not('status', 'in', '("cancelled","completed")'),
    supabase.from('genres').select('id, name').order('name'),
    adminClient.from('profile_genres').select('genre_id').eq('profile_id', user.id),
  ])

  if (!profile) redirect('/onboarding')

  const genres = (rawGenres ?? []) as Genre[]
  const selectedGenreIds = (rawProfileGenres ?? []).map((r) => r.genre_id as string)

  const notifications = (rawNotifications ?? []) as Notification[]
  const activeCount = rawProjects?.length ?? 0
  const userInitials = (profile.full_name as string).split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  // Signed URL per la foto anzianità (bucket privato)
  let oldestPhotoSignedUrl: string | null = null
  if ((profile as Profile).oldest_photo_url) {
    const path = (profile as Profile).oldest_photo_url!.split('/oldest-photos/')[1]?.split('?')[0]
    if (path) {
      const { data: signed } = await adminClient.storage
        .from('oldest-photos')
        .createSignedUrl(decodeURIComponent(path), 3600)
      oldestPhotoSignedUrl = signed?.signedUrl ?? null
    }
  }

  const xpProgress = getLevelProgress((profile as Profile).xp)
  const levelName = getLevelName((profile as Profile).level)
  const barColor = LEVEL_BAR_COLOR[(profile as Profile).level] ?? 'bg-neutral-500'
  const founder = isFounder(user.id)

  return (
    <div className="min-h-screen">
      <AppNav
        userInitials={userInitials}
        userId={user.id}
        avatarUrl={(profile as Profile).avatar_url ?? null}
        notifications={notifications}
      />

      <div className="sm:flex sm:items-start sm:justify-center sm:px-6 sm:py-8">
        <div className="w-full sm:max-w-4xl sm:rounded-2xl sm:border border-neutral-800 overflow-hidden flex flex-col sm:flex-row sm:min-h-[600px]">

          {/* ── SIDEBAR ── */}
          <aside className="sm:w-52 border-b sm:border-b-0 sm:border-r border-neutral-800 bg-neutral-950 flex flex-col shrink-0">

            {/* Avatar + nome */}
            <div className="flex items-center gap-3 p-4 sm:flex-col sm:items-start sm:px-4 sm:pt-4 sm:pb-0">
              <ProfileAvatar
                avatarUrl={(profile as Profile).avatar_url ?? null}
                role={(profile as Profile).role}
                size={44}
              />
              <div className="flex-1 min-w-0 sm:mt-2">
                <p className="text-sm font-medium text-neutral-100 leading-tight">{profile.full_name}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <RoleBadge role={(profile as Profile).role} />
                  {profile.city && <span className="text-xs text-neutral-500">{profile.city}</span>}
                </div>
              </div>
              <span className="sm:hidden text-[11px] font-medium text-neutral-500 border border-neutral-700 px-2 py-0.5 rounded-full shrink-0">
                Lv.{profile.level}
              </span>
            </div>

            {/* XP bar */}
            <div className="px-4 pt-3 pb-3 sm:pb-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-neutral-500">Lv.{profile.level} {levelName}</span>
                <span className="text-[10px] text-neutral-600">
                  {(profile as Profile).xp >= 1000
                    ? `${((profile as Profile).xp / 1000).toFixed(0)}k`
                    : (profile as Profile).xp} xp
                </span>
              </div>
              <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={['h-full rounded-full transition-all', barColor].join(' ')}
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>

            {/* Nav */}
            <nav className="flex sm:flex-col gap-1 sm:gap-0.5 overflow-x-auto px-3 pb-3 sm:px-4 sm:pb-0 sm:flex-1 scrollbar-hide">
              {[
                { label: 'Il mio profilo', href: '/me' },
                { label: 'Progetti', href: '/projects', badge: activeCount || null },
                { label: 'Messaggi', href: '/messages' },
                { label: 'Le mie visioni', href: '/bacheca' },
                { label: 'Impostazioni', href: '/profile/edit', active: true },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors whitespace-nowrap sm:whitespace-normal shrink-0 sm:shrink',
                    item.active
                      ? 'bg-neutral-800 text-neutral-100 font-medium'
                      : 'text-neutral-500 hover:bg-neutral-800/60 hover:text-neutral-200',
                  ].join(' ')}
                >
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className="bg-red-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              ))}
            </nav>

            {founder && (
              <div className="hidden sm:block mt-auto px-4 pt-4 pb-4">
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-amber-600 hover:bg-amber-500/10 hover:text-amber-400 transition-colors"
                >
                  ⚡ Admin
                </Link>
              </div>
            )}
          </aside>

          {/* ── MAIN ── */}
          <main className="flex-1 px-4 sm:px-6 py-5 min-w-0">
            <ProfileEditForm
              profile={profile as Profile}
              portfolioItems={(portfolioItems ?? []) as PortfolioItem[]}
              oldestPhotoSignedUrl={oldestPhotoSignedUrl}
              oldestPhotoExif={((profile as Profile).oldest_photo_exif as PhotoExif | null) ?? null}
              genres={genres}
              initialGenreIds={selectedGenreIds}
            />
          </main>

        </div>
      </div>
    </div>
  )
}
