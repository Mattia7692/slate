import Link from 'next/link'
import { signup } from '../actions'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface SignupPageProps {
  searchParams: Promise<{ error?: string; code?: string }>
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { error, code } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Slate" className="w-full h-auto mx-auto mix-blend-screen" />
          <p className="text-sm text-neutral-400">
            Crea il tuo account con un codice invito
          </p>
        </div>

        {/* Form */}
        <form action={signup} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <Input
            label="Codice invito"
            name="invite_code"
            type="text"
            required
            placeholder="es. SLATE-XXXX"
            defaultValue={code ?? ''}
            className="uppercase tracking-widest font-mono"
            hint="Il codice ti è stato inviato da un membro della community."
          />

          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="tu@esempio.com"
          />

          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
            hint="Minimo 8 caratteri."
            minLength={8}
          />

          <Button type="submit" className="w-full" size="lg">
            Crea account
          </Button>
        </form>

        {/* Disclaimer */}
        <p className="text-center text-xs text-neutral-600 leading-relaxed">
          Il tuo profilo sarà visibile solo dopo l&apos;approvazione manuale del team Slate.
        </p>

        {/* Footer */}
        <p className="text-center text-sm text-neutral-500">
          Hai già un account?{' '}
          <Link href="/auth/login" className="text-neutral-300 hover:text-white transition-colors">
            Accedi
          </Link>
        </p>
      </div>
    </main>
  )
}
