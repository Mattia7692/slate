'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculatePayment } from '@/lib/payment'

// ── Invia proposta di collaborazione ──────────────────────────────

interface SendInvitePayload {
  message: string | null
  creative_idea: string
  location: string
  alternative_amount: number | null
  moodboard_urls: string[]
}

export async function sendInvite(receiverId: string, payload: SendInvitePayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: senderProfile }, { data: receiverProfile }] = await Promise.all([
    supabase.from('profiles').select('id, role, level, full_name, xp').eq('id', user.id).single(),
    supabase.from('profiles').select('id, role, level, full_name, xp').eq('id', receiverId).single(),
  ])

  if (!senderProfile) return { error: 'Profilo non trovato.' }
  if (!receiverProfile) return { error: 'Profilo del destinatario non trovato.' }

  if (senderProfile.role === receiverProfile.role) {
    return { error: 'Puoi collaborare solo con utenti di ruolo opposto.' }
  }

  const photographerLevel =
    senderProfile.role === 'photographer' ? senderProfile.level : receiverProfile.level
  const modelLevel =
    senderProfile.role === 'model' ? senderProfile.level : receiverProfile.level

  const { payerRole, amount } = calculatePayment(photographerLevel, modelLevel)

  // Il DB accetta 'from'|'to'|'tfp' — mappiamo dal ruolo al punto di vista del mittente
  const proposedPayer =
    payerRole === 'tfp' ? 'tfp'
    : (senderProfile.role === payerRole) ? 'from'
    : 'to'

  const adminClient = createAdminClient()

  // Controlla se esiste già un invito pending tra questi due utenti
  const { data: existing } = await adminClient
    .from('project_invites')
    .select('id')
    .eq('from_profile_id', user.id)
    .eq('to_profile_id', receiverId)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) return { error: 'Hai già una proposta in attesa con questo utente.' }

  const { data: invite, error: inviteError } = await adminClient
    .from('project_invites')
    .insert({
      from_profile_id: user.id,
      to_profile_id: receiverId,
      notes: payload.message,
      creative_idea: payload.creative_idea,
      location: payload.location,
      alternative_amount: payload.alternative_amount,
      moodboard_urls: payload.moodboard_urls,
      status: 'pending',
      proposed_payer: proposedPayer,
      proposed_amount: amount,
      from_xp_snapshot: senderProfile.xp,
      to_xp_snapshot: receiverProfile.xp,
    })
    .select()
    .single()

  if (inviteError) return { error: inviteError.message }

  const { error: notifError } = await adminClient.from('notifications').insert({
    user_id: receiverId,
    type: 'invite_received',
    title: 'Nuova proposta di collaborazione',
    body: `${senderProfile.full_name}${payload.creative_idea ? ': ' + payload.creative_idea.slice(0, 100) : ''}`,
    data: { invite_id: invite.id },
  })
  if (notifError) console.error('Notifica non creata:', notifError.message)

  return { error: null, inviteId: invite.id }
}

// ── Accetta proposta ──────────────────────────────────────────────

export async function acceptInvite(inviteId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()

  const { data: invite } = await adminClient
    .from('project_invites')
    .select(`
      *,
      sender:profiles!project_invites_from_profile_id_fkey(id, role, level, full_name),
      receiver:profiles!project_invites_to_profile_id_fkey(id, role, level, full_name)
    `)
    .eq('id', inviteId)
    .single()

  if (!invite) return { error: 'Invito non trovato.' }
  if (invite.to_profile_id !== user.id) return { error: 'Non autorizzato.' }
  if (invite.status !== 'pending') return { error: 'Invito non più disponibile.' }

  const sender = invite.sender as { id: string; role: string; level: number; full_name: string }
  const receiver = invite.receiver as { id: string; role: string; level: number; full_name: string }

  const photographerId = sender.role === 'photographer' ? sender.id : receiver.id
  const modelId = sender.role === 'model' ? sender.id : receiver.id

  // Converte 'from'|'to'|'tfp' → 'photographer'|'model'|'tfp' per la tabella projects
  const rawPayer = invite.proposed_payer as string
  const payerRole =
    rawPayer === 'tfp' ? 'tfp'
    : rawPayer === 'from' ? sender.role
    : receiver.role

  const { data: project, error: projectError } = await adminClient
    .from('projects')
    .insert({
      photographer_id: photographerId,
      model_id: modelId,
      status: 'accepted',
      payer_role: payerRole,
      amount: invite.proposed_amount,
    })
    .select()
    .single()

  if (projectError) return { error: projectError.message }

  await Promise.all([
    adminClient
      .from('project_invites')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', inviteId),

    adminClient.from('notifications').insert({
      user_id: invite.from_profile_id,
      type: 'invite_accepted',
      title: `${receiver.full_name} ha accettato la tua proposta`,
      body: null,
      data: { invite_id: inviteId, project_id: project.id },
    }),

    adminClient
      .from('notifications')
      .update({ read: true })
      .filter('data->>invite_id', 'eq', inviteId)
      .eq('type', 'invite_received'),
  ])

  return { error: null, projectId: project.id }
}

