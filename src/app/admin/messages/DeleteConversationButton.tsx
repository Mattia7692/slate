'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteConversation } from './actions'

interface Props {
  conversationId: string
  redirectAfter?: string
}

export function DeleteConversationButton({ conversationId, redirectAfter }: Props) {
  const [confirm, setConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm) { setConfirm(true); return }
    startTransition(async () => {
      const result = await deleteConversation(conversationId)
      if (result.error) { alert(result.error); return }
      if (redirectAfter) router.push(redirectAfter)
      else router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
      {confirm && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirm(false) }}
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
        {isPending ? '...' : confirm ? 'Conferma' : 'Elimina chat'}
      </button>
    </div>
  )
}
