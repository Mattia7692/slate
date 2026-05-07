import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { ApplicationActions } from './ApplicationActions'

type ApplicationStatus = 'pending' | 'approved' | 'rejected'

interface SearchParams {
  status?: string
}

interface Application {
  id: string
  role: 'photographer' | 'model'
  email: string
  portfolio_url: string
  bio: string
  status: ApplicationStatus
  created_at: string
}

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: 'In attesa',
  approved: 'Approvata',
  rejected: 'Rifiutata',
}

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const ROLE_STYLE: Record<string, string> = {
  photographer: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  model: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
}

const FILTERS: { label: string; value: string }[] = [
  { label: 'Tutte', value: '' },
  { label: 'In attesa', value: 'pending' },
  { label: 'Approvate', value: 'approved' },
  { label: 'Rifiutate', value: 'rejected' },
]

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireAdmin()

  const { status } = await searchParams
  const admin = createAdminClient()

  let query = admin
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (status === 'pending' || status === 'approved' || status === 'rejected') {
    query = query.eq('status', status)
  }

  const { data: applications } = await query
  const apps = (applications ?? []) as Application[]

  // Contatori
  const { data: pendingCount } = await admin
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  const counts = {
    all: apps.length,
    pending: (pendingCount as unknown as { count: number } | null)?.count ?? 0,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Candidature</h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          {apps.length} {status ? STATUS_LABEL[status as ApplicationStatus]?.toLowerCase() : 'totali'}
          {!status && counts.pending > 0 && (
            <span className="text-amber-400 ml-1.5">· {counts.pending} in attesa</span>
          )}
        </p>
      </div>

      {/* Filtri */}
      <div className="flex items-center gap-2">
        {FILTERS.map((f) => (
          <a
            key={f.value}
            href={f.value ? `/admin/applications?status=${f.value}` : '/admin/applications'}
            className={[
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              (status ?? '') === f.value
                ? 'bg-white text-neutral-900 border-white'
                : 'text-neutral-400 border-neutral-700 hover:border-neutral-500 hover:text-neutral-200',
            ].join(' ')}
          >
            {f.label}
          </a>
        ))}
      </div>

      {/* Lista */}
      {apps.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-neutral-600">Nessuna candidatura trovata.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => (
            <div
              key={app.id}
              className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={[
                      'inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full border',
                      ROLE_STYLE[app.role],
                    ].join(' ')}
                  >
                    {app.role === 'photographer' ? 'Fotografo/a' : 'Modella/o'}
                  </span>
                  <span className="text-sm font-medium">{app.email}</span>
                  <span className="text-xs text-neutral-600">
                    {new Date(app.created_at).toLocaleDateString('it-IT', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </span>
                </div>
                <span
                  className={[
                    'inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0',
                    STATUS_STYLE[app.status],
                  ].join(' ')}
                >
                  {STATUS_LABEL[app.status]}
                </span>
              </div>

              {/* Portfolio link */}
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Portfolio</p>
                <a
                  href={
                    app.portfolio_url.startsWith('http')
                      ? app.portfolio_url
                      : `https://instagram.com/${app.portfolio_url.replace('@', '')}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-violet-400 hover:text-violet-300 transition-colors break-all"
                >
                  {app.portfolio_url}
                </a>
              </div>

              {/* Bio */}
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Presentazione</p>
                <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap line-clamp-4">
                  {app.bio}
                </p>
              </div>

              {/* Azioni */}
              <ApplicationActions applicationId={app.id} status={app.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
