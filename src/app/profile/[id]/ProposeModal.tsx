'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sendInvite } from '@/app/invites/actions'
import { RoleBadge } from '@/components/profile/RoleBadge'
import type { UserRole } from '@/types'

interface ProposeModalProps {
  targetProfileId: string
  targetName: string
  targetLevel: number
  targetRole: UserRole
  targetCity: string | null
  currentLevel: number
  currentRole: UserRole
  currentName: string
  currentCity: string | null
  currentUserId: string
}

const LEVEL_COLOR: Record<number, string> = {
  1: 'border-neutral-600 text-neutral-400',
  2: 'border-blue-500/50 text-blue-400',
  3: 'border-violet-500/50 text-violet-400',
  4: 'border-amber-500/50 text-amber-400',
  5: 'border-orange-500/50 text-orange-400',
}

function LevelBadge({ level }: { level: number }) {
  return (
    <span className={`text-[10px] border px-1.5 py-0.5 rounded-full font-medium ${LEVEL_COLOR[level] ?? LEVEL_COLOR[1]}`}>
      Lv.{level}
    </span>
  )
}

function CityBadge({ city }: { city: string }) {
  return (
    <span className="text-[10px] border border-teal-500/30 text-teal-400 bg-teal-500/[0.08] px-1.5 py-0.5 rounded-full">
      {city}
    </span>
  )
}

function compensationSuggestion(
  currentName: string, currentLevel: number,
  targetName: string, targetLevel: number,
): string {
  if (currentLevel === targetLevel) {
    return `${currentName} e ${targetName} sono allo stesso livello. Il nostro suggerimento è un accordo TFP — nessun pagamento, il lavoro vale uguale per entrambi.`
  }
  const senior = currentLevel > targetLevel ? currentName : targetName
  const junior = currentLevel > targetLevel ? targetName : currentName
  const seniorLv = currentLevel > targetLevel ? currentLevel : targetLevel
  const juniorLv = currentLevel > targetLevel ? targetLevel : currentLevel
  return `${senior} (Lv.${seniorLv}) ha più esperienza di ${junior} (Lv.${juniorLv}). Il nostro suggerimento è che il denaro vada da ${junior} verso ${senior}.`
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
      } catch {
        setMapUrl(null)
      }
    }, 800)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [address])

  return mapUrl
}

type PayDirection = 'i_pay' | 'they_pay' | 'tfp'

const PAY_DIRECTION_LABELS: Record<PayDirection, string> = {
  i_pay: 'Pago io',
  they_pay: 'Vengo pagato/a',
  tfp: 'TFP',
}

const PAY_DIRECTION_ACTIVE: Record<PayDirection, string> = {
  i_pay: 'border-blue-500/50 bg-blue-500/[0.08] text-blue-400',
  they_pay: 'border-amber-500/50 bg-amber-500/[0.08] text-amber-400',
  tfp: 'border-emerald-500/50 bg-emerald-500/[0.08] text-emerald-400',
}

