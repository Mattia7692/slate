'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { SlotModal } from './SlotModal'
import { AddSlotModal } from './AddSlotModal'
import type { TourSlotWithBooker, TourStatus, SlotStatus, Genre } from '@/types'

interface Props {
  slots: TourSlotWithBooker[]
  isCreator: boolean
  tourId: string
  creatorId: string
  tourStatus: TourStatus
  currentUserId: string
  defaultRate: number
  tourGenres: Genre[]
}

function groupByDate(slots: TourSlotWithBooker[]): Map<string, TourSlotWithBooker[]> {
  const map = new Map<string, TourSlotWithBooker[]>()
  for (const slot of slots) {
    const arr = map.get(slot.slot_date) ?? []
    arr.push(slot)
    map.set(slot.slot_date, arr)
  }
  return map
}

// Trim seconds from "HH:mm:ss" → "HH:mm", leave "HH:mm" as-is
function fmt(time: string) {
  return time.slice(0, 5)
}

type DisplayStatus = SlotStatus | 'occupied' | 'confirmed_mine'

const STATUS_STYLES: Record<DisplayStatus, string> = {
  free:           'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 active:bg-emerald-500/30',
  booked:         'border-amber-500/40  bg-amber-500/10  text-amber-300  active:bg-amber-500/30',
  confirmed:      'border-blue-500/40   bg-blue-500/10   text-blue-300   active:bg-blue-500/30',
  cancelled:      'border-neutral-800   bg-neutral-900   text-neutral-600',
  occupied:       'border-red-500/30    bg-red-500/10    text-red-400',
  confirmed_mine: 'border-cyan-500/40   bg-cyan-500/10   text-cyan-300   active:bg-cyan-500/30',
}

const STATUS_LABEL: Record<SlotStatus, string> = {
  free:      'Libero',
  booked:    'Prenotato',
  confirmed: 'Confermato',
  cancelled: 'Annullato',
}

const LEGEND_CREATOR: { status: DisplayStatus; label: string }[] = [
  { status: 'free',      label: 'Libero' },
  { status: 'booked',    label: 'Prenotato' },
  { status: 'confirmed', label: 'Confermato' },
  { status: 'cancelled', label: 'Annullato' },
]

const LEGEND_VISITOR: { status: DisplayStatus; label: string }[] = [
  { status: 'free',           label: 'Disponibile' },
  { status: 'confirmed_mine', label: 'Tuo slot' },
  { status: 'occupied',       label: 'Occupato' },
]

