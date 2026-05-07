'use client'

import { useState, useTransition } from 'react'
import { toggleAdmin } from './toggleAdminAction'

interface ToggleAdminButtonProps {
  profileId: string
  isAdmin: boolean
  profileName: string
}

export function ToggleAdminButton({ profileId, isAdmin, profileName }: ToggleAdminButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState(false)

  function handleClick() {
    if (!confirm) {
      setConfirm(true)
      return
    }
    startTransition(async () => {
      const result = await toggleAdmin(profileId, !isAdmin)
      if (result.error) alert(result.error)
      setConfirm(false)
    })
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-400">
          {isAdmin ? 'Rimuovere i permessi admin?' : `Promuovere ${profileName.split(' ')[0]} ad admin?`}
        </span>
        <button
          onClick={handleClick}
          disabled={isPending}
          className="text-xs font-medium text-white bg-neutral-700 hover:bg-neutral-600 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
        >
          {isPending ? '...' : 'Conferma'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          Annulla
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      className={[
        'text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors',
        isAdmin
          ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
          : 'border-violet-500/30 text-violet-400 hover:bg-violet-500/10',
      ].join(' ')}
    >
      {isAdmin ? 'Revoca admin' : 'Promuovi ad admin'}
    </button>
  )
}
