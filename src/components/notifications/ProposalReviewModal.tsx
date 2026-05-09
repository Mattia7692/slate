'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getInviteDetails, acceptInvite, declineInvite } from '@/app/invites/actions'
import type { InviteDetails } from '@/app/invites/actions'
import { RoleBadge } from '@/components/profile/RoleBadge'

interface Props {
  inviteId: string
  currentUserId: string
  onClose: () => void
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

function compensationContext(
  fromName: string, fromLevel: number,
  toName: string, toLevel: number,
): string {
  const fromFirst = fromName.split(' ')[0]
  const toFirst = toName.split(' ')[0]
  if (fromLevel === toLevel) {
    return `${fromFirst} e ${toFirst} sono allo stesso livello. Il suggerimento Slate è un accordo TFP — nessun pagamento, il lavoro vale uguale per entrambi.`
  }
  if (fromLevel > toLevel) {
    return `${fromFirst} (Lv.${fromLevel}) ha più esperienza di te (Lv.${toLevel}). Secondo il modello Slate, il meno esperto investe per lavorare con il più esperto. Il compenso proposto è:`
  }
  return `Hai più esperienza di ${fromFirst} (Lv.${fromLevel} vs Lv.${toLevel}). Secondo il modello Slate, il meno esperto investe per lavorare con il più esperto. Il compenso proposto è:`
}

// Interpreta compensation_note dal punto di vista del ricevente
function CompensationDisplay({ note, isReceiver }: { note: string | null; isReceiver: boolean }) {
  if (!note) return null

  let style = { border: 'border-neutral-700', bg: '', text: 'text-neutral-100', sub: '' }
  let subtext: string | null = null

  if (note.startsWith('TFP')) {
    style = { border: 'border-emerald-500/30', bg: 'bg-emerald-500/[0.08]', text: 'text-emerald-400', sub: 'text-emerald-500/70' }
  } else if (note.startsWith('Pago io')) {
    // il proponente paga → per il ricevente è positivo
    style = isReceiver
      ? { border: 'border-emerald-500/30', bg: 'bg-emerald-500/[0.08]', text: 'text-emerald-400', sub: 'text-emerald-500/70' }
      : { border: 'border-blue-500/30', bg: 'bg-blue-500/[0.08]', text: 'text-blue-400', sub: 'text-blue-500/70' }
    if (isReceiver) subtext = 'Il proponente si offre di pagarti'
  } else if (note.startsWith('Vengo pagato')) {
    // il proponente vuole essere pagato → il ricevente deve pagare
    style = isReceiver
      ? { border: 'border-amber-500/30', bg: 'bg-amber-500/[0.08]', text: 'text-amber-400', sub: 'text-amber-500/70' }
      : { border: 'border-blue-500/30', bg: 'bg-blue-500/[0.08]', text: 'text-blue-400', sub: 'text-blue-500/70' }
    if (isReceiver) subtext = 'Il proponente propone che tu lo/la paghi'
  }

  return (
    <div className={`rounded-lg border px-3 py-2.5 ${style.border} ${style.bg}`}>
      <p className={`text-sm font-semibold ${style.text}`}>{note}</p>
      {subtext && <p className={`text-xs mt-0.5 ${style.sub}`}>{subtext}</p>}
    </div>
  )
}

export function ProposalReviewModal({ inviteId, currentUserId, onClose }: Props) {
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mapUrl, setMapUrl] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [action, setAction] = useState<'accept' | 'decline' | null>(null)
  const router = useRouter()

