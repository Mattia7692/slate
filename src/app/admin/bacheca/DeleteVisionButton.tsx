'use client'

import { useState } from 'react'
import { deleteVision } from './actions'

export function DeleteVisionButton({ visionId }: { visionId: string }) {
  const [loading, setLoading] = useState(false)

  async function handle() {
    if (!confirm('Eliminare questa visione?')) return
    setLoading(true)
    await deleteVision(visionId)
    setLoading(false)
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="text-xs text-red-500 hover:text-red-400 disabled:opacity-40 transition-colors"
    >
      {loading ? '…' : 'Elimina'}
    </button>
  )
}
