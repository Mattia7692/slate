'use client'

import { useState, useTransition } from 'react'
import { deleteProfile } from '../actions'

interface Props {
  profileId: string
  profileName: string
}

export function DeleteProfileButton({ profileId, profileName }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirming) {
      setConfirming(true)
      return
    }
    startTransition(async () => {
      const result = await deleteProfile(profileId)
      if (result?.error) alert(result.error)
    })
  }

  return (
    <div className="flex items-center gap-2">
      {confirming && (
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          Annulla
        </button>
      )}
      <button
        onClick={handleClick}
        disabled={isPending}
        className={[
          'text-xs font-medium transition-colors disabled:opacity-50',
          confirming
            ? 'text-red-400 hover:text-red-300 underline'
            : 'text-neutral-600 hover:text-red-400',
        ].join(' ')}
      >
        {isPending ? 'Eliminazione...' : confirming ? `Conferma eliminazione di ${profileName}` : 'Elimina profilo'}
      </button>
    </div>
  )
}
