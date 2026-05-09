import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppNav } from '@/components/layout/AppNav'
import { format, parseISO, differenceInDays } from 'date-fns'
import { it } from 'date-fns/locale'
import type { VisionWithCreator, Notification, TourWithCreator } from '@/types'

const ROLE_LABEL = { photographer: 'Fotografo', model: 'Modella / Modello' }
const ROLE_STYLE = {
  photographer: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  model: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
}

interface BachecaPageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function BachecaPage({ searchParams }: BachecaPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single()

  const adminClient = createAdminClient()
  const { data: rawNotifications } = await adminClient
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  const notifications = (rawNotifications ?? []) as Notification[]
  const userInitials = (profile?.full_name ?? '')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const { tab } = await searchParams
  const activeTab = tab === 'tour' ? 'tour' : 'visioni'

  const [visionsResult, toursResult] = await Promise.all([
    activeTab === 'visioni'
      ? supabase
          .from('visions')
          .select(`*, creator:profiles!visions_creator_id_fkey(id, full_name, role, avatar_url, level), images:vision_images(id, image_url, order_index)`)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as unknown[] }),
    activeTab === 'tour'
      ? adminClient
          .from('tours')
          .select(`*, creator:profiles!tours_creator_id_fkey(id, full_name, role, avatar_url, level), images:tour_images(id, image_url, order_index)`)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as unknown[] }),
  ])

  const visions = ((visionsResult.data ?? []) as unknown[]) as VisionWithCreator[]
  const tours = ((toursResult.data ?? []) as unknown[]) as TourWithCreator[]

  return (
    <div className="min-h-screen">
      <AppNav
        userInitials={userInitials}
        userId={user.id}
        avatarUrl={profile?.avatar_url ?? null}
        notifications={notifications}
      />

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Bacheca</h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              {activeTab === 'visioni'
                ? `${visions.length} ${visions.length === 1 ? 'visione aperta' : 'visioni aperte'}`
                : `${tours.length} ${tours.length === 1 ? 'tour aperto' : 'tour aperti'}`}
            </p>
          </div>
          <Link
            href={activeTab === 'visioni' ? '/bacheca/nuova' : '/bacheca/tours/new'}
            className="inline-flex items-center gap-2 rounded-lg bg-white text-neutral-900 px-4 py-2 text-sm font-semibold hover:bg-neutral-200 transition-colors"
          >
            + {activeTab === 'visioni' ? 'Nuova visione' : 'Nuovo tour'}
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-neutral-800">
          {(['visioni', 'tour'] as const).map((t) => (
            <Link
              key={t}
              href={t === 'visioni' ? '/bacheca' : '/bacheca?tab=tour'}
              className={[
                'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize',
                activeTab === t
                  ? 'border-white text-white'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300',
              ].join(' ')}
            >
              {t === 'visioni' ? 'Visioni' : 'Tour'}
            </Link>
          ))}
        </div>

        {/* ── Visioni ── */}
        {activeTab === 'visioni' && (
          visions.length === 0 ? (
            <div className="py-32 text-center space-y-3">
              <p className="text-neutral-400">Nessuna visione aperta al momento.</p>
              <Link href="/bacheca/nuova" className="text-sm text-neutral-600 hover:text-neutral-300 transition-colors">
                Sii il primo a condividere la tua →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {visions.map((vision) => {
                const cover = [...vision.images].sort((a, b) => a.order_index - b.order_index)[0]
                return (
                  <Link
                    key={vision.id}
                    href={`/bacheca/${vision.id}`}
                    className="group block rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 hover:border-neutral-700 transition-all duration-200 hover:scale-[1.01]"
                  >
                    <div className="relative aspect-[4/3] bg-neutral-800 overflow-hidden">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover.image_url} alt={vision.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-4xl text-neutral-700">✦</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-3">
                        <span className={['text-[11px] font-semibold px-2 py-0.5 rounded-full border', ROLE_STYLE[vision.role_needed]].join(' ')}>
                          Cerca {ROLE_LABEL[vision.role_needed]}
                        </span>
                      </div>
                      {vision.images.length > 1 && (
                        <div className="absolute bottom-3 right-3 bg-black/50 rounded-full px-2 py-0.5 text-[11px] text-neutral-300">
                          +{vision.images.length - 1}
                        </div>
                      )}
                    </div>
                    <div className="p-4 space-y-2">
                      <p className="font-semibold text-sm leading-snug line-clamp-2">{vision.title}</p>
                      {vision.description && (
                        <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">{vision.description}</p>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <p className="text-xs text-neutral-600">{vision.creator.full_name} · Lv.{vision.creator.level}</p>
                        <p className="text-xs text-neutral-700">
                          {new Date(vision.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )
        )}

        {/* ── Tour ── */}
        {activeTab === 'tour' && (
          tours.length === 0 ? (
            <div className="py-32 text-center space-y-3">
              <p className="text-neutral-400">Nessun tour aperto al momento.</p>
              <Link href="/bacheca/tours/new" className="text-sm text-neutral-600 hover:text-neutral-300 transition-colors">
                Crea il tuo primo tour →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {tours.map((tour) => {
                const cover = [...tour.images].sort((a, b) => a.order_index - b.order_index)[0]
                const days = differenceInDays(parseISO(tour.end_date), parseISO(tour.start_date)) + 1
                return (
                  <Link
                    key={tour.id}
                    href={`/bacheca/tours/${tour.id}`}
                    className="group block rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 hover:border-neutral-700 transition-all duration-200 hover:scale-[1.01]"
                  >
                    <div className="relative aspect-[4/3] bg-neutral-800 overflow-hidden">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover.image_url} alt={tour.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-3xl text-neutral-700">✈</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-3">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                          Aperto
                        </span>
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      <p className="font-semibold text-sm leading-snug line-clamp-1">{tour.title}</p>
                      <p className="text-xs text-neutral-500">{tour.city} · {days} {days === 1 ? 'giorno' : 'giorni'}</p>
                      <div className="flex items-center justify-between pt-1">
                        <p className="text-xs text-emerald-400 font-medium">€{tour.hourly_rate}/h</p>
                        <p className="text-xs text-neutral-700">
                          {format(parseISO(tour.start_date), 'd MMM', { locale: it })} – {format(parseISO(tour.end_date), 'd MMM', { locale: it })}
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )
        )}
      </div>
    </div>
  )
}
