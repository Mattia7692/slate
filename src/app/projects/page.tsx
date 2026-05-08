import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppNav } from '@/components/layout/AppNav'
import type { ProjectStatus, Notification } from '@/types'

const STATUS_LABEL: Record<ProjectStatus, string> = {
  proposed: 'Proposta',
  accepted: 'Accettato',
  brief_signed: 'Brief firmato',
  paid: 'Pagato',
  completed: 'Completato',
  disputed: 'In disputa',
  cancelled: 'Cancellato',
}

const STATUS_COLOR: Record<ProjectStatus, string> = {
  proposed: 'text-sky-400',
  accepted: 'text-violet-400',
  brief_signed: 'text-amber-400',
  paid: 'text-emerald-400',
  completed: 'text-neutral-400',
  disputed: 'text-red-400',
  cancelled: 'text-neutral-600',
}

type ProjectRow = {
  id: string
  status: ProjectStatus
  payer_role: string
  amount: number
  created_at: string
  photographer: { id: string; full_name: string; role: string; level: number }
  model: { id: string; full_name: string; role: string; level: number }
}

export default async function ProjectsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: myProfile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single()
  const adminClient = createAdminClient()
  const { data: rawNotifications } = await adminClient.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30)
  const notifications = (rawNotifications ?? []) as Notification[]
  const userInitials = (myProfile?.full_name ?? '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  const { data: rawProjects } = await supabase
    .from('projects')
    .select(`
      id, status, payer_role, amount, created_at,
      photographer:profiles!projects_photographer_id_fkey(id, full_name, role, level),
      model:profiles!projects_model_id_fkey(id, full_name, role, level)
    `)
    .or(`photographer_id.eq.${user.id},model_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  const projects = (rawProjects ?? []) as unknown as ProjectRow[]

  const active = projects.filter((p) => !['completed', 'cancelled'].includes(p.status))
  const past = projects.filter((p) => ['completed', 'cancelled'].includes(p.status))

  return (
    <div className="min-h-screen">
      <AppNav userInitials={userInitials} userId={user.id} avatarUrl={myProfile?.avatar_url ?? null} notifications={notifications} />

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-10">
        {/* Attivi */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Attivi ({active.length})
            </h2>
            <Link href="/explore" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
              + Nuova collaborazione
            </Link>
          </div>

          {active.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm text-neutral-500">Nessun progetto attivo.</p>
              <Link href="/explore" className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors">
                Esplora i profili →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {active.map((p) => <ProjectRow key={p.id} project={p} userId={user.id} />)}
            </div>
          )}
        </section>

        {/* Passati */}
        {past.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Storico ({past.length})
            </h2>
            <div className="space-y-2 opacity-60">
              {past.map((p) => <ProjectRow key={p.id} project={p} userId={user.id} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function ProjectRow({ project: p, userId }: { project: ProjectRow; userId: string }) {
  const isPhotographer = userId === p.photographer.id
  const other = isPhotographer ? p.model : p.photographer

  return (
    <Link
      href={`/projects/${p.id}`}
      className="flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900/50 px-5 py-4 hover:border-neutral-700 hover:bg-neutral-900 transition-colors"
    >
      <div className={[
        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
        other.role === 'photographer' ? 'bg-sky-500/20 text-sky-400' : 'bg-rose-500/20 text-rose-400',
      ].join(' ')}>
        {other.role === 'photographer' ? 'F' : 'M'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{other.full_name}</p>
        <p className="text-xs text-neutral-500 mt-0.5">
          {new Date(p.created_at).toLocaleDateString('it-IT')}
          {' · '}
          {p.payer_role === 'tfp' ? 'TFP' : `€${(p.amount / 100).toFixed(0)}`}
        </p>
      </div>
      <span className={['text-xs font-medium', STATUS_COLOR[p.status]].join(' ')}>
        {STATUS_LABEL[p.status]}
      </span>
      <span className="text-neutral-600 shrink-0">›</span>
    </Link>
  )
}
