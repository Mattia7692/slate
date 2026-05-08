import Link from 'next/link'
import { notFound } from 'next/navigation'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFounder } from '@/lib/founder'
import { AdminEditForm } from './AdminEditForm'
import type { Profile } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminEditProfilePage({ params }: Props) {
  await requireAdmin()

  const { id } = await params
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  const currentIsFounder = isFounder(currentUser?.id ?? '')

  // Solo gli admin non-Founder vengono bloccati dal profilo Founder
  if (isFounder(id) && !currentIsFounder) redirect(`/admin/${id}`)

  return (
    <div className="max-w-lg mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Link href="/admin" className="hover:text-neutral-300 transition-colors">Profili</Link>
        <span>›</span>
        <Link href={`/admin/${id}`} className="hover:text-neutral-300 transition-colors">{profile.full_name}</Link>
        <span>›</span>
        <span className="text-neutral-300">Modifica</span>
      </div>

      <AdminEditForm profile={profile as Profile} isFounder={currentIsFounder} />
    </div>
  )
}
