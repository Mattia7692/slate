'use server'

import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'

export async function deleteConversation(conversationId: string) {
  await requireAdmin()
  const admin = createAdminClient()

  // Prima elimina i messaggi (nel caso non ci sia CASCADE sul DB)
  await admin.from('direct_messages').delete().eq('conversation_id', conversationId)

  const { error } = await admin.from('conversations').delete().eq('id', conversationId)

  if (error) return { error: error.message }
  return { error: null }
}
