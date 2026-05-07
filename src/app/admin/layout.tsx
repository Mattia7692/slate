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
      <header className="border-b border-neutral-800 px-5 h-12 flex items-center justify-between shrink-0">
        <span className="text-sm font-medium tracking-tight">
          Slate <span className="text-neutral-600 font-normal">/ Admin</span>
        </span>
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
      <div className="flex flex-1 min-h-[calc(100vh-48px)]">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 border-r border-neutral-800 bg-neutral-950 p-4 flex flex-col">
          <div className="mb-4">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-500 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Area admin
            </span>
          </div>
          <AdminSidebar pendingApplications={pendingApplications ?? 0} />
          <p className="text-[10px] text-neutral-700 mt-auto pt-4">v1 — area riservata</p>
        </aside>

        {/* Contenuto principale */}
        <main className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </main>
      </div>
    </div>
  )
}
