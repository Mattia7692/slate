import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLevelName, getLevelProgress, getXpForNextLevel } from '@/lib/xp'
import { isFounder } from '@/lib/founder'
import { XPBadge } from '@/components/profile/XPBadge'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar'
import { ProfileCard } from '@/components/profile/ProfileCard'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import type { ProjectStatus, Profile, PortfolioItem, Notification } from '@/types'

const STATUS_LABEL: Record<ProjectStatus, string> = {
  proposed: 'Proposta inviata',
  accepted: 'Accettato',
  brief_signed: 'Brief firmato',
  paid: 'Pagato',
  completed: 'Completato',
  disputed: 'In disputa',
  cancelled: 'Cancellato',
}

const STATUS_COLOR: Record<ProjectStatus, string> = {
  proposed: 'text-sky-400',
  accepted: 'text-violet-400',
  brief_signed: 'text-amber-400',
  paid: 'text-emerald-400',
  completed: 'text-neutral-400',
  disputed: 'text-red-400',
  cancelled: 'text-neutral-600',
}

type ProjectRow = {
  id: string
  status: string
  payer_role: string
  amount: number
  created_at: string
  photographer_id: string
  photographer: { id: string; full_name: string; role: string; level: number }
  model: { id: string; full_name: string; role: string; level: number }
}

