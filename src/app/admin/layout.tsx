import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { logout } from '@/app/auth/actions'
import { AdminSidebar } from './AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin()

  const admin = createAdminClient()
  const { count: pendingApplications } = await admin
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  return (
    <div className="min-h-screen flex flex-col">
      {/* Topbar */}
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between shrink-0">
        <Link href="/admin" className="text-sm font-semibold tracking-tight">
          Slate <span className="text-neutral-500 font-normal">/ Admin</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-xs text-neutral-600">{user.email}</span>
          <form action={logout}>
            <button
              type="submit"
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
            >
              Esci
            </button>
          </form>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-neutral-800 px-3 py-6 flex flex-col justify-between">
          <AdminSidebar pendingApplications={pendingApplications ?? 0} />
          <p className="text-xs text-neutral-700 px-3">v1 — area riservata</p>
        </aside>

        {/* Contenuto principale */}
        <main className="flex-1 overflow-y-auto px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
