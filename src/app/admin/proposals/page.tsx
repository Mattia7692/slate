import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { DeleteProposalButton } from './DeleteProposalButton'

const STATUS_STYLE: Record<string, string> = {
  pending:  'bg-amber-500/15 text-amber-400 border-amber-500/20',
  accepted: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  declined: 'bg-red-500/15 text-red-400 border-red-500/20',
}

const STATUS_LABEL: Record<string, string> = {
  pending:  'In attesa',
  accepted: 'Accettata',
  declined: 'Rifiutata',
}

export default async function AdminProposalsPage() {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: invites } = await admin
    .from('project_invites')
    .select(`
      id, status, proposed_amount, proposed_payer, creative_idea, location, notes, created_at, responded_at,
      from_profile:profiles!project_invites_from_profile_id_fkey(id, full_name, role, level),
      to_profile:profiles!project_invites_to_profile_id_fkey(id, full_name, role, level)
    `)
    .order('created_at', { ascending: false })

  const counts = {
    total:    invites?.length ?? 0,
    pending:  invites?.filter((i) => i.status === 'pending').length ?? 0,
    accepted: invites?.filter((i) => i.status === 'accepted').length ?? 0,
    declined: invites?.filter((i) => i.status === 'declined').length ?? 0,
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-100">Proposte di collaborazione</h1>
        <p className="text-xs text-neutral-500 mt-1">
          {counts.total} totali · {counts.pending} in attesa · {counts.accepted} accettate · {counts.declined} rifiutate
        </p>
      </div>

      {!invites || invites.length === 0 ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 px-6 py-12 text-center">
          <p className="text-sm text-neutral-600">Nessuna proposta ancora.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invites.map((invite) => {
            const from = invite.from_profile as unknown as { id: string; full_name: string; role: string; level: number } | null
            const to = invite.to_profile as unknown as { id: string; full_name: string; role: string; level: number } | null
            const amountEur = invite.proposed_amount ? invite.proposed_amount / 100 : 0

            return (
              <div
                key={invite.id}
                className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-3"
              >
                {/* Header riga */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* From → To */}
                    <div className="flex items-center gap-2 text-sm">
                      <a href={`/admin/${from?.id}`} className="font-medium text-neutral-100 hover:text-white transition-colors">
                        {from?.full_name ?? '—'}
                      </a>
                      <span className={[
                        'text-[10px] border px-1.5 py-0.5 rounded-full',
                        from?.role === 'photographer' ? 'border-sky-500/30 text-sky-400' : 'border-rose-500/30 text-rose-400',
                      ].join(' ')}>
                        Lv.{from?.level}
                      </span>
                      <span className="text-neutral-600 text-xs">→</span>
                      <a href={`/admin/${to?.id}`} className="font-medium text-neutral-100 hover:text-white transition-colors">
                        {to?.full_name ?? '—'}
                      </a>
                      <span className={[
                        'text-[10px] border px-1.5 py-0.5 rounded-full',
                        to?.role === 'photographer' ? 'border-sky-500/30 text-sky-400' : 'border-rose-500/30 text-rose-400',
                      ].join(' ')}>
                        Lv.{to?.level}
                      </span>
                    </div>

                    {/* Status */}
                    <span className={[
                      'text-xs font-medium px-2.5 py-0.5 rounded-full border',
                      STATUS_STYLE[invite.status] ?? 'bg-neutral-700/50 text-neutral-400 border-neutral-700',
                    ].join(' ')}>
                      {STATUS_LABEL[invite.status] ?? invite.status}
                    </span>

                    {/* Compenso */}
                    {invite.proposed_payer !== 'tfp' ? (
                      <span className="text-xs text-neutral-500">
                        €{amountEur.toFixed(0)} paga {invite.proposed_payer === 'from' ? from?.full_name?.split(' ')[0] : to?.full_name?.split(' ')[0]}
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-600">TFP</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] text-neutral-600">
                      {new Date(invite.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <DeleteProposalButton inviteId={invite.id} />
                  </div>
                </div>

                {/* Dettagli */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {invite.creative_idea && (
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Idea creativa</p>
                      <p className="text-neutral-300 line-clamp-2">{invite.creative_idea}</p>
                    </div>
                  )}
                  {invite.location && (
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Location</p>
                      <p className="text-neutral-300">{invite.location}</p>
                    </div>
                  )}
                  {invite.notes && (
                    <div className="space-y-0.5 sm:col-span-2">
                      <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Messaggio</p>
                      <p className="text-neutral-400 line-clamp-2">{invite.notes}</p>
                    </div>
                  )}
                </div>

                {invite.responded_at && (
                  <p className="text-[11px] text-neutral-700">
                    Risposta il {new Date(invite.responded_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
