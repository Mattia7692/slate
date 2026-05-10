'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  eachDayOfInterval,
  parseISO,
  format,
  addHours,
  addMinutes,
  parse,
} from 'date-fns'

interface SlotPrefs {
  slot_duration_hours: number
  morning_slots: number
  afternoon_slots: number
  morning_start: string  // "HH:mm"
  lunch_start: string
  lunch_end: string
  afternoon_end: string
  break_minutes: number
}

interface SlotInsert {
  tour_id: string
  slot_date: string
  start_time: string
  end_time: string
  duration_hours: number
  hourly_rate: number
  total_amount: number
  status: 'free'
}

function generateSlots(
  tourId: string,
  startDate: string,
  endDate: string,
  prefs: SlotPrefs,
  hourlyRate: number,
): SlotInsert[] {
  const slots: SlotInsert[] = []
  const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })

  for (const day of days) {
    const dateStr = format(day, 'yyyy-MM-dd')
    const base = parse(dateStr, 'yyyy-MM-dd', new Date())

    // Helper: parse "HH:mm" relative to base date
    const t = (hhmm: string) => parse(hhmm, 'HH:mm', base)

    // Morning slots
    let cursor = t(prefs.morning_start)
    for (let i = 0; i < prefs.morning_slots; i++) {
      const slotEnd = addHours(cursor, prefs.slot_duration_hours)
      slots.push({
        tour_id: tourId,
        slot_date: dateStr,
        start_time: format(cursor, 'HH:mm'),
        end_time: format(slotEnd, 'HH:mm'),
        duration_hours: prefs.slot_duration_hours,
        hourly_rate: hourlyRate,
        total_amount: hourlyRate * prefs.slot_duration_hours,
        status: 'free',
      })
      cursor = addMinutes(slotEnd, prefs.break_minutes)
    }

    // Afternoon slots
    cursor = t(prefs.lunch_end)
    for (let i = 0; i < prefs.afternoon_slots; i++) {
      const slotEnd = addHours(cursor, prefs.slot_duration_hours)
      slots.push({
        tour_id: tourId,
        slot_date: dateStr,
        start_time: format(cursor, 'HH:mm'),
        end_time: format(slotEnd, 'HH:mm'),
        duration_hours: prefs.slot_duration_hours,
        hourly_rate: hourlyRate,
        total_amount: hourlyRate * prefs.slot_duration_hours,
        status: 'free',
      })
      cursor = addMinutes(slotEnd, prefs.break_minutes)
    }
  }

  return slots
}

export interface CreateTourPayload {
  title: string
  city: string
  location_available: boolean
  location: string | null
  start_date: string
  end_date: string
  hourly_rate: number
  genre_ids: string[]
  slot_duration_hours: number
  morning_slots: number
  afternoon_slots: number
  morning_start: string
  lunch_start: string
  lunch_end: string
  afternoon_end: string
  break_minutes: number
  image_urls: string[]
}

