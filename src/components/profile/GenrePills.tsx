'use client'

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
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => onToggle(g.id)}
            className={[
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer',
              isSelected
                ? 'bg-white text-neutral-900'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200',
            ].join(' ')}
          >
            {g.label}
          </button>
        )
      })}
    </div>
  )
}
