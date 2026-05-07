'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFounder } from '@/lib/founder'

export async function toggleAdmin(profileId: string, makeAdmin: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Solo il Founder può promuovere/revocare admin
  if (!isFounder(user.id)) {
    return { error: 'Solo il Founder può gestire gli admin.' }
  }

  // Non si può toccare il Founder stesso
  if (isFounder(profileId)) {
    return { error: 'Il profilo Founder non può essere modificato.' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ is_admin: makeAdmin })
    .eq('id', profileId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/${profileId}`)
  return { error: null }
}
