'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function proposeCollaboration(targetProfileId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Carica entrambi i profili
  const [{ data: myProfile }, { data: targetProfile }] = await Promise.all([
    supabase.from('profiles').select('id, role, level').eq('id', user.id).single(),
    supabase.from('profiles').select('id, role, level').eq('id', targetProfileId).single(),
  ])

  if (!myProfile || !targetProfile) {
    return { projectId: null, error: 'Profilo non trovato.' }
  }

  if (myProfile.role === targetProfile.role) {
    return { projectId: null, error: 'Puoi collaborare solo con un ruolo diverso dal tuo.' }
  }

  // Determina chi è fotografo e chi è modella
  const photographerId = myProfile.role === 'photographer' ? myProfile.id : targetProfile.id
  const modelId = myProfile.role === 'model' ? myProfile.id : targetProfile.id

  // Verifica che non esista già un progetto aperto tra questi due
  const { data: existing } = await supabase
    .from('projects')
    .select('id')
    .eq('photographer_id', photographerId)
    .eq('model_id', modelId)
    .in('status', ['proposed', 'accepted', 'brief_signed', 'paid'])
    .maybeSingle()

  if (existing) {
    return { projectId: existing.id, error: null }
  }

  // Calcola payer_role e amount (amount sarà definito nel brief)
  const photographerLevel = myProfile.role === 'photographer' ? myProfile.level : targetProfile.level
  const modelLevel = myProfile.role === 'model' ? myProfile.level : targetProfile.level

  let payerRole: 'photographer' | 'model' | 'tfp'
  if (photographerLevel === modelLevel) {
    payerRole = 'tfp'
  } else if (photographerLevel > modelLevel) {
    payerRole = 'model'
  } else {
    payerRole = 'photographer'
  }

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      photographer_id: photographerId,
      model_id: modelId,
      proposed_by: user.id,
      status: 'proposed',
      payer_role: payerRole,
      amount: 0,
    })
    .select('id')
    .single()

  if (error || !project) {
    return { projectId: null, error: error?.message ?? 'Errore nella creazione del progetto.' }
  }

  return { projectId: project.id, error: null }
}
