'use client'

import { useState } from 'react'
import { deleteTour } from './actions'

export function DeleteTourButton({ tourId }: { tourId: string }) {
  const [loading, setLoading] = useState(false)

  async function handle() {
    if (!confirm('Eliminare questo tour?')) return
    setLoading(true)
    await deleteTour(tourId)
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
