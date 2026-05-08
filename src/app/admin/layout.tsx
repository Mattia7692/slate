import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminSidebar } from './AdminSidebar'
import { AdminHeader } from './AdminHeader'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin()

  const admin = createAdminClient()
  const { count: pendingApplications } = await admin
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">

      {/* Topbar + mobile dropdown */}
      <AdminHeader
        email={user.email ?? ''}
        pendingApplications={pendingApplications ?? 0}
      />

      {/* Body */}
      <div className="flex flex-1">

        {/* Sidebar: solo desktop */}
        <aside className="hidden md:flex w-52 shrink-0 border-r border-neutral-200 bg-white flex-col p-4">
          <div className="mb-4">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-600 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Area admin
            </span>
          </div>
          <AdminSidebar pendingApplications={pendingApplications ?? 0} />
          <p className="text-[10px] text-neutral-400 mt-auto pt-4">v1 — area riservata</p>
        </aside>

        {/* Contenuto principale */}
        <main className="flex-1 overflow-y-auto px-4 md:px-6 py-5 text-neutral-900">
          {children}
        </main>
      </div>
    </div>
  )
}
