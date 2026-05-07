import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar'
import type { ConversationWithProfiles, DirectMessageWithSender, Profile } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminConversationPage({ params }: Props) {
  await requireAdmin()
  const admin = createAdminClient()

  const { id } = await params

  const { data: raw } = await admin
    .from('conversations')
    .select(`
      id, created_at,
      participant_1, participant_2,
      participant_1_profile:profiles!conversations_participant_1_fkey(id, full_name, role, avatar_url, level),
      participant_2_profile:profiles!conversations_participant_2_fkey(id, full_name, role, avatar_url, level)
    `)
    .eq('id', id)
    .maybeSingle()

  if (!raw) notFound()

  const conv = raw as unknown as ConversationWithProfiles

  const { data: rawMessages } = await admin
    .from('direct_messages')
    .select('*, sender:profiles!direct_messages_sender_id_fkey(id, full_name, role)')
    .eq('conversation_id', id)
    .order('created_at')

  const messages = (rawMessages ?? []) as DirectMessageWithSender[]

  const p1 = conv.participant_1_profile
  const p2 = conv.participant_2_profile

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/messages"
          className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          ← Monitoraggio chat
        </Link>
      </div>

      {/* Header conversazione */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 px-5 py-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <ProfileAvatar avatarUrl={(p1 as unknown as Profile).avatar_url ?? null} role={p1.role} size={36} />
          <span className="text-neutral-600 text-xs">↔</span>
          <ProfileAvatar avatarUrl={(p2 as unknown as Profile).avatar_url ?? null} role={p2.role} size={36} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            <Link href={`/admin/${p1.id}`} className="hover:text-neutral-300 transition-colors">{p1.full_name}</Link>
            {' '}·{' '}
            <Link href={`/admin/${p2.id}`} className="hover:text-neutral-300 transition-colors">{p2.full_name}</Link>
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">
            Conversazione aperta il {new Date(conv.created_at).toLocaleDateString('it-IT')} · {messages.length} {messages.length === 1 ? 'messaggio' : 'messaggi'}
          </p>
        </div>
      </div>

      {/* Banner admin */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 flex items-center gap-2">
        <span className="text-amber-400 text-xs">⚠</span>
        <p className="text-xs text-amber-400/80">
          Stai visualizzando questa conversazione come amministratore. Il contenuto è confidenziale.
        </p>
      </div>

      {/* Messaggi */}
      <div className="space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-neutral-600 text-center py-12">Nessun messaggio in questa conversazione.</p>
        ) : (
          messages.map((msg) => {
            const isP1 = msg.sender_id === conv.participant_1
            return (
              <div key={msg.id} className={['flex gap-3', isP1 ? 'flex-row' : 'flex-row-reverse'].join(' ')}>
                <ProfileAvatar
                  avatarUrl={(isP1 ? (p1 as unknown as Profile) : (p2 as unknown as Profile)).avatar_url ?? null}
                  role={msg.sender.role}
                  size={32}
                />
                <div className={[
                  'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                  isP1 ? 'rounded-tl-sm bg-neutral-800 text-neutral-100' : 'rounded-tr-sm bg-neutral-700 text-neutral-100',
                ].join(' ')}>
                  <p className="text-xs font-medium mb-0.5 opacity-60">{msg.sender.full_name}</p>
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className="text-xs mt-0.5 text-neutral-500">
                    {new Date(msg.created_at).toLocaleString('it-IT', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
