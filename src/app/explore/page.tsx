import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProfileCard } from '@/components/profile/ProfileCard'
import { ExploreFilters } from './ExploreFilters'
import { AppNav } from '@/components/layout/AppNav'
import type { Profile, PortfolioItem, Notification } from '@/types'

interface ExplorePageProps {
  searchParams: Promise<{
    role?: string
    level?: string
  }>
}

type ProfileWithCover = Profile & { cover: PortfolioItem | null }

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single()

  const adminClient = createAdminClient()
  const { data: rawNotifications } = await adminClient
    .from('notifications')
    .select('*')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  const notifications = (rawNotifications ?? []) as Notification[]

  const userInitials = (profile?.full_name ?? '')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const { role, level } = await searchParams

  let query = supabase
    .from('profiles')
    .select('*')
    .eq('status', 'approved')
    .neq('id', user.id)
    .order('xp', { ascending: false })

  if (role === 'photographer' || role === 'model') {
    query = query.eq('role', role)
  }
  if (level) {
    query = query.eq('level', parseInt(level))
  }

  const { data: profiles } = await query

  // Cover card (prima foto del portfolio)
  const profileIds = profiles?.map((p) => p.id) ?? []
  const { data: covers } = profileIds.length
    ? await supabase
        .from('portfolio_items')
        .select('*')
        .in('profile_id', profileIds)
        .eq('order_index', 0)
    : { data: [] }

  const coverMap = new Map(covers?.map((c) => [c.profile_id, c]) ?? [])

  const profilesWithCover: ProfileWithCover[] = (profiles ?? []).map((p) => ({
    ...p,
    cover: coverMap.get(p.id) ?? null,
  }))

  const count = profilesWithCover.length

  return (
    <div className="min-h-screen">
      <AppNav
        userInitials={userInitials}
        userId={user.id}
        avatarUrl={profile?.avatar_url ?? null}
        notifications={notifications}
      />

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Esplora</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {count} {count === 1 ? 'profilo approvato' : 'profili approvati'}
          </p>
        </div>
        {/* Filtri */}
        <Suspense>
          <ExploreFilters
            currentRole={role ?? ''}
            currentLevel={level ?? ''}
          />
        </Suspense>

        {/* Griglia */}
        {profilesWithCover.length === 0 ? (
          <div className="py-32 text-center space-y-2">
            <p className="text-neutral-400">Nessun profilo trovato.</p>
            <p className="text-sm text-neutral-600">Prova a cambiare i filtri.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {profilesWithCover.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                coverImage={profile.cover}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
