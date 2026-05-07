import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProfileEditForm } from './ProfileEditForm'
import { XPBadge } from '@/components/profile/XPBadge'
import { isFounder } from '@/lib/founder'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar'
import type { Profile, PortfolioItem } from '@/types'

export default async function ProfileEditPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: portfolioItems }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('portfolio_items').select('*').eq('profile_id', user.id).order('order_index'),
  ])

  if (!profile) redirect('/onboarding')

  return (
    <div className="min-h-screen">
      {/* Topbar */}
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center gap-4">
        <Link
          href={`/profile/${user.id}`}
          className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          ← Profilo
        </Link>
      </header>

      <div className="max-w-lg mx-auto px-6 py-10 space-y-8">
        {/* Header */}
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
