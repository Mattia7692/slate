import Link from 'next/link'
import { notFound } from 'next/navigation'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFounder } from '@/lib/founder'
import { AdminEditForm } from './AdminEditForm'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar'
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
  if (isFounder(id)) redirect(`/admin/${id}`)

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

      {/* Header */}
      <div className="flex items-center gap-3">
        <ProfileAvatar avatarUrl={(profile as Profile).avatar_url ?? null} role={(profile as Profile).role} size={40} />
        <div>
          <p className="text-sm font-medium">{profile.full_name}</p>
          <p className="text-xs text-neutral-500 mt-0.5">
            {profile.role === 'photographer' ? 'Fotografo' : 'Modella / Modello'}
          </p>
        </div>
      </div>

      <AdminEditForm profile={profile as Profile} />
    </div>
  )
}
