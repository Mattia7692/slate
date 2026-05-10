'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeSeniorityBonus, yearsFromStartYear } from '@/lib/xp'
import type { UserRole } from '@/types'

interface CreateProfilePayload {
  role: UserRole
  full_name: string
  bio: string
  city: string
  instagram_url: string
  career_start_year: number | null
  oldest_photo_url: string | null
  oldest_photo_date: string | null
  oldest_photo_exif: Record<string, unknown> | null
  avatar_url: string | null
  portfolio_urls: string[]
  genre_ids: string[]
  hourly_rate: number | null
}

export async function createProfile(payload: CreateProfilePayload) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/auth/login')

  // Verifica che il profilo non esista già
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (existing) redirect('/dashboard')

  const yearsInIndustry = payload.career_start_year
    ? yearsFromStartYear(payload.career_start_year)
    : 0
  const seniorityBonus = computeSeniorityBonus(yearsInIndustry)

  // Crea il profilo
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      role: payload.role,
      full_name: payload.full_name.trim(),
      bio: payload.bio.trim() || null,
      city: payload.city.trim() || null,
      instagram_url: payload.instagram_url.trim() || null,
      career_start_year: payload.career_start_year,
      years_in_industry: yearsInIndustry,
      oldest_photo_url: payload.oldest_photo_url,
      oldest_photo_date: payload.oldest_photo_date,
      oldest_photo_exif: payload.oldest_photo_exif,
      avatar_url: payload.avatar_url,
      hourly_rate: payload.hourly_rate,
      xp: seniorityBonus,
      status: 'pending',
    })

  if (profileError) {
    return { error: profileError.message }
  }

  const adminClient = createAdminClient()

  // Inserisci le foto del portfolio
  if (payload.portfolio_urls.length > 0) {
    const portfolioItems = payload.portfolio_urls.map((url, index) => ({
      profile_id: user.id,
      image_url: url,
      order_index: index,
    }))
    await supabase.from('portfolio_items').insert(portfolioItems)
  }

  // Salva generi fotografici
  if (payload.genre_ids.length > 0) {
    await adminClient.from('profile_genres').insert(
      payload.genre_ids.map((genre_id) => ({ profile_id: user.id, genre_id }))
    )
  }

  // Marca il codice invito come usato (ora che il profilo esiste come FK target)
  const inviteCode = user.user_metadata?.invite_code as string | undefined
  if (inviteCode) {
    await adminClient
      .from('invite_codes')
      .update({ used_by: user.id, used_at: new Date().toISOString() })
      .eq('code', inviteCode)
      .is('used_by', null) // solo se non già marcato
  }

  // Logga il bonus anzianità se > 0
  if (seniorityBonus > 0) {
    await supabase.from('xp_transactions').insert({
      profile_id: user.id,
      delta: seniorityBonus,
      reason: 'seniority_bonus',
      project_id: null,
    })
  }

  redirect('/dashboard')
}
