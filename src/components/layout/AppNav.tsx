'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import type { Notification } from '@/types'

interface AppNavProps {
  userInitials: string
  userId: string
  notifications: Notification[]
}

const TABS = [
  { label: 'Home', href: '/dashboard' },
  { label: 'Esplora', href: '/explore' },
  { label: 'Visioni', href: '/bacheca' },
]

export function AppNav({ userInitials, userId, notifications }: AppNavProps) {
  const pathname = usePathname()

  return (
    <header className="border-b border-neutral-800 px-5 h-12 flex items-center justify-between gap-4">
      <Link href="/dashboard" className="shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Slate" className="h-9 w-auto mix-blend-screen" />
      </Link>

      <nav className="flex items-center gap-1">
        {TABS.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href !== '/dashboard' && pathname.startsWith(tab.href + '/')) ||
            (tab.href !== '/dashboard' && pathname === tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={[
                'text-[13px] px-3 py-1.5 rounded-lg transition-colors',
                isActive
                  ? 'bg-neutral-800 text-neutral-100 font-medium'
                  : 'text-neutral-500 hover:text-neutral-300',
              ].join(' ')}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>

      <div className="flex items-center gap-3 shrink-0">
        <NotificationBell initialNotifications={notifications} currentUserId={userId} />
        <Link
          href="/me"
          className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-semibold text-neutral-200 hover:bg-neutral-600 transition-colors"
        >
          {userInitials}
        </Link>
      </div>
    </header>
  )
}
