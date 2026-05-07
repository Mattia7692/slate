import { XP_LEVELS, type LevelName } from '@/types'

// ============================================================
// Calcolo livello dagli XP
// ============================================================

export function computeLevel(xp: number): number {
  if (xp >= 10000) return 5
  if (xp >= 4000) return 4
  if (xp >= 1500) return 3
  if (xp >= 500) return 2
  return 1
}

export function getLevelName(level: number): LevelName {
  const found = XP_LEVELS.find((l) => l.level === level)
  return found ? found.name : 'Newcomer'
}

export function getXpForNextLevel(xp: number): number | null {
  const current = XP_LEVELS.find((l) => xp >= l.min && xp <= l.max)
  if (!current || current.level === 5) return null
  const next = XP_LEVELS.find((l) => l.level === current.level + 1)
  return next ? next.min - xp : null
}

export function getLevelProgress(xp: number): number {
  const current = XP_LEVELS.find((l) => xp >= l.min && xp <= l.max)
  if (!current || current.level === 5) return 100
  const range = current.max - current.min + 1
  const earned = xp - current.min
  return Math.round((earned / range) * 100)
}

// ============================================================
// Bonus anzianità (one-time al completamento profilo)
// ============================================================

export function computeSeniorityBonus(yearsInIndustry: number): number {
  if (yearsInIndustry >= 20) return 1000
  if (yearsInIndustry >= 11) return 800
  if (yearsInIndustry >= 6) return 500
  if (yearsInIndustry >= 3) return 250
  if (yearsInIndustry >= 1) return 100
  return 0
}

// ============================================================
// Costanti XP
// ============================================================

export const XP_VALUES = {
  SHOOT_COMPLETED: 150,
  REVIEW_5_STARS: 75,
  REVIEW_4_STARS: 30,
  MASTER_COLLABORATION: 50,
  NO_SHOW_PENALTY: -200,
  LATE_CANCELLATION_PENALTY: -80,
  REPORT_PENALTY: -150,
} as const
