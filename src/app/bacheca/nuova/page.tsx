import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppNav } from '@/components/layout/AppNav'
import { NuovaVisioneForm } from './NuovaVisioneForm'
import type { Notification } from '@/types'

export default async function NuovaVisionePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()
  const [{ data: profile }, { data: rawNotifications }] = await Promise.all([
    supabase.from('profiles').select('status, role, full_name, avatar_url').eq('id', user.id).single(),
    adminClient.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
  ])

  if (profile?.status !== 'approved') redirect('/dashboard')

  const notifications = (rawNotifications ?? []) as Notification[]
  const userInitials = (profile?.full_name ?? '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen">
      <AppNav userInitials={userInitials} userId={user.id} avatarUrl={profile?.avatar_url ?? null} notifications={notifications} />

      <div className="max-w-xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-xl font-semibold">Nuova visione</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Condividi un'idea, un progetto, uno stile. Chi è interessato ti contatterà.
          </p>
        </div>
        <NuovaVisioneForm currentRole={profile.role as 'photographer' | 'model'} />
      </div>
    </div>
  )
}
