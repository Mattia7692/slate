'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { SlotModal } from './SlotModal'
import type { TourSlotWithBooker, TourStatus, SlotStatus } from '@/types'

interface Props {
  slots: TourSlotWithBooker[]
  isCreator: boolean
  tourId: string
  creatorId: string
  tourStatus: TourStatus
  currentUserId: string
}

// Group slots by date
function groupByDate(slots: TourSlotWithBooker[]): Map<string, TourSlotWithBooker[]> {
  const map = new Map<string, TourSlotWithBooker[]>()
  for (const slot of slots) {
    const arr = map.get(slot.slot_date) ?? []
    arr.push(slot)
    map.set(slot.slot_date, arr)
  }
  return map
}

const STATUS_STYLES: Record<SlotStatus, string> = {
  free: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20',
  booked: 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20',
  confirmed: 'border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20',
  cancelled: 'border-neutral-700 bg-neutral-900 text-neutral-600',
}

const STATUS_LABEL: Record<SlotStatus, string> = {
  free: 'Libero',
  booked: 'Prenotato',
  confirmed: 'Confermato',
  cancelled: 'Annullato',
}

export function TourCalendar({ slots, isCreator, tourId, creatorId, tourStatus, currentUserId }: Props) {
  const [selectedSlot, setSelectedSlot] = useState<TourSlotWithBooker | null>(null)

  const grouped = groupByDate(slots)
  const dates = Array.from(grouped.keys()).sort()

  if (dates.length === 0) {
    return (
      <div className="py-12 text-center text-neutral-500 text-sm">
        Nessuno slot disponibile.
      </div>
    )
  }

  function handleSlotClick(slot: TourSlotWithBooker) {
    // Photographers can only interact with free slots or their own booked slots
    if (!isCreator) {
      if (slot.status === 'cancelled') return
      if (slot.status === 'confirmed') return
      if (slot.status === 'booked' && slot.booked_by !== currentUserId) return
    }
    setSelectedSlot(slot)
  }

  function isClickable(slot: TourSlotWithBooker): boolean {
    if (tourStatus !== 'active') return false
    if (isCreator) return slot.status !== 'cancelled'
    // Photographer: can book free slots or view their own bookings
    if (slot.status === 'free') return true
    if (slot.status === 'booked' && slot.booked_by === currentUserId) return true
    return false
  }

  // Legend items (different per role)
  const legendItems = isCreator
    ? [
        { status: 'free' as SlotStatus, label: 'Libero' },
        { status: 'booked' as SlotStatus, label: 'Prenotato' },
        { status: 'confirmed' as SlotStatus, label: 'Confermato' },
        { status: 'cancelled' as SlotStatus, label: 'Annullato' },
      ]
    : [
        { status: 'free' as SlotStatus, label: 'Prenota' },
        { status: 'booked' as SlotStatus, label: 'Occupato' },
      ]

  return (
    <>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {legendItems.map(({ status, label }) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={['w-3 h-3 rounded-sm border', STATUS_STYLES[status]].join(' ')} />
            <span className="text-xs text-neutral-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="space-y-6">
        {dates.map((date) => {
          const daySlots = grouped.get(date)!
          const parsed = parseISO(date)

          return (
            <div key={date}>
              <p className="text-sm font-medium text-neutral-300 mb-2 capitalize">
                {format(parsed, 'EEEE d MMMM', { locale: it })}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {daySlots.map((slot) => {
                  // For non-creators, show occupied slots as grey
                  const displayStatus: SlotStatus =
                    !isCreator && (slot.status === 'booked' && slot.booked_by !== currentUserId)
                      ? 'cancelled'
                      : !isCreator && slot.status === 'confirmed'
                      ? 'cancelled'
                      : slot.status

                  const clickable = isClickable(slot)

                  return (
                    <button
                      key={slot.id}
                      onClick={() => clickable && handleSlotClick(slot)}
                      disabled={!clickable}
                      className={[
                        'rounded-xl border px-3 py-2.5 text-left transition-colors',
                        STATUS_STYLES[displayStatus],
                        clickable ? 'cursor-pointer' : 'cursor-default opacity-60',
                      ].join(' ')}
                    >
                      <p className="text-sm font-semibold tabular-nums">
                        {slot.start_time} – {slot.end_time}
                      </p>
                      <p className="text-[11px] mt-0.5 opacity-80">
                        {isCreator
                          ? STATUS_LABEL[slot.status]
                          : slot.status === 'free'
                          ? `€${slot.total_amount}`
                          : slot.status === 'booked' && slot.booked_by === currentUserId
                          ? 'La tua prenotazione'
                          : 'Occupato'}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {selectedSlot && (
        <SlotModal
          slot={selectedSlot}
          isCreator={isCreator}
          tourId={tourId}
          creatorId={creatorId}
          currentUserId={currentUserId}
          onClose={() => setSelectedSlot(null)}
        />
      )}
    </>
  )
}
