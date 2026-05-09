'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { saveBrief, approveBrief } from './actions'
import type { Brief, BriefFormData, ShootUsage } from '@/types'

const SHOOT_TYPES = [
  'Fashion editorial',
  'Commercial',
  'Beauty',
  'Ritratto',
  'Lingerie / Swimwear',
  'Artistico / Fine Art',
  'Sportivo',
  'Corporate',
  'Altro',
]

const USAGE_OPTIONS: { value: ShootUsage; label: string; sub: string }[] = [
  { value: 'portfolio_only', label: 'Solo portfolio', sub: 'Uso personale, no pubblicazione commerciale' },
  { value: 'social', label: 'Social media', sub: 'Pubblicazione su canali social personali' },
  { value: 'commercial', label: 'Commerciale', sub: 'Pubblicità, stampa, uso commerciale' },
]

interface BriefFormProps {
  projectId: string
  existingBrief: Brief | null
  canEdit: boolean       // true = solo proponente, status accepted
  canApprove: boolean    // true = solo ricevente, status accepted + brief presente
  currentUserId: string
  initialLocation: string | null       // da invite: "desc\naddr"
  initialMoodboardUrls: string[]       // da invite
  proposerSignedAt: string | null
  receiverSignedAt: string | null
}

function useLocationMap(address: string) {
  const [mapUrl, setMapUrl] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (address.trim().length < 3) { setMapUrl(null); return }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
          { headers: { 'Accept-Language': 'it' } }
        )
        const results = await res.json()
        if (results.length > 0) {
          const { lat, lon } = results[0]
          const delta = 0.02
          const bbox = `${parseFloat(lon) - delta},${parseFloat(lat) - delta},${parseFloat(lon) + delta},${parseFloat(lat) + delta}`
          setMapUrl(`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`)
        } else {
          setMapUrl(null)
        }
      } catch { setMapUrl(null) }
    }, 800)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [address])

  return mapUrl
}

function parseLocation(raw: string | null): [string, string] {
  if (!raw) return ['', '']
  const parts = raw.split('\n')
  return [parts[0] ?? '', parts[1] ?? '']
}

function LocationMapView({ address }: { address: string }) {
  const mapUrl = useLocationMap(address)
  if (!mapUrl) return null
  return (
    <div className="rounded-xl overflow-hidden border border-neutral-800 h-36 mt-1">
      <iframe src={mapUrl} className="w-full h-full" style={{ border: 0 }} title="Mappa location" />
    </div>
  )
}

