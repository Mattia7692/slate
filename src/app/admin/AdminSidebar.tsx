'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  label: string
  href: string
  exact: boolean
  badge?: number
}

const BASE_NAV_ITEMS: Omit<NavItem, 'badge'>[] = [
  { label: 'Gestione profili', href: '/admin', exact: true },
  { label: 'Candidature', href: '/admin/applications', exact: false },
  { label: 'Codici invito', href: '/admin/invite-codes', exact: false },
  { label: 'Progetti', href: '/admin/projects', exact: false },
  { label: 'Monitoraggio chat', href: '/admin/messages', exact: false },
  { label: 'Anteprima onboarding', href: '/admin/onboarding-preview', exact: false },
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
    <nav className="flex flex-col gap-0.5">
      {navItems.map(({ label, href, exact, badge }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={[
              'flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors',
              isActive
                ? 'bg-orange-900 text-neutral-100 font-medium'
                : 'text-neutral-500 hover:bg-orange-900/60 hover:text-neutral-200',
            ].join(' ')}
          >
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
