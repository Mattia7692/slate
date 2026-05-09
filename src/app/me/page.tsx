import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppNav } from '@/components/layout/AppNav'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar'
import { RoleBadge } from '@/components/profile/RoleBadge'
import { getLevelProgress, getLevelName, yearsFromStartYear } from '@/lib/xp'
import { isFounder } from '@/lib/founder'
import type { Notification, Profile, ProjectStatus } from '@/types'

const STATUS_LABEL: Record<ProjectStatus, string> = {
  proposed: 'Proposta',
  accepted: 'Accettato',
  brief_signed: 'Brief da firmare',
  paid: 'Pagato',
  completed: 'Completato',
  disputed: 'In disputa',
  cancelled: 'Cancellato',
}

const STATUS_DOT: Record<ProjectStatus, string> = {
  proposed: 'bg-sky-500',
  accepted: 'bg-violet-500',
  brief_signed: 'bg-amber-500',
  paid: 'bg-emerald-500',
  completed: 'bg-neutral-500',
  disputed: 'bg-red-500',
  cancelled: 'bg-neutral-700',
}

const STATUS_PILL: Record<ProjectStatus, string> = {
  proposed: 'bg-sky-500/10 text-sky-400',
  accepted: 'bg-violet-500/10 text-violet-400',
  brief_signed: 'bg-amber-500/10 text-amber-400',
  paid: 'bg-emerald-500/10 text-emerald-400',
  completed: 'bg-neutral-500/10 text-neutral-400',
  disputed: 'bg-red-500/10 text-red-400',
  cancelled: 'bg-neutral-800 text-neutral-600',
}

const LEVEL_BAR_COLOR: Record<number, string> = {
  1: 'bg-neutral-500',
  2: 'bg-blue-500',
  3: 'bg-violet-500',
  4: 'bg-amber-500',
  5: 'bg-orange-500',
}

type ProjectRow = {
  id: string
  status: string
  payer_role: string
  amount: number
  compensation_note: string | null
  proposer_id: string | null
  created_at: string
  photographer_id: string
  photographer: { id: string; full_name: string; role: string; level: number }
  model: { id: string; full_name: string; role: string; level: number }
}

type ConvOther = {
  id: string
  full_name: string
  avatar_url: string | null
  role: string
}

function formatMsgTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'ieri'
  if (diffDays < 7) return d.toLocaleDateString('it-IT', { weekday: 'short' })
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

