'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFounder } from '@/lib/founder'
import { computeLevel } from '@/lib/xp'

export async function adminUpdateProfile(profileId: string, formData: FormData) {
  await requireAdmin()
  if (isFounder(profileId)) return { error: 'Il profilo Founder non può essere modificato.' }
  const admin = createAdminClient()

  const full_name = (formData.get('full_name') as string).trim()
  const bio = (formData.get('bio') as string).trim()
  const city = (formData.get('city') as string).trim()
  const instagram_url = (formData.get('instagram_url') as string).trim()
  const years_in_industry = parseInt(formData.get('years_in_industry') as string) || 0
  const xp = parseInt(formData.get('xp') as string) || 0

  if (full_name.length < 2) {
    return { error: 'Il nome deve avere almeno 2 caratteri.' }
  }
  if (xp < 0) {
    return { error: 'Gli XP non possono essere negativi.' }
  }

  const { error } = await admin
    .from('profiles')
    .update({
      full_name,
      bio: bio || null,
      city: city || null,
      instagram_url: instagram_url || null,
      years_in_industry,
      xp,
      level: computeLevel(xp),
    })
    .eq('id', profileId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/${profileId}`)
  revalidatePath('/admin')
  redirect(`/admin/${profileId}`)
}

export async function awardFounderXp(profileId: string, delta: number) {
  await requireAdmin()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isFounder(user?.id ?? '')) return { error: 'Solo il Founder può assegnare bonus XP.' }
  if (isFounder(profileId)) return { error: 'Non puoi assegnare XP al Founder.' }
  if (delta === 0) return { error: 'Il valore deve essere diverso da zero.' }

  const admin = createAdminClient()

  // Leggi XP attuali
  const { data: profile } = await admin
    .from('profiles')
    .select('xp')
    .eq('id', profileId)
    .single()

  if (!profile) return { error: 'Profilo non trovato.' }

  const newXp = Math.max(0, profile.xp + delta)
  const newLevel = computeLevel(newXp)

  // Aggiorna XP + level e logga la transazione
  const [{ error: updateError }, { error: logError }] = await Promise.all([
    admin.from('profiles').update({ xp: newXp, level: newLevel }).eq('id', profileId),
    admin.from('xp_transactions').insert({
      profile_id: profileId,
      delta,
      reason: 'founder_bonus',
      project_id: null,
    }),
  ])

  if (updateError) return { error: updateError.message }
  if (logError) return { error: logError.message }

  revalidatePath(`/admin/${profileId}`)
  return { error: null, newXp }
}
