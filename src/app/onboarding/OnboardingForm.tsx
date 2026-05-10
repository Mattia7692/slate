'use client'

import { useState, useRef } from 'react'
import { readPhotoExif } from '@/lib/exif'
import { createClient } from '@/lib/supabase/client'
import { createProfile } from './actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GenrePills } from '@/components/profile/GenrePills'
import { computeSeniorityBonus, yearsFromStartYear } from '@/lib/xp'
import type { UserRole, Genre } from '@/types'

// ============================================================
// Tipi e costanti
// ============================================================

type ScreenId = 'role_genres' | 'measurements' | 'profile' | 'photos'

const SCREEN_LABELS: Record<ScreenId, string> = {
  role_genres:  'Ruolo & Generi',
  measurements: 'Misure',
  profile:      'Profilo',
  photos:       'Foto',
}

function getScreens(role: UserRole | null): ScreenId[] {
  if (role === 'model') return ['role_genres', 'measurements', 'profile', 'photos']
  return ['role_genres', 'profile', 'photos']
}

interface FormState {
  role: UserRole | null
  full_name: string
  bio: string
  city: string
  instagram_url: string
  career_start_year: number | null
}

interface MeasurementsState {
  height: string
  bust: string
  waist: string
  hips: string
  clothingSize: string
  shoeSize: string
  hairColor: string
  hairTexture: string
  eyeColor: string
}

const INITIAL_FORM: FormState = {
  role: null,
  full_name: '',
  bio: '',
  city: '',
  instagram_url: '',
  career_start_year: null,
}

const INITIAL_MEASUREMENTS: MeasurementsState = {
  height: '',
  bust: '',
  waist: '',
  hips: '',
  clothingSize: '',
  shoeSize: '',
  hairColor: '',
  hairTexture: '',
  eyeColor: '',
}

const PORTFOLIO_MIN = 3
const PORTFOLIO_MAX = 10
const STILL_LIFE_LABEL = 'Still life / Product'

// ============================================================
// Componente principale
// ============================================================

