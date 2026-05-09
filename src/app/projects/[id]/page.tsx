import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppNav } from '@/components/layout/AppNav'
import { ProjectStatusBar } from './ProjectStatus'
import { BriefForm } from './BriefForm'
import { ChatBox } from './ChatBox'
import { ReviewForm } from './ReviewForm'
import { ProjectActions } from './ProjectActions'
import type { MessageWithSender, Notification } from '@/types'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { id } = await params
  const adminClient = createAdminClient()

  const { data: project } = await supabase
    .from('projects')
    .select(`
      *,
      photographer:profiles!projects_photographer_id_fkey(*),
      model:profiles!projects_model_id_fkey(*)
    `)
    .eq('id', id)
    .single()

  if (!project) notFound()

  const isPhotographer = user.id === project.photographer_id
  const isModel = user.id === project.model_id
  if (!isPhotographer && !isModel) redirect('/dashboard')

  const isProposer = project.proposer_id ? user.id === project.proposer_id : isPhotographer

  const me = isPhotographer ? project.photographer : project.model
  const other = isPhotographer ? project.model : project.photographer

  const { data: rawNotifications } = await adminClient
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)
  const notifications = (rawNotifications ?? []) as Notification[]
  const userInitials = (me.full_name as string).split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  // Fetch dati invite per pre-popolare il brief
  let inviteInitialData: { location: string | null; moodboard_urls: string[] } | null = null
  if (project.invite_id) {
    const { data: inviteRaw } = await adminClient
      .from('project_invites')
      .select('location, moodboard_urls')
      .eq('id', project.invite_id)
      .maybeSingle()
    if (inviteRaw) {
      inviteInitialData = inviteRaw as { location: string | null; moodboard_urls: string[] }
    }
  }

  const [{ data: brief }, { data: rawMessages }, { data: myReview }] = await Promise.all([
    supabase.from('briefs').select('*').eq('project_id', id).maybeSingle(),
    supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(id, full_name, role)')
      .eq('project_id', id)
      .order('created_at'),
    supabase
      .from('reviews')
      .select('id')
      .eq('project_id', id)
      .eq('reviewer_id', user.id)
      .maybeSingle(),
  ])

  const messages = (rawMessages ?? []) as MessageWithSender[]

  // Sign fields: proponente = chi ha compilato, ricevente = chi ha approvato
  const proposerIsPhotographer = project.proposer_id
    ? project.proposer_id === project.photographer_id
    : isPhotographer
  const proposerSignedAt = (proposerIsPhotographer
    ? brief?.signed_by_photographer_at
    : brief?.signed_by_model_at) ?? null
  const receiverSignedAt = (proposerIsPhotographer
    ? brief?.signed_by_model_at
    : brief?.signed_by_photographer_at) ?? null

  // Label compenso contestuale (dal punto di vista dell'utente corrente)
  const proposerProfile = proposerIsPhotographer ? project.photographer : project.model
  const proposerFirstName = (proposerProfile.full_name as string).split(' ')[0]

  function buildCompensationLabel(note: string | null): string | null {
    if (!note) return null
    if (note.startsWith('TFP')) return note
    const amountMatch = note.match(/€(\d+)/)
    const amountStr = amountMatch ? ` — €${amountMatch[1]}` : ''
    if (note.startsWith('Pago io')) {
      return isProposer ? note : `${proposerFirstName} ti paga${amountStr}`
    }
    if (note.startsWith('Vengo pagato')) {
      return isProposer ? note : `Devi pagare ${proposerFirstName}${amountStr}`
    }
    return note
  }

  const compensationLabel = buildCompensationLabel(project.compensation_note ?? null)

  const canEditBrief = isProposer && project.status === 'accepted'
  const canApproveBrief = !isProposer && project.status === 'accepted' && !!brief
  const showBrief = ['accepted', 'brief_signed', 'paid', 'completed'].includes(project.status)
  const showChat = ['brief_signed', 'paid', 'completed', 'disputed'].includes(project.status)

  const canConfirm =
    (project.payer_role === 'tfp' && project.status === 'brief_signed') ||
    (project.payer_role !== 'tfp' && project.status === 'paid')

  return (
    <div className="min-h-screen">
      <AppNav
        userInitials={userInitials}
        userId={user.id}
        avatarUrl={me.avatar_url ?? null}
        notifications={notifications}
      />

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-10">
        {/* Header partecipanti */}
        <div className="flex items-center gap-4">
          <ParticipantChip profile={project.photographer} label="Fotografo" isMe={isPhotographer} />
          <span className="text-neutral-700 text-sm">×</span>
          <ParticipantChip profile={project.model} label="Modella / Modello" isMe={isModel} />
        </div>

        {/* Status bar */}
        <section className="space-y-2">
          <SectionTitle>Stato del progetto</SectionTitle>
          <ProjectStatusBar
            status={project.status}
            payerRole={project.payer_role}
            amount={project.amount}
            compensationNote={compensationLabel}
          />
        </section>

        {/* Banner contestuale */}
        <ProjectBanner
          status={project.status}
          isProposer={isProposer}
          briefExists={!!brief}
        />

        {/* Azioni principali */}
        <ProjectActions
          projectId={id}
          status={project.status}
          payerRole={project.payer_role}
          canAccept={false}
          canConfirm={canConfirm}
          isProposer={isProposer}
        />

        {/* Brief */}
        {showBrief && (
          <section className="space-y-4">
            <SectionTitle>Brief dello shooting</SectionTitle>
            <BriefForm
              projectId={id}
              existingBrief={brief ?? null}
              canEdit={canEditBrief}
              canApprove={canApproveBrief}
              currentUserId={user.id}
              initialLocation={inviteInitialData?.location ?? null}
              initialMoodboardUrls={inviteInitialData?.moodboard_urls ?? []}
              proposerSignedAt={proposerSignedAt}
              receiverSignedAt={receiverSignedAt}
            />
          </section>
        )}

        {/* Chat (solo dopo brief approvato) */}
        {showChat && (
          <section className="space-y-4">
            <SectionTitle>Chat</SectionTitle>
            <ChatBox
              projectId={id}
              currentUserId={user.id}
              initialMessages={messages}
            />
          </section>
        )}

        {/* Recensioni */}
        {project.status === 'completed' && !myReview && (
          <section className="space-y-4">
            <SectionTitle>Lascia una recensione</SectionTitle>
            <ReviewForm
              projectId={id}
              revieweeId={other.id}
              revieweeName={other.full_name}
              alreadyReviewed={!!myReview}
            />
          </section>
        )}
      </div>
    </div>
  )
}

