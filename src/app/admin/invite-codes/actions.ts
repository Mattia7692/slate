'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'SLATE-'
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function generateInviteCode(adminProfileId: string) {
  await requireAdmin()
  const admin = createAdminClient()

  // Genera un codice univoco (riprova in caso di collisione)
  let code = generateCode()
  let attempts = 0
  while (attempts < 5) {
    const { data: existing } = await admin
      .from('invite_codes')
      .select('id')
      .eq('code', code)
      .single()

    if (!existing) break
    code = generateCode()
    attempts++
  }

  const { error } = await admin.from('invite_codes').insert({
    code,
    created_by: adminProfileId,
  })

  if (error) return { code: null, error: error.message }

  revalidatePath('/admin/invite-codes')
  return { code, error: null }
}
