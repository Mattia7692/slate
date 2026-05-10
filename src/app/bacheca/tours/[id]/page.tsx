import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppNav } from '@/components/layout/AppNav'
import { TourCalendar } from './TourCalendar'
import { CreatorActions } from './CreatorActions'
import { format, parseISO, differenceInDays } from 'date-fns'
import { genrePillClass } from '@/lib/genreColors'
import { it } from 'date-fns/locale'
import type { Notification, TourWithCreator, TourSlotWithBooker, Genre } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TourDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()

  const [profileResult, notificationsResult, tourResult, slotsResult, genresResult] = await Promise.all([
    supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single(),
    adminClient.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
    adminClient
      .from('tours')
      .select(`*, creator:profiles!tours_creator_id_fkey(id, full_name, role, avatar_url, level), images:tour_images(id, image_url, order_index)`)
      .eq('id', id)
      .single(),
    adminClient
      .from('tour_slots')
      .select(`*, booker:profiles!tour_slots_booked_by_fkey(id, full_name, role, avatar_url, level)`)
      .eq('tour_id', id)
      .order('slot_date', { ascending: true })
      .order('start_time', { ascending: true }),
    adminClient.from('genres').select('id, slug, label, order_index').order('order_index'),
  ])

  if (!tourResult.data || tourResult.error) notFound()

  const tour = tourResult.data as unknown as TourWithCreator
  const slots = ((slotsResult.data ?? []) as unknown[]) as TourSlotWithBooker[]
  const allGenres = ((genresResult.data ?? []) as unknown[]) as Genre[]
  const notifications = ((notificationsResult.data ?? []) as unknown[]) as Notification[]
  const profile = profileResult.data

  const isCreator = tour.creator_id === user.id

  const tourGenres = allGenres.filter((g) => tour.genre_ids?.includes(g.id))

  const userInitials = (profile?.full_name ?? '')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const sortedImages = [...tour.images].sort((a, b) => a.order_index - b.order_index)
  const cover = sortedImages[0]
  const days = differenceInDays(parseISO(tour.end_date), parseISO(tour.start_date)) + 1
  const freeSlots = slots.filter((s) => s.status === 'free').length

  return (
    <div className="min-h-screen">
      <AppNav
        userInitials={userInitials}
        userId={user.id}
        avatarUrl={profile?.avatar_url ?? null}
        notifications={notifications}
      />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Cover */}
        {cover && (
          <div className="relative rounded-2xl overflow-hidden aspect-[16/7] bg-neutral-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover.image_url} alt={tour.title} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <span className={[
                'text-[11px] font-semibold px-2 py-0.5 rounded-full border inline-block mb-2',
                tour.status === 'active'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-neutral-600 bg-neutral-800 text-neutral-500',
              ].join(' ')}>
                {tour.status === 'active' ? 'Aperto' : 'Chiuso'}
              </span>
              <h1 className="text-xl font-bold text-white leading-tight">{tour.title}</h1>
            </div>
          </div>
        )}

        {!cover && (
          <div>
            <span className={[
              'text-[11px] font-semibold px-2 py-0.5 rounded-full border inline-block mb-2',
              tour.status === 'active'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-neutral-600 bg-neutral-800 text-neutral-500',
            ].join(' ')}>
              {tour.status === 'active' ? 'Aperto' : 'Chiuso'}
            </span>
            <h1 className="text-2xl font-bold">{tour.title}</h1>
          </div>
        )}

        {/* Meta */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
            <p className="text-[11px] text-neutral-500 mb-0.5">Città</p>
            <p className="text-sm font-medium">{tour.city}</p>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
            <p className="text-[11px] text-neutral-500 mb-0.5">Date</p>
            <p className="text-sm font-medium">
              {format(parseISO(tour.start_date), 'd MMM', { locale: it })} – {format(parseISO(tour.end_date), 'd MMM', { locale: it })}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
            <p className="text-[11px] text-neutral-500 mb-0.5">Cachet</p>
            <p className="text-sm font-medium text-emerald-400">€{tour.hourly_rate}/h</p>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
            <p className="text-[11px] text-neutral-500 mb-0.5">Slot liberi</p>
            <p className="text-sm font-medium">{freeSlots} / {slots.length}</p>
          </div>
        </div>

        {/* Location + Mappa */}
        {tour.location_available && tour.location && (() => {
          let desc = tour.location
          let address: string | null = null
          try {
            const parsed = JSON.parse(tour.location) as { description?: string; address?: string }
            if (parsed.description || parsed.address) {
              desc = parsed.description ?? ''
              address = parsed.address ?? null
            }
          } catch { /* plain text fallback */ }
          return (
            <div className="grid grid-cols-2 gap-3">
              {/* Info card */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-2">
                <p className="text-[11px] text-neutral-500 uppercase tracking-wide font-medium">Location disponibile</p>
                {desc && <p className="text-sm text-neutral-300 leading-relaxed">{desc}</p>}
                {address && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    {address}
                  </a>
                )}
              </div>
              {/* Mappa */}
              {address && (
                <div className="rounded-xl overflow-hidden border border-neutral-800 h-36">
                  <iframe
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed&hl=it&z=15`}
                    className="w-full h-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}
            </div>
          )
        })()}

        {/* Generi */}
        {tourGenres.length > 0 && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-3">
            <p className="text-[11px] text-neutral-500 uppercase tracking-wide font-medium">Generi trattati</p>
            <div className="flex flex-wrap gap-2">
              {tourGenres.map((g) => (
                <span key={g.id} className={genrePillClass(g.order_index)}>
                  {g.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Creator row — info + azioni */}
        <div className="flex items-center justify-between gap-3 border-t border-neutral-800 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-700 shrink-0 flex items-center justify-center">
              {tour.creator.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tour.creator.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-neutral-200">
                  {tour.creator.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-medium">{tour.creator.full_name}</p>
              <p className="text-xs text-neutral-500">Lv.{tour.creator.level} · {days} {days === 1 ? 'giorno' : 'giorni'} di evento</p>
            </div>
          </div>
          {isCreator && (
            <CreatorActions
              tourId={tour.id}
              initial={{
                title: tour.title,
                city: tour.city,
                role_needed: tour.role_needed,
                hourly_rate: tour.hourly_rate,
                location_available: tour.location_available,
                location: tour.location,
              }}
            />
          )}
        </div>

        {/* Calendar */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold">
            {isCreator ? 'I tuoi slot' : 'Slot disponibili'}
          </h2>
          <TourCalendar
            slots={slots}
            isCreator={isCreator}
            tourId={tour.id}
            creatorId={tour.creator_id}
            tourStatus={tour.status}
            currentUserId={user.id}
            defaultRate={tour.hourly_rate}
          />
        </div>
      </div>
    </div>
  )
}
