'use server'

import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'

export async function deleteProject(projectId: string) {
  await requireAdmin()
  const admin = createAdminClient()

  // Elimina dati collegati prima (nel caso non ci sia CASCADE)
  await Promise.all([
    admin.from('messages').delete().eq('project_id', projectId),
    admin.from('reviews').delete().eq('project_id', projectId),
    admin.from('briefs').delete().eq('project_id', projectId),
  ])

  const { error } = await admin.from('projects').delete().eq('id', projectId)

  if (error) return { error: error.message }
  return { error: null }
}
