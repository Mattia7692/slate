'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createTour } from '../actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GenrePills } from '@/components/profile/GenrePills'
import { eachDayOfInterval, parseISO, differenceInDays } from 'date-fns'
import type { Genre } from '@/types'

interface Props {
  genres: Genre[]
}

const STEPS = ['Info base', 'Slot', 'Generi', 'Foto'] as const

interface Step1 {
  title: string
  city: string
  location_available: boolean
  location: string
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
  location_available: false,
  location: '',
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

function slotPreview(s1: Step1, s2: Step2): string {
  const days = numDays(s1)
  if (days <= 0) return ''
  const perDay = (parseInt(s2.morning_slots) || 0) + (parseInt(s2.afternoon_slots) || 0)
  const total = perDay * days
  return `${perDay} slot/giorno × ${days} ${days === 1 ? 'giorno' : 'giorni'} = ${total} slot totali`
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
      return (
        s1.title.trim().length >= 2 &&
        s1.city.trim().length >= 2 &&
        !!s1.start_date &&
        !!s1.end_date &&
        s1.end_date >= s1.start_date &&
        !!s1.hourly_rate &&
        parseInt(s1.hourly_rate) > 0
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

      const result = await createTour({
        title: s1.title.trim(),
        city: s1.city.trim(),
        location_available: s1.location_available,
        location: s1.location_available ? s1.location.trim() || null : null,
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
      setError(err instanceof Error ? err.message : 'Errore imprevisto.')
    } finally {
      setLoading(false)
    }
  }

  const fieldCls = 'w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20'

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

          <Input
            label="Titolo del tour"
            value={s1.title}
            onChange={(e) => set1('title', e.target.value)}
            placeholder="Es. Milano Aprile 2026"
          />

          <Input
            label="Città"
            value={s1.city}
            onChange={(e) => set1('city', e.target.value)}
            placeholder="Milano"
          />

          {/* Location toggle */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer group">
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
              <span className="text-sm text-neutral-300">Ho una location disponibile</span>
            </label>
            {s1.location_available && (
              <textarea
                value={s1.location}
                onChange={(e) => set1('location', e.target.value)}
                placeholder="Descrivi la location (studio, spazio outdoor, indirizzo…)"
                rows={2}
                className={fieldCls + ' resize-none'}
              />
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

          {/* Anteprima */}
          {slotPreview(s1, s2) && (
            <div className="rounded-xl border border-neutral-700 bg-neutral-900/60 px-4 py-3">
              <p className="text-xs text-neutral-500">Anteprima slot</p>
              <p className="text-sm font-medium text-neutral-200 mt-1">{slotPreview(s1, s2)}</p>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Generi ── */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-medium">Generi</h2>
            <p className="text-sm text-neutral-400 mt-1">Seleziona i generi che sei disposta a scattare in questo tour.</p>
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
            <h2 className="text-lg font-medium">Foto del tour</h2>
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
            {loading ? 'Pubblicazione…' : 'Pubblica tour'}
          </Button>
        )}
      </div>
    </div>
  )
}
