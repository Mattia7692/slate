import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppNav } from '@/components/layout/AppNav'
import { RoleBadge } from '@/components/profile/RoleBadge'
import { ProfileCard } from '@/components/profile/ProfileCard'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar'
import type { VisionWithCreator, Profile, Notification } from '@/types'

const ROLE_LABEL = { photographer: 'fotografo', model: 'modella' }
const ROLE_STYLE = {
  photographer: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  model: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>
}) {
  const { role: roleFilter } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const adminClient = createAdminClient()
  const { data: rawNotifications } = await adminClient
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  const notifications = (rawNotifications ?? []) as Notification[]

  const userInitials = (profile.full_name as string)
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  // Pending: mostra schermata di attesa senza il feed
  if (profile.status === 'pending') {
    return (
      <div className="min-h-screen">
        <AppNav userInitials={userInitials} userId={user.id} avatarUrl={(profile as Profile).avatar_url ?? null} notifications={notifications} />
        <div className="max-w-lg mx-auto px-6 py-20 space-y-6">
          <div className="flex items-center gap-4">
            <ProfileAvatar avatarUrl={(profile as Profile).avatar_url ?? null} role={(profile as Profile).role} size={56} />
            <div>
              <p className="font-semibold">{profile.full_name}</p>
              <p className="text-sm text-neutral-500">
                <RoleBadge role={profile.role as 'photographer' | 'model'} />
                {profile.city ? ` · ${profile.city}` : ''}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-6 py-5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <p className="text-sm font-medium text-amber-400">Profilo in revisione</p>
            </div>
            <p className="text-sm text-amber-700 leading-relaxed">
              Ogni profilo su Slate viene approvato manualmente per garantire la qualità della community.
              Riceverai una notifica appena il tuo profilo sarà attivo.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Approved: fetch feed data
  let visionsQuery = supabase
    .from('visions')
    .select(`
      *,
      creator:profiles!visions_creator_id_fkey(id, full_name, role, avatar_url, level),
      images:vision_images(id, image_url, order_index)
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(6)

  if (roleFilter === 'photographer' || roleFilter === 'model') {
    visionsQuery = visionsQuery.eq('role_needed', roleFilter)
  }

  const [
    { data: rawVisions },
    { data: photographers },
    { data: models },
  ] = await Promise.all([
    visionsQuery,
    supabase
      .from('profiles')
      .select('*')
      .eq('status', 'approved')
      .eq('role', 'photographer')
      .neq('id', user.id)
      .order('xp', { ascending: false })
      .limit(4),
    supabase
      .from('profiles')
      .select('*')
      .eq('status', 'approved')
      .eq('role', 'model')
      .neq('id', user.id)
      .order('xp', { ascending: false })
      .limit(4),
  ])

  const visions = (rawVisions ?? []) as unknown as VisionWithCreator[]

  const photographerProfiles = (photographers ?? []) as unknown as Profile[]
  const modelProfiles = (models ?? []) as unknown as Profile[]

  const PILLS = [
    { label: 'Tutte', value: undefined as string | undefined },
    { label: 'Cercano fotografo', value: 'photographer' },
    { label: 'Cercano modella', value: 'model' },
  ]

  return (
    <div className="min-h-screen">
      <AppNav userInitials={userInitials} userId={user.id} avatarUrl={(profile as Profile).avatar_url ?? null} notifications={notifications} />

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-8">

        {/* ── VISIONI RECENTI ─────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Visioni recenti
            </h2>
            <Link href="/bacheca" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
              Vedi tutte →
            </Link>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {PILLS.map(({ label, value }) => {
              const isActive = value === undefined ? !roleFilter : value === roleFilter
              const href = value ? `/dashboard?role=${value}` : '/dashboard'
              return (
                <Link
                  key={label}
                  href={href}
                  className={[
                    'text-xs font-medium px-3.5 py-1.5 rounded-full border transition-colors',
                    isActive
                      ? 'bg-neutral-100 text-neutral-900 border-neutral-100'
                      : 'border-neutral-700 text-neutral-500 hover:text-neutral-300 hover:border-neutral-600',
                  ].join(' ')}
                >
                  {label}
                </Link>
              )
            })}
          </div>

          {visions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-800 py-10 text-center space-y-1.5">
              <p className="text-sm text-neutral-600">Nessuna visione al momento.</p>
              <Link href="/bacheca/nuova" className="text-xs text-neutral-700 hover:text-neutral-400 transition-colors">
                Crea la prima →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {visions.map((vision) => {
                const cover = [...vision.images].sort((a, b) => a.order_index - b.order_index)[0]
                return (
                  <Link
                    key={vision.id}
                    href={`/bacheca/${vision.id}`}
                    className="group block rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900 hover:border-neutral-700 transition-all duration-200"
                  >
                    <div className="relative aspect-[4/3] bg-neutral-800 overflow-hidden">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover.image_url}
                          alt={vision.title}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-3xl text-neutral-700">✦</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-1.5">
                      <p className="text-sm font-medium leading-snug line-clamp-1">{vision.title}</p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-neutral-600 truncate">{vision.creator.full_name}</p>
                        <span className={[
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0',
                          ROLE_STYLE[vision.role_needed],
                        ].join(' ')}>
                          {ROLE_LABEL[vision.role_needed]}
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        <div className="h-px bg-neutral-800/60" />

        {/* ── FOTOGRAFI IN EVIDENZA ────────────────────────────── */}
        {photographerProfiles.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Fotografi in evidenza
              </h2>
              <Link href="/explore?role=photographer" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
                Vedi tutti →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {photographerProfiles.map((p) => (
                <ProfileCard key={p.id} profile={p} avatarUrl={p.avatar_url ?? null} />
              ))}
            </div>
          </section>
        )}

        <div className="h-px bg-neutral-800/60" />

        {/* ── MODELLE IN EVIDENZA ──────────────────────────────── */}
        {modelProfiles.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Modelle in evidenza
              </h2>
              <Link href="/explore?role=model" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
                Vedi tutte →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {modelProfiles.map((p) => (
                <ProfileCard key={p.id} profile={p} avatarUrl={p.avatar_url ?? null} />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
