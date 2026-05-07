'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { adminUpdateProfile } from './actions'
import type { Profile } from '@/types'

export function AdminEditForm({ profile }: { profile: Profile }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <form
      action={(formData) => {
        setError(null)
        startTransition(async () => {
          const result = await adminUpdateProfile(profile.id, formData)
          if (result?.error) setError(result.error)
        })
      }}
      className="space-y-6"
    >
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Informazioni</h2>

        <Input
          label="Nome completo"
          name="full_name"
          defaultValue={profile.full_name}
          required
          minLength={2}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-300">Bio</label>
          <textarea
            name="bio"
            defaultValue={profile.bio ?? ''}
            rows={4}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20 resize-none"
          />
        </div>

        <Input
          label="Città"
          name="city"
          defaultValue={profile.city ?? ''}
        />

        <Input
          label="Instagram"
          name="instagram_url"
          defaultValue={profile.instagram_url ?? ''}
          placeholder="@username"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Dati piattaforma</h2>

        <Input
          label="Anni di esperienza"
          name="years_in_industry"
          type="number"
          min={0}
          max={60}
          defaultValue={profile.years_in_industry}
        />

        <Input
          label="XP"
          name="xp"
          type="number"
          min={0}
          defaultValue={profile.xp}
          hint="Modifica manuale degli XP. Il livello verrà ricalcolato automaticamente."
        />
      </section>

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={isPending}>
          Salva modifiche
        </Button>
      </div>
    </form>
  )
}
