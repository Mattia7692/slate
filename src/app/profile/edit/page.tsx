import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProfileEditForm } from './ProfileEditForm'
import { XPBadge } from '@/components/profile/XPBadge'
import { isFounder } from '@/lib/founder'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar'
import { AppNav } from '@/components/layout/AppNav'
import type { Profile, PortfolioItem, Notification } from '@/types'

export default async function ProfileEditPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()
  const [[{ data: profile }, { data: portfolioItems }], { data: rawNotifications }] = await Promise.all([
    Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('portfolio_items').select('*').eq('profile_id', user.id).order('order_index'),
    ]),
    adminClient.from('notifications').select('*').eq('profile_id', user.id).order('created_at', { ascending: false }).limit(30),
  ])

  if (!profile) redirect('/onboarding')

  const notifications = (rawNotifications ?? []) as Notification[]
  const userInitials = (profile.full_name as string).split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen">
      <AppNav userInitials={userInitials} userId={user.id} avatarUrl={(profile as Profile).avatar_url ?? null} notifications={notifications} />

      <div className="max-w-lg mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center gap-4">
          <ProfileAvatar avatarUrl={(profile as Profile).avatar_url ?? null} role={(profile as Profile).role} size={48} />
          <div>
            <p className="text-sm font-medium">{profile.full_name}</p>
            <p className="text-xs text-neutral-500 mt-0.5">
              {profile.role === 'photographer' ? 'Fotografo' : 'Modella / Modello'}
            </p>
          </div>
          <div className="ml-auto">
            <XPBadge level={(profile as Profile).level} xp={(profile as Profile).xp} isFounder={isFounder(user.id)} />
          </div>
        </div>

        <ProfileEditForm
          profile={profile as Profile}
          portfolioItems={(portfolioItems ?? []) as PortfolioItem[]}
        />
      </div>
    </div>
  )
}