export function TourCalendar({ slots, isCreator, tourId, creatorId, tourStatus, currentUserId, defaultRate, tourGenres }: Props) {
  const [selectedSlot, setSelectedSlot] = useState<TourSlotWithBooker | null>(null)
  const [addSlotDate, setAddSlotDate] = useState<string | null>(null)

  const grouped = groupByDate(slots)
  const dates = Array.from(grouped.keys()).sort()

  if (dates.length === 0) {
    return <div className="py-12 text-center text-neutral-500 text-sm">Nessuno slot disponibile.</div>
  }

  function isClickable(slot: TourSlotWithBooker): boolean {
    if (tourStatus !== 'active') return false
    if (isCreator) return true
    if (slot.status === 'free') return true
    if (slot.status === 'booked' && slot.booked_by === currentUserId) return true
    return false
  }

  function getDisplayStatus(slot: TourSlotWithBooker): DisplayStatus {
    if (!isCreator) {
      if (slot.status === 'confirmed' && slot.booked_by === currentUserId) return 'confirmed_mine'
      if ((slot.status === 'booked' && slot.booked_by !== currentUserId) ||
          slot.status === 'confirmed') return 'occupied'
    }
    return slot.status
  }

  function getSubLabel(slot: TourSlotWithBooker): string {
    if (isCreator) return STATUS_LABEL[slot.status]
    if (slot.status === 'free') return `€${slot.total_amount}`
    if (slot.status === 'booked' && slot.booked_by === currentUserId) return 'Tua prenotaz.'
    if (slot.status === 'confirmed' && slot.booked_by === currentUserId) return 'Confermato'
    return 'Occupato'
  }

  const legend = isCreator ? LEGEND_CREATOR : LEGEND_VISITOR

  return (
    <>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-5">
        {legend.map(({ status, label }) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={['w-2.5 h-2.5 rounded-sm border', STATUS_STYLES[status]].join(' ')} />
            <span className="text-xs text-neutral-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Week-view grid — 3 columns visible, horizontal scroll for more */}
      <div className="overflow-x-auto pb-2 -mx-4 px-4">
        <div
          className="flex gap-2"
          style={{ minWidth: `${dates.length * (dates.length <= 3 ? 0 : 152)}px` }}
        >
          {dates.map((date) => {
            const daySlots = grouped.get(date)!
            const parsed = parseISO(date)
            const morning = daySlots.filter((s) => fmt(s.start_time) < '12:00')
            const afternoon = daySlots.filter((s) => fmt(s.start_time) >= '12:00')

            return (
              <div
                key={date}
                className="flex flex-col min-w-0 flex-1"
                style={dates.length > 3 ? { minWidth: '148px', maxWidth: '148px' } : undefined}
              >
                {/* Day header */}
                <div className="mb-2 pb-2 border-b border-neutral-800">
                  <p className="text-[11px] text-neutral-500 capitalize">
                    {format(parsed, 'EEE', { locale: it })}
                  </p>
                  <p className="text-sm font-semibold">
                    {format(parsed, 'd MMM', { locale: it })}
                  </p>
                </div>

                {/* Morning */}
                {morning.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    <p className="text-[10px] text-neutral-600 uppercase tracking-wide font-medium">Mattina</p>
                    {morning.map((slot) => {
                      const display = getDisplayStatus(slot)
                      const clickable = isClickable(slot)
                      return (
                        <button
                          key={slot.id}
                          onClick={() => clickable && setSelectedSlot(slot)}
                          disabled={!clickable}
                          className={[
                            'w-full rounded-lg border px-2 py-1.5 text-left transition-colors',
                            STATUS_STYLES[display],
                            clickable ? 'cursor-pointer hover:opacity-90' : 'cursor-default opacity-50',
                          ].join(' ')}
                        >
                          <p className="text-xs font-semibold tabular-nums leading-none">
                            {fmt(slot.start_time)}–{fmt(slot.end_time)}
                          </p>
                          <p className="text-[10px] mt-0.5 opacity-75 leading-none">
                            {getSubLabel(slot)}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Afternoon */}
                {afternoon.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-neutral-600 uppercase tracking-wide font-medium">Pomeriggio</p>
                    {afternoon.map((slot) => {
                      const display = getDisplayStatus(slot)
                      const clickable = isClickable(slot)
                      return (
                        <button
                          key={slot.id}
                          onClick={() => clickable && setSelectedSlot(slot)}
                          disabled={!clickable}
                          className={[
                            'w-full rounded-lg border px-2 py-1.5 text-left transition-colors',
                            STATUS_STYLES[display],
                            clickable ? 'cursor-pointer hover:opacity-90' : 'cursor-default opacity-50',
                          ].join(' ')}
                        >
                          <p className="text-xs font-semibold tabular-nums leading-none">
                            {fmt(slot.start_time)}–{fmt(slot.end_time)}
                          </p>
                          <p className="text-[10px] mt-0.5 opacity-75 leading-none">
                            {getSubLabel(slot)}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Aggiungi slot — fuori dal contenitore overflow-x per evitare il clip verticale su mobile */}
      {isCreator && tourStatus === 'active' && (
        <div className="overflow-x-auto -mx-4 px-4 mt-2">
          <div
            className="flex gap-2"
            style={{ minWidth: `${dates.length * (dates.length <= 3 ? 0 : 152)}px` }}
          >
            {dates.map((date) => (
              <div
                key={date}
                className="min-w-0 flex-1"
                style={dates.length > 3 ? { minWidth: '148px', maxWidth: '148px' } : undefined}
              >
                <button
                  onClick={() => setAddSlotDate(date)}
                  className="w-full rounded-lg border border-dashed border-violet-500/30 bg-violet-500/5 px-2 py-2 text-left transition-colors hover:bg-violet-500/10 hover:border-violet-500/50 active:bg-violet-500/20 cursor-pointer"
                >
                  <p className="text-[10px] font-semibold text-violet-400 leading-none">+ Aggiungi slot</p>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedSlot && (
        <SlotModal
          slot={selectedSlot}
          isCreator={isCreator}
          tourId={tourId}
          creatorId={creatorId}
          currentUserId={currentUserId}
          tourGenres={tourGenres}
          onClose={() => setSelectedSlot(null)}
        />
      )}

      {addSlotDate && (
        <AddSlotModal
          tourId={tourId}
          slotDate={addSlotDate}
          defaultRate={defaultRate}
          onClose={() => setAddSlotDate(null)}
        />
      )}
    </>
  )
}
