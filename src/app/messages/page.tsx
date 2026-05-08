import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar'
import { RoleBadge } from '@/components/profile/RoleBadge'
import { AppNav } from '@/components/layout/AppNav'
import type { ConversationWithProfiles, Profile, Notification } from '@/types'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: myProfile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single()
  const adminClient = createAdminClient()
  const { data: rawNotifications } = await adminClient.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30)
  const notifications = (rawNotifications ?? []) as Notification[]
  const userInitials = (myProfile?.full_name ?? '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  const { data: raw } = await supabase
    .from('conversations')
    .select(`
      id, created_at,
      participant_1_profile:profiles!conversations_participant_1_fkey(id, full_name, role, avatar_url, level),
      participant_2_profile:profiles!conversations_participant_2_fkey(id, full_name, role, avatar_url, level)
    `)
    .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
    .order('created_at', { ascending: false })

  const conversations = (raw ?? []) as unknown as ConversationWithProfiles[]

  return (
    <div className="min-h-screen">
      <AppNav userInitials={userInitials} userId={user.id} avatarUrl={myProfile?.avatar_url ?? null} notifications={notifications} />

      <div className="max-w-2xl mx-auto px-6 py-8">
        {conversations.length === 0 ? (
          <div className="py-24 text-center space-y-2">
            <p className="text-neutral-400">Nessuna conversazione ancora.</p>
            <p className="text-sm text-neutral-600">
              Visita il profilo di un altro utente per iniziare a chattare.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => {
              const other = conv.participant_1_profile.id === user.id
                ? conv.participant_2_profile
                : conv.participant_1_profile

              return (
                <Link
                  key={conv.id}
                  href={`/messages/${conv.id}`}
                  className="flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900/50 px-5 py-4 hover:border-neutral-700 hover:bg-neutral-900 transition-colors"
                >
                  <ProfileAvatar
                    avatarUrl={(other as unknown as Profile).avatar_url ?? null}
                    role={other.role}
                    size={40}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{other.full_name}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      <RoleBadge role={other.role as 'photographer' | 'model'} />
                    </p>
                  </div>
                  <span className="text-neutral-600 shrink-0">›</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
