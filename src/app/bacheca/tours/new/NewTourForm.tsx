'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createTour } from '../actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GenrePills } from '@/components/profile/GenrePills'
import { parseISO, differenceInDays } from 'date-fns'
import type { Genre } from '@/types'

interface Props {
  genres: Genre[]
}

const STEPS = ['Info base', 'Slot', 'Generi', 'Foto'] as const

interface Step1 {
  title: string
  city: string
  role_needed: 'photographer' | 'model' | ''
  location_available: boolean
  location_description: string
  location_address: string
  start_date: string
  end_date: string
  hourly_rate: string
}

interface Step2 {
  slot_duration_hours: string
  morning_slots: string
  afternoon_slots: string
  morning_start: string
  lunch_start: string
  lunch_end: string
  afternoon_end: string
  break_minutes: string
}

const DEFAULT_S1: Step1 = {
  title: '',
  city: '',
  role_needed: '',
  location_available: false,
  location_description: '',
  location_address: '',
  start_date: '',
  end_date: '',
  hourly_rate: '',
}

const DEFAULT_S2: Step2 = {
  slot_duration_hours: '2',
  morning_slots: '2',
  afternoon_slots: '2',
  morning_start: '09:00',
  lunch_start: '13:00',
  lunch_end: '14:00',
  afternoon_end: '18:00',
  break_minutes: '30',
}

function numDays(s1: Step1): number {
  if (!s1.start_date || !s1.end_date) return 0
  try {
    return differenceInDays(parseISO(s1.end_date), parseISO(s1.start_date)) + 1
  } catch { return 0 }
}

function slotCount(s2: Step2, days: number) {
  const perDay = (parseInt(s2.morning_slots) || 0) + (parseInt(s2.afternoon_slots) || 0)
  return { perDay, total: perDay * days }
}

