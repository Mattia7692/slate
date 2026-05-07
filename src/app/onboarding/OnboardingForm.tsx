'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { createProfile } from './actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { computeSeniorityBonus } from '@/lib/xp'
import type { UserRole } from '@/types'

// ============================================================
// Tipi locali
// ============================================================

interface FormState {
  role: UserRole | null
  full_name: string
  bio: string
  city: string
  instagram_url: string
  years_in_industry: number
}

const INITIAL_STATE: FormState = {
  role: null,
  full_name: '',
  bio: '',
  city: '',
  instagram_url: '',
  years_in_industry: 0,
}

const STEPS = ['Ruolo', 'Profilo', 'Foto'] as const

// ============================================================
// Componente principale
// ============================================================

export function OnboardingForm({ preview = false }: { preview?: boolean }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [oldestPhotoFile, setOldestPhotoFile] = useState<File | null>(null)
  const [oldestPhotoPreview, setOldestPhotoPreview] = useState<string | null>(null)
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([])
  const [portfolioPreviews, setPortfolioPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewDone, setPreviewDone] = useState(false)

  const supabase = createClient()

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // --- Upload helpers ---

  function handleOldestPhoto(file: File | null) {
    if (!file) return
    setOldestPhotoFile(file)
    setOldestPhotoPreview(URL.createObjectURL(file))
  }

  function handlePortfolioFiles(files: FileList | null) {
    if (!files) return
    const newFiles = Array.from(files).slice(0, 10 - portfolioFiles.length)
    setPortfolioFiles((prev) => [...prev, ...newFiles])
    setPortfolioPreviews((prev) => [
      ...prev,
      ...newFiles.map((f) => URL.createObjectURL(f)),
    ])
  }

  function removePortfolioFile(index: number) {
    setPortfolioFiles((prev) => prev.filter((_, i) => i !== index))
    setPortfolioPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  async function uploadFile(file: File, bucket: string, path: string): Promise<string> {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })
    if (error) throw new Error(error.message)

    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  // --- Navigazione step ---

  function canProceed(): boolean {
    if (step === 0) return form.role !== null
    if (step === 1) return form.full_name.trim().length >= 2
    return true
  }

  // --- Submit finale ---

  async function handleSubmit() {
    if (preview) {
      setPreviewDone(true)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessione scaduta.')

      const uid = user.id
      const ts = Date.now()

      // Upload foto più vecchia
      let oldestPhotoUrl: string | null = null
      if (oldestPhotoFile) {
        const ext = oldestPhotoFile.name.split('.').pop()
        oldestPhotoUrl = await uploadFile(
          oldestPhotoFile,
          'oldest-photos',
          `${uid}/${ts}.${ext}`
        )
      }

      // Upload portfolio
      const portfolioUrls: string[] = []
      for (let i = 0; i < portfolioFiles.length; i++) {
        const file = portfolioFiles[i]
        const ext = file.name.split('.').pop()
        const url = await uploadFile(file, 'portfolio', `${uid}/${ts}-${i}.${ext}`)
        portfolioUrls.push(url)
      }

      // Crea il profilo via Server Action
      const result = await createProfile({
        role: form.role!,
        full_name: form.full_name,
        bio: form.bio,
        city: form.city,
        instagram_url: form.instagram_url,
        years_in_industry: form.years_in_industry,
        oldest_photo_url: oldestPhotoUrl,
        portfolio_urls: portfolioUrls,
      })

      if (result?.error) {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto.')
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // Render
  // ============================================================

  if (preview && previewDone) {
    return (
      <div className="space-y-6 text-center py-8">
        <p className="text-4xl">✓</p>
        <p className="text-lg font-medium">Anteprima completata</p>
        <p className="text-sm text-neutral-400">Nessun dato è stato salvato.</p>
        <button
          onClick={() => { setPreviewDone(false); setStep(0); setForm(INITIAL_STATE); setOldestPhotoFile(null); setOldestPhotoPreview(null); setPortfolioFiles([]); setPortfolioPreviews([]) }}
          className="text-sm text-neutral-400 hover:text-white underline transition-colors cursor-pointer"
        >
          Ricomincia dall&apos;inizio
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Banner anteprima */}
      {preview && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-400 text-center">
          Modalità anteprima — nessun dato verrà salvato
        </div>
      )}

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div
              className={[
                'h-1 flex-1 rounded-full transition-colors',
                i <= step ? 'bg-white' : 'bg-neutral-800',
              ].join(' ')}
            />
            {i === STEPS.length - 1 && null}
          </div>
        ))}
      </div>
      <p className="text-xs text-neutral-500 text-right">
        Step {step + 1} di {STEPS.length} — {STEPS[step]}
      </p>

      {/* Errore globale */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ---- STEP 0: Ruolo ---- */}
      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Qual è il tuo ruolo?</h2>
          <div className="grid grid-cols-2 gap-4">
            {(['photographer', 'model'] as const).map((role) => (
              <button
                key={role}
                onClick={() => set('role', role)}
                className={[
                  'flex flex-col items-center gap-3 rounded-xl border p-6 transition-colors cursor-pointer',
                  form.role === role
                    ? 'border-white bg-white/5'
                    : 'border-neutral-800 hover:border-neutral-600',
                ].join(' ')}
              >
                <span className="text-3xl">{role === 'photographer' ? '📷' : '🧍'}</span>
                <span className="text-sm font-medium">
                  {role === 'photographer' ? 'Fotografo' : 'Modella / Modello'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---- STEP 1: Profilo ---- */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Il tuo profilo</h2>

          <Input
            label="Nome completo"
            value={form.full_name}
            onChange={(e) => set('full_name', e.target.value)}
            placeholder="Mario Rossi"
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-300">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => set('bio', e.target.value)}
              placeholder="Racconta chi sei, il tuo stile, cosa cerchi..."
              rows={3}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20 resize-none"
            />
          </div>

          <Input
            label="Città"
            value={form.city}
            onChange={(e) => set('city', e.target.value)}
            placeholder="Milano"
          />

          <Input
            label="Instagram"
            value={form.instagram_url}
            onChange={(e) => set('instagram_url', e.target.value)}
            placeholder="@username"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-300">
              Anni di esperienza nel settore
            </label>
            <input
              type="number"
              min={0}
              max={50}
              value={form.years_in_industry}
              onChange={(e) => set('years_in_industry', parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20"
            />
            {form.years_in_industry > 0 && (
              <p className="text-xs text-neutral-500">
                Bonus anzianità:{' '}
                <span className="text-emerald-400 font-medium">
                  +{computeSeniorityBonus(form.years_in_industry)} XP
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* ---- STEP 2: Foto ---- */}
      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-lg font-medium">Le tue foto</h2>

          {/* Foto più vecchia */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-neutral-300">
              Foto più vecchia che possiedi
            </p>
            <p className="text-xs text-neutral-500">
              Serve per verificare il tuo bonus anzianità ({form.years_in_industry} anni →{' '}
              <span className="text-emerald-400">
                +{computeSeniorityBonus(form.years_in_industry)} XP
              </span>
              ).
            </p>

            {oldestPhotoPreview ? (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-neutral-700">
                <Image src={oldestPhotoPreview} alt="Foto anzianità" fill className="object-cover" />
                <button
                  onClick={() => { setOldestPhotoFile(null); setOldestPhotoPreview(null) }}
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-xs hover:bg-black/80 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 rounded-lg border border-dashed border-neutral-700 hover:border-neutral-500 cursor-pointer transition-colors">
                <span className="text-sm text-neutral-500">Clicca per caricare</span>
                <span className="text-xs text-neutral-600 mt-1">JPG, PNG, WebP — max 10MB</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleOldestPhoto(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>

          {/* Portfolio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-300">
                Portfolio / Book{' '}
                <span className="text-neutral-600 font-normal">(opzionale)</span>
              </p>
              <span className="text-xs text-neutral-600">{portfolioFiles.length}/10</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {portfolioPreviews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-neutral-700">
                  <Image src={src} alt={`Portfolio ${i + 1}`} fill className="object-cover" />
                  <button
                    onClick={() => removePortfolioFile(i)}
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-xs hover:bg-black/80 cursor-pointer leading-none"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {portfolioFiles.length < 10 && (
                <label className="aspect-square rounded-lg border border-dashed border-neutral-700 hover:border-neutral-500 cursor-pointer transition-colors flex items-center justify-center">
                  <span className="text-2xl text-neutral-600">+</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handlePortfolioFiles(e.target.files)}
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigazione */}
      <div className="flex gap-3 pt-2">
        {step > 0 && (
          <Button
            variant="secondary"
            onClick={() => setStep((s) => s - 1)}
            disabled={loading}
            className="flex-1"
          >
            Indietro
          </Button>
        )}

        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
            className="flex-1"
          >
            Avanti
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            loading={loading}
            className="flex-1"
          >
            {loading ? 'Caricamento...' : 'Invia profilo'}
          </Button>
        )}
      </div>
    </div>
  )
}
