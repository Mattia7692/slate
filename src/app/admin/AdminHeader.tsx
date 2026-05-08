'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/auth/actions'

const NAV_ITEMS = [
  { label: 'Gestione profili',    href: '/admin',                    exact: true },
  { label: 'Candidature',         href: '/admin/applications',        exact: false },
  { label: 'Codici invito',       href: '/admin/invite-codes',        exact: false },
  { label: 'Progetti',            href: '/admin/projects',            exact: false },
  { label: 'Monitoraggio chat',   href: '/admin/messages',            exact: false },
  { label: 'Anteprima onboarding',href: '/admin/onboarding-preview',  exact: false },
]

interface Props {
  email: string
  pendingApplications: number
}

export function AdminHeader({ email, pendingApplications }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <>
      {/* ── TOPBAR ─────────────────────────────────────────────── */}
      <header className="bg-white border-b border-neutral-200 px-4 md:px-5 h-34 md:h-32 flex items-center justify-between shrink-0">

        {/* Logo + badge */}
        <div className="flex items-center gap-3">
          <Link href="/admin" onClick={() => setMenuOpen(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Slate" className="h-30 md:h-24 w-auto invert mix-blend-multiply" />
          </Link>
          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Admin
          </span>
        </div>

        {/* Desktop: email + logout */}
        <div className="hidden md:flex items-center gap-4">
          <span className="text-xs text-neutral-400">{email}</span>
          <form action={logout}>
            <button
              type="submit"
              className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
            >
              Esci
            </button>
          </form>
        </div>

        {/* Mobile: hamburger */}
        <button
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
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
      </header>

      {/* ── MOBILE DROPDOWN ────────────────────────────────────── */}
      {menuOpen && (
        <div className="md:hidden bg-white border-b border-neutral-200">

          {/* Email + logout */}
          <div className="px-5 py-3 flex items-center justify-between border-b border-neutral-100">
            <span className="text-xs text-neutral-500 truncate">{email}</span>
            <form action={logout}>
              <button
                type="submit"
                className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer ml-4 shrink-0"
              >
                Esci
              </button>
            </form>
          </div>

          {/* Nav */}
          <nav className="px-3 py-3 flex flex-col gap-0.5">
            <div className="px-3 py-2 mb-0.5">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-600 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Area admin
              </span>
            </div>
            {NAV_ITEMS.map(({ label, href, exact }) => {
              const active = isActive(href, exact)
              const badge = href === '/admin/applications' && pendingApplications > 0
                ? pendingApplications
                : undefined
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={[
                    'flex items-center gap-2 px-3 py-3 rounded-xl text-sm transition-colors',
                    active
                      ? 'bg-amber-50 text-amber-900 font-medium'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900',
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
        </div>
      )}
    </>
  )
}
