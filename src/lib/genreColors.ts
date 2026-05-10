// Colori per i 10 generi fotografici, mappati per order_index (1-based)
// Ogni genere ha sempre lo stesso colore in tutta l'app.

const GENRE_COLORS = [
  { border: 'border-blue-500/30',    bg: 'bg-blue-500/10',    text: 'text-blue-400',    bgActive: 'bg-blue-500/25'    }, // 1 Commerciale
  { border: 'border-violet-500/30',  bg: 'bg-violet-500/10',  text: 'text-violet-400',  bgActive: 'bg-violet-500/25'  }, // 2 Fashion / Editoriale
  { border: 'border-rose-500/30',    bg: 'bg-rose-500/10',    text: 'text-rose-400',    bgActive: 'bg-rose-500/25'    }, // 3 Beauty / Ritratto
  { border: 'border-amber-500/30',   bg: 'bg-amber-500/10',   text: 'text-amber-400',   bgActive: 'bg-amber-500/25'   }, // 4 Lingerie / Swimwear
  { border: 'border-red-500/30',     bg: 'bg-red-500/10',     text: 'text-red-400',     bgActive: 'bg-red-500/25'     }, // 5 Nudo artistico
  { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', bgActive: 'bg-emerald-500/25' }, // 6 Performance / Fitness
  { border: 'border-cyan-500/30',    bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    bgActive: 'bg-cyan-500/25'    }, // 7 Maternità
  { border: 'border-yellow-500/30',  bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  bgActive: 'bg-yellow-500/25'  }, // 8 Still life / Product
  { border: 'border-indigo-500/30',  bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  bgActive: 'bg-indigo-500/25'  }, // 9 Street / Urban
  { border: 'border-orange-500/30',  bg: 'bg-orange-500/10',  text: 'text-orange-400',  bgActive: 'bg-orange-500/25'  }, // 10 Cosplay / Artistico
] as const

export function genreColor(orderIndex: number) {
  const idx = Math.max(0, Math.min(orderIndex - 1, GENRE_COLORS.length - 1))
  return GENRE_COLORS[idx]
}

// Classe completa per una pill di display (non interattiva)
export function genrePillClass(orderIndex: number): string {
  const c = genreColor(orderIndex)
  return `rounded-full border ${c.border} ${c.bg} ${c.text} px-3 py-1 text-xs font-medium`
}
