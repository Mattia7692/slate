import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar'
import { DeleteConversationButton } from './DeleteConversationButton'
import type { ConversationWithProfiles, Profile } from '@/types'

export default async function AdminMessagesPage() {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: raw } = await admin
    .from('conversations')
    .select(`
      id, created_at,
      participant_1_profile:profiles!conversations_participant_1_fkey(id, full_name, role, avatar_url, level),
      participant_2_profile:profiles!conversations_participant_2_fkey(id, full_name, role, avatar_url, level)
    `)
    .order('created_at', { ascending: false })

  const conversations = (raw ?? []) as unknown as ConversationWithProfiles[]

  // Conta messaggi per conversazione
  const { data: counts } = await admin
    .from('direct_messages')
    .select('conversation_id')

  const countMap = new Map<string, number>()
  counts?.forEach((m) => {
    countMap.set(m.conversation_id, (countMap.get(m.conversation_id) ?? 0) + 1)
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Monitoraggio chat</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{conversations.length} conversazioni totali</p>
        </div>
      </div>

      {conversations.length === 0 ? (
        <p className="text-sm text-neutral-500 py-12 text-center">Nessuna conversazione ancora.</p>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const p1 = conv.participant_1_profile
            const p2 = conv.participant_2_profile
            const msgCount = countMap.get(conv.id) ?? 0

            return (
              <div key={conv.id} className="flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900/50 px-5 py-4 hover:border-neutral-700 hover:bg-neutral-900 transition-colors">
                <Link href={`/admin/messages/${conv.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Partecipanti */}
                  <div className="flex items-center gap-2 shrink-0">
                    <ProfileAvatar avatarUrl={(p1 as unknown as Profile).avatar_url ?? null} role={p1.role} size={32} />
                    <span className="text-neutral-600 text-xs">↔</span>
                    <ProfileAvatar avatarUrl={(p2 as unknown as Profile).avatar_url ?? null} role={p2.role} size={32} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {p1.full_name} · {p2.full_name}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {new Date(conv.created_at).toLocaleDateString('it-IT')}
                    </p>
                  </div>

                  <span className="text-xs text-neutral-500 shrink-0">
                    {msgCount} {msgCount === 1 ? 'messaggio' : 'messaggi'}
                  </span>
                  <span className="text-neutral-600 shrink-0">›</span>
                </Link>

                <DeleteConversationButton conversationId={conv.id} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
