import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar'
import { DirectChatBox } from './DirectChatBox'
import type { ConversationWithProfiles, DirectMessageWithSender, Profile } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ConversationPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const { id } = await params

  const { data: raw } = await supabase
    .from('conversations')
    .select(`
      id, participant_1, participant_2, created_at,
      participant_1_profile:profiles!conversations_participant_1_fkey(id, full_name, role, avatar_url, level),
      participant_2_profile:profiles!conversations_participant_2_fkey(id, full_name, role, avatar_url, level)
    `)
    .eq('id', id)
    .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
    .maybeSingle()

  if (!raw) notFound()

  const conv = raw as unknown as ConversationWithProfiles
  const other = conv.participant_1_profile.id === user.id
    ? conv.participant_2_profile
    : conv.participant_1_profile

  const { data: rawMessages } = await supabase
    .from('direct_messages')
    .select('*, sender:profiles!direct_messages_sender_id_fkey(id, full_name, role)')
    .eq('conversation_id', id)
    .order('created_at')

  const messages = (rawMessages ?? []) as DirectMessageWithSender[]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center gap-4 shrink-0">
        <Link href="/messages" className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
          ←
        </Link>
        <ProfileAvatar
          avatarUrl={(other as unknown as Profile).avatar_url ?? null}
          role={other.role}
          size={32}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{other.full_name}</p>
          <p className="text-xs text-neutral-500">
            {other.role === 'photographer' ? 'Fotografo' : 'Modella / Modello'}
          </p>
        </div>
        <Link
          href={`/profile/${other.id}`}
          className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors shrink-0"
        >
          Vedi profilo →
        </Link>
      </header>

      {/* Chat — occupa tutto lo spazio rimanente */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <DirectChatBox
          conversationId={id}
          currentUserId={user.id}
          currentUserRole={currentProfile?.role ?? 'photographer'}
          initialMessages={messages}
        />
      </div>
    </div>
  )
}