type ProfileWithCover = Profile & { cover: PortfolioItem | null }

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const isApproved = profile.status === 'approved'
  const oppositeRole = profile.role === 'photographer' ? 'model' : 'photographer'

  // Notifiche (admin client per bypassare RLS)
  const adminClient = createAdminClient()
  const { data: rawNotifications } = await adminClient
    .from('notifications')
    .select('*')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  const notifications = (rawNotifications ?? []) as Notification[]

  // Fetch in parallelo
  const [
    { data: rawProjects },
    { data: reviewRows },
    { data: suggestedRaw },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select(`
        id, status, payer_role, amount, created_at, photographer_id,
        photographer:profiles!projects_photographer_id_fkey(id, full_name, role, level),
        model:profiles!projects_model_id_fkey(id, full_name, role, level)
      `)
      .or(`photographer_id.eq.${user.id},model_id.eq.${user.id}`)
      .not('status', 'in', '("cancelled")')
      .order('created_at', { ascending: false }),
    supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', user.id),
    isApproved
      ? supabase
          .from('profiles')
          .select('*')
          .eq('status', 'approved')
          .eq('role', oppositeRole)
          .neq('id', user.id)
          .order('xp', { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] }),
  ])

  const projects = rawProjects as unknown as ProjectRow[] | null
  const activeProjects = projects?.filter((p) => !['completed', 'cancelled'].includes(p.status)) ?? []
  const pastProjects = projects?.filter((p) => p.status === 'completed') ?? []

  const avgRating = reviewRows?.length
    ? (reviewRows.reduce((s, r) => s + r.rating, 0) / reviewRows.length).toFixed(1)
    : null

  // Cover per i profili suggeriti
  const suggestedIds = suggestedRaw?.map((p) => p.id) ?? []
  const { data: suggestedCovers } = suggestedIds.length
    ? await supabase
        .from('portfolio_items')
        .select('*')
        .in('profile_id', suggestedIds)
        .eq('order_index', 0)
    : { data: [] }

  const coverMap = new Map(suggestedCovers?.map((c) => [c.profile_id, c]) ?? [])
  const suggested: ProfileWithCover[] = (suggestedRaw ?? []).map((p) => ({
    ...(p as unknown as Profile),
    cover: coverMap.get(p.id) ?? null,
  }))

  // XP progress
  const xpProgress = getLevelProgress(profile.xp)
  const xpToNext = getXpForNextLevel(profile.xp)
  const levelName = getLevelName(profile.level)

  return (
    <div className="min-h-screen">
      {/* Topbar */}
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
          Slate
        </Link>
        <nav className="flex items-center gap-5">
          {isApproved && (
            <>
              <Link href="/explore" className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors">
                Esplora
              </Link>
              <Link href="/projects" className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors">
                Progetti
              </Link>
              <Link href="/messages" className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors">
                Messaggi
              </Link>
            </>
          )}
          <Link href={`/profile/${user.id}`} className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors">
            Profilo
          </Link>
          {isApproved && (
            <NotificationBell
              initialNotifications={notifications}
              currentUserId={user.id}
            />
          )}
        </nav>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-12">

        {/* ── HERO ─────────────────────────────────────────────── */}
        {profile.status === 'pending' ? (
          <div className="space-y-6">
            <div className="flex items-center gap-5">
              <ProfileAvatar avatarUrl={(profile as Profile).avatar_url ?? null} role={(profile as Profile).role} size={72} />
              <div className="space-y-1">
                <p className="text-xl font-semibold">{profile.full_name}</p>
                <p className="text-sm text-neutral-400">
                  {profile.role === 'photographer' ? 'Fotografo' : 'Modella / Modello'}
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
        ) : (
          <div className="flex items-start gap-6">
            <ProfileAvatar avatarUrl={(profile as Profile).avatar_url ?? null} role={(profile as Profile).role} size={72} />

            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xl font-semibold">{profile.full_name}</p>
                  <p className="text-sm text-neutral-400 mt-0.5">
                    {profile.role === 'photographer' ? 'Fotografo' : 'Modella / Modello'}
                    {profile.city ? ` · ${profile.city}` : ''}
                  </p>
                </div>
                <XPBadge level={profile.level} xp={profile.xp} showXp isFounder={isFounder(user.id)} />
              </div>

              {/* XP progress bar */}
              <div className="space-y-1.5">
                <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-neutral-600">
                    Lv.{profile.level} — {levelName}
                  </p>
                  {xpToNext !== null ? (
                    <p className="text-xs text-neutral-600">{xpToNext} XP al prossimo livello</p>
                  ) : (
                    <p className="text-xs text-neutral-600">Livello massimo</p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-5 text-sm flex-wrap">
                <span className="text-neutral-300">
                  <span className="font-semibold">{pastProjects.length}</span>
                  <span className="text-neutral-600 ml-1.5">shooting</span>
                </span>
                {avgRating && (
                  <span className="text-neutral-300">
                    <span className="font-semibold text-amber-400">★ {avgRating}</span>
                    <span className="text-neutral-600 ml-1.5">({reviewRows?.length})</span>
                  </span>
                )}
                <span className="text-neutral-300">
                  <span className="font-semibold">{profile.years_in_industry}</span>
                  <span className="text-neutral-600 ml-1.5">anni nel settore</span>
                </span>
              </div>

              <Link
                href="/profile/edit"
                className="inline-flex text-xs text-neutral-600 hover:text-neutral-300 transition-colors"
              >
                Modifica profilo →
              </Link>
            </div>
          </div>
        )}

        {/* ── PROGETTI ATTIVI ───────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Progetti attivi
            </h2>
            {isApproved && (
              <Link href="/explore" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
                + Nuova collaborazione
              </Link>
            )}
          </div>

          {activeProjects.length === 0 ? (
            isApproved ? (
              <Link
                href="/explore"
                className="flex items-center gap-4 rounded-2xl border border-dashed border-neutral-800 px-6 py-8 hover:border-neutral-600 transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-neutral-800 group-hover:bg-neutral-700 transition-colors flex items-center justify-center text-xl shrink-0">
                  {profile.role === 'photographer' ? '🧍' : '📷'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Inizia la tua prima collaborazione</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Esplora i profili e proponi uno shooting
                  </p>
                </div>
                <span className="text-neutral-600 group-hover:text-neutral-400 transition-colors">→</span>
              </Link>
            ) : (
              <p className="text-sm text-neutral-600 py-4">
                I tuoi progetti appariranno qui dopo l&apos;approvazione del profilo.
              </p>
            )
          ) : (
            <div className="space-y-2">
              {activeProjects.map((p) => {
                const isPhotographer = user.id === p.photographer.id
                const other = isPhotographer ? p.model : p.photographer
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900/50 px-5 py-4 hover:border-neutral-700 hover:bg-neutral-900 transition-colors"
                  >
                    <div className="text-xl shrink-0">
                      {other.role === 'photographer' ? '📷' : '🧍'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{other.full_name}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {new Date(p.created_at).toLocaleDateString('it-IT')}
                        {' · '}
                        {p.payer_role === 'tfp' ? 'TFP' : `€${(p.amount / 100).toFixed(2)}`}
                      </p>
                    </div>
                    <span className={['text-xs font-medium', STATUS_COLOR[p.status as ProjectStatus]].join(' ')}>
                      {STATUS_LABEL[p.status as ProjectStatus]}
                    </span>
                    <span className="text-neutral-600 shrink-0">›</span>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* ── SCOPRI ───────────────────────────────────────────── */}
        {isApproved && suggested.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                {profile.role === 'photographer' ? 'Modelle e modelli' : 'Fotografi'} in evidenza
              </h2>
              <Link href={`/explore?role=${oppositeRole}`} className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
                Vedi tutti →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {suggested.map((p) => (
                <ProfileCard key={p.id} profile={p} coverImage={p.cover} />
              ))}
            </div>
          </section>
        )}

        {/* ── SHOOTING PASSATI ─────────────────────────────────── */}
        {pastProjects.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Shooting completati
            </h2>
            <div className="space-y-2">
              {pastProjects.map((p) => {
                const isPhotographer = user.id === p.photographer.id
                const other = isPhotographer ? p.model : p.photographer
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900/20 px-5 py-3.5 hover:border-neutral-700 transition-colors opacity-60 hover:opacity-100"
                  >
                    <div className="text-lg shrink-0">
                      {other.role === 'photographer' ? '📷' : '🧍'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{other.full_name}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {new Date(p.created_at).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <span className="text-xs text-neutral-600 shrink-0">›</span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
