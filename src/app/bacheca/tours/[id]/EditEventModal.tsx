'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateTourEvent } from '../actions'

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
  onClose: () => void
}

export function EditEventModal({ tourId, initial, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Parsa location JSON se presente
  const parsedLoc = (() => {
    if (!initial.location) return { description: '', address: '' }
    try {
      const p = JSON.parse(initial.location) as { description?: string; address?: string }
      return { description: p.description ?? '', address: p.address ?? '' }
    } catch {
      return { description: initial.location, address: '' }
    }
  })()

  const [title, setTitle] = useState(initial.title)
  const [city, setCity] = useState(initial.city)
  const [roleNeeded, setRoleNeeded] = useState<'photographer' | 'model'>(initial.role_needed)
  const [hourlyRate, setHourlyRate] = useState(String(initial.hourly_rate))
  const [locationAvailable, setLocationAvailable] = useState(initial.location_available)
  const [locDescription, setLocDescription] = useState(parsedLoc.description)
  const [locAddress, setLocAddress] = useState(parsedLoc.address)

  const fieldCls = 'w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20'

  async function handleSave() {
    if (!title.trim() || !city.trim() || !hourlyRate || parseInt(hourlyRate) <= 0) {
      setError('Compila tutti i campi obbligatori.')
      return
    }
    const location = locationAvailable
      ? JSON.stringify({ description: locDescription.trim(), address: locAddress.trim() })
      : null

    setLoading(true)
    setError(null)
    try {
      const res = await updateTourEvent(tourId, {
        title: title.trim(),
        city: city.trim(),
        role_needed: roleNeeded,
        hourly_rate: parseInt(hourlyRate),
        location_available: locationAvailable,
        location,
      })
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
      <div className="w-full sm:max-w-sm bg-neutral-950 border border-neutral-800 rounded-t-2xl sm:rounded-2xl p-5 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between gap-3">
          <p className="text-base font-semibold">Modifica evento</p>
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* A chi è rivolto */}
        <div className="space-y-2">
          <label className="text-xs text-neutral-500">A chi è rivolto?</label>
          <div className="flex gap-3">
            {(['photographer', 'model'] as const).map((role) => {
              const label = role === 'photographer' ? 'Fotograf*' : 'Modell*'
              const active = roleNeeded === role
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setRoleNeeded(role)}
                  className={[
                    'flex-1 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors',
                    active
                      ? role === 'photographer'
                        ? 'border-blue-500/60 bg-blue-500/15 text-blue-300'
                        : 'border-violet-500/60 bg-violet-500/15 text-violet-300'
                      : 'border-neutral-700 bg-neutral-900 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300',
                  ].join(' ')}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Titolo */}
        <div className="space-y-1.5">
          <label className="text-xs text-neutral-500">Titolo</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={fieldCls}
          />
        </div>

        {/* Città */}
        <div className="space-y-1.5">
          <label className="text-xs text-neutral-500">Città</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={fieldCls}
          />
        </div>

        {/* Cachet */}
        <div className="space-y-1.5">
          <label className="text-xs text-neutral-500">Cachet orario (€/h)</label>
          <input
            type="number"
            min={1}
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            className={fieldCls}
          />
        </div>

        {/* Location toggle */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setLocationAvailable((v) => !v)}
              className={[
                'w-10 h-6 rounded-full transition-colors relative shrink-0',
                locationAvailable ? 'bg-white' : 'bg-neutral-700',
              ].join(' ')}
            >
              <div className={[
                'absolute top-1 w-4 h-4 bg-neutral-900 rounded-full transition-transform',
                locationAvailable ? 'translate-x-5' : 'translate-x-1',
              ].join(' ')} />
            </div>
            <span className="text-sm text-neutral-300">Dettagli della location (se disponibile)</span>
          </label>

          {locationAvailable && (
            <div className="space-y-2 pl-1">
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-500">Descrizione</label>
                <textarea
                  value={locDescription}
                  onChange={(e) => setLocDescription(e.target.value)}
                  rows={2}
                  className={fieldCls + ' resize-none'}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-500">Indirizzo</label>
                <input
                  type="text"
                  value={locAddress}
                  onChange={(e) => setLocAddress(e.target.value)}
                  className={fieldCls}
                />
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="space-y-2 pt-1">
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full rounded-xl bg-white text-neutral-900 hover:bg-neutral-200 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            {loading ? 'Salvataggio…' : 'Salva modifiche'}
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
