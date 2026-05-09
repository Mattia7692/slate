import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProfileCard } from '@/components/profile/ProfileCard'
import { ExploreFilters } from './ExploreFilters'
import { AppNav } from '@/components/layout/AppNav'
import type { Profile, PortfolioItem, Notification, Genre } from '@/types'

interface ExplorePageProps {
  searchParams: Promise<{
    role?: string
    level?: string
    city?: string
    genre?: string
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
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  const notifications = (rawNotifications ?? []) as Notification[]

  const userInitials = (profile?.full_name ?? '')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  // Fetch distinct cities + all genres in parallelo
  const [{ data: cityRows }, { data: rawGenres }] = await Promise.all([
    adminClient.from('profiles').select('city').eq('status', 'approved').not('city', 'is', null),
    adminClient.from('genres').select('id, slug, label, order_index').order('order_index'),
  ])
  const cities = [...new Set((cityRows ?? []).map((r) => r.city as string).filter(Boolean))].sort()
  const genres = (rawGenres ?? []) as Genre[]

  const { role, level, city, genre } = await searchParams

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
  if (city) {
    query = query.eq('city', city)
  }

  // Filtro per genere: due passi
  if (genre) {
    const { data: pgRows } = await adminClient
      .from('profile_genres')
      .select('profile_id')
      .eq('genre_id', genre)
    const idsWithGenre = (pgRows ?? []).map((r) => r.profile_id as string)
    if (idsWithGenre.length === 0) {
      // Nessun profilo con questo genere — forza risultato vuoto
      query = query.in('id', ['00000000-0000-0000-0000-000000000000'])
    } else {
      query = query.in('id', idsWithGenre)
    }
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
            currentCity={city ?? ''}
            currentGenre={genre ?? ''}
            cities={cities}
            genres={genres}
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
