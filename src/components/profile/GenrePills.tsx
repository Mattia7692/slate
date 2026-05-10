'use client'

import { genreColor } from '@/lib/genreColors'
import type { Genre } from '@/types'

interface GenrePillsProps {
  genres: Genre[]
  selected: string[]
  onToggle: (id: string) => void
}

export function GenrePills({ genres, selected, onToggle }: GenrePillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {genres.map((g) => {
        const isSelected = selected.includes(g.id)
        const c = genreColor(g.order_index)
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => onToggle(g.id)}
            className={[
              'rounded-full border px-4 py-1.5 text-sm font-medium transition-all cursor-pointer',
              isSelected
                ? `${c.border} ${c.bgActive} ${c.text}`
                : 'border-neutral-700 bg-neutral-800/60 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300',
            ].join(' ')}
          >
            {g.label}
          </button>
        )
      })}
    </div>
  )
}
