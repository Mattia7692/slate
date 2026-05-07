'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Ritorna l'id della conversazione (esistente o appena creata) e ci naviga
export async function openConversation(otherUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  if (user.id === otherUserId) return { error: 'Non puoi chattare con te stesso.' }

  // Ordina i partecipanti per garantire unicità
  const [p1, p2] = [user.id, otherUserId].sort()

  // Cerca conversazione esistente
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('participant_1', p1)
    .eq('participant_2', p2)
    .maybeSingle()

  if (existing) {
    redirect(`/messages/${existing.id}`)
  }

  // Crea nuova conversazione
  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert({ participant_1: p1, participant_2: p2 })
    .select('id')
    .single()

  if (error || !newConv) return { error: error?.message ?? 'Errore nella creazione della conversazione.' }

  redirect(`/messages/${newConv.id}`)
}

export async function sendDirectMessage(conversationId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  if (!content.trim()) return { error: 'Messaggio vuoto.' }

  // Verifica che l'utente sia partecipante
  const { data: conv } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
    .maybeSingle()

  if (!conv) return { error: 'Conversazione non trovata.' }

  const { error } = await supabase
    .from('direct_messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, content: content.trim() })

  if (error) return { error: error.message }
  revalidatePath(`/messages/${conversationId}`)
  return { error: null }
}
