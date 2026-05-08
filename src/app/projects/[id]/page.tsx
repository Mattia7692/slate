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

  const me = isPhotographer ? project.photographer : project.model
  const other = isPhotographer ? project.model : project.photographer

  const adminClient = createAdminClient()
  const { data: rawNotifications } = await adminClient.from('notifications').select('*').eq('profile_id', user.id).order('created_at', { ascending: false }).limit(30)
  const notifications = (rawNotifications ?? []) as Notification[]
  const userInitials = (me.full_name as string).split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  // Brief, messaggi, recensioni in parallelo
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

  const mySignedAt = isPhotographer
    ? brief?.signed_by_photographer_at ?? null
    : brief?.signed_by_model_at ?? null

  const otherSignedAt = isPhotographer
    ? brief?.signed_by_model_at ?? null
    : brief?.signed_by_photographer_at ?? null

  const canEditBrief = ['accepted'].includes(project.status)
  const canAccept = project.status === 'proposed' && user.id !== project.proposed_by
  const canConfirm =
    (project.payer_role === 'tfp' && project.status === 'brief_signed') ||
    (project.payer_role !== 'tfp' && project.status === 'paid')

  return (
    <div className="min-h-screen">
      <AppNav userInitials={userInitials} userId={user.id} avatarUrl={me.avatar_url ?? null} notifications={notifications} />

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-10">
        {/* Header partecipanti */}
        <div className="flex items-center gap-4">
          <ParticipantChip profile={project.photographer} label="Fotografo" isMe={isPhotographer} />
          <span className="text-neutral-700 text-sm">×</span>
          <ParticipantChip profile={project.model} label={project.model.role === 'model' ? 'Modella / Modello' : 'Modella'} isMe={isModel} />
        </div>

        {/* Status bar */}
        <section className="space-y-2">
          <SectionTitle>Stato del progetto</SectionTitle>
          <ProjectStatusBar
            status={project.status}
            payerRole={project.payer_role}
            amount={project.amount}
          />
        </section>

        {/* Azioni principali */}
        <ProjectActions
          projectId={id}
          status={project.status}
          payerRole={project.payer_role}
          canAccept={canAccept}
          canConfirm={canConfirm}
          isProposer={project.status === 'proposed' && user.id === project.proposed_by}
        />

        {/* Brief */}
        {['accepted', 'brief_signed', 'paid', 'completed'].includes(project.status) && (
          <section className="space-y-4">
            <SectionTitle>Brief dello shooting</SectionTitle>
            <BriefForm
              projectId={id}
              existingBrief={brief ?? null}
              mySignedAt={mySignedAt}
              otherSignedAt={otherSignedAt}
              canEdit={canEditBrief}
            />
          </section>
        )}

        {/* Chat */}
        <section className="space-y-4">
          <SectionTitle>Chat</SectionTitle>
          <ChatBox
            projectId={id}
            currentUserId={user.id}
            initialMessages={messages}
          />
        </section>

        {/* Recensioni (solo dopo completamento) */}
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
      <span className="text-sm">{label === 'Fotografo' ? '📷' : '🧍'}</span>
      <span className="text-sm font-medium">{profile.full_name}</span>
      {isMe && <span className="text-xs text-neutral-600">(tu)</span>}
      <span className="text-xs text-neutral-600">Lv.{profile.level}</span>
    </Link>
  )
}
