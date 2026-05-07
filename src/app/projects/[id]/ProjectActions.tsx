'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { acceptProject, cancelProject, confirmCompletion } from './actions'
import type { ProjectStatus, PayerRole } from '@/types'

interface ProjectActionsProps {
  projectId: string
  status: ProjectStatus
  payerRole: PayerRole
  canAccept: boolean
  canConfirm: boolean
  isProposer: boolean
}

export function ProjectActions({
  projectId,
  status,
  payerRole,
  canAccept,
  canConfirm,
  isProposer,
}: ProjectActionsProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function run(action: () => Promise<{ error: string | null }>) {
    startTransition(async () => {
      const result = await action()
      if (result.error) alert(result.error)
      else router.refresh()
    })
  }

  if (status === 'cancelled' || status === 'completed' || status === 'disputed') return null

  return (
    <div className="flex flex-wrap gap-3">
      {/* Accetta proposta */}
      {canAccept && status === 'proposed' && (
        <Button loading={isPending} onClick={() => run(() => acceptProject(projectId))}>
          Accetta proposta
        </Button>
      )}

      {/* Attende risposta */}
      {isProposer && status === 'proposed' && (
        <p className="text-sm text-neutral-500 self-center">
          In attesa che l&apos;altro partecipante accetti la proposta.
        </p>
      )}

      {/* Conferma completamento (TFP dopo brief firmato, pagato per gli altri) */}
      {canConfirm && (
        <Button loading={isPending} onClick={() => run(() => confirmCompletion(projectId))}>
          Conferma shooting completato
        </Button>
      )}

      {/* Brief_signed + pagamento richiesto */}
      {status === 'brief_signed' && payerRole !== 'tfp' && (
        <div className="w-full rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <p className="text-sm text-amber-400">
            Brief firmato da entrambi. Il pagamento è richiesto per procedere.
          </p>
          <p className="text-xs text-amber-600 mt-1">
            La funzionalità di pagamento sarà disponibile a breve (Step 8).
          </p>
        </div>
      )}

      {/* Cancella */}
      {!['completed', 'cancelled'].includes(status) && (
        <Button
          variant="ghost"
          size="sm"
          loading={isPending}
          onClick={() => {
            if (confirm('Sei sicuro di voler cancellare questo progetto?')) {
              run(() => cancelProject(projectId))
            }
          }}
        >
          Cancella progetto
        </Button>
      )}
    </div>
  )
}
