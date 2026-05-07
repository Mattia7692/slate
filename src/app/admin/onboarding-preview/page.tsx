import { requireAdmin } from '@/lib/admin'
import { OnboardingForm } from '@/app/onboarding/OnboardingForm'

export default async function OnboardingPreviewPage() {
  await requireAdmin()

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8 space-y-1">
        <h1 className="text-xl font-semibold">Anteprima onboarding</h1>
        <p className="text-sm text-neutral-500">
          Visualizza il flusso di registrazione come lo vede un nuovo utente.
        </p>
      </div>
      <OnboardingForm preview />
    </div>
  )
}
