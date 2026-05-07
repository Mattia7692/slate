import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NuovaVisioneForm } from './NuovaVisioneForm'

export default async function NuovaVisionePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('status, role')
    .eq('id', user.id)
    .single()

  if (profile?.status !== 'approved') redirect('/dashboard')

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center gap-4">
        <Link href="/bacheca" className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
          ← Bacheca
        </Link>
      </header>

      <div className="max-w-xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-xl font-semibold">Nuova visione</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Condividi un'idea, un progetto, uno stile. Chi è interessato ti contatterà.
          </p>
        </div>
        <NuovaVisioneForm currentRole={profile.role as 'photographer' | 'model'} />
      </div>
    </div>
  )
}
