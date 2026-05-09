'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { XP_VALUES } from '@/lib/xp'
import type { BriefFormData } from '@/types'

async function getProjectAndUser(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*, photographer:profiles!projects_photographer_id_fkey(*), model:profiles!projects_model_id_fkey(*)')
    .eq('id', projectId)
    .single()

  if (!project) redirect('/dashboard')

  const isPhotographer = user.id === project.photographer_id
  const isModel = user.id === project.model_id
  if (!isPhotographer && !isModel) redirect('/dashboard')

  const isProposer = project.proposer_id ? user.id === project.proposer_id : isPhotographer

  return { supabase, user, project, isPhotographer, isModel, isProposer }
}

// ── Accetta proposta (vecchio flusso direct) ───────────────────

export async function acceptProject(projectId: string) {
  const { supabase } = await getProjectAndUser(projectId)

  const { error } = await supabase
    .from('projects')
    .update({ status: 'accepted' })
    .eq('id', projectId)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { error: null }
}

// ── Cancella progetto ──────────────────────────────────────────

export async function cancelProject(projectId: string) {
  const { supabase, project } = await getProjectAndUser(projectId)

  if (['completed', 'disputed'].includes(project.status)) {
    return { error: 'Non puoi cancellare un progetto già completato.' }
  }

  const { error } = await supabase
    .from('projects')
    .update({ status: 'cancelled' })
    .eq('id', projectId)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { error: null }
}

// ── Salva brief (solo proponente) ──────────────────────────────

export async function saveBrief(projectId: string, data: BriefFormData) {
  const { supabase, project, isPhotographer, isProposer } = await getProjectAndUser(projectId)

  if (!isProposer) return { error: 'Solo il proponente può compilare il brief.' }
  if (project.status !== 'accepted') {
    return { error: 'Il brief può essere modificato solo durante la fase di consolidamento.' }
  }

  const now = new Date().toISOString()
  const proposerSignField = isPhotographer ? 'signed_by_photographer_at' : 'signed_by_model_at'
  const receiverSignField = isPhotographer ? 'signed_by_model_at' : 'signed_by_photographer_at'

  const { error } = await supabase
    .from('briefs')
    .upsert(
      {
        project_id: projectId,
        ...data,
        [proposerSignField]: now,
        [receiverSignField]: null,
      },
      { onConflict: 'project_id' }
    )

  if (error) return { error: error.message }

  // Notifica al ricevente
  const receiverId = project.proposer_id === project.photographer_id
    ? project.model_id
    : project.photographer_id

  const adminClient = createAdminClient()
  await adminClient.from('notifications').insert({
    user_id: receiverId,
    type: 'project_update',
    title: 'Brief pronto per la tua approvazione',
    body: "Dai un'occhiata al brief e approvalo per aprire la chat.",
    data: { project_id: projectId },
  })

  revalidatePath(`/projects/${projectId}`)
  return { error: null }
}

// ── Approva brief (solo ricevente) ─────────────────────────────

export async function approveBrief(projectId: string) {
  const { supabase, project, isPhotographer, isProposer } = await getProjectAndUser(projectId)

  if (isProposer) return { error: 'Il proponente non può approvare il proprio brief.' }
  if (project.status !== 'accepted') return { error: 'Nessun brief da approvare.' }

  const { data: brief } = await supabase
    .from('briefs')
    .select('id')
    .eq('project_id', projectId)
    .maybeSingle()

  if (!brief) return { error: 'Il proponente non ha ancora inviato il brief.' }

  const now = new Date().toISOString()
  const receiverSignField = isPhotographer ? 'signed_by_photographer_at' : 'signed_by_model_at'

  await Promise.all([
    supabase.from('briefs').update({ [receiverSignField]: now }).eq('project_id', projectId),
    supabase.from('projects').update({ status: 'brief_signed' }).eq('id', projectId),
  ])

  // Notifica al proponente
  if (project.proposer_id) {
    const adminClient = createAdminClient()
    await adminClient.from('notifications').insert({
      user_id: project.proposer_id,
      type: 'project_update',
      title: 'Brief approvato!',
      body: 'La tua controparte ha approvato il brief. La chat è ora aperta.',
      data: { project_id: projectId },
    })
  }

  revalidatePath(`/projects/${projectId}`)
  return { error: null }
}

// ── Conferma completamento ─────────────────────────────────────

export async function confirmCompletion(projectId: string) {
  const { supabase, project, isPhotographer } = await getProjectAndUser(projectId)

  const allowedStatuses = project.payer_role === 'tfp' ? ['brief_signed'] : ['paid']
  if (!allowedStatuses.includes(project.status)) {
    return { error: 'Non puoi confermare il completamento in questo stato.' }
  }

  const { error } = await supabase
    .from('projects')
    .update({ status: 'completed' })
    .eq('id', projectId)

  if (error) return { error: error.message }

  const photographerId = project.photographer_id
  const modelId = project.model_id
  const photographerLevel = (project.photographer as { level: number }).level
  const modelLevel = (project.model as { level: number }).level

  await Promise.all([
    supabase.rpc('apply_xp', { p_profile_id: photographerId, p_delta: XP_VALUES.SHOOT_COMPLETED, p_reason: 'shoot_completed', p_project_id: projectId }),
    supabase.rpc('apply_xp', { p_profile_id: modelId, p_delta: XP_VALUES.SHOOT_COMPLETED, p_reason: 'shoot_completed', p_project_id: projectId }),
  ])

  if (photographerLevel === 5 && modelLevel < 5) {
    await supabase.rpc('apply_xp', { p_profile_id: modelId, p_delta: XP_VALUES.MASTER_COLLABORATION, p_reason: 'master_collaboration', p_project_id: projectId })
  }
  if (modelLevel === 5 && photographerLevel < 5) {
    await supabase.rpc('apply_xp', { p_profile_id: photographerId, p_delta: XP_VALUES.MASTER_COLLABORATION, p_reason: 'master_collaboration', p_project_id: projectId })
  }

  revalidatePath(`/projects/${projectId}`)
  return { error: null }
}

// ── Invia recensione ───────────────────────────────────────────

export async function submitReview(
  projectId: string,
  revieweeId: string,
  rating: number,
  comment: string
) {
  const { supabase, user, project } = await getProjectAndUser(projectId)

  if (project.status !== 'completed') return { error: 'Il progetto non è ancora completato.' }

  const { error } = await supabase.from('reviews').insert({
    project_id: projectId,
    reviewer_id: user.id,
    reviewee_id: revieweeId,
    rating,
    comment: comment.trim() || null,
  })

  if (error) return { error: error.message }

  const xpDelta = rating === 5 ? XP_VALUES.REVIEW_5_STARS : rating === 4 ? XP_VALUES.REVIEW_4_STARS : 0
  if (xpDelta > 0) {
    const reason: 'review_5_stars' | 'review_4_stars' = rating === 5 ? 'review_5_stars' : 'review_4_stars'
    await supabase.rpc('apply_xp', { p_profile_id: revieweeId, p_delta: xpDelta, p_reason: reason, p_project_id: projectId })
  }

  revalidatePath(`/projects/${projectId}`)
  return { error: null }
}

// ── Invia messaggio ────────────────────────────────────────────

export async function sendMessage(projectId: string, content: string) {
  const { supabase, user } = await getProjectAndUser(projectId)

  if (!content.trim()) return { error: 'Messaggio vuoto.' }

  const { error } = await supabase.from('messages').insert({
    project_id: projectId,
    sender_id: user.id,
    content: content.trim(),
  })

  if (error) return { error: error.message }
  return { error: null }
}
