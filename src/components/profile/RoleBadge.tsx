import type { UserRole } from '@/types'

const STYLES: Record<UserRole, string> = {
  photographer: 'bg-sky-500/15 text-sky-400 border-sky-500/25',
  model:        'bg-rose-500/15 text-rose-400 border-rose-500/25',
}

const LABEL: Record<UserRole, string> = {
  photographer: 'Fotografo',
  model:        'Modell*',
}

interface Props {
  role: UserRole
  className?: string
}

export function RoleBadge({ role, className = '' }: Props) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        STYLES[role],
        className,
      ].join(' ')}
    >
      {LABEL[role]}
    </span>
  )
}
