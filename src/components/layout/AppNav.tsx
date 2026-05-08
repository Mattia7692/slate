'use client'

import Link from 'next/link'
import { useState } from 'react'
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
  const [menuOpen, setMenuOpen] = useState(false)

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="border-b border-neutral-800 px-4 md:px-5 h-14 md:h-32 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/dashboard" className="shrink-0" onClick={closeMenu}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Slate" className="h-10 md:h-24 w-auto mix-blend-screen" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
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

        {/* Right: bell + avatar (desktop) + hamburger (mobile) */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Bell: sempre visibile */}
          <NotificationBell initialNotifications={notifications} currentUserId={userId} />

          {/* Avatar: solo desktop */}
          <Link
            href="/me"
            className="hidden md:flex w-8 h-8 rounded-full overflow-hidden bg-neutral-700 hover:opacity-80 transition-opacity shrink-0 items-center justify-center"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-semibold text-neutral-200">{userInitials}</span>
            )}
          </Link>

          {/* Hamburger: solo mobile */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Chiudi menu' : 'Apri menu'}
          >
            {menuOpen ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="2" y1="2" x2="16" y2="16" />
                <line x1="16" y1="2" x2="2" y2="16" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="2" y1="5" x2="16" y2="5" />
                <line x1="2" y1="9" x2="16" y2="9" />
                <line x1="2" y1="13" x2="16" y2="13" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* ── MOBILE DROPDOWN ────────────────────────────────────── */}
      {menuOpen && (
        <div className="md:hidden border-b border-neutral-800 bg-neutral-950">

          {/* User row */}
          <div className="px-5 py-4 flex items-center gap-3 border-b border-neutral-800/60">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-700 shrink-0 flex items-center justify-center">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-neutral-200">{userInitials}</span>
              )}
            </div>
            <div className="flex-1" />
            <Link
              href="/me"
              onClick={closeMenu}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Area personale →
            </Link>
          </div>

          {/* Nav links */}
          <nav className="px-3 py-3 flex flex-col gap-0.5">
            {MAIN_TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={closeMenu}
                className={[
                  'flex items-center px-3 py-3 rounded-xl text-sm transition-colors',
                  isActive(tab.href)
                    ? 'bg-neutral-800 text-neutral-100 font-medium'
                    : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200',
                ].join(' ')}
              >
                {tab.label}
              </Link>
            ))}
            <div className="my-1.5 h-px bg-neutral-800/60" />
            <Link
              href="/me"
              onClick={closeMenu}
              className={[
                'flex items-center px-3 py-3 rounded-xl text-sm transition-colors',
                isActive('/me')
                  ? 'bg-neutral-800 text-neutral-100 font-medium'
                  : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200',
              ].join(' ')}
            >
              Personale
            </Link>
          </nav>
        </div>
      )}
    </>
  )
}
