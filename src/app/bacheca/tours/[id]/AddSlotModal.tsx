'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { addSlot } from '../actions'

interface Props {
  tourId: string
  slotDate: string
  defaultRate: number
  onClose: () => void
}

export function AddSlotModal({ tourId, slotDate, defaultRate, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [startTime, setStartTime] = useState('09:00')
  const [duration, setDuration] = useState('2')
  const [rate, setRate] = useState(String(defaultRate))

  const dateLabel = format(parseISO(slotDate), 'EEEE d MMMM', { locale: it })

  async function handleAdd() {
    const dur = parseFloat(duration)
    const r = parseFloat(rate)
    if (!startTime || !dur || dur <= 0 || !r || r <= 0) {
      setError('Valori non validi.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await addSlot(tourId, slotDate, startTime, dur, r)
      if (res.error) {
        setError(res.error)
      } else {
        onClose()
        router.refresh()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore imprevisto.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full sm:max-w-sm bg-neutral-950 border border-neutral-800 rounded-t-2xl sm:rounded-2xl p-5 space-y-4 shadow-xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-neutral-500 capitalize">{dateLabel}</p>
            <p className="text-base font-semibold mt-0.5">Aggiungi slot</p>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-neutral-500">Ora inizio</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-neutral-500">Durata (ore)</label>
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-neutral-500">Cachet orario (€/h)</label>
            <input
              type="number"
              min={1}
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500/20"
            />
          </div>
          <p className="text-xs text-neutral-600">
            Totale: €{(parseFloat(duration || '0') * parseFloat(rate || '0')).toFixed(0)}
          </p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="space-y-2 pt-1">
          <button
            onClick={handleAdd}
            disabled={loading}
            className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            {loading ? 'Aggiunta…' : 'Aggiungi slot'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full rounded-xl border border-neutral-700 hover:bg-neutral-800 text-neutral-400 px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}
