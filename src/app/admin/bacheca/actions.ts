'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'

export async function deleteVision(visionId: string) {
  await requireAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('visions').delete().eq('id', visionId)
  if (error) return { error: error.message }
  revalidatePath('/admin/bacheca')
  return { error: null }
}

export async function deleteTour(tourId: string) {
  await requireAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('tours').delete().eq('id', tourId)
  if (error) return { error: error.message }
  revalidatePath('/admin/bacheca')
  return { error: null }
}
