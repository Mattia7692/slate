'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  {
    label: 'Gestione profili',
    href: '/admin',
    icon: '👤',
    exact: true,
  },
  {
    label: 'Codici invito',
    href: '/admin/invite-codes',
    icon: '🎟️',
    exact: false,
  },
  {
    label: 'Progetti',
    href: '/admin/projects',
    icon: '📋',
    exact: false,
  },
  {
    label: 'Monitoraggio chat',
    href: '/admin/messages',
    icon: '💬',
    exact: false,
  },
  {
    label: 'Anteprima onboarding',
    href: '/admin/onboarding-preview',
    icon: '👁️',
    exact: false,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <nav className="space-y-0.5">
      {NAV_ITEMS.map(({ label, href, icon, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={[
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
              isActive
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-100',
            ].join(' ')}
          >
            <span className="text-base leading-none">{icon}</span>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
