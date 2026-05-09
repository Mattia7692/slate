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

// Suggerimento compenso basato sui livelli
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
  return `${senior} (Lv.${seniorLv}) ha più esperienza di ${junior} (Lv.${juniorLv}). Il nostro suggerimento è che, se c'è uno scambio di denaro, vada da ${junior} → ${senior}. Siete liberi di accordarvi diversamente su un compenso che valorizzi il lavoro di entrambi.`
}

// Hook per mappa OSM con debounce geocoding
function useLocationMap(location: string) {
  const [mapUrl, setMapUrl] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (location.trim().length < 3) { setMapUrl(null); return }

    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
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
  }, [location])

  return mapUrl
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
  const [compensationNote, setCompensationNote] = useState('')
  const [creativeIdea, setCreativeIdea] = useState('')
  const [location, setLocation] = useState('')
  const [message, setMessage] = useState('')
  const [moodboardUrls, setMoodboardUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<{ compensationNote?: string; creativeIdea?: string; location?: string }>({})
  const moodboardRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()
  const mapUrl = useLocationMap(location)

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
      setMoodboardUrls((prev) => [...prev, ...urls])
    } finally {
      setUploading(false)
    }
  }

  function validate() {
    const e: typeof errors = {}
    if (!compensationNote.trim()) e.compensationNote = 'Campo obbligatorio'
    if (!creativeIdea.trim()) e.creativeIdea = 'Campo obbligatorio'
    if (!location.trim()) e.location = 'Campo obbligatorio'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSend() {
    if (!validate()) return
    startTransition(async () => {
      const result = await sendInvite(targetProfileId, {
        message: message.trim() || null,
        creative_idea: creativeIdea.trim(),
        location: location.trim(),
        compensation_note: compensationNote.trim(),
        moodboard_urls: moodboardUrls,
      })
      if (result.error) { alert(result.error); return }
      setOpen(false)
      resetForm()
      router.push('/dashboard')
    })
  }

  function resetForm() {
    setCompensationNote(''); setCreativeIdea(''); setLocation('')
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
                <div className="space-y-2 flex-1">
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Proposta di collaborazione</p>
                  {/* Proponente */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-neutral-100">{currentName}</span>
                    <RoleBadge role={currentRole} />
                    <span className="text-[10px] text-neutral-600 border border-neutral-700 px-1.5 py-0.5 rounded-full">Lv.{currentLevel}</span>
                    {currentCity && <span className="text-[11px] text-neutral-500">{currentCity}</span>}
                  </div>
                  <div className="flex items-center gap-1.5 pl-1">
                    <span className="text-neutral-700 text-xs">↓</span>
                  </div>
                  {/* Destinatario */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-neutral-100">{targetName}</span>
                    <RoleBadge role={targetRole} />
                    <span className="text-[10px] text-neutral-600 border border-neutral-700 px-1.5 py-0.5 rounded-full">Lv.{targetLevel}</span>
                    {targetCity && <span className="text-[11px] text-neutral-500">{targetCity}</span>}
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

              {/* Suggerimento compenso */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 space-y-1.5">
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Suggerimento Slate</p>
                <p className="text-xs text-neutral-400 leading-relaxed">{suggestion}</p>
              </div>

              {/* Compenso proposto — obbligatorio */}
              <Field label="Compenso proposto" hint="obbligatorio" error={errors.compensationNote}>
                <input
                  type="text"
                  value={compensationNote}
                  onChange={(e) => { setCompensationNote(e.target.value); if (errors.compensationNote) setErrors((p) => ({ ...p, compensationNote: undefined })) }}
                  placeholder='Es. "TFP", "€150 da me a te", "€200 totali, metà ciascuno"…'
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
                />
              </Field>

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

              {/* Location + mappa */}
              <Field label="Location" hint="obbligatoria" error={errors.location}>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => { setLocation(e.target.value); if (errors.location) setErrors((p) => ({ ...p, location: undefined })) }}
                  placeholder="Es. Studio a Milano, esterno Navigli, villa in campagna..."
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
              <Field label="Moodboard" hint={`opzionale · ${moodboardUrls.length}/6`}>
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
