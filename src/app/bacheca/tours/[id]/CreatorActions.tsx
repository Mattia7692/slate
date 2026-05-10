'use client'

import { useState } from 'react'
import { DeleteEventModal } from './DeleteEventModal'
import { EditEventModal } from './EditEventModal'

interface Props {
  tourId: string
  initial: {
    title: string
    city: string
    role_needed: 'photographer' | 'model'
    hourly_rate: number
    location_available: boolean
    location: string | null
  }
}

export function CreatorActions({ tourId, initial }: Props) {
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowEdit(true)}
          className="rounded-lg border border-neutral-700 hover:bg-neutral-800 text-neutral-300 px-3 py-1.5 text-xs font-medium transition-colors"
        >
          Modifica
        </button>
        <button
          onClick={() => setShowDelete(true)}
          className="rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 text-xs font-medium transition-colors"
        >
          Elimina
        </button>
      </div>

      {showEdit && (
        <EditEventModal
          tourId={tourId}
          initial={initial}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showDelete && (
        <DeleteEventModal
          tourId={tourId}
          onClose={() => setShowDelete(false)}
        />
      )}
    </>
  )
}
