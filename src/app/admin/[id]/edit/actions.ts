'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFounder } from '@/lib/founder'
import { computeLevel, yearsFromStartYear } from '@/lib/xp'

async function getCurrentUserId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? ''
}

export async function adminUpdateProfile(profileId: string, formData: FormData) {
  await requireAdmin()

  const currentUserId = await getCurrentUserId()
  // Gli admin non possono modificare il Founder, ma il Founder può modificare se stesso
  if (isFounder(profileId) && !isFounder(currentUserId)) {
    return { error: 'Il profilo Founder non può essere modificato.' }
  }

  const admin = createAdminClient()

  const full_name = (formData.get('full_name') as string).trim()
  const bio = (formData.get('bio') as string).trim()
  const city = (formData.get('city') as string).trim()
  const instagram_url = (formData.get('instagram_url') as string).trim()
  const career_start_year = parseInt(formData.get('career_start_year') as string) || null
  const years_in_industry = career_start_year ? yearsFromStartYear(career_start_year) : 0
  const xp = parseInt(formData.get('xp') as string) || 0
  const hourlyRateRaw = formData.get('hourly_rate') as string | null
  const hourly_rate = hourlyRateRaw && parseInt(hourlyRateRaw) > 0 ? parseInt(hourlyRateRaw) : null

  if (full_name.length < 2) return { error: 'Il nome deve avere almeno 2 caratteri.' }
  if (xp < 0) return { error: 'Gli XP non possono essere negativi.' }

  const { error } = await admin
    .from('profiles')
    .update({
      full_name,
      bio: bio || null,
      city: city || null,
      instagram_url: instagram_url || null,
      career_start_year,
      years_in_industry,
      xp,
      level: computeLevel(xp),
      hourly_rate,
    })
    .eq('id', profileId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/${profileId}`)
  revalidatePath('/admin')
  redirect(`/admin/${profileId}`)
}

export async function uploadAvatarAdmin(
  profileId: string,
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  await requireAdmin()

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'Nessun file selezionato.' }

  const admin = createAdminClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${profileId}/avatar.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await admin.storage
    .from('avatars')
    .upload(path, buffer, { contentType: file.type, cacheControl: '3600', upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data } = admin.storage.from('avatars').getPublicUrl(path)
  const url = `${data.publicUrl}?t=${Date.now()}`

  const { error: updateError } = await admin
    .from('profiles')
    .update({ avatar_url: url })
    .eq('id', profileId)

  if (updateError) return { error: updateError.message }

  revalidatePath(`/admin/${profileId}`)
  revalidatePath(`/admin/${profileId}/edit`)
  return { url }
}

export async function adminUpdateProfileGenres(profileId: string, genreIds: string[]) {
  await requireAdmin()
  const admin = createAdminClient()

  await admin.from('profile_genres').delete().eq('profile_id', profileId)

  if (genreIds.length > 0) {
    const { error } = await admin.from('profile_genres').insert(
      genreIds.map((genre_id) => ({ profile_id: profileId, genre_id }))
    )
    if (error) return { error: error.message }
  }

  revalidatePath(`/admin/${profileId}`)
  revalidatePath(`/admin/${profileId}/edit`)
  return { error: null }
}

export async function awardFounderXp(profileId: string, delta: number) {
  await requireAdmin()

  const currentUserId = await getCurrentUserId()
  if (!isFounder(currentUserId)) return { error: 'Solo il Founder può assegnare bonus XP.' }
  if (delta === 0) return { error: 'Il valore deve essere diverso da zero.' }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('xp')
    .eq('id', profileId)
    .single()

  if (!profile) return { error: 'Profilo non trovato.' }

  const newXp = Math.max(0, profile.xp + delta)
  const newLevel = computeLevel(newXp)

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
