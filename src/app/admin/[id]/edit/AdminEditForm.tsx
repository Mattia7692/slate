'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { adminUpdateProfile, awardFounderXp } from './actions'
import type { Profile } from '@/types'

export function AdminEditForm({
  profile,
  isFounder,
}: {
  profile: Profile
  isFounder: boolean
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // XP bonus widget
  const [xpDelta, setXpDelta] = useState<string>('')
  const [xpPending, setXpPending] = useXpTransition()
  const [xpFeedback, setXpFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const currentXp = profile.xp
  const parsedDelta = parseInt(xpDelta) || 0
  const previewXp = Math.max(0, currentXp + parsedDelta)

  function handleAwardXp() {
    if (!parsedDelta) return
    setXpFeedback(null)
    setXpPending(true)
    awardFounderXp(profile.id, parsedDelta).then((result) => {
      setXpPending(false)
      if (result.error) {
        setXpFeedback({ ok: false, msg: result.error })
      } else {
        setXpFeedback({ ok: true, msg: `+${parsedDelta} XP assegnati. Nuovo totale: ${result.newXp} XP` })
        setXpDelta('')
      }
    })
  }

  return (
    <div className="space-y-10">
      {/* ── FORM PRINCIPALE ─────────────────────────── */}
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

          <Input label="Città" name="city" defaultValue={profile.city ?? ''} />
          <Input label="Instagram" name="instagram_url" defaultValue={profile.instagram_url ?? ''} placeholder="@username" />
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
            label="XP (valore assoluto)"
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

      {/* ── BONUS XP — solo Founder ──────────────────── */}
      {isFounder && (
        <section className="space-y-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div>
            <h2 className="text-xs font-medium text-amber-400 uppercase tracking-wider">
              ✦ Assegna bonus XP
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              XP attuali: <span className="text-white font-medium">{currentXp}</span>
            </p>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Delta XP</label>
              <input
                type="number"
                value={xpDelta}
                onChange={(e) => { setXpDelta(e.target.value); setXpFeedback(null) }}
                placeholder="es. +100 o -50"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:border-amber-500/40 focus:ring-amber-500/10"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleAwardXp}
              disabled={!parsedDelta || xpPending}
              loading={xpPending}
            >
              Assegna
            </Button>
          </div>

          {parsedDelta !== 0 && !xpFeedback && (
            <p className="text-xs text-neutral-500">
              Risultato: {currentXp} → <span className={parsedDelta > 0 ? 'text-emerald-400' : 'text-red-400'}>{previewXp} XP</span>
            </p>
          )}

          {xpFeedback && (
            <p className={['text-xs font-medium', xpFeedback.ok ? 'text-emerald-400' : 'text-red-400'].join(' ')}>
              {xpFeedback.msg}
            </p>
          )}
        </section>
      )}
    </div>
  )
}

// Micro-hook per il pending state del bonus XP
function useXpTransition(): [boolean, (v: boolean) => void] {
  const [v, setV] = useState(false)
  return [v, setV]
}
