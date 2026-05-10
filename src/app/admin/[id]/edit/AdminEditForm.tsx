'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { adminUpdateProfile, adminUpdateProfileGenres, adminUpdateMeasurements, awardFounderXp } from './actions'
import { AdminAvatarUpload } from './AdminAvatarUpload'
import { GenrePills } from '@/components/profile/GenrePills'
import type { Profile, Genre } from '@/types'

export function AdminEditForm({
  profile,
  isFounder,
  genres,
  currentGenreIds,
  email,
}: {
  profile: Profile
  isFounder: boolean
  genres: Genre[]
  currentGenreIds: string[]
  email: string | null
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Generi
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>(currentGenreIds)
  const [genresPending, setGenresPending] = useState(false)
  const [genresFeedback, setGenresFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  function toggleGenre(id: string) {
    setSelectedGenreIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])
    setGenresFeedback(null)
  }

  function handleSaveGenres() {
    setGenresPending(true)
    setGenresFeedback(null)
    adminUpdateProfileGenres(profile.id, selectedGenreIds).then((res) => {
      setGenresPending(false)
      setGenresFeedback(res.error
        ? { ok: false, msg: res.error }
        : { ok: true, msg: 'Generi aggiornati.' }
      )
    })
  }

  // Misure
  const [mHeight, setMHeight] = useState(String(profile.height_cm ?? ''))
  const [mBust, setMBust] = useState(String(profile.bust_cm ?? ''))
  const [mWaist, setMWaist] = useState(String(profile.waist_cm ?? ''))
  const [mHips, setMHips] = useState(String(profile.hips_cm ?? ''))
  const [mClothing, setMClothing] = useState(profile.clothing_size ?? '')
  const [mShoe, setMShoe] = useState(profile.shoe_size ?? '')
  const [mHairColor, setMHairColor] = useState(profile.hair_color ?? '')
  const [mHairTexture, setMHairTexture] = useState(profile.hair_texture ?? '')
  const [mEyeColor, setMEyeColor] = useState(profile.eye_color ?? '')
  const [measurementsPending, setMeasurementsPending] = useState(false)
  const [measurementsFeedback, setMeasurementsFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  function handleSaveMeasurements() {
    const parseIntOrNull = (v: string) => { const n = parseInt(v); return isNaN(n) || n <= 0 ? null : n }
    const parseStrOrNull = (v: string) => v.trim() || null
    setMeasurementsPending(true)
    setMeasurementsFeedback(null)
    adminUpdateMeasurements(profile.id, {
      height_cm: parseIntOrNull(mHeight),
      bust_cm: parseIntOrNull(mBust),
      waist_cm: parseIntOrNull(mWaist),
      hips_cm: parseIntOrNull(mHips),
      clothing_size: parseStrOrNull(mClothing),
      shoe_size: parseStrOrNull(mShoe),
      hair_color: parseStrOrNull(mHairColor),
      hair_texture: parseStrOrNull(mHairTexture),
      eye_color: parseStrOrNull(mEyeColor),
    }).then((res) => {
      setMeasurementsPending(false)
      setMeasurementsFeedback(res.error
        ? { ok: false, msg: res.error }
        : { ok: true, msg: 'Misure aggiornate.' }
      )
    })
  }

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

      {/* ── AVATAR ──────────────────────────────────── */}
      <AdminAvatarUpload
        profileId={profile.id}
        avatarUrl={profile.avatar_url ?? null}
        fullName={profile.full_name}
        role={profile.role}
      />

      {/* ── PROFILO: nome, bio, città, instagram, tariffa ── */}
      <form
        action={(formData) => {
          setError(null)
          startTransition(async () => {
            const result = await adminUpdateProfile(profile.id, formData)
            if (result?.error) setError(result.error)
          })
        }}
        className="space-y-10"
      >
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <section className="space-y-4">
          <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Profilo</h2>

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
          <Input
            label="Tariffa oraria (€/h)"
            name="hourly_rate"
            type="number"
            min={1}
            defaultValue={profile.hourly_rate ?? undefined}
            placeholder="es. 150"
          />
        </section>

        {/* ── ANAGRAFICA: anno carriera, XP, email ────── */}
        <section className="space-y-4">
          <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Anagrafica</h2>

          <Input
            label="Anno di inizio carriera"
            name="career_start_year"
            type="number"
            min={1950}
            max={new Date().getFullYear()}
            defaultValue={(profile as Profile & { career_start_year?: number | null }).career_start_year ?? undefined}
            hint={`Anni nel settore: ${(profile as Profile & { career_start_year?: number | null }).career_start_year ? new Date().getFullYear() - (profile as Profile & { career_start_year: number }).career_start_year : profile.years_in_industry}`}
          />

          <Input
            label="XP (valore assoluto)"
            name="xp"
            type="number"
            min={0}
            defaultValue={profile.xp}
            hint="Modifica manuale degli XP. Il livello verrà ricalcolato automaticamente."
          />

          {/* Email — sola lettura */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-300">
              Email
              <span className="ml-2 text-[10px] font-normal text-neutral-600 uppercase tracking-wide">sola lettura</span>
            </label>
            <div className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-500 select-all">
              {email ?? '—'}
            </div>
          </div>
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

      {/* ── GENERI ──────────────────────────────────── */}
      {genres.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Generi</h2>
          <GenrePills
            genres={genres}
            selected={selectedGenreIds}
            onToggle={toggleGenre}
          />
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveGenres}
              loading={genresPending}
              disabled={genresPending}
            >
              Salva generi
            </Button>
            {genresFeedback && (
              <p className={['text-xs font-medium', genresFeedback.ok ? 'text-emerald-400' : 'text-red-400'].join(' ')}>
                {genresFeedback.msg}
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── MISURE — solo modelle ───────────────────── */}
      {profile.role === 'model' && (
        <section className="space-y-4">
          <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Misure</h2>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-300">Altezza (cm)</label>
            <input type="number" inputMode="numeric" min={100} max={220} value={mHeight} onChange={(e) => setMHeight(e.target.value)} placeholder="160"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-300">Misure (seno / vita / fianchi in cm)</label>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" inputMode="numeric" min={50} max={150} value={mBust} onChange={(e) => setMBust(e.target.value)} placeholder="90"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20" />
              <input type="number" inputMode="numeric" min={50} max={150} value={mWaist} onChange={(e) => setMWaist(e.target.value)} placeholder="60"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20" />
              <input type="number" inputMode="numeric" min={50} max={150} value={mHips} onChange={(e) => setMHips(e.target.value)} placeholder="90"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Taglia abiti</label>
              <input type="text" value={mClothing} onChange={(e) => setMClothing(e.target.value)} placeholder="36, 38, 40…"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Numero di scarpe</label>
              <input type="text" value={mShoe} onChange={(e) => setMShoe(e.target.value)} placeholder="38, 39, 40…"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Colore capelli</label>
              <input type="text" value={mHairColor} onChange={(e) => setMHairColor(e.target.value)} placeholder="castani, biondi, neri, rossi…"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Struttura capelli</label>
              <input type="text" value={mHairTexture} onChange={(e) => setMHairTexture(e.target.value)} placeholder="lisci, mossi, ricci…"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-300">Colore occhi</label>
            <input type="text" value={mEyeColor} onChange={(e) => setMEyeColor(e.target.value)} placeholder="marroni, verdi, azzurri…"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20" />
          </div>

          <div className="flex items-center gap-4">
            <Button type="button" variant="secondary" onClick={handleSaveMeasurements} loading={measurementsPending} disabled={measurementsPending}>
              Salva misure
            </Button>
            {measurementsFeedback && (
              <p className={['text-xs font-medium', measurementsFeedback.ok ? 'text-emerald-400' : 'text-red-400'].join(' ')}>
                {measurementsFeedback.msg}
              </p>
            )}
          </div>
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
