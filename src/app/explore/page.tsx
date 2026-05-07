import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileCard } from '@/components/profile/ProfileCard'
import { ExploreFilters } from './ExploreFilters'
import type { Profile, PortfolioItem } from '@/types'

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
      {/* Header */}
      <header className="border-b border-neutral-800 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Esplora</h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              {count} {count === 1 ? 'profilo approvato' : 'profili approvati'}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