export function NewTourForm({ genres }: Props) {
  const [step, setStep] = useState(0)
  const [s1, setS1] = useState<Step1>(DEFAULT_S1)
  const [s2, setS2] = useState<Step2>(DEFAULT_S2)
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitBlocked, setSubmitBlocked] = useState(false)

  // Map: update src only on blur to avoid iframe flashing on every keystroke
  const [mapQuery, setMapQuery] = useState('')

  const supabaseRef = useRef(createClient())

  function set1<K extends keyof Step1>(k: K, v: Step1[K]) {
    setS1((p) => ({ ...p, [k]: v }))
  }
  function set2<K extends keyof Step2>(k: K, v: Step2[K]) {
    setS2((p) => ({ ...p, [k]: v }))
  }

  function toggleGenre(id: string) {
    setSelectedGenreIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])
  }

  function handleImages(files: FileList | null) {
    if (!files) return
    const newFiles = Array.from(files).slice(0, 5 - imageFiles.length)
    setImageFiles((p) => [...p, ...newFiles])
    setImagePreviews((p) => [...p, ...newFiles.map((f) => URL.createObjectURL(f))])
  }

  function removeImage(i: number) {
    setImageFiles((p) => p.filter((_, idx) => idx !== i))
    setImagePreviews((p) => p.filter((_, idx) => idx !== i))
  }

  function canProceed(): boolean {
    if (step === 0) {
      const locationOk = !s1.location_available || (
        s1.location_description.trim().length >= 2 &&
        s1.location_address.trim().length >= 2
      )
      return (
        s1.title.trim().length >= 2 &&
        s1.city.trim().length >= 2 &&
        s1.role_needed !== '' &&
        !!s1.start_date &&
        !!s1.end_date &&
        s1.end_date >= s1.start_date &&
        !!s1.hourly_rate &&
        parseInt(s1.hourly_rate) > 0 &&
        locationOk
      )
    }
    if (step === 1) {
      return (
        parseInt(s2.slot_duration_hours) > 0 &&
        (parseInt(s2.morning_slots) > 0 || parseInt(s2.afternoon_slots) > 0)
      )
    }
    if (step === 2) return selectedGenreIds.length >= 1
    return imageFiles.length >= 1
  }

  async function handleSubmit() {
    if (imageFiles.length === 0) {
      setSubmitBlocked(true)
      setTimeout(() => setSubmitBlocked(false), 3000)
      return
    }
    setLoading(true)
    setError(null)

    try {
      const supabase = supabaseRef.current
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessione scaduta.')

      const ts = Date.now()
      const imageUrls: string[] = []
      for (let i = 0; i < imageFiles.length; i++) {
        const ext = imageFiles[i].name.split('.').pop()
        const path = `${user.id}/${ts}-${i}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('tours')
          .upload(path, imageFiles[i], { cacheControl: '3600', upsert: false })
        if (upErr) throw new Error(upErr.message)
        const { data } = supabase.storage.from('tours').getPublicUrl(path)
        imageUrls.push(data.publicUrl)
      }

      // Pack location description + address into a single JSON for the DB column
      const locationValue = s1.location_available
        ? JSON.stringify({ description: s1.location_description.trim(), address: s1.location_address.trim() })
        : null

      const result = await createTour({
        title: s1.title.trim(),
        city: s1.city.trim(),
        role_needed: s1.role_needed as 'photographer' | 'model',
        location_available: s1.location_available,
        location: locationValue,
        start_date: s1.start_date,
        end_date: s1.end_date,
        hourly_rate: parseInt(s1.hourly_rate),
        genre_ids: selectedGenreIds,
        slot_duration_hours: parseInt(s2.slot_duration_hours),
        morning_slots: parseInt(s2.morning_slots) || 0,
        afternoon_slots: parseInt(s2.afternoon_slots) || 0,
        morning_start: s2.morning_start,
        lunch_start: s2.lunch_start,
        lunch_end: s2.lunch_end,
        afternoon_end: s2.afternoon_end,
        break_minutes: parseInt(s2.break_minutes) || 0,
        image_urls: imageUrls,
      })

      if (result?.error) setError(result.error)
    } catch (err) {
      // Next.js redirect() throws a special NEXT_REDIRECT error — let it propagate for navigation
      if (
        err !== null &&
        typeof err === 'object' &&
        'digest' in err &&
        typeof (err as { digest: unknown }).digest === 'string' &&
        (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
      ) throw err
      setError(err instanceof Error ? err.message : 'Errore imprevisto.')
    } finally {
      setLoading(false)
    }
  }

  const fieldCls = 'w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20'

  // Economic preview (computed in step 1 but needs hourly_rate from step 0)
  const days = numDays(s1)
  const { perDay, total } = slotCount(s2, days)
  const rate = parseInt(s1.hourly_rate) || 0
  const dur = parseInt(s2.slot_duration_hours) || 0
  const potentialEarnings = total * dur * rate

  return (
    <div className="space-y-8">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((_, i) => (
          <div key={i} className={['h-1 flex-1 rounded-full transition-colors', i <= step ? 'bg-white' : 'bg-neutral-800'].join(' ')} />
        ))}
      </div>
      <p className="text-xs text-neutral-500 text-right">
        Step {step + 1} di {STEPS.length} — {STEPS[step]}
      </p>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ── STEP 0: Info base ── */}
      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Info base</h2>

          {/* Chi stai cercando? */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">
              A chi è rivolto? <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              {(['photographer', 'model'] as const).map((role) => {
                const label = role === 'photographer' ? 'Fotograf*' : 'Modell*'
                const active = s1.role_needed === role
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => set1('role_needed', role)}
                    className={[
                      'flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors',
                      active
                        ? role === 'photographer'
                          ? 'border-blue-500/60 bg-blue-500/15 text-blue-300'
                          : 'border-violet-500/60 bg-violet-500/15 text-violet-300'
                        : 'border-neutral-700 bg-neutral-900 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <Input
            label="Titolo dell'evento"
            value={s1.title}
            onChange={(e) => set1('title', e.target.value)}
            placeholder="es. Milano aprile 2026, Foto Fair Roma..."
          />

          <Input
            label="Città"
            value={s1.city}
            onChange={(e) => set1('city', e.target.value)}
            placeholder="Milano"
          />

          {/* Location toggle */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => set1('location_available', !s1.location_available)}
                className={[
                  'w-10 h-6 rounded-full transition-colors relative shrink-0',
                  s1.location_available ? 'bg-white' : 'bg-neutral-700',
                ].join(' ')}
              >
                <div className={[
                  'absolute top-1 w-4 h-4 bg-neutral-900 rounded-full transition-transform',
                  s1.location_available ? 'translate-x-5' : 'translate-x-1',
                ].join(' ')} />
              </div>
              <span className="text-sm text-neutral-300">Dettagli della location (se disponibile)</span>
            </label>

            {s1.location_available && (
              <div className="space-y-3 pl-1">
                {/* Descrizione */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-300">
                    Descrizione location <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={s1.location_description}
                    onChange={(e) => set1('location_description', e.target.value)}
                    placeholder="Studio privato con luce naturale, ciclorama bianco, zona trucco…"
                    rows={2}
                    className={fieldCls + ' resize-none'}
                  />
                </div>

                {/* Indirizzo */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-300">
                    Indirizzo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={s1.location_address}
                    onChange={(e) => set1('location_address', e.target.value)}
                    onBlur={(e) => {
                      const v = e.target.value.trim()
                      if (v.length > 4) setMapQuery(v)
                    }}
                    placeholder="Via Roma 1, Milano"
                    className={fieldCls}
                  />
                </div>

                {/* Mappa */}
                {mapQuery && (
                  <div className="rounded-xl overflow-hidden border border-neutral-700 h-44">
                    <iframe
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed&hl=it&z=15`}
                      className="w-full h-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Data inizio</label>
              <input type="date" value={s1.start_date} onChange={(e) => set1('start_date', e.target.value)} className={fieldCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Data fine</label>
              <input type="date" value={s1.end_date} min={s1.start_date || undefined} onChange={(e) => set1('end_date', e.target.value)} className={fieldCls} />
            </div>
          </div>

          {/* Cachet */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-300">Cachet orario (€/h)</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={s1.hourly_rate}
              onChange={(e) => set1('hourly_rate', e.target.value)}
              placeholder="150"
              className={fieldCls}
            />
          </div>
        </div>
      )}

      {/* ── STEP 1: Preferenze slot ── */}
      {step === 1 && (
        <div className="space-y-5">
          <h2 className="text-lg font-medium">Preferenze slot</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Durata shooting (ore)</label>
              <input type="number" inputMode="numeric" min={1} max={8} value={s2.slot_duration_hours} onChange={(e) => set2('slot_duration_hours', e.target.value)} className={fieldCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Pausa tra slot (min)</label>
              <input type="number" inputMode="numeric" min={0} value={s2.break_minutes} onChange={(e) => set2('break_minutes', e.target.value)} className={fieldCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Shooting mattina</label>
              <input type="number" inputMode="numeric" min={0} max={6} value={s2.morning_slots} onChange={(e) => set2('morning_slots', e.target.value)} className={fieldCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Shooting pomeriggio</label>
              <input type="number" inputMode="numeric" min={0} max={6} value={s2.afternoon_slots} onChange={(e) => set2('afternoon_slots', e.target.value)} className={fieldCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Inizio mattina</label>
              <input type="time" value={s2.morning_start} onChange={(e) => set2('morning_start', e.target.value)} className={fieldCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Fine pomeriggio</label>
              <input type="time" value={s2.afternoon_end} onChange={(e) => set2('afternoon_end', e.target.value)} className={fieldCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Pausa pranzo dalle</label>
              <input type="time" value={s2.lunch_start} onChange={(e) => set2('lunch_start', e.target.value)} className={fieldCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">alle</label>
              <input type="time" value={s2.lunch_end} min={s2.lunch_start} onChange={(e) => set2('lunch_end', e.target.value)} className={fieldCls} />
            </div>
          </div>

          {/* Anteprima + guadagno */}
          {days > 0 && perDay > 0 && (
            <div className="rounded-xl border border-neutral-700 bg-neutral-900/60 px-4 py-4 space-y-3">
              <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium">Anteprima</p>

              <div className="flex items-baseline justify-between">
                <p className="text-sm text-neutral-400">Slot totali</p>
                <p className="text-sm font-semibold text-neutral-100">
                  {perDay} slot/giorno × {days} {days === 1 ? 'giorno' : 'giorni'} = <span className="text-white">{total} slot</span>
                </p>
              </div>

              {rate > 0 && dur > 0 && (
                <>
                  <div className="h-px bg-neutral-800" />
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm text-neutral-400">Potenziale guadagno</p>
                    <p className="text-base font-bold text-emerald-400">
                      €{potentialEarnings.toLocaleString('it-IT')}
                    </p>
                  </div>
                  <p className="text-[11px] text-neutral-600">
                    {total} slot × {dur}h × €{rate}/h — se tutti confermati
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Generi ── */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-medium">Generi</h2>
            <p className="text-sm text-neutral-400 mt-1">Seleziona i generi fotografici per questo evento.</p>
          </div>
          <GenrePills genres={genres} selected={selectedGenreIds} onToggle={toggleGenre} />
          {selectedGenreIds.length === 0 && (
            <p className="text-xs text-neutral-600">Seleziona almeno un genere per continuare.</p>
          )}
        </div>
      )}

      {/* ── STEP 3: Foto ── */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-medium">Foto dell'evento</h2>
            <p className="text-sm text-neutral-400 mt-1">Fino a 5 foto. La prima sarà la cover. Almeno 1 obbligatoria.</p>
          </div>

          <div className="flex items-center justify-between">
            <span className={['text-sm font-medium', imageFiles.length > 0 ? 'text-emerald-400' : 'text-neutral-500'].join(' ')}>
              {imageFiles.length}/5 foto {imageFiles.length > 0 && '✓'}
            </span>
            {imageFiles.length === 0 && <span className="text-xs text-neutral-600">Almeno 1 richiesta</span>}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {imagePreviews.map((src, i) => (
              <div key={i} className={['relative aspect-square rounded-lg overflow-hidden border', i === 0 ? 'border-white/30' : 'border-neutral-700'].join(' ')}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
                {i === 0 && (
                  <span className="absolute top-1 left-1 text-[10px] bg-white text-black rounded px-1 font-semibold">Cover</span>
                )}
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 bg-black/60 rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-black/80 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
            {imageFiles.length < 5 && (
              <label className="aspect-square rounded-lg border border-dashed border-neutral-700 hover:border-neutral-500 cursor-pointer transition-colors flex items-center justify-center">
                <span className="text-2xl text-neutral-600">+</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImages(e.target.files)} />
              </label>
            )}
          </div>

          {submitBlocked && (
            <p className="text-xs text-amber-400 text-center">Carica almeno 1 foto per continuare</p>
          )}
        </div>
      )}

      {/* Nav */}
      <div className="flex gap-3 pt-2">
        {step > 0 && (
          <Button variant="secondary" onClick={() => setStep((s) => s - 1)} disabled={loading} className="flex-1">
            Indietro
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()} className="flex-1">
            Avanti
          </Button>
        ) : (
          <Button onClick={handleSubmit} loading={loading} disabled={loading} className="flex-1">
            {loading ? 'Pubblicazione…' : 'Pubblica evento'}
          </Button>
        )}
      </div>
    </div>
  )
}
