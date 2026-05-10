'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { deleteTourEvent } from '../actions'
import type { BookedSlotConflict } from '../actions'

interface Props {
  tourId: string
  onClose: () => void
}

export function DeleteEventModal({ tourId, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<BookedSlotConflict[] | null>(null)

  async function handleDelete(force = false) {
    setLoading(true)
    setError(null)
    try {
      const res = await deleteTourEvent(tourId, force)
      if ('error' in res) {
        setError(res.error)
      } else if ('conflict' in res) {
        setConflicts(res.conflict)
      } else {
        router.push('/bacheca')
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

        {/* Stato: nessun conflitto — prima conferma */}
        {!conflicts && (
          <>
            <div>
              <p className="text-base font-semibold">Elimina evento</p>
              <p className="text-sm text-neutral-400 mt-1">
                Questa azione è irreversibile. Tutti gli slot e le foto dell'evento verranno eliminati.
              </p>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleDelete(false)}
                disabled={loading}
                className="w-full rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold transition-colors"
              >
                {loading ? 'Controllo…' : 'Elimina evento'}
              </button>
              <button
                onClick={onClose}
                disabled={loading}
                className="w-full rounded-xl border border-neutral-700 hover:bg-neutral-800 text-neutral-400 px-4 py-2.5 text-sm font-semibold transition-colors"
              >
                Annulla
              </button>
            </div>
          </>
        )}

        {/* Stato: ci sono slot prenotati */}
        {conflicts && (
          <>
            <div>
              <p className="text-base font-semibold text-amber-400">Attenzione — slot prenotati</p>
              <p className="text-sm text-neutral-400 mt-1">
                I seguenti slot sono già prenotati. Se elimini l'evento, verrà inviata una notifica di scuse a ciascun utente.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 divide-y divide-neutral-800 max-h-48 overflow-y-auto">
              {conflicts.map((c) => (
                <div key={c.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{c.booker_name}</p>
                    <p className="text-xs text-neutral-500 capitalize">
                      {format(parseISO(c.slot_date), 'EEEE d MMM', { locale: it })} · {c.start_time.slice(0, 5)}
                    </p>
                  </div>
                  <span className="text-[10px] font-medium border border-amber-500/30 bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full shrink-0">
                    Prenotato
                  </span>
                </div>
              ))}
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleDelete(true)}
                disabled={loading}
                className="w-full rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold transition-colors"
              >
                {loading ? 'Eliminazione…' : 'Sì, elimina e notifica gli utenti'}
              </button>
              <button
                onClick={onClose}
                disabled={loading}
                className="w-full rounded-xl border border-neutral-700 hover:bg-neutral-800 text-neutral-400 px-4 py-2.5 text-sm font-semibold transition-colors"
              >
                No, mantieni l'evento
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
