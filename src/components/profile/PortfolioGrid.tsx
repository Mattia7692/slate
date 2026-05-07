'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { PortfolioItem } from '@/types'

interface PortfolioGridProps {
  items: PortfolioItem[]
}

export function PortfolioGrid({ items }: PortfolioGridProps) {
  const [lightbox, setLightbox] = useState<string | null>(null)

  if (!items.length) {
    return (
      <p className="text-sm text-neutral-600 py-8 text-center">
        Nessuna foto nel portfolio.
      </p>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setLightbox(item.image_url)}
            className="relative aspect-square rounded-xl overflow-hidden border border-neutral-800 hover:border-neutral-600 transition-colors cursor-pointer group"
          >
            <Image
              src={item.image_url}
              alt={item.caption ?? ''}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {item.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs text-white truncate">{item.caption}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
            <Image
              src={lightbox}
              alt="Portfolio"
              fill
              className="object-contain"
            />
          </div>
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </>
  )
}
