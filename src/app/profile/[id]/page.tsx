import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { XPBadge } from '@/components/profile/XPBadge'
import { isFounder } from '@/lib/founder'
import { PortfolioGrid } from '@/components/profile/PortfolioGrid'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar'
import { RoleBadge } from '@/components/profile/RoleBadge'
import { AppNav } from '@/components/layout/AppNav'
import { ProposeModal } from './ProposeModal'
import { MessageButton } from './MessageButton'
import type { ReviewWithReviewer, Notification, Genre } from '@/types'

interface ProfilePageProps {
  params: Promise<{ id: string }>
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 text-sm">
      {'★'.repeat(rating)}
      <span className="text-neutral-700">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { id } = await params

  // Fetch profilo (solo approvati, oppure il proprio)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .or(`status.eq.approved,id.eq.${user.id}`)
    .single()

  if (!profile) notFound()

  const isOwnProfile = user.id === id

  // Profilo dell'utente corrente (per calcolo compenso + nav)
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id, role, level, full_name, avatar_url, city')
    .eq('id', user.id)
    .single()

  const adminClient = createAdminClient()
  const { data: rawNotifications } = await adminClient.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30)
  const notifications = (rawNotifications ?? []) as Notification[]
  const userInitials = (myProfile?.full_name ?? '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  // Portfolio, recensioni, generi in parallelo
  const [{ data: portfolioItems }, { data: reviews }, { data: profileGenreRows }] = await Promise.all([
    supabase
      .from('portfolio_items')
      .select('*')
      .eq('profile_id', id)
      .order('order_index'),
    supabase
      .from('reviews')
      .select('*, reviewer:profiles!reviews_reviewer_id_fkey(id, full_name, role)')
      .eq('reviewee_id', id)
      .order('created_at', { ascending: false }),
    adminClient
      .from('profile_genres')
      .select('genre_id, genres(id, name)')
      .eq('profile_id', id),
  ])

  const profileGenres = (profileGenreRows ?? [])
    .map((r) => {
      const g = r.genres as unknown
      if (!g || typeof g !== 'object' || Array.isArray(g)) return null
      return g as Genre
    })
    .filter((g): g is Genre => g !== null)

  const avgRating =
    reviews && reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null

  return (
    <div className="min-h-screen">
      <AppNav userInitials={userInitials} userId={user.id} avatarUrl={myProfile?.avatar_url ?? null} notifications={notifications} />

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        {/* Hero */}
        <div className="flex items-start gap-5">
          <ProfileAvatar avatarUrl={profile.avatar_url ?? null} role={profile.role} size={64} />

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-xl font-semibold">{profile.full_name}</h1>
                <p className="text-sm text-neutral-400 mt-0.5">
                  <RoleBadge role={profile.role} />
                  {profile.city ? ` · ${profile.city}` : ''}
                </p>
              </div>
              <XPBadge level={profile.level} xp={profile.xp} showXp isFounder={isFounder(id)} />
            </div>

            {/* Stats riga */}
            <div className="flex items-center gap-4 text-sm text-neutral-500 flex-wrap">
              {(() => {
                const csy = (profile as unknown as { career_start_year?: number | null }).career_start_year
                const years = csy ? new Date().getFullYear() - csy : (profile.years_in_industry as number)
                return years > 0 ? <span>{years} anni nel settore</span> : null
              })()}
              {avgRating && (
                <span className="flex items-center gap-1">
                  <span className="text-amber-400">★</span>
                  {avgRating}
                  <span className="text-neutral-600">({reviews!.length})</span>
                </span>
              )}
              {profile.instagram_url && (
                <a
                  href={
                    profile.instagram_url.startsWith('@')
                      ? `https://instagram.com/${profile.instagram_url.slice(1)}`
                      : profile.instagram_url
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neutral-300 transition-colors"
                >
                  {profile.instagram_url}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Generi */}
        {profileGenres.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {profileGenres.map((g) => (
              <span
                key={g.id}
                className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs text-neutral-400"
              >
                {g.name}
              </span>
            ))}
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <section className="space-y-2">
            <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Bio</h2>
            <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
              {profile.bio}
            </p>
          </section>
        )}

        {/* CTA */}
        {!isOwnProfile && profile.status === 'approved' && myProfile && myProfile.role !== profile.role && (
          <div className="flex items-center gap-3 flex-wrap">
            <ProposeModal
              targetProfileId={id}
              targetName={profile.full_name}
              targetLevel={profile.level}
              targetRole={profile.role}
              targetCity={profile.city ?? null}
              currentLevel={myProfile.level}
              currentRole={myProfile.role}
              currentName={myProfile.full_name}
              currentCity={(myProfile as { city?: string | null }).city ?? null}
              currentUserId={user!.id}
            />
            <MessageButton targetUserId={id} />
          </div>
        )}
        {!isOwnProfile && profile.status === 'approved' && myProfile && myProfile.role === profile.role && (
          <div className="flex items-center gap-3 flex-wrap">
            <MessageButton targetUserId={id} />
          </div>
        )}

        {isOwnProfile && (
          <Link
            href="/profile/edit"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm font-medium hover:border-neutral-500 transition-colors"
          >
            Modifica profilo
          </Link>
        )}

        {/* Portfolio */}
        <section className="space-y-4">
          <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Portfolio / Book
            {portfolioItems?.length ? ` (${portfolioItems.length})` : ''}
          </h2>
          <PortfolioGrid items={portfolioItems ?? []} />
        </section>

        {/* Recensioni */}
        {reviews && reviews.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Recensioni ({reviews.length})
            </h2>
            <div className="space-y-3">
              {(reviews as ReviewWithReviewer[]).map((review) => (
                <div
                  key={review.id}
                  className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <Link
                        href={`/profile/${review.reviewer.id}`}
                        className="text-sm font-medium hover:text-neutral-300 transition-colors"
                      >
                        {review.reviewer.full_name}
                      </Link>
                      <RoleBadge role={review.reviewer.role as 'photographer' | 'model'} className="ml-2" />
                    </div>
                    <div className="flex items-center gap-2">
                      <StarRating rating={review.rating} />
                      <span className="text-xs text-neutral-600">
                        {new Date(review.created_at).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-neutral-400 leading-relaxed">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
