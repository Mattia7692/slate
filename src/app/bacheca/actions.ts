'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types'

export async function createVision(data: {
  title: string
  description: string
  role_needed: UserRole
  image_urls: string[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: vision, error } = await supabase
    .from('visions')
    .insert({
      creator_id: user.id,
      title: data.title.trim(),
      description: data.description.trim() || null,
      role_needed: data.role_needed,
      status: 'open',
    })
    .select()
    .single()

  if (error) return { error: error.message }

  if (data.image_urls.length > 0) {
    await supabase.from('vision_images').insert(
      data.image_urls.map((url, i) => ({
        vision_id: vision.id,
        image_url: url,
        order_index: i,
      }))
    )
  }

  revalidatePath('/bacheca')
  redirect(`/bacheca/${vision.id}`)
}

export async function closeVision(visionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { error } = await supabase
    .from('visions')
    .update({ status: 'closed' })
    .eq('id', visionId)
    .eq('creator_id', user.id)

  if (error) return { error: error.message }
  revalidatePath(`/bacheca/${visionId}`)
  revalidatePath('/bacheca')
  return { error: null }
}

export async function deleteVision(visionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { error } = await supabase
    .from('visions')
    .delete()
    .eq('id', visionId)
    .eq('creator_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/bacheca')
  redirect('/bacheca')
}
