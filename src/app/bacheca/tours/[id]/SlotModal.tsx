'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { bookSlot, confirmSlot, confirmSlotWithChanges, cancelSlot, updateSlot, reactivateSlot } from '../actions'
import { genrePillClass } from '@/lib/genreColors'
import type { TourSlotWithBooker, Genre } from '@/types'

interface Props {
  slot: TourSlotWithBooker
  isCreator: boolean
  tourId: string
  creatorId: string
  currentUserId: string
  tourGenres: Genre[]
  onClose: () => void
}

export function SlotModal({ slot, isCreator, tourId, creatorId, currentUserId, tourGenres, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Edit mode (creator only) — riattiva slot cancellati
  const [editMode, setEditMode] = useState(slot.status === 'cancelled')
  const [editStart, setEditStart] = useState(slot.start_time.slice(0, 5))
  const [editDuration, setEditDuration] = useState(String(slot.duration_hours))
  const [editRate, setEditRate] = useState(String(slot.hourly_rate))

  // Negoziazione (creator, slot booked) — modifica e accetta
  const [negotiateMode, setNegotiateMode] = useState(false)
  const [negStart, setNegStart] = useState(slot.start_time.slice(0, 5))
  const [negDuration, setNegDuration] = useState(String(slot.duration_hours))
  const [negRate, setNegRate] = useState(String(slot.hourly_rate))

  // Messaggio opzionale (solo photographer in fase di prenotazione)
  const [message, setMessage] = useState('')

  // Generi in comune
  const [commonGenres, setCommonGenres] = useState<Genre[]>([])

  useEffect(() => {
    // Fetch solo per chi sta per prenotare (non creator, slot libero)
    if (isCreator || slot.status !== 'free' || tourGenres.length === 0) return
    const supabase = createClient()
    supabase
      .from('profile_genres')
      .select('genre_id')
      .eq('profile_id', currentUserId)
      .then(({ data }) => {
        if (!data) return
        const myGenreIds = new Set(data.map((r: { genre_id: string }) => r.genre_id))
        setCommonGenres(tourGenres.filter((g) => myGenreIds.has(g.id)))
      })
  }, [isCreator, slot.status, currentUserId, tourGenres])

  const parsed = parseISO(slot.slot_date)
  const dateLabel = format(parsed, 'EEEE d MMMM', { locale: it })

  const fmt = (t: string) => t.slice(0, 5)

  async function run(fn: () => Promise<{ error: string | null } | void>) {
    setLoading(true)
    setError(null)
    try {
      const res = await fn()
      if (res && 'error' in res && res.error) {
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

  async function handleBook() {
    await run(() =>
      bookSlot(slot.id, tourId, creatorId, slot.slot_date, slot.start_time, message || undefined)
    )
  }

  async function handleConfirm() {
    await run(() => confirmSlot(slot.id, tourId))
  }

  async function handleConfirmWithChanges() {
    const dur = parseFloat(negDuration)
    const rate = parseFloat(negRate)
    if (!negStart || !dur || dur <= 0 || !rate || rate <= 0) {
      setError('Valori non validi.')
      return
    }
    await run(() => confirmSlotWithChanges(slot.id, tourId, negStart, dur, rate))
  }

  async function handleCancel() {
    await run(() => cancelSlot(slot.id, tourId))
  }

  async function handleUpdate() {
    const dur = parseFloat(editDuration)
    const rate = parseFloat(editRate)
    if (!editStart || !dur || dur <= 0 || !rate || rate <= 0) {
      setError('Valori non validi.')
      return
    }
    if (slot.status === 'cancelled') {
      await run(() => reactivateSlot(slot.id, tourId, editStart, dur, rate))
    } else {
      await run(() => updateSlot(slot.id, tourId, dur, rate))
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full sm:max-w-sm bg-neutral-950 border border-neutral-800 rounded-t-2xl sm:rounded-2xl p-5 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold capitalize">{dateLabel}</p>
            <p className="text-2xl font-bold tabular-nums mt-0.5">{fmt(slot.start_time)} – {fmt(slot.end_time)}</p>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Details */}
        {!editMode && (
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Durata</span>
              <span className="font-medium">{slot.duration_hours}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Cachet orario</span>
              <span className="font-medium">€{slot.hourly_rate}/h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Totale</span>
              <span className="font-medium text-emerald-400">€{slot.total_amount}</span>
            </div>
            {slot.booked_by && slot.booker && (
              <div className="flex justify-between">
                <span className="text-neutral-500">Prenotato da</span>
                <span className="font-medium">{slot.booker.full_name}</span>
              </div>
            )}
            {/* Messaggio del prenotante (visibile al creator) */}
            {isCreator && slot.booking_message && (
              <div className="pt-2 border-t border-neutral-800">
                <p className="text-[11px] text-neutral-500 mb-1">Messaggio</p>
                <p className="text-sm text-neutral-300 leading-relaxed">{slot.booking_message}</p>
              </div>
            )}
          </div>
        )}

        {/* Edit mode (creator) */}
        {editMode && (
          <div className="space-y-3">
            {slot.status === 'cancelled' && (
              <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2">
                <p className="text-xs text-violet-300">Slot annullato — modifica e riattiva</p>
              </div>
            )}
            {slot.status === 'cancelled' && (
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-500">Ora inizio</label>
                <input
                  type="time"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500/20"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs text-neutral-500">Durata (ore)</label>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-neutral-500">Cachet orario (€/h)</label>
              <input
                type="number"
                min={1}
                value={editRate}
                onChange={(e) => setEditRate(e.target.value)}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500/20"
              />
            </div>
            <p className="text-xs text-neutral-600">
              Totale: €{(parseFloat(editDuration || '0') * parseFloat(editRate || '0')).toFixed(0)}
            </p>
          </div>
        )}

        {/* Generi in comune (solo photographer, slot libero) */}
        {!isCreator && slot.status === 'free' && commonGenres.length > 0 && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 space-y-2">
            <p className="text-[11px] text-neutral-500 uppercase tracking-wide font-medium">
              Generi in comune
            </p>
            <div className="flex flex-wrap gap-1.5">
              {commonGenres.map((g) => (
                <span key={g.id} className={genrePillClass(g.order_index)}>
                  {g.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Messaggio opzionale (solo photographer, slot libero) */}
        {!isCreator && slot.status === 'free' && (
          <div className="space-y-1.5">
            <label className="text-xs text-neutral-500">
              Messaggio <span className="text-neutral-700">(opzionale)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descrivi brevemente che tipo di foto vorresti realizzare…"
              rows={3}
              maxLength={400}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 resize-none"
            />
            {message.length > 0 && (
              <p className="text-[11px] text-neutral-700 text-right">{message.length}/400</p>
            )}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-1">
          {/* CREATOR ACTIONS */}
          {isCreator && !editMode && !negotiateMode && (
            <>
              {slot.status === 'booked' && (
                <>
                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold transition-colors"
                  >
                    {loading ? 'Conferma…' : 'Conferma così com\'è'}
                  </button>
                  <button
                    onClick={() => setNegotiateMode(true)}
                    disabled={loading}
                    className="w-full rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold transition-colors"
                  >
                    Modifica e accetta
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="w-full rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold transition-colors"
                  >
                    {loading ? '…' : 'Rifiuta prenotazione'}
                  </button>
                </>
              )}
              {slot.status === 'confirmed' && (
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="w-full rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold transition-colors"
                >
                  {loading ? '…' : 'Annulla shooting'}
                </button>
              )}
              {slot.status === 'free' && (
                <button
                  onClick={() => setEditMode(true)}
                  className="w-full rounded-xl border border-neutral-700 hover:bg-neutral-800 text-neutral-300 px-4 py-2.5 text-sm font-semibold transition-colors"
                >
                  Modifica slot
                </button>
              )}
            </>
          )}

          {/* Negoziazione: modifica orario/durata/cachet e accetta */}
          {isCreator && negotiateMode && (
            <div className="space-y-3">
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2">
                <p className="text-xs text-cyan-300">Modifica le condizioni e conferma</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-500">Ora inizio</label>
                <input type="time" value={negStart} onChange={(e) => setNegStart(e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-500">Durata (ore)</label>
                <input type="number" min={0.5} step={0.5} value={negDuration} onChange={(e) => setNegDuration(e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-500">Cachet orario (€/h)</label>
                <input type="number" min={1} value={negRate} onChange={(e) => setNegRate(e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500/20" />
              </div>
              <p className="text-xs text-neutral-600">
                Totale: €{(parseFloat(negDuration || '0') * parseFloat(negRate || '0')).toFixed(0)}
              </p>
              <button
                onClick={handleConfirmWithChanges}
                disabled={loading}
                className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-2.5 text-sm font-semibold transition-colors"
              >
                {loading ? 'Conferma…' : 'Accetto a queste condizioni'}
              </button>
              <button
                onClick={() => setNegotiateMode(false)}
                disabled={loading}
                className="w-full rounded-xl border border-neutral-700 hover:bg-neutral-800 text-neutral-400 px-4 py-2.5 text-sm font-semibold transition-colors"
              >
                Indietro
              </button>
            </div>
          )}

          {/* Edit mode save */}
          {isCreator && editMode && (
            <>
              <button
                onClick={handleUpdate}
                disabled={loading}
                className={[
                  'w-full rounded-xl disabled:opacity-50 px-4 py-2.5 text-sm font-semibold transition-colors',
                  slot.status === 'cancelled'
                    ? 'bg-violet-600 hover:bg-violet-500 text-white'
                    : 'bg-white text-neutral-900 hover:bg-neutral-200',
                ].join(' ')}
              >
                {loading
                  ? 'Salvataggio…'
                  : slot.status === 'cancelled'
                    ? 'Riattiva slot'
                    : 'Salva modifiche'}
              </button>
              {slot.status !== 'cancelled' && (
                <button
                  onClick={() => setEditMode(false)}
                  disabled={loading}
                  className="w-full rounded-xl border border-neutral-700 hover:bg-neutral-800 text-neutral-400 px-4 py-2.5 text-sm font-semibold transition-colors"
                >
                  Annulla
                </button>
              )}
            </>
          )}

          {/* PHOTOGRAPHER ACTIONS */}
          {!isCreator && (
            <>
              {slot.status === 'free' && (
                <button
                  onClick={handleBook}
                  disabled={loading}
                  className="w-full rounded-xl bg-white text-neutral-900 hover:bg-neutral-200 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold transition-colors"
                >
                  {loading ? 'Prenotazione…' : `Prenota — €${slot.total_amount}`}
                </button>
              )}
              {slot.status === 'booked' && slot.booked_by === currentUserId && (
                <div className="space-y-2">
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-center">
                    <p className="text-xs text-amber-400">Prenotazione in attesa di conferma</p>
                  </div>
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="w-full rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold transition-colors"
                  >
                    {loading ? '…' : 'Annulla prenotazione'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
