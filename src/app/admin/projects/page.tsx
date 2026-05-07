import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ProjectStatus } from '@/types'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim())

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
  proposed: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  accepted: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  brief_signed: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  completed: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
  disputed: 'bg-red-500/10 text-red-400 border-red-500/20',
  cancelled: 'bg-neutral-800/50 text-neutral-600 border-neutral-700',
}

type ProjectRow = {
  id: string
  status: ProjectStatus
  payer_role: string
  amount: number
  created_at: string
  photographer: { id: string; full_name: string; level: number }
  model: { id: string; full_name: string; level: number }
}

export default async function AdminProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser?.email || !ADMIN_EMAILS.includes(authUser.email)) {
    redirect('/dashboard')
  }

  const adminClient = createAdminClient()
  const { data: rawProjects } = await adminClient
    .from('projects')
    .select(`
      id, status, payer_role, amount, created_at,
      photographer:profiles!projects_photographer_id_fkey(id, full_name, level),
      model:profiles!projects_model_id_fkey(id, full_name, level)
    `)
    .order('created_at', { ascending: false })

  const projects = (rawProjects ?? []) as unknown as ProjectRow[]

  const counts = {
    total: projects.length,
    active: projects.filter((p) => !['completed', 'cancelled'].includes(p.status)).length,
    completed: projects.filter((p) => p.status === 'completed').length,
    disputed: projects.filter((p) => p.status === 'disputed').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Progetti</h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          {counts.total} totali · {counts.active} attivi · {counts.completed} completati
          {counts.disputed > 0 && (
            <span className="text-red-400 ml-1">· {counts.disputed} in disputa</span>
          )}
        </p>
      </div>

      <div className="rounded-xl border border-neutral-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-900/50">
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Fotografo</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Modella</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Compenso</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Stato</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Data</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/50">
            {projects.map((p) => (
              <tr key={p.id} className="hover:bg-neutral-900/30 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/${p.photographer.id}`}
                    className="font-medium hover:text-neutral-300 transition-colors"
                  >
                    {p.photographer.full_name}
                  </Link>
                  <span className="text-neutral-600 ml-1.5 text-xs">Lv.{p.photographer.level}</span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/${p.model.id}`}
                    className="font-medium hover:text-neutral-300 transition-colors"
                  >
                    {p.model.full_name}
                  </Link>
                  <span className="text-neutral-600 ml-1.5 text-xs">Lv.{p.model.level}</span>
                </td>
                <td className="px-4 py-3 text-neutral-400">
                  {p.payer_role === 'tfp'
                    ? 'TFP'
                    : `€${(p.amount / 100).toFixed(0)} (${p.payer_role === 'photographer' ? 'fot.' : 'mod.'})`}
                </td>
                <td className="px-4 py-3">
                  <span className={['inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full border', STATUS_COLOR[p.status]].join(' ')}>
                    {STATUS_LABEL[p.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-600 text-xs">
                  {new Date(p.created_at).toLocaleDateString('it-IT')}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/projects/${p.id}`}
                    className="text-xs text-neutral-500 hover:text-neutral-200 transition-colors"
                  >
                    Vedi →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {projects.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-neutral-600">Nessun progetto ancora.</p>
          </div>
        )}
      </div>
    </div>
  )
}
