'use client'

import { useState, useRef } from 'react'
import { readPhotoExif } from '@/lib/exif'
import { createClient } from '@/lib/supabase/client'
import { createProfile } from './actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { computeSeniorityBonus, yearsFromStartYear } from '@/lib/xp'
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
  career_start_year: number | null
}

const INITIAL_STATE: FormState = {
  role: null,
  full_name: '',
  bio: '',
  city: '',
  instagram_url: '',
  career_start_year: null,
}

const STEPS = ['Ruolo', 'Profilo', 'Foto'] as const
const PORTFOLIO_MIN = 3
const PORTFOLIO_MAX = 10

// ============================================================
// Componente principale
// ============================================================

export function OnboardingForm({ preview = false }: { preview?: boolean }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(INITIAL_STATE)

  // Foto più vecchia
  const [oldestPhotoFile, setOldestPhotoFile] = useState<File | null>(null)
  const [oldestPhotoPreview, setOldestPhotoPreview] = useState<string | null>(null)
  const [oldestPhotoDate, setOldestPhotoDate] = useState<string | null>(null)
  const [oldestPhotoExif, setOldestPhotoExif] = useState<Record<string, unknown> | null>(null)

  // Foto profilo (avatar)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Portfolio
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([])
  const [portfolioPreviews, setPortfolioPreviews] = useState<string[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewDone, setPreviewDone] = useState(false)
  const [submitBlocked, setSubmitBlocked] = useState(false)

  const submitBtnRef = useRef<HTMLButtonElement>(null)
  const supabase = createClient()

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // --- Upload helpers ---

  async function handleOldestPhoto(file: File | null) {
    if (!file) return
    setOldestPhotoFile(file)
    setOldestPhotoPreview(URL.createObjectURL(file))
    setOldestPhotoDate(null)
    setOldestPhotoExif(null)
    const exif = await readPhotoExif(file)
    if (exif) {
      setOldestPhotoDate(exif.date)
      setOldestPhotoExif(exif as unknown as Record<string, unknown>)
    }
  }

  function handleAvatarPhoto(file: File | null) {
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  function handlePortfolioFiles(files: FileList | null) {
    if (!files) return
    const newFiles = Array.from(files).slice(0, PORTFOLIO_MAX - portfolioFiles.length)
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
    // Step 2: tutte e tre le sezioni devono essere complete
    return oldestPhotoFile !== null && avatarFile !== null && portfolioFiles.length >= PORTFOLIO_MIN
  }

  function handleSubmitClick() {
    if (portfolioFiles.length < PORTFOLIO_MIN) {
      setSubmitBlocked(true)
      setTimeout(() => setSubmitBlocked(false), 3000)
      return
    }
    handleSubmit()
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
        oldestPhotoUrl = await uploadFile(oldestPhotoFile, 'oldest-photos', `${uid}/${ts}.${ext}`)
      }

      // Upload foto profilo (avatar)
      let avatarUrl: string | null = null
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        avatarUrl = await uploadFile(avatarFile, 'avatars', `${uid}/${ts}-avatar.${ext}`)
      }

      // Upload portfolio
      const portfolioUrls: string[] = []
      for (let i = 0; i < portfolioFiles.length; i++) {
        const file = portfolioFiles[i]
        const ext = file.name.split('.').pop()
        const url = await uploadFile(file, 'portfolio', `${uid}/${ts}-${i}.${ext}`)
        portfolioUrls.push(url)
      }

      const result = await createProfile({
        role: form.role!,
        full_name: form.full_name,
        bio: form.bio,
        city: form.city,
        instagram_url: form.instagram_url,
        career_start_year: form.career_start_year,
        oldest_photo_url: oldestPhotoUrl,
        oldest_photo_date: oldestPhotoDate,
        oldest_photo_exif: oldestPhotoExif,
        avatar_url: avatarUrl,
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
          onClick={() => {
            setPreviewDone(false)
            setStep(0)
            setForm(INITIAL_STATE)
            setOldestPhotoFile(null)
            setOldestPhotoPreview(null)
            setAvatarFile(null)
            setAvatarPreview(null)
            setPortfolioFiles([])
            setPortfolioPreviews([])
          }}
          className="text-sm text-neutral-400 hover:text-white underline transition-colors cursor-pointer"
        >
          Ricomincia dall&apos;inizio
        </button>
      </div>
    )
  }

  const portfolioCount = portfolioFiles.length
  const portfolioReady = portfolioCount >= PORTFOLIO_MIN

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
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {(['photographer', 'model'] as const).map((role) => (
              <button
                key={role}
                onClick={() => set('role', role)}
                className={[
                  'flex flex-col items-center gap-3 rounded-xl border p-5 sm:p-6 transition-colors cursor-pointer',
                  form.role === role
                    ? 'border-white bg-white/5'
                    : 'border-neutral-800 hover:border-neutral-600',
                ].join(' ')}
              >
                <span className={[
                  'text-3xl font-bold',
                  role === 'photographer' ? 'text-sky-400' : 'text-rose-400',
                ].join(' ')}>
                  {role === 'photographer' ? 'F' : 'M'}
                </span>
                <span className={[
                  'text-sm font-semibold',
                  role === 'photographer' ? 'text-sky-300' : 'text-rose-300',
                ].join(' ')}>
                  {role === 'photographer' ? 'Fotografo' : 'Modell*'}
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
              Anno in cui hai iniziato a lavorare nel settore
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder={`es. ${new Date().getFullYear() - 5}`}
              value={form.career_start_year ?? ''}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '')
                if (raw === '') { set('career_start_year', null); return }
                const year = parseInt(raw)
                if (raw.length <= 4) set('career_start_year', year)
              }}
              maxLength={4}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20"
            />
            {form.career_start_year && form.career_start_year >= 1950 && form.career_start_year < new Date().getFullYear() && (() => {
              const years = yearsFromStartYear(form.career_start_year)
              return (
                <p className="text-xs text-neutral-500">
                  {years} {years === 1 ? 'anno' : 'anni'} nel settore ·{' '}
                  <span className="text-emerald-400 font-medium">
                    +{computeSeniorityBonus(years)} XP
                  </span>
                </p>
              )
            })()}
          </div>
        </div>
      )}

      {/* ---- STEP 2: Foto ---- */}
      {step === 2 && (
        <div className="space-y-8">

          {/* SEZIONE 1 — Foto più vecchia */}
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-medium">La tua foto più vecchia</h3>
              <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
                Carica la foto professionale più vecchia in cui hai posato o che hai scattato.
                La data di questa immagine serve a dare credibilità agli anni di esperienza che hai dichiarato.
                Siamo consapevoli che le date possono essere alterate — stiamo cercando di costruire
                un rapporto di fiducia reciproca 😊
              </p>
            </div>

            {oldestPhotoPreview ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-neutral-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={oldestPhotoPreview}
                  alt="Foto anzianità"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <button
                  onClick={() => { setOldestPhotoFile(null); setOldestPhotoPreview(null) }}
                  className="absolute top-2 right-2 bg-black/60 rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-black/80 cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-44 rounded-xl border border-dashed border-neutral-700 active:border-neutral-500 hover:border-neutral-500 cursor-pointer transition-colors">
                <span className="text-2xl text-neutral-600 mb-2">📎</span>
                <span className="text-sm text-neutral-500">Tocca per caricare</span>
                <span className="text-xs text-neutral-600 mt-1">JPG, PNG, WebP</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleOldestPhoto(e.target.files?.[0] ?? null)}
                />
              </label>
            )}

            <p className="text-xs text-neutral-600">
              Questa foto è riservata agli amministratori e non sarà visibile nel tuo profilo pubblico.
            </p>
          </div>

          <div className="border-t border-neutral-800" />

          {/* SEZIONE 2 — Foto profilo */}
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-medium">Foto profilo</h3>
              <p className="text-sm text-neutral-500 mt-1">
                La foto con cui gli altri ti riconosceranno su Slate.
              </p>
            </div>

            {avatarPreview ? (
              <div className="relative w-36 h-36 rounded-2xl overflow-hidden border border-neutral-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarPreview}
                  alt="Foto profilo"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <button
                  onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}
                  className="absolute top-2 right-2 bg-black/60 rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-black/80 cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-36 h-36 rounded-2xl border border-dashed border-neutral-700 active:border-neutral-500 hover:border-neutral-500 cursor-pointer transition-colors">
                <span className="text-3xl text-neutral-600">👤</span>
                <span className="text-xs text-neutral-600 mt-2">Tocca per caricare</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleAvatarPhoto(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>

          <div className="border-t border-neutral-800" />

          {/* SEZIONE 3 — Portfolio / Book */}
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-medium">Portfolio / Book</h3>
              <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
                Scegli le immagini che meglio rappresentano te e la qualità del tuo lavoro.
                Sono richieste almeno 3 immagini per completare il profilo.
              </p>
            </div>

            {/* Contatore */}
            <div className="flex items-center justify-between">
              <span
                className={[
                  'text-sm font-medium transition-colors',
                  portfolioReady ? 'text-emerald-400' : 'text-neutral-500',
                ].join(' ')}
              >
                {portfolioCount}/{PORTFOLIO_MAX} foto
                {portfolioReady && ' ✓'}
              </span>
              {!portfolioReady && (
                <span className="text-xs text-neutral-600">
                  {PORTFOLIO_MIN - portfolioCount} ancora {PORTFOLIO_MIN - portfolioCount === 1 ? 'richiesta' : 'richieste'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {portfolioPreviews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-neutral-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Portfolio ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                  <button
                    onClick={() => removePortfolioFile(i)}
                    className="absolute top-1 right-1 bg-black/60 rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-black/80 cursor-pointer transition-colors leading-none"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {portfolioFiles.length < PORTFOLIO_MAX && (
                <label className="aspect-square rounded-lg border border-dashed border-neutral-700 active:border-neutral-500 hover:border-neutral-500 cursor-pointer transition-colors flex items-center justify-center">
                  <span className="text-3xl text-neutral-600">+</span>
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

            {/* Tooltip blocco submit */}
            {submitBlocked && (
              <p className="text-xs text-amber-400 text-center">
                Carica almeno 3 immagini per continuare
              </p>
            )}
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
            ref={submitBtnRef}
            onClick={handleSubmitClick}
            loading={loading}
            disabled={loading || !oldestPhotoFile || !avatarFile}
            className="flex-1"
          >
            {loading ? 'Caricamento...' : 'Invia profilo'}
          </Button>
        )}
      </div>
    </div>
  )
}
