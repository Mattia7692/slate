'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sendInvite } from '@/app/invites/actions'
import { calculatePayment } from '@/lib/payment'
import { RoleBadge } from '@/components/profile/RoleBadge'
import type { UserRole } from '@/types'

interface ProposeModalProps {
  targetProfileId: string
  targetName: string
  targetLevel: number
  targetRole: UserRole
  currentLevel: number
  currentRole: UserRole
  currentName: string
  currentUserId: string
}

const PAYER_LABEL: Record<string, string> = {
  photographer: 'paga il fotografo',
  model:        'paga il/la modell*',
  tfp:          'TFP — nessun pagamento',
}

export function ProposeModal({
  targetProfileId,
  targetName,
  targetLevel,
  targetRole,
  currentLevel,
  currentRole,
  currentName,
  currentUserId,
}: ProposeModalProps) {
  const [open, setOpen] = useState(false)
  const [creativeIdea, setCreativeIdea] = useState('')
  const [location, setLocation] = useState('')
  const [message, setMessage] = useState('')
  const [altAmount, setAltAmount] = useState('')
  const [moodboardUrls, setMoodboardUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<{ creativeIdea?: string; location?: string }>({})
  const moodboardRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const photographerLevel = currentRole === 'photographer' ? currentLevel : targetLevel
  const modelLevel = currentRole === 'model' ? currentLevel : targetLevel
  const payment = calculatePayment(photographerLevel, modelLevel)

  async function handleMoodboardUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    const urls: string[] = []
    try {
      for (let i = 0; i < Math.min(files.length, 6 - moodboardUrls.length); i++) {
        const file = files[i]
        const ext = file.name.split('.').pop()
        const path = `moodboard/${currentUserId}/${Date.now()}-${i}.${ext}`
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
        alternative_amount: altAmount ? Math.round(parseFloat(altAmount) * 100) : null,
        moodboard_urls: moodboardUrls,
      })
      if (result.error) { alert(result.error); return }
      setOpen(false)
      resetForm()
      router.push(`/dashboard`)
    })
  }

  function resetForm() {
    setCreativeIdea(''); setLocation(''); setMessage(''); setAltAmount(''); setMoodboardUrls([]); setErrors({})
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
                <div>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">Proposta di collaborazione</p>
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <span className="font-semibold text-neutral-100">{currentName}</span>
                    <span className="text-neutral-600 text-xs border border-neutral-700 px-1.5 py-0.5 rounded-full">Lv.{currentLevel}</span>
                    <RoleBadge role={currentRole} />
                    <span className="text-neutral-600">→</span>
                    <span className="font-semibold text-neutral-100">{targetName}</span>
                    <span className="text-neutral-600 text-xs border border-neutral-700 px-1.5 py-0.5 rounded-full">Lv.{targetLevel}</span>
                    <RoleBadge role={targetRole} />
                  </div>
                </div>
                <button onClick={handleClose} className="text-neutral-600 hover:text-neutral-300 transition-colors text-lg leading-none shrink-0 mt-0.5">✕</button>
              </div>
            </div>

            {/* Body — scrollabile */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

              {/* Compenso Slate */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 space-y-1">
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Compenso calcolato da Slate</p>
                {payment.payerRole === 'tfp' ? (
                  <p className="text-sm font-semibold text-emerald-400">TFP — nessun pagamento · livelli identici</p>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-neutral-100">€{payment.amountEur.toFixed(0)}</span>
                    <span className="text-xs text-neutral-500">{PAYER_LABEL[payment.payerRole]}</span>
                    <span className="text-xs text-neutral-700 ml-auto">{payment.levelDiff} lv. diff · €50/lv.</span>
                  </div>
                )}
              </div>

              {/* Compenso alternativo */}
              <Field label="Compenso alternativo proposto" hint="opzionale">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">€</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={altAmount}
                    onChange={(e) => setAltAmount(e.target.value)}
                    placeholder={payment.payerRole === 'tfp' ? '0' : payment.amountEur.toFixed(0)}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 pl-7 pr-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
                  />
                </div>
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

              {/* Location */}
              <Field label="Location" hint="obbligatoria" error={errors.location}>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => { setLocation(e.target.value); if (errors.location) setErrors((p) => ({ ...p, location: undefined })) }}
                  placeholder="Es. Studio a Milano, esterno Navigli, villa in campagna..."
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
                />
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