export function OnboardingForm({ preview = false, genres }: { preview?: boolean; genres: Genre[] }) {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('role_genres')
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [measurements, setMeasurements] = useState<MeasurementsState>(INITIAL_MEASUREMENTS)
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([])
  const [hourlyRate, setHourlyRate] = useState<string>('')

  // Foto più vecchia
  const [oldestPhotoFile, setOldestPhotoFile] = useState<File | null>(null)
  const [oldestPhotoPreview, setOldestPhotoPreview] = useState<string | null>(null)
  const [oldestPhotoDate, setOldestPhotoDate] = useState<string | null>(null)
  const [oldestPhotoExif, setOldestPhotoExif] = useState<Record<string, unknown> | null>(null)

  // Foto profilo
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

  // ---- Helpers ----

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function setM<K extends keyof MeasurementsState>(key: K, value: string) {
    setMeasurements((prev) => ({ ...prev, [key]: value }))
  }

  function handleRoleSelect(role: UserRole) {
    set('role', role)
    setSelectedGenreIds([])
  }

  const visibleGenres = form.role === 'model'
    ? genres.filter((g) => g.label !== STILL_LIFE_LABEL)
    : genres

  function toggleGenre(id: string) {
    setSelectedGenreIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  // ---- Navigation ----

  const screens = getScreens(form.role)
  const currentIndex = screens.indexOf(currentScreen)
  const totalSteps = screens.length
  const isLastScreen = currentScreen === 'photos'

  function goNext() {
    const next = screens[currentIndex + 1]
    if (next) setCurrentScreen(next)
  }

  function goBack() {
    const prev = screens[currentIndex - 1]
    if (prev) setCurrentScreen(prev)
  }

  function canProceed(): boolean {
    if (currentScreen === 'role_genres') return form.role !== null && selectedGenreIds.length >= 1
    if (currentScreen === 'measurements') return measurements.height.trim() !== ''
    if (currentScreen === 'profile') return form.full_name.trim().length >= 2
    return oldestPhotoFile !== null && avatarFile !== null && portfolioFiles.length >= PORTFOLIO_MIN
  }

  // ---- Upload helpers ----

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

  function handleSubmitClick() {
    if (portfolioFiles.length < PORTFOLIO_MIN) {
      setSubmitBlocked(true)
      setTimeout(() => setSubmitBlocked(false), 3000)
      return
    }
    handleSubmit()
  }

  // ---- Submit ----

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

      let oldestPhotoUrl: string | null = null
      if (oldestPhotoFile) {
        const ext = oldestPhotoFile.name.split('.').pop()
        oldestPhotoUrl = await uploadFile(oldestPhotoFile, 'oldest-photos', `${uid}/${ts}.${ext}`)
      }

      let avatarUrl: string | null = null
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        avatarUrl = await uploadFile(avatarFile, 'avatars', `${uid}/${ts}-avatar.${ext}`)
      }

      const portfolioUrls: string[] = []
      for (let i = 0; i < portfolioFiles.length; i++) {
        const file = portfolioFiles[i]
        const ext = file.name.split('.').pop()
        const url = await uploadFile(file, 'portfolio', `${uid}/${ts}-${i}.${ext}`)
        portfolioUrls.push(url)
      }

      const validGenreIds = new Set(visibleGenres.map((g) => g.id))
      const genreIds = selectedGenreIds.filter((id) => validGenreIds.has(id))

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
        genre_ids: genreIds,
        hourly_rate: hourlyRate ? parseInt(hourlyRate) : null,
        // Misure (solo modelle)
        height_cm: form.role === 'model' && measurements.height ? parseInt(measurements.height) : null,
        bust_cm: form.role === 'model' && measurements.bust ? parseInt(measurements.bust) : null,
        waist_cm: form.role === 'model' && measurements.waist ? parseInt(measurements.waist) : null,
        hips_cm: form.role === 'model' && measurements.hips ? parseInt(measurements.hips) : null,
        clothing_size: form.role === 'model' && measurements.clothingSize ? measurements.clothingSize : null,
        shoe_size: form.role === 'model' && measurements.shoeSize ? measurements.shoeSize : null,
        hair_color: form.role === 'model' && measurements.hairColor ? measurements.hairColor : null,
        hair_texture: form.role === 'model' && measurements.hairTexture ? measurements.hairTexture : null,
        eye_color: form.role === 'model' && measurements.eyeColor ? measurements.eyeColor : null,
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
  // Preview done
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
            setCurrentScreen('role_genres')
            setForm(INITIAL_FORM)
            setMeasurements(INITIAL_MEASUREMENTS)
            setSelectedGenreIds([])
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

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-8">
      {/* Banner anteprima */}
      {preview && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-400 text-center">
          Modalità anteprima — nessun dato verrà salvato
        </div>
      )}

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          {screens.map((s, i) => (
            <div
              key={s}
              className={[
                'h-1 flex-1 rounded-full transition-colors',
                i <= currentIndex ? 'bg-white' : 'bg-neutral-800',
              ].join(' ')}
            />
          ))}
        </div>
        <p className="text-xs text-neutral-500 text-right">
          Step {currentIndex + 1} di {totalSteps} — {SCREEN_LABELS[currentScreen]}
        </p>
      </div>

      {/* Errore globale */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ---- SCREEN: Ruolo & Generi ---- */}
      {currentScreen === 'role_genres' && (
        <div className="space-y-6">
          {/* Sezione 1: Ruolo */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Qual è il tuo ruolo?</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {(['photographer', 'model'] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleSelect(role)}
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

          {/* Sezione 2: Generi (visibile solo dopo aver scelto il ruolo) */}
          {form.role !== null && (
            <div className="space-y-4 border-t border-neutral-800 pt-6">
              <div>
                <h2 className="text-lg font-medium">I tuoi generi</h2>
                <p className="text-sm text-neutral-400 mt-1">
                  Seleziona i generi in cui lavori. Puoi sceglierne più di uno.
                </p>
              </div>
              <GenrePills
                genres={visibleGenres}
                selected={selectedGenreIds}
                onToggle={toggleGenre}
              />
              {selectedGenreIds.length === 0 && (
                <p className="text-xs text-neutral-600">Seleziona almeno un genere per continuare.</p>
              )}

              {/* Cachet orario */}
              <div className="border-t border-neutral-800 pt-5 space-y-2">
                <label className="text-sm font-medium text-neutral-300">
                  La tua tariffa oraria (€/h)
                </label>
                <p className="text-xs text-neutral-600">Facoltativa — comparirà sul tuo profilo pubblico.</p>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="es. 150"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- SCREEN: Misure (solo modelle) ---- */}
      {currentScreen === 'measurements' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-medium">Le tue misure</h2>
            <p className="text-sm text-neutral-400 mt-1 leading-relaxed">
              Questi dati aiutano i fotografi a capire se sei adatta al loro progetto. Potrai aggiornarli in qualsiasi momento.
            </p>
          </div>

          {/* Altezza */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-300">
              Altezza (cm) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={100}
              max={220}
              value={measurements.height}
              onChange={(e) => setM('height', e.target.value)}
              placeholder="160"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20"
            />
          </div>

          {/* Misure seno/vita/fianchi */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-300">
              Misure (seno / vita / fianchi in cm)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={50}
                max={150}
                value={measurements.bust}
                onChange={(e) => setM('bust', e.target.value)}
                placeholder="90"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20"
              />
              <input
                type="number"
                inputMode="numeric"
                min={50}
                max={150}
                value={measurements.waist}
                onChange={(e) => setM('waist', e.target.value)}
                placeholder="60"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20"
              />
              <input
                type="number"
                inputMode="numeric"
                min={50}
                max={150}
                value={measurements.hips}
                onChange={(e) => setM('hips', e.target.value)}
                placeholder="90"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20"
              />
            </div>
          </div>

          {/* Taglia abiti */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-300">Taglia abiti</label>
            <input
              type="text"
              value={measurements.clothingSize}
              onChange={(e) => setM('clothingSize', e.target.value)}
              placeholder="36, 38, 40…"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20"
            />
          </div>

          {/* Numero scarpe */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-300">Numero di scarpe</label>
            <input
              type="text"
              value={measurements.shoeSize}
              onChange={(e) => setM('shoeSize', e.target.value)}
              placeholder="38, 39, 40…"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20"
            />
          </div>

          {/* Capelli */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Colore capelli</label>
              <input
                type="text"
                value={measurements.hairColor}
                onChange={(e) => setM('hairColor', e.target.value)}
                placeholder="castani, biondi, neri, rossi…"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Struttura capelli</label>
              <input
                type="text"
                value={measurements.hairTexture}
                onChange={(e) => setM('hairTexture', e.target.value)}
                placeholder="lisci, mossi, ricci…"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20"
              />
            </div>
          </div>

          {/* Occhi */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-300">Colore occhi</label>
            <input
              type="text"
              value={measurements.eyeColor}
              onChange={(e) => setM('eyeColor', e.target.value)}
              placeholder="marroni, verdi, azzurri…"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20"
            />
          </div>

          <p className="text-xs text-neutral-600">
            I campi contrassegnati con <span className="text-rose-400">*</span> sono obbligatori.
          </p>
        </div>
      )}

      {/* ---- SCREEN: Profilo / Anagrafica ---- */}
      {currentScreen === 'profile' && (
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
              const years = yearsFromStartYear(form.career_start_year!)
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

      {/* ---- SCREEN: Foto ---- */}
      {currentScreen === 'photos' && (
        <div className="space-y-8">

          {/* Foto più vecchia */}
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
                <img src={oldestPhotoPreview} alt="Foto anzianità" className="absolute inset-0 w-full h-full object-cover" />
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
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleOldestPhoto(e.target.files?.[0] ?? null)} />
              </label>
            )}

            <p className="text-xs text-neutral-600">
              Questa foto è riservata agli amministratori e non sarà visibile nel tuo profilo pubblico.
            </p>
          </div>

          <div className="border-t border-neutral-800" />

          {/* Foto profilo */}
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-medium">Foto profilo</h3>
              <p className="text-sm text-neutral-500 mt-1">La foto con cui gli altri ti riconosceranno su Slate.</p>
            </div>

            {avatarPreview ? (
              <div className="relative w-36 h-36 rounded-2xl overflow-hidden border border-neutral-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarPreview} alt="Foto profilo" className="absolute inset-0 w-full h-full object-cover" />
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
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarPhoto(e.target.files?.[0] ?? null)} />
              </label>
            )}
          </div>

          <div className="border-t border-neutral-800" />

          {/* Portfolio */}
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-medium">Portfolio / Book</h3>
              <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
                Scegli le immagini che meglio rappresentano te e la qualità del tuo lavoro.
                Sono richieste almeno 3 immagini per completare il profilo.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <span className={['text-sm font-medium transition-colors', portfolioReady ? 'text-emerald-400' : 'text-neutral-500'].join(' ')}>
                {portfolioCount}/{PORTFOLIO_MAX} foto{portfolioReady && ' ✓'}
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
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handlePortfolioFiles(e.target.files)} />
                </label>
              )}
            </div>

            {submitBlocked && (
              <p className="text-xs text-amber-400 text-center">Carica almeno 3 immagini per continuare</p>
            )}
          </div>
        </div>
      )}

      {/* Navigazione */}
      <div className="flex gap-3 pt-2">
        {currentIndex > 0 && (
          <Button variant="secondary" onClick={goBack} disabled={loading} className="flex-1">
            Indietro
          </Button>
        )}

        {!isLastScreen ? (
          <Button onClick={goNext} disabled={!canProceed()} className="flex-1">
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