  useEffect(() => {
    getInviteDetails(inviteId).then(({ data, error }) => {
      if (error || !data) { setLoadError(error ?? 'Errore'); return }
      setInvite(data)
      if (data.location) {
        // Geocoda la seconda riga (indirizzo), o l'unica se non c'è separatore
        const parts = data.location.split('\n')
        const addrPart = parts.length > 1 ? parts[1] : parts[0]
        fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addrPart)}&format=json&limit=1`,
          { headers: { 'Accept-Language': 'it' } }
        )
          .then((r) => r.json())
          .then((results) => {
            if (results.length > 0) {
              const { lat, lon } = results[0]
              const delta = 0.02
              const bbox = `${parseFloat(lon) - delta},${parseFloat(lat) - delta},${parseFloat(lon) + delta},${parseFloat(lat) + delta}`
              setMapUrl(`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`)
            }
          })
          .catch(() => {})
      }
    })
  }, [inviteId])

  function handleAccept() {
    setAction('accept')
    startTransition(async () => {
      const result = await acceptInvite(inviteId)
      if (result.error) { alert(result.error); setAction(null); return }
      onClose()
      router.push('/dashboard')
    })
  }

  function handleDecline() {
    setAction('decline')
    startTransition(async () => {
      const result = await declineInvite(inviteId)
      if (result.error) { alert(result.error); setAction(null); return }
      onClose()
      router.refresh()
    })
  }

  const isReceiver = invite?.to_profile.id === currentUserId

  // Parsing location in due parti
  const locationParts = invite?.location ? invite.location.split('\n') : []
  const locationDesc = locationParts[0] ?? null
  const locationAddr = locationParts.length > 1 ? locationParts[1] : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full md:max-w-lg bg-neutral-950 border border-neutral-800 rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-neutral-600 uppercase tracking-wider mb-3">Proposta di collaborazione</p>

              {invite && (
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
                      <span className="text-sm font-semibold text-neutral-100">{invite.from_profile.full_name}</span>
                      <RoleBadge role={invite.from_profile.role as 'photographer' | 'model'} />
                      <LevelBadge level={invite.from_profile.level} />
                      {invite.from_profile.city && <CityBadge city={invite.from_profile.city} />}
                    </div>
                    {/* Destinatario */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-neutral-100">{invite.to_profile.full_name}</span>
                      <RoleBadge role={invite.to_profile.role as 'photographer' | 'model'} />
                      <LevelBadge level={invite.to_profile.level} />
                      {invite.to_profile.city && <CityBadge city={invite.to_profile.city} />}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contenuto */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {loadError && <p className="text-sm text-red-400">{loadError}</p>}

          {!invite && !loadError && (
            <div className="py-8 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
            </div>
          )}

          {invite && (
            <>
              {/* Compenso */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 space-y-2.5">
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {compensationContext(
                    invite.from_profile.full_name, invite.from_profile.level,
                    invite.to_profile.full_name, invite.to_profile.level,
                  )}
                </p>
                {invite.compensation_note && (
                  <CompensationDisplay note={invite.compensation_note} isReceiver={!!isReceiver} />
                )}
              </div>

              {/* Idea creativa */}
              {invite.creative_idea && (
                <div className="space-y-1">
                  <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Idea creativa</p>
                  <p className="text-sm text-neutral-200 leading-relaxed">{invite.creative_idea}</p>
                </div>
              )}

              {/* Location + mappa */}
              {invite.location && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Location</p>
                  {locationDesc && (
                    <p className="text-sm font-medium text-neutral-200">{locationDesc}</p>
                  )}
                  {locationAddr && (
                    <p className="text-sm text-neutral-400">{locationAddr}</p>
                  )}
                  {mapUrl && (
                    <div className="rounded-xl overflow-hidden border border-neutral-800 h-40 mt-1">
                      <iframe
                        src={mapUrl}
                        className="w-full h-full"
                        style={{ border: 0 }}
                        title="Mappa location"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Messaggio */}
              {invite.notes && (
                <div className="space-y-1">
                  <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Messaggio</p>
                  <p className="text-sm text-neutral-400 leading-relaxed">{invite.notes}</p>
                </div>
              )}

              {/* Moodboard */}
              {invite.moodboard_urls.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Moodboard</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {invite.moodboard_urls.map((url, i) => (
                      <div key={i} className="aspect-square rounded-lg overflow-hidden bg-neutral-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-neutral-700">
                Inviata il {new Date(invite.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        {invite && isReceiver && (
          <div className="px-5 py-4 border-t border-neutral-800 flex gap-2 shrink-0">
            <button
              onClick={handleDecline}
              disabled={isPending}
              className="flex-1 rounded-xl border border-neutral-700 text-neutral-400 text-sm font-medium py-2.5 hover:border-neutral-500 hover:text-neutral-200 transition-colors disabled:opacity-40"
            >
              {isPending && action === 'decline' ? '...' : 'Rifiuta'}
            </button>
            <button
              onClick={handleAccept}
              disabled={isPending}
              className="flex-1 rounded-xl bg-white text-black text-sm font-semibold py-2.5 hover:bg-neutral-200 transition-colors disabled:opacity-40"
            >
              {isPending && action === 'accept' ? '...' : 'Accetta'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