export async function createTour(payload: CreateTourPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()

  const coverUrl = payload.image_urls[0] ?? null

  const { data: tour, error } = await adminClient
    .from('tours')
    .insert({
      creator_id: user.id,
      title: payload.title.trim(),
      city: payload.city.trim(),
      location_available: payload.location_available,
      location: payload.location_available ? (payload.location?.trim() ?? null) : null,
      start_date: payload.start_date,
      end_date: payload.end_date,
      hourly_rate: payload.hourly_rate,
      cover_url: coverUrl,
      status: 'active',
      genre_ids: payload.genre_ids,
      slot_duration_hours: payload.slot_duration_hours,
      morning_slots: payload.morning_slots,
      afternoon_slots: payload.afternoon_slots,
      morning_start: payload.morning_start,
      lunch_start: payload.lunch_start,
      lunch_end: payload.lunch_end,
      afternoon_end: payload.afternoon_end,
      break_minutes: payload.break_minutes,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // Immagini
  if (payload.image_urls.length > 0) {
    await adminClient.from('tour_images').insert(
      payload.image_urls.map((url, i) => ({
        tour_id: tour.id,
        image_url: url,
        order_index: i,
      }))
    )
  }

  // Genera slot
  const slots = generateSlots(
    tour.id,
    payload.start_date,
    payload.end_date,
    {
      slot_duration_hours: payload.slot_duration_hours,
      morning_slots: payload.morning_slots,
      afternoon_slots: payload.afternoon_slots,
      morning_start: payload.morning_start,
      lunch_start: payload.lunch_start,
      lunch_end: payload.lunch_end,
      afternoon_end: payload.afternoon_end,
      break_minutes: payload.break_minutes,
    },
    payload.hourly_rate,
  )

  if (slots.length > 0) {
    await adminClient.from('tour_slots').insert(slots)
  }

  revalidatePath('/bacheca')
  redirect(`/bacheca/tours/${tour.id}`)
}

export async function bookSlot(slotId: string, tourId: string, creatorId: string, slotDate: string, startTime: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('tour_slots')
    .update({ status: 'booked', booked_by: user.id, booked_at: new Date().toISOString() })
    .eq('id', slotId)
    .eq('status', 'free')

  if (error) return { error: error.message }

  // Notifica alla modella
  await adminClient.from('notifications').insert({
    user_id: creatorId,
    type: 'project_update',
    title: 'Nuova prenotazione slot',
    body: `${myProfile?.full_name ?? 'Un fotografo'} ha prenotato lo slot del ${slotDate} alle ${startTime}.`,
    data: { tour_id: tourId, slot_id: slotId },
  })

  revalidatePath(`/bacheca/tours/${tourId}`)
  return { error: null }
}

export async function confirmSlot(slotId: string, tourId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('tour_slots')
    .update({ status: 'confirmed' })
    .eq('id', slotId)
    .eq('tour_id', tourId)

  if (error) return { error: error.message }
  revalidatePath(`/bacheca/tours/${tourId}`)
  return { error: null }
}

export async function cancelSlot(slotId: string, tourId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('tour_slots')
    .update({ status: 'cancelled', booked_by: null, booked_at: null })
    .eq('id', slotId)
    .eq('tour_id', tourId)

  if (error) return { error: error.message }
  revalidatePath(`/bacheca/tours/${tourId}`)
  return { error: null }
}

export async function updateSlot(slotId: string, tourId: string, durationHours: number, hourlyRate: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()

  // Leggi slot corrente
  const { data: slot } = await adminClient
    .from('tour_slots')
    .select('start_time, slot_date')
    .eq('id', slotId)
    .single()

  if (!slot) return { error: 'Slot non trovato.' }

  // Ricalcola end_time
  const base = new Date()
  const [h, m] = slot.start_time.split(':').map(Number)
  base.setHours(h, m, 0, 0)
  const end = addHours(base, durationHours)
  const endTime = format(end, 'HH:mm')

  // Trova slot dello stesso tour/giorno che iniziano dentro il nuovo intervallo
  // (start_time > start_time dello slot corrente E start_time < nuovo end_time)
  const { data: overlapping } = await adminClient
    .from('tour_slots')
    .select('id, status')
    .eq('tour_id', tourId)
    .eq('slot_date', slot.slot_date)
    .neq('id', slotId)
    .gt('start_time', slot.start_time)
    .lt('start_time', endTime)

  if (overlapping && overlapping.length > 0) {
    const blocked = overlapping.filter((s) => s.status === 'booked' || s.status === 'confirmed')
    if (blocked.length > 0) {
      return { error: 'Non puoi allungare questo slot: ci sono prenotazioni attive che si sovrappongono.' }
    }

    // Cancella gli slot liberi sovrapposti
    const ids = overlapping.map((s) => s.id)
    await adminClient
      .from('tour_slots')
      .update({ status: 'cancelled' })
      .in('id', ids)
  }

  const { error } = await adminClient
    .from('tour_slots')
    .update({
      duration_hours: durationHours,
      hourly_rate: hourlyRate,
      total_amount: durationHours * hourlyRate,
      end_time: endTime,
    })
    .eq('id', slotId)
    .eq('tour_id', tourId)
    .eq('status', 'free')

  if (error) return { error: error.message }
  revalidatePath(`/bacheca/tours/${tourId}`)
  return { error: null }
}

export async function reactivateSlot(
  slotId: string,
  tourId: string,
  startTime: string,
  durationHours: number,
  hourlyRate: number,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()

  const { data: slot } = await adminClient
    .from('tour_slots')
    .select('slot_date')
    .eq('id', slotId)
    .single()

  if (!slot) return { error: 'Slot non trovato.' }

  // Calcola end_time
  const base = new Date()
  const [h, m] = startTime.split(':').map(Number)
  base.setHours(h, m, 0, 0)
  const endTime = format(addHours(base, durationHours), 'HH:mm')

  // Controlla sovrapposizioni con slot attivi (non cancellati)
  const { data: overlapping } = await adminClient
    .from('tour_slots')
    .select('id')
    .eq('tour_id', tourId)
    .eq('slot_date', slot.slot_date)
    .neq('id', slotId)
    .neq('status', 'cancelled')
    .lt('start_time', endTime)
    .gt('end_time', startTime)

  if (overlapping && overlapping.length > 0) {
    return { error: 'Lo slot si sovrappone a uno slot esistente.' }
  }

  const { error } = await adminClient
    .from('tour_slots')
    .update({
      start_time: startTime,
      end_time: endTime,
      duration_hours: durationHours,
      hourly_rate: hourlyRate,
      total_amount: durationHours * hourlyRate,
      status: 'free',
    })
    .eq('id', slotId)
    .eq('tour_id', tourId)

  if (error) return { error: error.message }
  revalidatePath(`/bacheca/tours/${tourId}`)
  return { error: null }
}

export async function addSlot(
  tourId: string,
  slotDate: string,
  startTime: string,
  durationHours: number,
  hourlyRate: number,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()

  // Calcola end_time
  const base = new Date()
  const [h, m] = startTime.split(':').map(Number)
  base.setHours(h, m, 0, 0)
  const endTime = format(addHours(base, durationHours), 'HH:mm')

  // Controlla sovrapposizioni con slot attivi
  const { data: overlapping } = await adminClient
    .from('tour_slots')
    .select('id')
    .eq('tour_id', tourId)
    .eq('slot_date', slotDate)
    .neq('status', 'cancelled')
    .lt('start_time', endTime)
    .gt('end_time', startTime)

  if (overlapping && overlapping.length > 0) {
    return { error: 'Lo slot si sovrappone a uno slot esistente.' }
  }

  const { error } = await adminClient
    .from('tour_slots')
    .insert({
      tour_id: tourId,
      slot_date: slotDate,
      start_time: startTime,
      end_time: endTime,
      duration_hours: durationHours,
      hourly_rate: hourlyRate,
      total_amount: durationHours * hourlyRate,
      status: 'free',
    })

  if (error) return { error: error.message }
  revalidatePath(`/bacheca/tours/${tourId}`)
  return { error: null }
}

export async function closeTour(tourId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('tours')
    .update({ status: 'closed' })
    .eq('id', tourId)
    .eq('creator_id', user.id)

  if (error) return { error: error.message }
  revalidatePath(`/bacheca/tours/${tourId}`)
  revalidatePath('/bacheca')
  return { error: null }
}