export default async function MePage() {
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

  const [
    { data: rawProjects },
    { data: reviewRows },
    { data: rawConversations },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select(`
        id, status, payer_role, amount, compensation_note, proposer_id, created_at, photographer_id,
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
    supabase
      .from('conversations')
      .select(`
        id, participant_1, participant_2, created_at,
        participant_1_profile:profiles!conversations_participant_1_fkey(id, full_name, avatar_url, role),
        participant_2_profile:profiles!conversations_participant_2_fkey(id, full_name, avatar_url, role)
      `)
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const projects = rawProjects as unknown as ProjectRow[] | null
  const activeProjects = projects?.filter((p) => !['completed', 'cancelled'].includes(p.status)) ?? []
  const pastProjects = projects?.filter((p) => p.status === 'completed') ?? []

  // Last message per conversation
  const conversationIds = (rawConversations ?? []).map((c) => c.id)
  const { data: lastMessages } = conversationIds.length
    ? await supabase
        .from('direct_messages')
        .select('conversation_id, content, created_at, sender_id')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const lastMsgMap = new Map<string, { content: string; created_at: string; sender_id: string }>()
  for (const msg of lastMessages ?? []) {
    if (!lastMsgMap.has(msg.conversation_id)) lastMsgMap.set(msg.conversation_id, msg)
  }

  const conversations = (rawConversations ?? []).map((c) => ({
    ...c,
    other: (c.participant_1 === user.id ? c.participant_2_profile : c.participant_1_profile) as unknown as ConvOther,
    lastMsg: lastMsgMap.get(c.id) ?? null,
  }))

  const xpProgress = getLevelProgress((profile as Profile).xp)
  const levelName = getLevelName((profile as Profile).level)
  const barColor = LEVEL_BAR_COLOR[(profile as Profile).level] ?? 'bg-neutral-500'

  const founder = isFounder(user.id)

  return (
    <div className="min-h-screen">
      <AppNav userInitials={userInitials} userId={user.id} avatarUrl={(profile as Profile).avatar_url ?? null} notifications={notifications} />

      <div className="sm:flex sm:items-start sm:justify-center sm:px-6 sm:py-8">
        <div className="w-full sm:max-w-4xl sm:rounded-2xl sm:border border-neutral-800 overflow-hidden flex flex-col sm:flex-row sm:min-h-[600px]">

        {/* ── SIDEBAR ──────────────────────────────────────────── */}
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
              <p className="text-xs text-neutral-500 mt-0.5">
                <RoleBadge role={(profile as Profile).role} />
                {profile.city ? ` · ${profile.city}` : ''}
              </p>
            </div>
            {/* Badge livello: solo mobile */}
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

          {/* Menu: scroll orizzontale su mobile, verticale su desktop */}
          <nav className="flex sm:flex-col gap-1 sm:gap-0.5 overflow-x-auto px-3 pb-3 sm:px-4 sm:pb-0 sm:flex-1 scrollbar-hide">
            {[
              { label: 'Il mio profilo', href: '/me', active: true },
              { label: 'Progetti', href: '/projects', badge: activeProjects.length || null },
              { label: 'Messaggi', href: '/messages' },
              { label: 'Le mie visioni', href: '/bacheca' },
              { label: 'Impostazioni', href: '/profile/edit' },
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

        {/* ── MAIN ─────────────────────────────────────────────── */}
        <main className="flex-1 px-4 sm:px-6 py-5 min-w-0 space-y-6">

          {/* Stat row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-neutral-900 rounded-xl px-4 py-3">
              <p className="text-2xl font-semibold text-neutral-100">{pastProjects.length}</p>
              <p className="text-xs text-neutral-500 mt-0.5">Shooting completati</p>
            </div>
            <div className="bg-neutral-900 rounded-xl px-4 py-3">
              <p className="text-2xl font-semibold text-neutral-100">
                {(profile as Profile).xp >= 1000
                  ? `${((profile as Profile).xp / 1000).toFixed(0)}k`
                  : (profile as Profile).xp}
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">XP totali</p>
            </div>
            <div className="bg-neutral-900 rounded-xl px-4 py-3">
              <p className="text-2xl font-semibold text-neutral-100">
                {(profile as Profile & { career_start_year?: number | null }).career_start_year
                  ? yearsFromStartYear((profile as Profile & { career_start_year: number }).career_start_year)
                  : profile.years_in_industry}
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">Anni nel settore</p>
            </div>
          </div>

          {/* Progetti attivi */}
          <div className="space-y-3">
            <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Progetti attivi
            </h2>
            {activeProjects.length === 0 ? (
              <Link
                href="/explore"
                className="flex items-center gap-3 rounded-xl border border-dashed border-neutral-800 px-4 py-4 hover:border-neutral-700 transition-colors group"
              >
                <p className="text-sm text-neutral-600 group-hover:text-neutral-400 transition-colors">
                  Nessun progetto attivo — Esplora profili →
                </p>
              </Link>
            ) : (
              <div className="space-y-2">
                {activeProjects.map((p) => {
                  const isPhotographer = user.id === p.photographer.id
                  const other = isPhotographer ? p.model : p.photographer
                  const isProposer = p.proposer_id ? user.id === p.proposer_id : isPhotographer
                  const proposerIsPhotographer = p.proposer_id
                    ? p.proposer_id === p.photographer_id
                    : isPhotographer
                  const proposerProfile = proposerIsPhotographer ? p.photographer : p.model
                  const proposerFirstName = (proposerProfile.full_name as string).split(' ')[0]
                  const note = p.compensation_note
                  let compensationLabel: string
                  if (!note) {
                    compensationLabel = p.payer_role === 'tfp' ? 'TFP' : `€${(p.amount / 100).toFixed(0)}`
                  } else if (note.startsWith('TFP')) {
                    compensationLabel = note
                  } else {
                    const amountMatch = note.match(/€(\d+)/)
                    const amountStr = amountMatch ? ` — €${amountMatch[1]}` : ''
                    if (note.startsWith('Pago io')) {
                      compensationLabel = isProposer ? note : `${proposerFirstName} ti paga${amountStr}`
                    } else if (note.startsWith('Vengo pagato')) {
                      compensationLabel = isProposer ? note : `Devi pagare ${proposerFirstName}${amountStr}`
                    } else {
                      compensationLabel = note
                    }
                  }
                  return (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-3 hover:border-neutral-700 transition-colors"
                    >
                      <div className={['w-2 h-2 rounded-full shrink-0', STATUS_DOT[p.status as ProjectStatus]].join(' ')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-100 truncate">{other.full_name}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{compensationLabel}</p>
                      </div>
                      <span className={[
                        'text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0',
                        STATUS_PILL[p.status as ProjectStatus],
                      ].join(' ')}>
                        {STATUS_LABEL[p.status as ProjectStatus]}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          <div className="h-px bg-neutral-800/60" />

          {/* Messaggi recenti */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Messaggi recenti
              </h2>
              <Link href="/messages" className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors">
                Vedi tutti →
              </Link>
            </div>
            {conversations.length === 0 ? (
              <p className="text-sm text-neutral-600 py-2">Nessun messaggio ancora.</p>
            ) : (
              <div className="divide-y divide-neutral-800/60">
                {conversations.map((conv) => {
                  const other = conv.other
                  const initials = other?.full_name
                    ?.split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase() ?? '?'
                  const isUnread = conv.lastMsg && conv.lastMsg.sender_id !== user.id
                  return (
                    <Link
                      key={conv.id}
                      href={`/messages/${conv.id}`}
                      className="flex items-center gap-3 py-3 hover:opacity-80 transition-opacity"
                    >
                      <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-[11px] font-medium text-neutral-400 shrink-0 overflow-hidden">
                        {other?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={other.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-100">{other?.full_name}</p>
                        {conv.lastMsg && (
                          <p className="text-xs text-neutral-500 truncate">{conv.lastMsg.content}</p>
                        )}
                      </div>
                      {isUnread && (
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                      )}
                      {conv.lastMsg && (
                        <p className="text-[11px] text-neutral-600 shrink-0">
                          {formatMsgTime(conv.lastMsg.created_at)}
                        </p>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

        </main>
        </div>
      </div>
    </div>
  )
}
