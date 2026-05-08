'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const full_name = (formData.get('full_name') as string).trim()
  const bio = (formData.get('bio') as string).trim()
  const city = (formData.get('city') as string).trim()
  const instagram_url = (formData.get('instagram_url') as string).trim()

  if (full_name.length < 2) {
    return { error: 'Il nome deve avere almeno 2 caratteri.' }
  }

  const avatar_url = (formData.get('avatar_url') as string | null) || null

  const { error } = await supabase
    .from('profiles')
    .update({ full_name, bio: bio || null, city: city || null, instagram_url: instagram_url || null, avatar_url })
    .eq('id', user.id)

  if (error) return { error: error.message }

  redirect(`/profile/${user.id}`)
}

export async function deletePortfolioItem(itemId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autenticato.' }

  // Verifica che l'item appartenga all'utente
  const { data: item } = await supabase
    .from('portfolio_items')
    .select('id, image_url')
    .eq('id', itemId)
    .eq('profile_id', user.id)
    .single()

  if (!item) return { error: 'Item non trovato.' }

  const { error } = await supabase
    .from('portfolio_items')
    .delete()
    .eq('id', itemId)

  if (error) return { error: error.message }
  return { ok: true }
}

export async function updateOldestPhoto(
  url: string,
  date: string | null,
  exif: Record<string, unknown> | null,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autenticato.' }

  const { error } = await supabase
    .from('profiles')
    .update({ oldest_photo_url: url, oldest_photo_date: date, oldest_photo_exif: exif })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return { ok: true }
}

export async function clearOldestPhoto() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autenticato.' }

  const { error } = await supabase
    .from('profiles')
    .update({ oldest_photo_url: null, oldest_photo_date: null, oldest_photo_exif: null })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return { ok: true }
}

export async function addPortfolioItem(imageUrl: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autenticato.' }

  // Calcola il prossimo order_index
  const { count } = await supabase
    .from('portfolio_items')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', user.id)

  const { error } = await supabase
    .from('portfolio_items')
    .insert({ profile_id: user.id, image_url: imageUrl, order_index: count ?? 0 })

  if (error) return { error: error.message }
  return { ok: true }
}
