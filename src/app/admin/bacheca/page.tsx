import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { format, parseISO, differenceInDays } from 'date-fns'
import { it } from 'date-fns/locale'
import { DeleteVisionButton } from './DeleteVisionButton'
import { DeleteTourButton } from './DeleteTourButton'

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

const ROLE_LABEL: Record<string, string> = {
  photographer: 'Fotografo',
  model: 'Modella',
}

const VISION_STATUS_STYLE: Record<string, string> = {
  open:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  closed: 'bg-neutral-700/40 text-neutral-500 border-neutral-700',
}

const TOUR_STATUS_STYLE: Record<string, string> = {
  active:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  closed:    'bg-neutral-700/40 text-neutral-500 border-neutral-700',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/20',
}

const TOUR_STATUS_LABEL: Record<string, string> = {
  active:    'Attivo',
  closed:    'Chiuso',
  cancelled: 'Annullato',
}

export default async function AdminBachecaPage({ searchParams }: PageProps) {
  await requireAdmin()
  const { tab } = await searchParams
  const activeTab = tab === 'tour' ? 'tour' : 'visioni'

  const admin = createAdminClient()

  const [visionsResult, toursResult] = await Promise.all([
    activeTab === 'visioni'
      ? admin
          .from('visions')
          .select(`id, title, role_needed, status, created_at, creator:profiles!visions_creator_id_fkey(id, full_name, role, level)`)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    activeTab === 'tour'
      ? admin
          .from('tours')
          .select(`id, title, city, status, start_date, end_date, hourly_rate, created_at, creator:profiles!tours_creator_id_fkey(id, full_name, role, level)`)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  const visions = ((visionsResult.data ?? []) as unknown[]) as {
    id: string
    title: string
    role_needed: string
    status: string
    created_at: string
    creator: { id: string; full_name: string; role: string; level: number } | null
  }[]

  const tours = ((toursResult.data ?? []) as unknown[]) as {
    id: string
    title: string
    city: string
    status: string
    start_date: string
    end_date: string
    hourly_rate: number
    created_at: string
    creator: { id: string; full_name: string; role: string; level: number } | null
  }[]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-100">Visioni e Tour</h1>
        <p className="text-xs text-neutral-500 mt-1">
          {activeTab === 'visioni'
            ? `${visions.length} vision${visions.length === 1 ? 'e' : 'i'}`
            : `${tours.length} tour`}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-orange-900/60">
        {(['visioni', 'tour'] as const).map((t) => (
          <Link
            key={t}
            href={t === 'visioni' ? '/admin/bacheca' : '/admin/bacheca?tab=tour'}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize',
              activeTab === t
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-orange-200/40 hover:text-orange-200/70',
            ].join(' ')}
          >
            {t === 'visioni' ? 'Visioni' : 'Tour'}
          </Link>
        ))}
      </div>

      {/* ── VISIONI ── */}
      {activeTab === 'visioni' && (
        visions.length === 0 ? (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 px-6 py-12 text-center">
            <p className="text-sm text-neutral-600">Nessuna visione pubblicata.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visions.map((v) => (
              <div
                key={v.id}
                className="flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900/40 px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/bacheca/${v.id}`}
                      className="text-sm font-medium text-neutral-100 hover:text-white transition-colors truncate"
                    >
                      {v.title}
                    </Link>
                    <span className={[
                      'text-[10px] font-medium border px-1.5 py-0.5 rounded-full shrink-0',
                      VISION_STATUS_STYLE[v.status] ?? 'bg-neutral-700/40 text-neutral-500 border-neutral-700',
                    ].join(' ')}>
                      {v.status === 'open' ? 'Aperta' : 'Chiusa'}
                    </span>
                    <span className="text-[10px] text-neutral-600 border border-neutral-700 px-1.5 py-0.5 rounded-full shrink-0">
                      Cerca {ROLE_LABEL[v.role_needed] ?? v.role_needed}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {v.creator
                      ? <Link href={`/admin/${v.creator.id}`} className="hover:text-neutral-300 transition-colors">{v.creator.full_name}</Link>
                      : '—'
                    }
                    {' · '}
                    {format(new Date(v.created_at), 'd MMM yyyy', { locale: it })}
                  </p>
                </div>
                <DeleteVisionButton visionId={v.id} />
              </div>
            ))}
          </div>
        )
      )}

      {/* ── TOUR ── */}
      {activeTab === 'tour' && (
        tours.length === 0 ? (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 px-6 py-12 text-center">
            <p className="text-sm text-neutral-600">Nessun tour creato.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tours.map((t) => {
              const days = differenceInDays(parseISO(t.end_date), parseISO(t.start_date)) + 1
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900/40 px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/bacheca/tours/${t.id}`}
                        className="text-sm font-medium text-neutral-100 hover:text-white transition-colors truncate"
                      >
                        {t.title}
                      </Link>
                      <span className={[
                        'text-[10px] font-medium border px-1.5 py-0.5 rounded-full shrink-0',
                        TOUR_STATUS_STYLE[t.status] ?? 'bg-neutral-700/40 text-neutral-500 border-neutral-700',
                      ].join(' ')}>
                        {TOUR_STATUS_LABEL[t.status] ?? t.status}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {t.creator
                        ? <Link href={`/admin/${t.creator.id}`} className="hover:text-neutral-300 transition-colors">{t.creator.full_name}</Link>
                        : '—'
                      }
                      {' · '}
                      {t.city}
                      {' · '}
                      {format(parseISO(t.start_date), 'd MMM', { locale: it })}–{format(parseISO(t.end_date), 'd MMM yyyy', { locale: it })}
                      {' · '}
                      {days} {days === 1 ? 'giorno' : 'giorni'}
                      {' · '}
                      <span className="text-emerald-500">€{t.hourly_rate}/h</span>
                    </p>
                  </div>
                  <DeleteTourButton tourId={t.id} />
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
