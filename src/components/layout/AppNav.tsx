'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import type { Notification } from '@/types'

interface AppNavProps {
  userInitials: string
  userId: string
  avatarUrl: string | null
  notifications: Notification[]
}

const MAIN_TABS = [
  { label: 'Home', href: '/dashboard' },
  { label: 'Esplora', href: '/explore' },
  { label: 'Visioni', href: '/bacheca' },
]

export function AppNav({ userInitials, userId, avatarUrl, notifications }: AppNavProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <header className="border-b border-neutral-800 px-5 h-32 flex items-center justify-between gap-4">
      <Link href="/dashboard" className="shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Slate" className="h-24 w-auto mix-blend-screen" />
      </Link>

      <nav className="flex items-center gap-1">
        {MAIN_TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              'text-[13px] px-3 py-1.5 rounded-lg transition-colors',
              isActive(tab.href)
                ? 'bg-neutral-800 text-neutral-100 font-medium'
                : 'text-neutral-500 hover:text-neutral-300',
            ].join(' ')}
          >
            {tab.label}
          </Link>
        ))}

        <span className="text-neutral-700 px-1 select-none">/</span>

        <Link
          href="/me"
          className={[
            'text-[13px] px-3 py-1.5 rounded-lg transition-colors',
            isActive('/me')
              ? 'bg-neutral-800 text-neutral-100 font-medium'
              : 'text-neutral-500 hover:text-neutral-300',
          ].join(' ')}
        >
          Personale
        </Link>
      </nav>

      <div className="flex items-center gap-3 shrink-0">
        <NotificationBell initialNotifications={notifications} currentUserId={userId} />
        <Link href="/me" className="w-8 h-8 rounded-full overflow-hidden bg-neutral-700 hover:opacity-80 transition-opacity shrink-0">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="w-full h-full flex items-center justify-center text-xs font-semibold text-neutral-200">
              {userInitials}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}
