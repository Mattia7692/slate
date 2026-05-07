'use client'

import { useTransition } from 'react'
import { openConversation } from '@/app/messages/actions'

interface MessageButtonProps {
  targetUserId: string
}

export function MessageButton({ targetUserId }: MessageButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleMessage() {
    startTransition(async () => {
      await openConversation(targetUserId)
    })
  }

  return (
    <button
      onClick={handleMessage}
      disabled={isPending}
      className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm font-medium hover:border-neutral-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
    >
      {isPending ? 'Apertura...' : 'Scrivi un messaggio'}
    </button>
  )
}