export function ProposeModal({
  targetProfileId,
  targetName,
  targetLevel,
  targetRole,
  targetCity,
  currentLevel,
  currentRole,
  currentName,
  currentCity,
  currentUserId,
}: ProposeModalProps) {
  const [open, setOpen] = useState(false)
  const [payDirection, setPayDirection] = useState<PayDirection | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [creativeIdea, setCreativeIdea] = useState('')
  const [locationDesc, setLocationDesc] = useState('')
  const [locationAddr, setLocationAddr] = useState('')
  const [message, setMessage] = useState('')
  const [moodboardUrls, setMoodboardUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<{
    compensation?: string
    compensationAmount?: string
    creativeIdea?: string
    locationDesc?: string
    locationAddr?: string
    moodboard?: string
  }>({})
  const moodboardRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()
  const mapUrl = useLocationMap(locationAddr)

  const suggestion = compensationSuggestion(currentName, currentLevel, targetName, targetLevel)

  async function handleMoodboardUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    const urls: string[] = []
    try {
      for (let i = 0; i < Math.min(files.length, 6 - moodboardUrls.length); i++) {
        const file = files[i]
        const ext = file.name.split('.').pop()
        const path = `${currentUserId}/moodboard-${Date.now()}-${i}.${ext}`
        const { error } = await supabase.storage.from('portfolio').upload(path, file, { cacheControl: '3600', upsert: false })
        if (error) continue
        const { data } = supabase.storage.from('portfolio').getPublicUrl(path)
        urls.push(data.publicUrl)
      }
      setMoodboardUrls((prev) => {
        const next = [...prev, ...urls]
        if (errors.moodboard && next.length > 0) setErrors((p) => ({ ...p, moodboard: undefined }))
        return next
      })
    } finally {
      setUploading(false)
    }
  }

  function buildCompensationNote(): string {
    if (payDirection === 'tfp') return 'TFP — nessun pagamento'
    const amt = payAmount.trim() ? ` — €${payAmount.trim()}` : ''
    if (payDirection === 'i_pay') return `Pago io${amt}`
    if (payDirection === 'they_pay') return `Vengo pagato/a${amt}`
    return ''
  }

  function validate() {
    const e: typeof errors = {}
    if (!payDirection) e.compensation = 'Seleziona chi paga'
    if (payDirection && payDirection !== 'tfp' && !payAmount.trim()) e.compensationAmount = "Inserisci l'importo"
    if (!creativeIdea.trim()) e.creativeIdea = 'Campo obbligatorio'
    if (!locationDesc.trim()) e.locationDesc = 'Campo obbligatorio'
    if (!locationAddr.trim()) e.locationAddr = 'Campo obbligatorio'
    if (moodboardUrls.length === 0) e.moodboard = 'Almeno un\'immagine è obbligatoria'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSend() {
    if (!validate()) return
    startTransition(async () => {
      const result = await sendInvite(targetProfileId, {
        message: message.trim() || null,
        creative_idea: creativeIdea.trim(),
        location: locationDesc.trim() + '\n' + locationAddr.trim(),
        compensation_note: buildCompensationNote(),
        moodboard_urls: moodboardUrls,
      })
      if (result.error) { alert(result.error); return }
      setOpen(false)
      resetForm()
      router.push('/dashboard')
    })
  }

  function resetForm() {
    setPayDirection(null); setPayAmount('')
    setCreativeIdea(''); setLocationDesc(''); setLocationAddr('')
    setMessage(''); setMoodboardUrls([]); setErrors({})
  }

  function handleClose() { setOpen(false); resetForm() }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-neutral-100 transition-colors"
      >
        Invia proposta
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl max-h-[92dvh] flex flex-col">

            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-neutral-800 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-neutral-600 uppercase tracking-wider mb-3">Proposta di collaborazione</p>

                  <div className="flex items-stretch gap-3">
                    {/* Freccia verticale */}
                    <div className="flex flex-col items-center pt-1 pb-1 shrink-0">
                      <div className="w-px flex-1 bg-neutral-700" />
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="text-neutral-500 -mt-px shrink-0">
                        <path d="M5 10L0 0h10z" />
                      </svg>
                    </div>

                    {/* Profili */}
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Proponente */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-neutral-100">{currentName}</span>
                        <RoleBadge role={currentRole} />
                        <LevelBadge level={currentLevel} />
                        {currentCity && <CityBadge city={currentCity} />}
                      </div>
                      {/* Destinatario */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-neutral-100">{targetName}</span>
                        <RoleBadge role={targetRole} />
                        <LevelBadge level={targetLevel} />
                        {targetCity && <CityBadge city={targetCity} />}
                      </div>
                    </div>
                  </div>
                </div>

                <button onClick={handleClose} className="text-neutral-600 hover:text-neutral-300 transition-colors shrink-0 mt-0.5 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-800">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

              {/* Compenso */}
              <div className="space-y-3">
                {/* Suggerimento Slate */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3">
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">Suggerimento Slate</p>
                  <p className="text-xs text-neutral-400 leading-relaxed">{suggestion}</p>
                </div>

                {/* Direzione pagamento */}
                <div className="space-y-1.5">
                  <div className="flex items-baseline gap-2">
                    <label className="text-xs font-medium text-neutral-300 uppercase tracking-wider">Compenso proposto</label>
                    <span className="text-[10px] text-neutral-600">obbligatorio</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(['i_pay', 'they_pay', 'tfp'] as PayDirection[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setPayDirection(d)
                          if (errors.compensation) setErrors((p) => ({ ...p, compensation: undefined }))
                        }}
                        className={[
                          'rounded-xl border py-2.5 text-sm font-medium transition-colors',
                          payDirection === d
                            ? PAY_DIRECTION_ACTIVE[d]
                            : 'border-neutral-700 text-neutral-500 hover:border-neutral-500 hover:text-neutral-300',
                        ].join(' ')}
                      >
                        {PAY_DIRECTION_LABELS[d]}
                      </button>
                    ))}
                  </div>
                  {errors.compensation && <p className="text-xs text-red-400">{errors.compensation}</p>}
                </div>

                {/* Importo */}
                {payDirection && payDirection !== 'tfp' && (
                  <Field label="Importo" hint="obbligatorio" error={errors.compensationAmount}>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">€</span>
                      <input
                        type="number"
                        min="0"
                        value={payAmount}
                        onChange={(e) => {
                          setPayAmount(e.target.value)
                          if (errors.compensationAmount) setErrors((p) => ({ ...p, compensationAmount: undefined }))
                        }}
                        placeholder="150"
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-900 pl-7 pr-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
                      />
                    </div>
                  </Field>
                )}
              </div>

              {/* Idea creativa */}
              <Field label="Idea creativa" hint="obbligatoria" error={errors.creativeIdea}>
                <textarea
                  value={creativeIdea}
                  onChange={(e) => { setCreativeIdea(e.target.value); if (errors.creativeIdea) setErrors((p) => ({ ...p, creativeIdea: undefined })) }}
                  placeholder="Descrivi il concept dello shooting: mood, stile, riferimenti visivi..."
                  rows={3}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none resize-none"
                />
              </Field>

              {/* Location */}
              <div className="space-y-3">
                <Field label="Tipo di location" hint="obbligatoria" error={errors.locationDesc}>
                  <input
                    type="text"
                    value={locationDesc}
                    onChange={(e) => { setLocationDesc(e.target.value); if (errors.locationDesc) setErrors((p) => ({ ...p, locationDesc: undefined })) }}
                    placeholder="Es. Studio fotografico, fienile, villa privata, scogliera..."
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
                  />
                </Field>

                <Field label="Indirizzo" hint="obbligatorio" error={errors.locationAddr}>
                  <input
                    type="text"
                    value={locationAddr}
                    onChange={(e) => { setLocationAddr(e.target.value); if (errors.locationAddr) setErrors((p) => ({ ...p, locationAddr: undefined })) }}
                    placeholder="Es. Via Tortona 32, Milano"
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
                  />
                  {mapUrl && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-neutral-800 h-36">
                      <iframe
                        src={mapUrl}
                        className="w-full h-full"
                        style={{ border: 0 }}
                        title="Mappa location"
                      />
                    </div>
                  )}
                </Field>
              </div>

              {/* Messaggio */}
              <Field label="Messaggio" hint="opzionale">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Ciao ${targetName.split(' ')[0]}, mi piacerebbe collaborare con te...`}
                  rows={2}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none resize-none"
                />
              </Field>

              {/* Moodboard */}
              <Field label="Moodboard" hint={`obbligatoria · min 1 · ${moodboardUrls.length}/6`} error={errors.moodboard}>
                <div className="space-y-2">
                  {moodboardUrls.length > 0 && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {moodboardUrls.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-neutral-800 group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setMoodboardUrls((p) => p.filter((_, idx) => idx !== i))}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white"
                          >
                            Rimuovi
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {moodboardUrls.length < 6 && (
                    <button
                      type="button"
                      onClick={() => moodboardRef.current?.click()}
                      disabled={uploading}
                      className="w-full rounded-lg border border-dashed border-neutral-700 hover:border-neutral-500 py-3 text-xs text-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-50"
                    >
                      {uploading ? 'Caricamento...' : '+ Aggiungi immagini'}
                    </button>
                  )}
                  <input ref={moodboardRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleMoodboardUpload(e.target.files)} />
                </div>
              </Field>

            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-neutral-800 shrink-0 flex gap-3">
              <button
                onClick={handleSend}
                disabled={isPending}
                className="flex-1 rounded-xl bg-white py-2.5 text-sm font-semibold text-neutral-950 hover:bg-neutral-100 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Invio in corso...' : 'Invia proposta'}
              </button>
              <button
                onClick={handleClose}
                className="px-4 rounded-xl border border-neutral-700 text-sm text-neutral-400 hover:border-neutral-500 hover:text-neutral-200 transition-colors"
              >
                Annulla
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}

function Field({
  label, hint, error, children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <label className="text-xs font-medium text-neutral-300 uppercase tracking-wider">{label}</label>
        {hint && <span className="text-[10px] text-neutral-600">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
