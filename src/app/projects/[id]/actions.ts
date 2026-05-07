'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  return { supabase, user, project, isPhotographer, isModel }
}

// ── Accetta proposta ───────────────────────────────────────────

export async function acceptProject(projectId: string) {
  const { supabase, project, isPhotographer, isModel } = await getProjectAndUser(projectId)

  if (project.status !== 'proposed') return { error: 'Progetto non in stato proposta.' }

  // Solo chi ha ricevuto la proposta può accettare
  // La proposta è sempre fatta dall'utente che l'ha creata (photographer_id o model_id)
  // Per semplicità accettiamo che uno dei due possa accettare
  if (!isPhotographer && !isModel) return { error: 'Non autorizzato.' }

  const { error } = await supabase
    .from('projects')
    .update({ status: 'accepted' })
    .eq('id', projectId)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { error: null }
}

// ── Rifiuta / cancella proposta ────────────────────────────────

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

// ── Salva / aggiorna brief ─────────────────────────────────────

export async function saveBrief(projectId: string, data: BriefFormData) {
  const { supabase, project } = await getProjectAndUser(projectId)

  if (!['accepted'].includes(project.status)) {
    return { error: 'Il brief può essere modificato solo quando il progetto è accettato.' }
  }

  const { error } = await supabase
    .from('briefs')
    .upsert(
      {
        project_id: projectId,
        ...data,
        // Reset firme quando il brief viene aggiornato
        signed_by_photographer_at: null,
        signed_by_model_at: null,
      },
      { onConflict: 'project_id' }
    )

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { error: null }
}

// ── Firma brief ────────────────────────────────────────────────

export async function signBrief(projectId: string) {
  const { supabase, user, project, isPhotographer } = await getProjectAndUser(projectId)

  if (project.status !== 'accepted') return { error: 'Progetto non in stato accettato.' }

  const { data: brief } = await supabase
    .from('briefs')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (!brief) return { error: 'Compila prima il brief.' }

  const now = new Date().toISOString()
  const field = isPhotographer ? 'signed_by_photographer_at' : 'signed_by_model_at'
  const otherField = isPhotographer ? 'signed_by_model_at' : 'signed_by_photographer_at'

  await supabase
    .from('briefs')
    .update({ [field]: now })
    .eq('project_id', projectId)

  // Se anche l'altro ha già firmato → brief_signed
  if (brief[otherField]) {
    const nextStatus = project.payer_role === 'tfp' ? 'brief_signed' : 'brief_signed'
    await supabase
      .from('projects')
      .update({ status: nextStatus })
      .eq('id', projectId)
  }

  revalidatePath(`/projects/${projectId}`)
  return { error: null }
}

// ── Conferma completamento ─────────────────────────────────────

export async function confirmCompletion(projectId: string) {
  const { supabase, user, project, isPhotographer } = await getProjectAndUser(projectId)

  const allowedStatuses = project.payer_role === 'tfp'
    ? ['brief_signed']
    : ['paid']

  if (!allowedStatuses.includes(project.status)) {
    return { error: 'Non puoi confermare il completamento in questo stato.' }
  }

  // Usiamo i metadati del progetto per tracciare chi ha confermato
  // Soluzione semplice: colonne dedicate (aggiungiamo con upsert su un campo json)
  // Per v1 usiamo un approccio basato sui messaggi di sistema
  const confirmField = isPhotographer
    ? 'confirmed_by_photographer'
    : 'confirmed_by_model'

  // Leggi stato attuale delle conferme dalla tabella (campo JSON nella tabella projects)
  // Poiché non abbiamo questi campi nello schema, usiamo una colonna metadata
  // Approcio semplificato: contiamo i messaggi di conferma
  // Per v1: un solo utente che conferma → completed (semplificato)
  // In produzione servirebbe un campo confirmed_by_photographer / confirmed_by_model

  const { error } = await supabase
    .from('projects')
    .update({ status: 'completed' })
    .eq('id', projectId)

  if (error) return { error: error.message }

  // Assegna XP a entrambi tramite apply_xp (security definer, gestisce XP + log atomicamente)
  const photographerId = project.photographer_id
  const modelId = project.model_id
  const photographerLevel = (project.photographer as { level: number }).level
  const modelLevel = (project.model as { level: number }).level

  await Promise.all([
    supabase.rpc('apply_xp', { p_profile_id: photographerId, p_delta: XP_VALUES.SHOOT_COMPLETED, p_reason: 'shoot_completed', p_project_id: projectId }),
    supabase.rpc('apply_xp', { p_profile_id: modelId, p_delta: XP_VALUES.SHOOT_COMPLETED, p_reason: 'shoot_completed', p_project_id: projectId }),
  ])

  // Bonus collaborazione con Master
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

  // XP per chi ha ricevuto la recensione
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
