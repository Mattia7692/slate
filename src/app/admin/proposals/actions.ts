'use server'

import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'

export async function deleteProposal(inviteId: string) {
  await requireAdmin()
  const admin = createAdminClient()

  const { error } = await admin
    .from('project_invites')
    .delete()
    .eq('id', inviteId)

  if (error) return { error: error.message }
  return { error: null }
}
