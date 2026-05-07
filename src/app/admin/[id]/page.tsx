import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLevelName, computeSeniorityBonus } from '@/lib/xp'
import { isFounder } from '@/lib/founder'
import { AdminProfileActions } from './AdminProfileActions'
import type { ProfileStatus } from '@/types'

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
        <div className="w-14 h-14 rounded-full bg-neutral-800 flex items-center justify-center text-2xl shrink-0">
          {profile.role === 'photographer' ? '📷' : '🧍'}
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
          {isFounder(id) ? (
            <span className="rounded-full border border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-rose-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300">
              ✦ Founder
            </span>
          ) : (
            <>
              <AdminProfileActions profileId={id} currentStatus={profile.status as ProfileStatus} />
              <Link
                href={`/admin/${id}/edit`}
                className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Modifica profilo →
              </Link>
            </>
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

      {/* Foto anzianità */}
      {profile.oldest_photo_url && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">
            Foto più vecchia (verifica anzianità)
          </h2>
          <div className="relative w-full max-w-sm aspect-video rounded-xl overflow-hidden border border-neutral-800">
            <Image
              src={profile.oldest_photo_url}
              alt="Foto anzianità"
              fill
              className="object-cover"
            />
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
                <Image
                  src={item.image_url}
                  alt={item.caption ?? `Portfolio ${item.order_index + 1}`}
                  fill
                  className="object-cover"
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
