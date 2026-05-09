import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppNav } from '@/components/layout/AppNav'
import { NewTourForm } from './NewTourForm'
import type { Notification, Genre } from '@/types'

export default async function NewTourPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()

  const [profileResult, notificationsResult, genresResult] = await Promise.all([
    supabase.from('profiles').select('full_name, avatar_url, role').eq('id', user.id).single(),
    adminClient.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
    adminClient.from('genres').select('id, slug, label, order_index').order('order_index'),
  ])

  const profile = profileResult.data
  const notifications = ((notificationsResult.data ?? []) as unknown[]) as Notification[]
  const genres = ((genresResult.data ?? []) as unknown[]) as Genre[]

  const userInitials = (profile?.full_name ?? '')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-screen">
      <AppNav
        userInitials={userInitials}
        userId={user.id}
        avatarUrl={profile?.avatar_url ?? null}
        notifications={notifications}
      />

      <div className="max-w-lg mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-xl font-semibold tracking-tight">Nuovo tour</h1>
          <p className="text-sm text-neutral-500 mt-1">Crea il tuo calendario di disponibilità</p>
        </div>

        <NewTourForm genres={genres} />
      </div>
    </div>
  )
}
