import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Controllo email hardcoded (founder + admin storici via env)
  const emailIsAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? '')

  if (emailIsAdmin) return user

  // Controllo colonna is_admin nel profilo
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/dashboard')

  return user
}
