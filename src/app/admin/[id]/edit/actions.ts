'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFounder } from '@/lib/founder'

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
    })
    .eq('id', profileId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/${profileId}`)
  revalidatePath('/admin')
  redirect(`/admin/${profileId}`)
}
