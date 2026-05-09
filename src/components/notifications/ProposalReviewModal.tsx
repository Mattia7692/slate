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

export function ProposalReviewModal({ inviteId, currentUserId, onClose }: Props) {
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [action, setAction] = useState<'accept' | 'decline' | null>(null)
  const router = useRouter()

  useEffect(() => {
    getInviteDetails(inviteId).then(({ data, error }) => {
      if (error || !data) setLoadError(error ?? 'Errore')
      else setInvite(data)
    })
  }, [inviteId])

  function handleAccept() {
    setAction('accept')
    startTransition(async () => {
      const result = await acceptInvite(inviteId)
      if (result.error) { alert(result.error); setAction(null); return }
      onClose()
      router.push(`/projects/${result.projectId}`)
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full md:max-w-lg bg-neutral-950 border border-neutral-800 rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] text-neutral-600 uppercase tracking-wider mb-1.5">Proposta di collaborazione</p>
              {invite && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium text-neutral-100">{invite.from_profile.full_name}</span>
                    <RoleBadge role={invite.from_profile.role as 'photographer' | 'model'} />
                    <span className="text-[10px] text-neutral-600 border border-neutral-700 px-1.5 py-0.5 rounded-full">Lv.{invite.from_profile.level}</span>
                    {invite.from_profile.city && <span className="text-[11px] text-neutral-500">{invite.from_profile.city}</span>}
                  </div>
                  <div className="pl-1 text-neutral-700 text-xs">↓</div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium text-neutral-100">{invite.to_profile.full_name}</span>
                    <RoleBadge role={invite.to_profile.role as 'photographer' | 'model'} />
                    <span className="text-[10px] text-neutral-600 border border-neutral-700 px-1.5 py-0.5 rounded-full">Lv.{invite.to_profile.level}</span>
                    {invite.to_profile.city && <span className="text-[11px] text-neutral-500">{invite.to_profile.city}</span>}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="13" y2="13" />
                <line x1="13" y1="1" x2="1" y2="13" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contenuto */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {loadError && (
            <p className="text-sm text-red-400">{loadError}</p>
          )}

          {!invite && !loadError && (
            <div className="py-8 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
            </div>
          )}

          {invite && (
            <>
              {/* Compenso proposto */}
              {invite.compensation_note && (
                <div className="rounded-xl border border-neutral-700 bg-neutral-900/60 px-4 py-3 space-y-0.5">
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Compenso proposto</p>
                  <p className="text-sm text-neutral-200 font-medium">{invite.compensation_note}</p>
                </div>
              )}

              {/* Idea creativa */}
              {invite.creative_idea && (
                <div className="space-y-1">
                  <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Idea creativa</p>
                  <p className="text-sm text-neutral-200 leading-relaxed">{invite.creative_idea}</p>
                </div>
              )}

              {/* Location */}
              {invite.location && (
                <div className="space-y-1">
                  <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Location</p>
                  <p className="text-sm text-neutral-200">{invite.location}</p>
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

              {/* Data invio */}
              <p className="text-[11px] text-neutral-700">
                Inviata il {new Date(invite.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </>
          )}
        </div>

        {/* Footer azioni — solo per il destinatario */}
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