// ── Sub-componenti ─────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{children}</h2>
  )
}

function ParticipantChip({
  profile,
  label,
  isMe,
}: {
  profile: { id: string; full_name: string; level: number }
  label: string
  isMe: boolean
}) {
  return (
    <Link
      href={`/profile/${profile.id}`}
      className="flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5 hover:border-neutral-600 transition-colors"
    >
      <span className={['text-xs font-semibold', label === 'Fotografo' ? 'text-sky-400' : 'text-rose-400'].join(' ')}>
        {label === 'Fotografo' ? 'F' : 'M'}
      </span>
      <span className="text-sm font-medium">{profile.full_name}</span>
      {isMe && <span className="text-xs text-neutral-600">(tu)</span>}
      <span className="text-xs text-neutral-600">Lv.{profile.level}</span>
    </Link>
  )
}

function ProjectBanner({
  status,
  isProposer,
  briefExists,
}: {
  status: string
  isProposer: boolean
  briefExists: boolean
}) {
  if (status !== 'accepted') return null

  if (isProposer) {
    if (!briefExists) {
      return (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 space-y-1">
          <p className="text-sm font-medium text-violet-300">Compila il brief dello shooting</p>
          <p className="text-xs text-violet-600">
            Inserisci i dettagli. La tua controparte riceverà una notifica e potrà approvarlo.
          </p>
        </div>
      )
    }
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 space-y-1">
        <p className="text-sm font-medium text-amber-300">Brief inviato — in attesa di approvazione</p>
        <p className="text-xs text-amber-600">
          Ti avviseremo quando la tua controparte approverà il brief.
        </p>
      </div>
    )
  }

  if (!briefExists) {
    return (
      <div className="rounded-xl border border-neutral-700 bg-neutral-900/50 px-4 py-3 space-y-1">
        <p className="text-sm font-medium text-neutral-300">Il proponente sta consolidando il progetto</p>
        <p className="text-xs text-neutral-600">
          Riceverai una notifica quando il brief sarà pronto per la tua revisione.
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 space-y-1">
      <p className="text-sm font-medium text-blue-300">Brief pronto — revisiona e approva</p>
      <p className="text-xs text-blue-600">
        Controlla i dettagli qui sotto e approva per aprire la chat del progetto.
      </p>
    </div>
  )
}
