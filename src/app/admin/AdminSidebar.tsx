'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  label: string
  href: string
  icon: string
  exact: boolean
  badge?: number
}

const BASE_NAV_ITEMS: Omit<NavItem, 'badge'>[] = [
  { label: 'Gestione profili', href: '/admin', icon: '👤', exact: true },
  { label: 'Candidature', href: '/admin/applications', icon: '📥', exact: false },
  { label: 'Codici invito', href: '/admin/invite-codes', icon: '🎟️', exact: false },
  { label: 'Progetti', href: '/admin/projects', icon: '📋', exact: false },
  { label: 'Monitoraggio chat', href: '/admin/messages', icon: '💬', exact: false },
  { label: 'Anteprima onboarding', href: '/admin/onboarding-preview', icon: '👁️', exact: false },
]

interface AdminSidebarProps {
  pendingApplications?: number
}

export function AdminSidebar({ pendingApplications = 0 }: AdminSidebarProps) {
  const pathname = usePathname()

  const navItems: NavItem[] = BASE_NAV_ITEMS.map((item) => ({
    ...item,
    badge: item.href === '/admin/applications' && pendingApplications > 0
      ? pendingApplications
      : undefined,
  }))

  return (
    <nav className="space-y-0.5">
      {navItems.map(({ label, href, icon, exact, badge }) => {
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
            <span className="flex-1">{label}</span>
            {badge !== undefined && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-[10px] font-bold text-black flex items-center justify-center leading-none">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
