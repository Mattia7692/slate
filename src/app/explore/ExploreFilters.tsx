'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import type { Genre } from '@/types'
import { genreColor } from '@/lib/genreColors'

const ROLE_PILLS = [
  { value: '',             label: 'Tutti' },
  { value: 'photographer', label: 'Fotografi' },
  { value: 'model',        label: 'Modelle' },
]

const LEVEL_PILLS = [
  { value: '', label: 'Tutti i livelli' },
  { value: '1', label: 'Newcomer' },
  { value: '2', label: 'Rising' },
  { value: '3', label: 'Established' },
  { value: '4', label: 'Pro' },
  { value: '5', label: 'Master' },
]

interface ExploreFiltersProps {
  currentRole: string
  currentLevel: string
  currentCity: string
  currentGenre: string
  cities: string[]
  genres: Genre[]
}

export function ExploreFilters({ currentRole, currentLevel, currentCity, currentGenre, cities, genres }: ExploreFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="space-y-3">
      {/* Ruolo */}
      <div className="flex flex-wrap gap-2">
        {ROLE_PILLS.map((p) => (
          <button
            key={p.value}
            onClick={() => updateParam('role', p.value)}
            className={[
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150 cursor-pointer',
              currentRole === p.value
                ? 'bg-white text-neutral-900'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200',
            ].join(' ')}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Livello */}
      <div className="flex flex-wrap gap-2">
        {LEVEL_PILLS.map((p) => (
          <button
            key={p.value}
            onClick={() => updateParam('level', p.value)}
            className={[
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150 cursor-pointer',
              currentLevel === p.value
                ? 'bg-white text-neutral-900'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200',
            ].join(' ')}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Città */}
      {cities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => updateParam('city', '')}
            className={[
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150 cursor-pointer',
              currentCity === ''
                ? 'bg-white text-neutral-900'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200',
            ].join(' ')}
          >
            Tutte le città
          </button>
          {cities.map((c) => (
            <button
              key={c}
              onClick={() => updateParam('city', c)}
              className={[
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150 cursor-pointer',
                currentCity === c
                  ? 'bg-white text-neutral-900'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200',
              ].join(' ')}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Generi */}
      {genres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => updateParam('genre', '')}
            className={[
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150 cursor-pointer',
              currentGenre === ''
                ? 'bg-white text-neutral-900'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200',
            ].join(' ')}
          >
            Tutti i generi
          </button>
          {genres.map((g) => {
            const c = genreColor(g.order_index)
            const isActive = currentGenre === g.id
            return (
              <button
                key={g.id}
                onClick={() => updateParam('genre', isActive ? '' : g.id)}
                className={[
                  'rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-150 cursor-pointer',
                  isActive
                    ? `${c.border} ${c.bgActive} ${c.text}`
                    : 'border-neutral-700 bg-neutral-800/60 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300',
                ].join(' ')}
              >
                {g.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
