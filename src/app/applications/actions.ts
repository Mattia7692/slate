'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function submitApplication(data: {
  role: 'photographer' | 'model'
  email: string
  portfolio_url: string
  bio: string
}) {
  const admin = createAdminClient()

  const { error } = await admin
    .from('applications')
    .insert({
      role: data.role,
      email: data.email.trim().toLowerCase(),
      portfolio_url: data.portfolio_url.trim(),
      bio: data.bio.trim(),
      status: 'pending',
    })

  if (error) return { error: error.message }

  const roleLabel = data.role === 'photographer' ? 'Fotografo/a' : 'Modella/o'

  // Notifiche in-app per tutti gli admin
  const { data: admins } = await admin
    .from('profiles')
    .select('id')
    .eq('is_admin', true)

  if (admins && admins.length > 0) {
    await admin.from('notifications').insert(
      admins.map((a) => ({
        profile_id: a.id,
        type: 'project_update' as const,
        title: 'Nuova candidatura',
        body: `${roleLabel} — ${data.email}`,
        invite_id: null,
        project_id: null,
      }))
    )
  }

  return { error: null }
}

export async function updateApplicationStatus(
  applicationId: string,
  status: 'approved' | 'rejected'
) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('applications')
    .update({ status })
    .eq('id', applicationId)

  if (error) return { error: error.message }
  return { error: null }
}

export async function deleteApplication(applicationId: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('applications')
    .delete()
    .eq('id', applicationId)

  if (error) return { error: error.message }
  return { error: null }
}