export function BriefForm({
  projectId,
  existingBrief,
  canEdit,
  canApprove,
  currentUserId,
  initialLocation,
  initialMoodboardUrls,
  proposerSignedAt,
  receiverSignedAt,
}: BriefFormProps) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(!existingBrief && canEdit)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const moodboardRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const [initLocDesc, initLocAddr] = parseLocation(
    existingBrief?.location_description ?? initialLocation
  )

  const [form, setForm] = useState<BriefFormData>({
    shoot_type: existingBrief?.shoot_type ?? '',
    shoot_date: existingBrief?.shoot_date ?? '',
    duration_hours: existingBrief?.duration_hours ?? 2,
    location_description: existingBrief?.location_description ?? (initialLocation ?? ''),
    deliverables_count: existingBrief?.deliverables_count ?? 20,
    delivery_days: existingBrief?.delivery_days ?? 14,
    usage: existingBrief?.usage ?? 'portfolio_only',
    notes: existingBrief?.notes ?? '',
    moodboard_urls: existingBrief?.moodboard_urls ?? initialMoodboardUrls,
  })

  const [locationDesc, setLocationDesc] = useState(initLocDesc)
  const [locationAddr, setLocationAddr] = useState(initLocAddr)
  const editMapUrl = useLocationMap(locationAddr)

  function set<K extends keyof BriefFormData>(key: K, value: BriefFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleMoodboardUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    const urls: string[] = []
    try {
      for (let i = 0; i < Math.min(files.length, 9 - form.moodboard_urls.length); i++) {
        const file = files[i]
        const ext = file.name.split('.').pop()
        const path = `${currentUserId}/brief-${Date.now()}-${i}.${ext}`
        const { error: upErr } = await supabase.storage.from('portfolio').upload(path, file, { cacheControl: '3600', upsert: false })
        if (upErr) continue
        const { data } = supabase.storage.from('portfolio').getPublicUrl(path)
        urls.push(data.publicUrl)
      }
      set('moodboard_urls', [...form.moodboard_urls, ...urls])
    } finally {
      setUploading(false)
    }
  }

  function handleSave() {
    setError(null)
    setSuccess(null)
    const combined = locationDesc.trim() + (locationAddr.trim() ? '\n' + locationAddr.trim() : '')
    startTransition(async () => {
      const result = await saveBrief(projectId, { ...form, location_description: combined })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess('Brief inviato alla controparte per approvazione.')
        setIsEditing(false)
      }
    })
  }

  function handleApprove() {
    setError(null)
    startTransition(async () => {
      const result = await approveBrief(projectId)
      if (result.error) { setError(result.error); return }
      router.refresh()
    })
  }

  // ── Read-only view ─────────────────────────────────────────────
  if (!isEditing && existingBrief) {
    const [locDesc, locAddr] = parseLocation(existingBrief.location_description)

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo di shoot" value={existingBrief.shoot_type || '—'} />
          <Field label="Data" value={existingBrief.shoot_date
            ? new Date(existingBrief.shoot_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
            : '—'} />
          <Field label="Durata" value={`${existingBrief.duration_hours} ore`} />
          <Field
            label="Utilizzo immagini"
            value={USAGE_OPTIONS.find((u) => u.value === existingBrief.usage)?.label ?? existingBrief.usage}
          />
          <Field label="Foto da consegnare" value={`${existingBrief.deliverables_count} foto`} />
          <Field label="Tempi consegna" value={`${existingBrief.delivery_days} giorni`} />
        </div>

        {existingBrief.location_description && (
          <div className="space-y-1">
            <p className="text-xs text-neutral-500">Location</p>
            {locDesc && <p className="text-sm font-medium text-neutral-200">{locDesc}</p>}
            {locAddr && <p className="text-sm text-neutral-400">{locAddr}</p>}
            {locAddr && <LocationMapView address={locAddr} />}
          </div>
        )}

        {existingBrief.notes && <Field label="Note" value={existingBrief.notes} />}

        {existingBrief.moodboard_urls.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-neutral-500">Moodboard</p>
            <div className="grid grid-cols-3 gap-1.5">
              {existingBrief.moodboard_urls.map((url, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-neutral-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2 flex-wrap">
          <SignBadge label="Proponente" signedAt={proposerSignedAt} />
          <SignBadge label="Ricevente" signedAt={receiverSignedAt} />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3 flex-wrap items-center">
          {canEdit && (
            <Button size="sm" variant="secondary" onClick={() => setIsEditing(true)} disabled={isPending}>
              Modifica brief
            </Button>
          )}
          {canApprove && (
            <>
              <Button size="sm" loading={isPending} onClick={handleApprove}>
                Approva brief
              </Button>
              <p className="text-xs text-neutral-600">
                Approva per aprire la chat del progetto
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Form edit (solo proponente) ────────────────────────────────
  if (!canEdit) return null

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {success}
        </div>
      )}

      {/* Tipo shoot */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-300">Tipo di shoot</label>
        <div className="flex flex-wrap gap-2">
          {SHOOT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set('shoot_type', t)}
              className={[
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                form.shoot_type === t
                  ? 'border-white bg-white/10 text-white'
                  : 'border-neutral-700 text-neutral-400 hover:border-neutral-500',
              ].join(' ')}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Data shoot"
          type="date"
          value={form.shoot_date}
          onChange={(e) => set('shoot_date', e.target.value)}
          required
        />
        <Input
          label="Durata (ore)"
          type="number"
          min={1}
          max={12}
          step={0.5}
          value={form.duration_hours}
          onChange={(e) => set('duration_hours', parseFloat(e.target.value) || 1)}
          required
        />
        <Input
          label="Foto da consegnare"
          type="number"
          min={1}
          value={form.deliverables_count}
          onChange={(e) => set('deliverables_count', parseInt(e.target.value) || 1)}
          required
        />
        <Input
          label="Giorni per la consegna"
          type="number"
          min={1}
          value={form.delivery_days}
          onChange={(e) => set('delivery_days', parseInt(e.target.value) || 1)}
          required
        />
      </div>

      {/* Location */}
      <div className="space-y-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-300">Tipo di location</label>
          <input
            type="text"
            value={locationDesc}
            onChange={(e) => setLocationDesc(e.target.value)}
            placeholder="Es. Studio fotografico, fienile, villa privata..."
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-300">Indirizzo</label>
          <input
            type="text"
            value={locationAddr}
            onChange={(e) => setLocationAddr(e.target.value)}
            placeholder="Es. Via Tortona 32, Milano"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-500"
          />
          {editMapUrl && (
            <div className="mt-1 rounded-xl overflow-hidden border border-neutral-800 h-36">
              <iframe src={editMapUrl} className="w-full h-full" style={{ border: 0 }} title="Mappa location" />
            </div>
          )}
        </div>
      </div>

      {/* Utilizzo */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-neutral-300">Utilizzo delle immagini</label>
        {USAGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => set('usage', opt.value)}
            className={[
              'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors cursor-pointer',
              form.usage === opt.value
                ? 'border-white bg-white/5'
                : 'border-neutral-800 hover:border-neutral-600',
            ].join(' ')}
          >
            <div className={[
              'mt-0.5 w-4 h-4 rounded-full border-2 shrink-0',
              form.usage === opt.value ? 'border-white bg-white' : 'border-neutral-600',
            ].join(' ')} />
            <div>
              <p className="text-sm font-medium">{opt.label}</p>
              <p className="text-xs text-neutral-500 mt-0.5">{opt.sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Moodboard */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-neutral-300">
          Moodboard{' '}
          <span className="text-neutral-600 font-normal text-xs">({form.moodboard_urls.length}/9)</span>
        </label>
        {form.moodboard_urls.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5">
            {form.moodboard_urls.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-neutral-800 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => set('moodboard_urls', form.moodboard_urls.filter((_, idx) => idx !== i))}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white"
                >
                  Rimuovi
                </button>
              </div>
            ))}
          </div>
        )}
        {form.moodboard_urls.length < 9 && (
          <button
            type="button"
            onClick={() => moodboardRef.current?.click()}
            disabled={uploading}
            className="w-full rounded-lg border border-dashed border-neutral-700 hover:border-neutral-500 py-3 text-xs text-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-50"
          >
            {uploading ? 'Caricamento...' : '+ Aggiungi immagini'}
          </button>
        )}
        <input
          ref={moodboardRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleMoodboardUpload(e.target.files)}
        />
      </div>

      {/* Note */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-300">
          Note <span className="text-neutral-600 font-normal">(opzionale)</span>
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Eventuali richieste particolari..."
          rows={3}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-500 resize-none"
        />
      </div>

      <div className="flex gap-3">
        {existingBrief && (
          <Button variant="secondary" onClick={() => setIsEditing(false)} disabled={isPending}>
            Annulla
          </Button>
        )}
        <Button loading={isPending} onClick={handleSave}>
          Invia brief
        </Button>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-sm text-neutral-200">{value}</p>
    </div>
  )
}

function SignBadge({ label, signedAt }: { label: string; signedAt: string | null }) {
  return (
    <div className={[
      'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs',
      signedAt
        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
        : 'border-neutral-700 text-neutral-500',
    ].join(' ')}>
      <span>{signedAt ? '✓' : '○'}</span>
      <span>{label}</span>
      {signedAt && (
        <span className="text-emerald-600">
          {new Date(signedAt).toLocaleDateString('it-IT')}
        </span>
      )}
    </div>
  )
}
