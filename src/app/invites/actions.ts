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
    supabase.from('profiles').select('id, role, level, full_name').eq('id', user.id).single(),
    supabase.from('profiles').select('id, role, level, full_name').eq('id', receiverId).single(),
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

  const adminClient = createAdminClient()

  // Controlla se esiste già un invito pending tra questi due utenti
  const { data: existing } = await adminClient
    .from('project_invites')
    .select('id')
    .eq('sender_id', user.id)
    .eq('receiver_id', receiverId)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) return { error: 'Hai già una proposta in attesa con questo utente.' }

  const { data: invite, error: inviteError } = await adminClient
    .from('project_invites')
    .insert({
      sender_id: user.id,
      receiver_id: receiverId,
      message: payload.message,
      creative_idea: payload.creative_idea,
      location: payload.location,
      alternative_amount: payload.alternative_amount,
      moodboard_urls: payload.moodboard_urls,
      status: 'pending',
      payer_role: payerRole,
      amount,
    })
    .select()
    .single()

  if (inviteError) return { error: inviteError.message }

  const senderLabel =
    senderProfile.role === 'photographer' ? 'Fotografo' : 'Modella / Modello'

  await adminClient.from('notifications').insert({
    profile_id: receiverId,
    type: 'invite_received',
    title: `${senderProfile.full_name} ti ha proposto una collaborazione`,
    body: payload.message,
    invite_id: invite.id,
  })

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
      sender:profiles!project_invites_sender_id_fkey(id, role, level, full_name),
      receiver:profiles!project_invites_receiver_id_fkey(id, role, level, full_name)
    `)
    .eq('id', inviteId)
    .single()

  if (!invite) return { error: 'Invito non trovato.' }
  if (invite.receiver_id !== user.id) return { error: 'Non autorizzato.' }
  if (invite.status !== 'pending') return { error: 'Invito non più disponibile.' }

  const sender = invite.sender as { id: string; role: string; level: number; full_name: string }
  const receiver = invite.receiver as { id: string; role: string; level: number; full_name: string }

  const photographerId = sender.role === 'photographer' ? sender.id : receiver.id
  const modelId = sender.role === 'model' ? sender.id : receiver.id

  const { data: project, error: projectError } = await adminClient
    .from('projects')
    .insert({
      photographer_id: photographerId,
      model_id: modelId,
      proposed_by: invite.sender_id,
      status: 'accepted',
      payer_role: invite.payer_role,
      amount: invite.amount,
      invite_id: inviteId,
    })
    .select()
    .single()

  if (projectError) return { error: projectError.message }

  await Promise.all([
    adminClient
      .from('project_invites')
      .update({ status: 'accepted' })
      .eq('id', inviteId),

    adminClient.from('notifications').insert({
      profile_id: invite.sender_id,
      type: 'invite_accepted',
      title: `${receiver.full_name} ha accettato la tua proposta`,
      body: null,
      invite_id: inviteId,
      project_id: project.id,
    }),

    // Segna la notifica originale come letta
    adminClient
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('invite_id', inviteId)
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
    .select('sender_id, receiver_id, receiver:profiles!project_invites_receiver_id_fkey(full_name)')
    .eq('id', inviteId)
    .single()

  if (!invite) return { error: 'Invito non trovato.' }
  if (invite.receiver_id !== user.id) return { error: 'Non autorizzato.' }

  const receiver = invite.receiver as unknown as { full_name: string }

  await Promise.all([
    adminClient
      .from('project_invites')
      .update({ status: 'declined' })
      .eq('id', inviteId),

    adminClient.from('notifications').insert({
      profile_id: invite.sender_id,
      type: 'invite_declined',
      title: `${receiver.full_name} ha rifiutato la tua proposta`,
      body: null,
      invite_id: inviteId,
    }),

    adminClient
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('invite_id', inviteId)
      .eq('type', 'invite_received'),
  ])

  return { error: null }
}

// ── Segna notifica come letta ─────────────────────────────────────

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autenticato.' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('profile_id', user.id)

  return { error: error?.message ?? null }
}
