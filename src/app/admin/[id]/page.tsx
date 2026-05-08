import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLevelName, computeSeniorityBonus } from '@/lib/xp'
import { isFounder } from '@/lib/founder'
import { AdminProfileActions } from './AdminProfileActions'
import { ToggleAdminButton } from './ToggleAdminButton'
import { DeleteProfileButton } from './DeleteProfileButton'
import type { Profile, ProfileStatus } from '@/types'
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

interface AdminProfilePageProps {
  params: Promise<{ id: string }>
}

export default async function AdminProfilePage({ params }: AdminProfilePageProps) {
  await requireAdmin()

  const { id } = await params
  const admin = createAdminClient()

  // Identità dell'utente corrente (per sapere se è il Founder)
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  const currentIsFounder = isFounder(currentUser?.id ?? '')

  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  const { data: portfolioItems } = await admin
    .from('portfolio_items')
    .select('*')
    .eq('profile_id', id)
    .order('order_index')

  const { data: authUser } = await admin.auth.admin.getUserById(id)

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

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Link href="/admin" className="hover:text-neutral-300 transition-colors">
          Profili
        </Link>
        <span>›</span>
        <span className="text-neutral-300">{profile.full_name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-neutral-800 overflow-hidden shrink-0 flex items-center justify-center text-2xl">
          {(profile as unknown as Profile).avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={(profile as unknown as Profile).avatar_url!}
              alt={profile.full_name}
              className="w-full h-full object-cover"
            />
          ) : (
            profile.role === 'photographer' ? '📷' : '🧍'
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold">{profile.full_name}</h1>
            <span
              className={[
                'rounded-full border px-2.5 py-0.5 text-xs font-medium',
                STATUS_BADGE[profile.status as ProfileStatus],
              ].join(' ')}
            >
              {STATUS_LABEL[profile.status as ProfileStatus]}
            </span>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            {profile.role === 'photographer' ? 'Fotografo' : 'Modella / Modello'}
            {profile.city ? ` · ${profile.city}` : ''}
          </p>
          {authUser?.user?.email && (
            <p className="text-xs text-neutral-600 mt-0.5">{authUser.user.email}</p>
          )}
        </div>

        {/* Azioni */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {/* Badge Founder */}
          {isFounder(id) && (
            <span className="rounded-full border border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-rose-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300">
              ✦ Founder
            </span>
          )}
          {/* Badge Admin */}
          {!isFounder(id) && profile.is_admin && (
            <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-400">
              Admin
            </span>
          )}
          {/* Controlli stato + promuovi admin — stessa riga */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <AdminProfileActions
              profileId={id}
              currentStatus={profile.status as ProfileStatus}
              isSelf={currentUser?.id === id}
            />
            {currentIsFounder && !isFounder(id) && (
              <ToggleAdminButton
                profileId={id}
                isAdmin={!!profile.is_admin}
                profileName={profile.full_name}
              />
            )}
          </div>
          {/* Modifica profilo */}
          {(!isFounder(id) || currentIsFounder) && (
            <Link
              href={`/admin/${id}/edit`}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Modifica profilo →
            </Link>
          )}
          {/* Elimina profilo — solo su profili non-Founder, non se stessi */}
          {!isFounder(id) && currentUser?.id !== id && (
            <DeleteProfileButton profileId={id} profileName={profile.full_name} />
          )}
        </div>
      </div>

      {/* Sezione info */}
      <div className="grid grid-cols-2 gap-4">
        <InfoCard label="Livello" value={`${getLevelName(profile.level)} (Lv. ${profile.level})`} />
        <InfoCard label="XP totali" value={`${profile.xp} XP`} />
        <InfoCard
          label="Esperienza"
          value={`${profile.years_in_industry} anni`}
          sub={`Bonus anzianità: +${computeSeniorityBonus(profile.years_in_industry)} XP`}
        />
        <InfoCard
          label="Iscritto il"
          value={new Date(profile.created_at).toLocaleDateString('it-IT', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
        />
        {profile.instagram_url && (
          <InfoCard label="Instagram" value={profile.instagram_url} />
        )}
      </div>

      {/* Bio */}
      {profile.bio && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Bio</h2>
          <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
        </section>
      )}

      {/* Foto di verifica anzianità — visibile solo qui, non nel profilo pubblico */}
      {(oldestPhotoSignedUrl || profile.oldest_photo_url) && (
        <section className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-medium text-amber-400 uppercase tracking-wider">
                Foto di verifica anzianità
              </h2>
              <p className="text-xs text-neutral-600 mt-0.5">
                Riservata agli amministratori — non visibile nel profilo pubblico
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Foto */}
            {(oldestPhotoSignedUrl ?? profile.oldest_photo_url) && (
              <div className="relative w-full sm:w-64 aspect-video rounded-xl overflow-hidden border border-neutral-800 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={(oldestPhotoSignedUrl ?? profile.oldest_photo_url)!}
                  alt="Foto di verifica anzianità"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            )}

            {/* EXIF panel — stile Lightroom */}
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
      {portfolioItems && portfolioItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">
            Portfolio / Book ({portfolioItems.length} foto)
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {portfolioItems.map((item) => (
              <div
                key={item.id}
                className="relative aspect-square rounded-lg overflow-hidden border border-neutral-800"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image_url}
                  alt={item.caption ?? `Portfolio ${item.order_index + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
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
