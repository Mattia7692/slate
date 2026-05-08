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
    <main className="min-h-screen flex items-center justify-center px-4 py-8 sm:py-16">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8 sm:mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Slate" className="h-12 w-auto mx-auto mix-blend-screen mb-5" />
          <p className="text-sm text-neutral-400">
            Completa il tuo profilo per essere approvato dal team.
          </p>
        </div>
        <OnboardingForm />
      </div>
    </main>
  )
}
