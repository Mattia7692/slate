import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface InvitePageProps {
  params: Promise<{ code: string }>
}

// Valida il codice e reindirizza alla signup pre-compilata
export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params
  const supabase = await createClient()

  const { data: invite } = await supabase
    .from('invite_codes')
    .select('id, used_by')
    .eq('code', code.toUpperCase())
    .single()

  if (!invite || invite.used_by) {
    redirect(`/auth/signup?error=${encodeURIComponent('Codice invito non valido o già utilizzato.')}`)
  }

  redirect(`/auth/signup?code=${encodeURIComponent(code.toUpperCase())}`)
}
