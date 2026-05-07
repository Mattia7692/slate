'use client'

import { useState, useTransition } from 'react'
import { closeVision, deleteVision } from '../actions'

export function CloseVisionButton({ visionId }: { visionId: string }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleClose() {
    startTransition(async () => {
      await closeVision(visionId)
    })
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    startTransition(async () => {
      await deleteVision(visionId)
    })
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClose}
        disabled={isPending}
        className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-400 hover:border-neutral-500 hover:text-neutral-200 transition-colors disabled:opacity-50"
      >
        Chiudi visione
      </button>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className={[
          'rounded-lg border px-4 py-2 text-sm transition-colors disabled:opacity-50',
          confirmDelete
            ? 'border-red-500/50 text-red-400 hover:border-red-500 hover:bg-red-500/10'
            : 'border-neutral-700 text-neutral-600 hover:border-neutral-600 hover:text-neutral-400',
        ].join(' ')}
      >
        {confirmDelete ? 'Conferma eliminazione' : 'Elimina'}
      </button>
      {confirmDelete && (
        <button
          onClick={() => setConfirmDelete(false)}
          className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
        >
          Annulla
        </button>
      )}
    </div>
  )
}
