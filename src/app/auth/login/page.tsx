import Link from 'next/link'
import { login } from '../actions'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface LoginPageProps {
  searchParams: Promise<{ error?: string; next?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Slate</h1>
          <p className="text-sm text-neutral-400">Accedi al tuo account</p>
        </div>

        {/* Form */}
        <form action={login} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

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
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />

          <Button type="submit" className="w-full" size="lg">
            Accedi
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-neutral-500">
          Hai un codice invito?{' '}
          <Link href="/auth/signup" className="text-neutral-300 hover:text-white transition-colors">
            Registrati
          </Link>
        </p>
      </div>
    </main>
  )
}
