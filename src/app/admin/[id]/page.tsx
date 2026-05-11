import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLevelName, computeSeniorityBonus, yearsFromStartYear } from '@/lib/xp'
import { isFounder } from '@/lib/founder'
import { AdminActionsPanel } from './AdminActionsPanel'
import { RoleBadge } from '@/components/profile/RoleBadge'
import { XPBadge } from '@/components/profile/XPBadge'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar'
import { PortfolioGrid } from '@/components/profile/PortfolioGrid'
import { genrePillClass } from '@/lib/genreColors'
import type { Profile, ProfileStatus, UserRole, Genre, ReviewWithReviewer } from '@/types'
import type { PhotoExif } from '@/lib/exif'

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

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 text-sm">
      {'★'.repeat(rating)}
      <span className="text-neutral-700">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

interface AdminProfilePageProps {
  params: Promise<{ id: string }>
}

export default async function AdminProfilePage({ params }: AdminProfilePageProps) {
  await requireAdmin()

  const { id } = await params
  const admin = createAdminClient()

  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  const currentIsFounder = isFounder(currentUser?.id ?? '')

  const [
    { data: profile },
    { data: portfolioItems },
    { data: authUserResult },
    { data: profileGenreRows },
    { data: reviews },
  ] = await Promise.all([
    admin.from('profiles').select('*').eq('id', id).single(),
    admin.from('portfolio_items').select('*').eq('profile_id', id).order('order_index'),
    admin.auth.admin.getUserById(id),
    admin.from('profile_genres').select('genre_id, genres(id, slug, label, order_index)').eq('profile_id', id),
    admin.from('reviews')
      .select('*, reviewer:profiles!reviews_reviewer_id_fkey(id, full_name, role)')
      .eq('reviewee_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!profile) notFound()

  const authUser = (authUserResult as unknown as { user?: { email?: string } } | null)?.user

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

  // Signed URL per la foto anzianità (bucket privato)
  let oldestPhotoSignedUrl: string | null = null
  if (profile.oldest_photo_url) {
    const path = profile.oldest_photo_url.split('/oldest-photos/')[1]?.split('?')[0]
    if (path) {
      const { data: signed } = await admin.storage
        .from('oldest-photos')
        .createSignedUrl(decodeURIComponent(path), 3600)
      oldestPhotoSignedUrl = signed?.signedUrl ?? null
    }
  }

  const csy = (profile as Profile & { career_start_year?: number | null }).career_start_year
  const years = csy ? yearsFromStartYear(csy) : profile.years_in_industry

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Link href="/admin" className="hover:text-neutral-300 transition-colors">Profili</Link>
        <span>›</span>
        <span className="text-neutral-300">{profile.full_name}</span>
      </div>

      {/* Hero — avatar + info + azioni admin */}
      <div className="flex items-start gap-5 flex-wrap sm:flex-nowrap">
        <ProfileAvatar avatarUrl={(profile as unknown as Profile).avatar_url ?? null} role={profile.role as UserRole} size={64} />

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold">{profile.full_name}</h1>
                <span className={['rounded-full border px-2.5 py-0.5 text-xs font-medium', STATUS_BADGE[profile.status as ProfileStatus]].join(' ')}>
                  {STATUS_LABEL[profile.status as ProfileStatus]}
                </span>
                {isFounder(id) && (
                  <span className="rounded-full border border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-rose-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                    ✦ Founder
                  </span>
                )}
                {!isFounder(id) && profile.is_admin && (
                  <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-400">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-400 mt-0.5">
                <RoleBadge role={profile.role as UserRole} />
                {profile.city ? ` · ${profile.city}` : ''}
              </p>
            </div>
            <XPBadge level={profile.level} xp={profile.xp} showXp isFounder={isFounder(id)} />
          </div>

          {/* Stats riga */}
          <div className="flex items-center gap-4 text-sm text-neutral-500 flex-wrap">
            {(years as number) > 0 && <span>{years} anni nel settore</span>}
            {profile.hourly_rate && (
              <span className="text-emerald-400 font-medium">€{profile.hourly_rate}/h</span>
            )}
            {avgRating && (
              <span className="flex items-center gap-1">
                <span className="text-amber-400">★</span>
                {avgRating}
                <span className="text-neutral-600">({reviews!.length})</span>
              </span>
            )}
            {profile.instagram_url && (
              <a
                href={profile.instagram_url.startsWith('@') ? `https://instagram.com/${profile.instagram_url.slice(1)}` : profile.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-300 transition-colors"
              >
                {profile.instagram_url}
              </a>
            )}
            {authUser?.email && (
              <span className="text-neutral-600 text-xs">{authUser.email}</span>
            )}
          </div>
        </div>
      </div>

      {/* Pannello azioni admin */}
      <AdminActionsPanel
        profileId={id}
        currentStatus={profile.status as ProfileStatus}
        isAdmin={!!profile.is_admin}
        isSelf={currentUser?.id === id}
        isFounderProfile={isFounder(id)}
        currentIsFounder={currentIsFounder}
        profileName={profile.full_name}
      />

      {/* Info grid — dati piattaforma */}
      <div className="grid grid-cols-2 gap-3">
        <InfoCard label="Livello" value={`${getLevelName(profile.level)} (Lv. ${profile.level})`} />
        <InfoCard label="XP totali" value={`${profile.xp} XP`} />
        <InfoCard
          label="Esperienza"
          value={`${years} anni${csy ? ` (dal ${csy})` : ''}`}
          sub={`Bonus anzianità: +${computeSeniorityBonus(years as number)} XP`}
        />
        <InfoCard
          label="Iscritto il"
          value={new Date(profile.created_at).toLocaleDateString('it-IT', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
        />
      </div>

      {/* Generi */}
      {profileGenres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {profileGenres.map((g) => (
            <span key={g.id} className={genrePillClass(g.order_index)}>{g.label}</span>
          ))}
        </div>
      )}

      {/* Bio */}
      {profile.bio && (
        <section className="space-y-2">
          <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Bio</h2>
          <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
        </section>
      )}

      {/* Misure (solo modelle) */}
      {profile.role === 'model' && profile.height_cm && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Misure</h2>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-neutral-500">Altezza</span>
                <span className="font-medium">{profile.height_cm} cm</span>
              </div>
              {(profile.bust_cm || profile.waist_cm || profile.hips_cm) && (
                <div className="flex justify-between gap-2">
                  <span className="text-neutral-500">Misure</span>
                  <span className="font-medium tabular-nums">
                    {profile.bust_cm ?? '—'}/{profile.waist_cm ?? '—'}/{profile.hips_cm ?? '—'}
                  </span>
                </div>
              )}
              {profile.clothing_size && (
                <div className="flex justify-between gap-2">
                  <span className="text-neutral-500">Taglia</span>
                  <span className="font-medium">{profile.clothing_size}</span>
                </div>
              )}
              {profile.shoe_size && (
                <div className="flex justify-between gap-2">
                  <span className="text-neutral-500">Scarpe</span>
                  <span className="font-medium">{profile.shoe_size}</span>
                </div>
              )}
              {profile.hair_color && (
                <div className="flex justify-between gap-2">
                  <span className="text-neutral-500">Capelli</span>
                  <span className="font-medium capitalize">
                    {[profile.hair_color, profile.hair_texture].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              {profile.eye_color && (
                <div className="flex justify-between gap-2">
                  <span className="text-neutral-500">Occhi</span>
                  <span className="font-medium capitalize">{profile.eye_color}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Foto di verifica anzianità — solo admin */}
      {(oldestPhotoSignedUrl || profile.oldest_photo_url) && (
        <section className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div>
            <h2 className="text-sm font-medium text-amber-400 uppercase tracking-wider">
              Prima foto professionale
            </h2>
            <p className="text-xs text-neutral-600 mt-0.5">
              Riservata agli amministratori — non visibile nel profilo pubblico
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {(oldestPhotoSignedUrl ?? profile.oldest_photo_url) && (
              <div className="relative w-full sm:w-64 aspect-video rounded-xl overflow-hidden border border-neutral-800 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={(oldestPhotoSignedUrl ?? profile.oldest_photo_url)!}
                  alt="Prima foto professionale"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            )}

            {(() => {
              const exif = (profile as unknown as Profile).oldest_photo_exif as PhotoExif | null
              const date = profile.oldest_photo_date
              const hasData = date || exif?.camera || exif?.lens || exif?.aperture || exif?.shutter || exif?.iso
              return (
                <div className="flex-1 rounded-xl border border-neutral-800 bg-neutral-900 p-3 font-mono text-xs space-y-2">
                  <p className="text-neutral-500 uppercase tracking-wider text-[10px] mb-2">Metadati EXIF</p>
                  {hasData ? (
                    <>
                      <AdminExifRow label="Data" value={date ? new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : null} />
                      <AdminExifRow label="Camera" value={exif?.camera ?? null} />
                      <AdminExifRow label="Obiettivo" value={exif?.lens ?? null} />
                      <AdminExifRow label="Focale" value={exif?.focal_length ?? null} />
                      <AdminExifRow label="Apertura" value={exif?.aperture ?? null} />
                      <AdminExifRow label="Esposizione" value={exif?.shutter ?? null} />
                      <AdminExifRow label="ISO" value={exif?.iso != null ? String(exif.iso) : null} />
                    </>
                  ) : (
                    <p className="text-neutral-600 text-[11px] font-sans">Nessun dato EXIF disponibile.</p>
                  )}
                </div>
              )
            })()}
          </div>
        </section>
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
              <div key={review.id} className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Link
                      href={`/admin/${review.reviewer.id}`}
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
  )
}

function InfoCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-3 space-y-0.5">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-sm font-medium">{value}</p>
      {sub && <p className="text-xs text-neutral-600">{sub}</p>}
    </div>
  )
}

function AdminExifRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-neutral-600 text-[10px] uppercase tracking-wider shrink-0">{label}</span>
      <span className="text-neutral-300 text-right">{value}</span>
    </div>
  )
}
