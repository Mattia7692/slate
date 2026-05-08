'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin'
import { isFounder } from '@/lib/founder'
import type { ProfileStatus } from '@/types'

async function setProfileStatus(profileId: string, status: ProfileStatus) {
  await requireAdmin()
  if (isFounder(profileId)) return { error: 'Il profilo Founder non può essere modificato.' }
  const admin = createAdminClient()

  const { error } = await admin
    .from('profiles')
    .update({ status })
    .eq('id', profileId)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  revalidatePath(`/admin/${profileId}`)
  return { error: null }
}

export async function approveProfile(profileId: string) {
  return setProfileStatus(profileId, 'approved')
}

export async function suspendProfile(profileId: string) {
  return setProfileStatus(profileId, 'suspended')
}

export async function setPendingProfile(profileId: string) {
  return setProfileStatus(profileId, 'pending')
}

export async function deleteProfile(profileId: string): Promise<{ error: string | null }> {
  await requireAdmin()
  if (isFounder(profileId)) return { error: 'Il profilo Founder non può essere cancellato.' }

  const admin = createAdminClient()

  // Cancella l'utente da auth (a cascata elimina il profilo via FK o trigger)
  const { error: authError } = await admin.auth.admin.deleteUser(profileId)
  if (authError) return { error: authError.message }

  revalidatePath('/admin')
  redirect('/admin')
}
