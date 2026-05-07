'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateApplicationStatus, deleteApplication } from '@/app/applications/actions'

export function ApplicationActions({
  applicationId,
  status,
}: {
  applicationId: string
  status: 'pending' | 'approved' | 'rejected'
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleStatus(s: 'approved' | 'rejected') {
    startTransition(async () => {
      const result = await updateApplicationStatus(applicationId, s)
      if (result.error) { alert(result.error); return }
      router.refresh()
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteApplication(applicationId)
      if (result.error) { alert(result.error); return }
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2 pt-1">
      {status === 'pending' && (
        <>
          <button
            onClick={() => handleStatus('approved')}
            disabled={isPending}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
          >
            Approva
          </button>
          <button
            onClick={() => handleStatus('rejected')}
            disabled={isPending}
            className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            Rifiuta
          </button>
        </>
      )}
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="px-3 py-1.5 rounded-lg text-neutral-600 text-xs font-semibold hover:text-red-400 hover:bg-red-500/5 transition-colors disabled:opacity-50 ml-auto"
      >
        Elimina
      </button>
    </div>
  )
}
