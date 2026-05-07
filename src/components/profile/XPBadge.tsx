import { getLevelName } from '@/lib/xp'
import { XP_LEVELS } from '@/types'

interface XPBadgeProps {
  level: number
  xp: number
  showXp?: boolean
  size?: 'sm' | 'md'
  isFounder?: boolean
}

const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-neutral-700 text-neutral-300 border-neutral-600',
  2: 'bg-sky-500/15 text-sky-400 border-sky-500/25',
  3: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
  4: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  5: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
}

export function XPBadge({ level, xp, showXp = false, size = 'md', isFounder = false }: XPBadgeProps) {
  const name = getLevelName(level)
  const levelData = XP_LEVELS.find((l) => l.level === level)
  const nextLevel = XP_LEVELS.find((l) => l.level === level + 1)

  const progress =
    level < 5 && levelData
      ? Math.min(100, Math.round(((xp - levelData.min) / (levelData.max - levelData.min + 1)) * 100))
      : 100

  return (
    <div className="inline-flex flex-col gap-1">
      {isFounder ? (
        <span
          className={[
            'inline-flex items-center gap-1.5 rounded-full border font-semibold',
            'bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border-amber-400/40',
            size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
          ].join(' ')}
        >
          <span>✦</span>
          <span>Founder</span>
        </span>
      ) : (
        <span
          className={[
            'inline-flex items-center gap-1.5 rounded-full border font-medium',
            size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
            LEVEL_COLORS[level] ?? LEVEL_COLORS[1],
          ].join(' ')}
        >
          <span>Lv.{level}</span>
          <span>{name}</span>
        </span>
      )}

      {showXp && (
        <div className="space-y-0.5 px-0.5">
          <div className="flex justify-between text-xs text-neutral-600">
            <span>{xp} XP</span>
            {!isFounder && nextLevel && <span>{nextLevel.min} XP</span>}
          </div>
          <div className="h-1 w-full rounded-full bg-neutral-800 overflow-hidden">
            <div
              className={[
                'h-full rounded-full transition-all',
                isFounder ? 'bg-gradient-to-r from-amber-400 to-rose-400' : 'bg-neutral-400',
              ].join(' ')}
              style={{ width: isFounder ? '100%' : `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
