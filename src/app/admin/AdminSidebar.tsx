'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  label: string
  href: string
  exact: boolean
  badge?: number
}

interface NavGroup {
  title: string
  items: Omit<NavItem, 'badge'>[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Area admin',
    items: [
      { label: 'Candidature',         href: '/admin/applications',      exact: false },
      { label: 'Codici invito',        href: '/admin/invite-codes',      exact: false },
      { label: 'Profili',             href: '/admin',                   exact: true  },
      { label: 'Anteprima onboarding', href: '/admin/onboarding-preview', exact: false },
    ],
  },
  {
    title: 'Monitoraggio comunità',
    items: [
      { label: 'Proposte',   href: '/admin/proposals', exact: false },
      { label: 'Progetti',   href: '/admin/projects',  exact: false },
      { label: 'Chat',       href: '/admin/messages',  exact: false },
      { label: 'Visioni e Tour', href: '/admin/bacheca', exact: false },
    ],
  },
]

interface AdminSidebarProps {
  pendingApplications?: number
}

export function AdminSidebar({ pendingApplications = 0 }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="text-[10px] font-semibold text-amber-500/70 uppercase tracking-widest mb-2 px-1">
            {group.title}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map(({ label, href, exact }) => {
              const isActive = exact ? pathname === href : pathname.startsWith(href)
              const badge =
                href === '/admin/applications' && pendingApplications > 0
                  ? pendingApplications
                  : undefined
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-orange-800/60 text-neutral-100'
                      : 'text-orange-200/60 hover:bg-orange-900/50 hover:text-orange-100',
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
          </div>
        </div>
      ))}
    </nav>
  )
}
