'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteProposal } from './actions'

export function DeleteProposalButton({ inviteId }: { inviteId: string }) {
  const [confirm, setConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    if (!confirm) { setConfirm(true); return }
    startTransition(async () => {
      const result = await deleteProposal(inviteId)
      if (result.error) { alert(result.error); return }
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2">
      {confirm && (
        <button
          onClick={() => setConfirm(false)}
          className="text-[11px] text-neutral-600 hover:text-neutral-400 transition-colors"
        >
          Annulla
        </button>
      )}
      <button
        onClick={handleClick}
        disabled={isPending}
        className={[
          'text-[11px] font-medium transition-colors disabled:opacity-50',
          confirm ? 'text-red-400 hover:text-red-300' : 'text-neutral-600 hover:text-red-400',
        ].join(' ')}
      >
        {isPending ? '...' : confirm ? 'Conferma' : 'Elimina'}
      </button>
    </div>
  )
}
