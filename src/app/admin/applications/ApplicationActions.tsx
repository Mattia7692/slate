'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateApplicationStatus } from '@/app/applications/actions'

export function ApplicationActions({ applicationId }: { applicationId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handle(status: 'approved' | 'rejected') {
    startTransition(async () => {
      const result = await updateApplicationStatus(applicationId, status)
      if (result.error) {
        alert(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2 pt-1">
      <button
        onClick={() => handle('approved')}
        disabled={isPending}
        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
      >
        Approva
      </button>
      <button
        onClick={() => handle('rejected')}
        disabled={isPending}
        className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
      >
        Rifiuta
      </button>
    </div>
  )
}
