'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { submitReview } from './actions'

interface ReviewFormProps {
  projectId: string
  revieweeId: string
  revieweeName: string
  alreadyReviewed: boolean
}

export function ReviewForm({ projectId, revieweeId, revieweeName, alreadyReviewed }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(alreadyReviewed)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit() {
    if (rating === 0) { setError('Seleziona una valutazione.'); return }
    setError(null)
    startTransition(async () => {
      const result = await submitReview(projectId, revieweeId, rating, comment)
      if (result.error) {
        setError(result.error)
      } else {
        setSubmitted(true)
      }
    })
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400">
        Recensione inviata. Grazie!
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 space-y-4">
      <p className="text-sm font-medium">Lascia una recensione a {revieweeName}</p>

      {/* Stelle */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="text-2xl transition-transform hover:scale-110 cursor-pointer"
          >
            <span className={(hovered || rating) >= star ? 'text-amber-400' : 'text-neutral-700'}>
              ★
            </span>
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Descrivi la tua esperienza (opzionale)"
        rows={3}
        className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20 resize-none"
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button loading={isPending} onClick={handleSubmit} size="sm">
        Invia recensione
      </Button>
    </div>
  )
}
