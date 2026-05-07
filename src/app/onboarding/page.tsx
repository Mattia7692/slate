import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingForm } from './OnboardingForm'

export default async function OnboardingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Se il profilo esiste già, vai alla dashboard
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (profile) redirect('/dashboard')

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Benvenuto su Slate</h1>
          <p className="text-sm text-neutral-400">
            Completa il tuo profilo per essere approvato dal team.
          </p>
        </div>
        <OnboardingForm />
      </div>
    </main>
  )
}