// ── Rifiuta proposta ──────────────────────────────────────────────

export async function declineInvite(inviteId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()

  const { data: invite } = await adminClient
    .from('project_invites')
    .select('from_profile_id, to_profile_id, receiver:profiles!project_invites_to_profile_id_fkey(full_name)')
    .eq('id', inviteId)
    .single()

  if (!invite) return { error: 'Invito non trovato.' }
  if (invite.to_profile_id !== user.id) return { error: 'Non autorizzato.' }

  const receiver = invite.receiver as unknown as { full_name: string }

  await Promise.all([
    adminClient
      .from('project_invites')
      .update({ status: 'declined', responded_at: new Date().toISOString() })
      .eq('id', inviteId),

    adminClient.from('notifications').insert({
      user_id: invite.from_profile_id,
      type: 'invite_declined',
      title: `${receiver.full_name} ha rifiutato la tua proposta`,
      body: null,
      data: { invite_id: inviteId },
    }),

    adminClient
      .from('notifications')
      .update({ read: true })
      .filter('data->>invite_id', 'eq', inviteId)
      .eq('type', 'invite_received'),
  ])

  return { error: null }
}

// ── Dettagli invito (per modal) ───────────────────────────────────

export interface InviteDetails {
  id: string
  creative_idea: string | null
  location: string | null
  notes: string | null
  moodboard_urls: string[]
  proposed_payer: string
  proposed_amount: number
  alternative_amount: number | null
  created_at: string
  from_profile: { id: string; full_name: string; role: string; level: number; avatar_url: string | null }
  to_profile: { id: string; full_name: string; role: string; level: number; avatar_url: string | null }
}

export async function getInviteDetails(inviteId: string): Promise<{ data: InviteDetails | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Non autenticato.' }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('project_invites')
    .select(`
      id, creative_idea, location, notes, moodboard_urls,
      proposed_payer, proposed_amount, alternative_amount, created_at,
      from_profile:profiles!project_invites_from_profile_id_fkey(id, full_name, role, level, avatar_url),
      to_profile:profiles!project_invites_to_profile_id_fkey(id, full_name, role, level, avatar_url)
    `)
    .eq('id', inviteId)
    .eq('status', 'pending')
    .single()

  if (error || !data) return { data: null, error: 'Proposta non trovata.' }

  // Verifica che l'utente sia coinvolto
  const from = data.from_profile as unknown as InviteDetails['from_profile']
  const to = data.to_profile as unknown as InviteDetails['to_profile']
  if (from.id !== user.id && to.id !== user.id) return { data: null, error: 'Non autorizzato.' }

  return {
    data: {
      id: data.id,
      creative_idea: data.creative_idea,
      location: data.location,
      notes: data.notes,
      moodboard_urls: (data.moodboard_urls as string[]) ?? [],
      proposed_payer: data.proposed_payer as string,
      proposed_amount: data.proposed_amount,
      alternative_amount: data.alternative_amount,
      created_at: data.created_at,
      from_profile: from,
      to_profile: to,
    },
    error: null,
  }
}

// ── Segna notifica come letta ─────────────────────────────────────

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autenticato.' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id)

  return { error: error?.message ?? null }
}
