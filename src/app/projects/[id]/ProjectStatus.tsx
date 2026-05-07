import type { ProjectStatus, PayerRole } from '@/types'

const STEPS: { status: ProjectStatus; label: string }[] = [
  { status: 'proposed', label: 'Proposta inviata' },
  { status: 'accepted', label: 'Proposta accettata' },
  { status: 'brief_signed', label: 'Brief firmato' },
  { status: 'paid', label: 'Pagamento ricevuto' },
  { status: 'completed', label: 'Completato' },
]

const STATUS_ORDER: Record<ProjectStatus, number> = {
  proposed: 0,
  accepted: 1,
  brief_signed: 2,
  paid: 3,
  completed: 4,
  disputed: 4,
  cancelled: -1,
}

interface ProjectStatusProps {
  status: ProjectStatus
  payerRole: PayerRole
  amount: number
}

export function ProjectStatusBar({ status, payerRole, amount }: ProjectStatusProps) {
  const currentOrder = STATUS_ORDER[status]
  const isCancelled = status === 'cancelled'
  const isDisputed = status === 'disputed'
  const isTfp = payerRole === 'tfp'

  // Per TFP saltiamo il pagamento
  const visibleSteps = isTfp
    ? STEPS.filter((s) => s.status !== 'paid')
    : STEPS

  if (isCancelled) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
        <p className="text-sm text-red-400 font-medium">Progetto cancellato</p>
      </div>
    )
  }

  if (isDisputed) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
        <p className="text-sm text-amber-400 font-medium">Progetto in disputa — il team Slate sta esaminando il caso.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-0">
        {visibleSteps.map((step, i) => {
          const stepOrder = STATUS_ORDER[step.status]
          const isDone = currentOrder > stepOrder
          const isCurrent = currentOrder === stepOrder
          const isLast = i === visibleSteps.length - 1

          return (
            <div key={step.status} className="flex items-center flex-1">
              {/* Dot */}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={[
                    'w-2.5 h-2.5 rounded-full border-2 transition-colors',
                    isDone
                      ? 'bg-white border-white'
                      : isCurrent
                      ? 'bg-transparent border-white'
                      : 'bg-transparent border-neutral-700',
                  ].join(' ')}
                />
              </div>
              {/* Linea */}
              {!isLast && (
                <div
                  className={[
                    'h-px flex-1 transition-colors',
                    isDone ? 'bg-white' : 'bg-neutral-800',
                  ].join(' ')}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Labels */}
      <div className="flex justify-between">
        {visibleSteps.map((step) => {
          const stepOrder = STATUS_ORDER[step.status]
          const isDone = currentOrder > stepOrder
          const isCurrent = currentOrder === stepOrder

          return (
            <span
              key={step.status}
              className={[
                'text-xs',
                isDone
                  ? 'text-neutral-400'
                  : isCurrent
                  ? 'text-white font-medium'
                  : 'text-neutral-700',
              ].join(' ')}
            >
              {step.label}
            </span>
          )
        })}
      </div>

      {/* Badge compenso */}
      <div className="flex items-center gap-2 pt-1">
        {isTfp ? (
          <span className="text-xs rounded-full border border-sky-500/20 bg-sky-500/10 text-sky-400 px-2.5 py-0.5">
            TFP — Nessun compenso
          </span>
        ) : (
          <span className="text-xs rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5">
            Compenso: €{(amount / 100).toFixed(2)} · paga{' '}
            {payerRole === 'photographer' ? 'il fotografo' : 'la modella'}
          </span>
        )}
      </div>
    </div>
  )
}
