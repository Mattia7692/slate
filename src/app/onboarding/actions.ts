'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
      xp: seniorityBonus,
      status: 'pending',
    })

  if (profileError) {
    return { error: profileError.message }
  }

  // Inserisci le foto del portfolio
  if (payload.portfolio_urls.length > 0) {
    const portfolioItems = payload.portfolio_urls.map((url, index) => ({
      profile_id: user.id,
      image_url: url,
      order_index: index,
    }))

    await supabase.from('portfolio_items').insert(portfolioItems)
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
