'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { sendInvite } from '@/app/invites/actions'
import { calculatePayment } from '@/lib/payment'
import type { UserRole } from '@/types'

interface PartecipaModalProps {
  creatorId: string
  creatorName: string
  creatorLevel: number
  creatorRole: UserRole
  currentLevel: number
  currentRole: UserRole
}

const PAYER_LABEL: Record<string, string> = {
  photographer: 'il fotografo',
  model: 'la modella / modello',
  tfp: 'nessuno (TFP)',
}

export function PartecipaModal({
  creatorId,
  creatorName,
  creatorLevel,
  creatorRole,
  currentLevel,
  currentRole,
}: PartecipaModalProps) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const photographerLevel = currentRole === 'photographer' ? currentLevel : creatorLevel
  const modelLevel = currentRole === 'model' ? currentLevel : creatorLevel
  const payment = calculatePayment(photographerLevel, modelLevel)

  function handleSend() {
    setError(null)
    startTransition(async () => {
      const result = await sendInvite(creatorId, {
        message: message.trim() || null,
        creative_idea: '',
        location: '',
        alternative_amount: null,
        moodboard_urls: [],
      })
      if (result.error) {
        setError(result.error)
        return
      }
      setOpen(false)
      setMessage('')
    })
  }

  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)} className="w-full sm:w-auto">
        Partecipa a questa visione
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-6 space-y-5 shadow-2xl">
            <div className="space-y-1">
              <h2 className="text-base font-semibold">Partecipa alla visione</h2>
              <p className="text-sm text-neutral-500">
                Invierai una proposta a {creatorName} (Lv.{creatorLevel})
              </p>
            </div>

            {/* Calcolo compenso */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-3">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Compenso calcolato
              </p>
              {payment.payerRole === 'tfp' ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-emerald-400">TFP — Nessun pagamento</p>
                  <p className="text-xs text-neutral-500">
                    Livelli identici: shooting gratuito per entrambi.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-lg font-bold">
                    €{payment.amountEur.toFixed(0)}
                    <span className="text-sm font-normal text-neutral-500 ml-1.5">
                      paga {PAYER_LABEL[payment.payerRole]}
                    </span>
                  </p>
                  <p className="text-xs text-neutral-500">
                    {payment.levelDiff} {payment.levelDiff === 1 ? 'livello' : 'livelli'} di differenza · €50 per livello
                  </p>
                </div>
              )}
            </div>

            {/* Messaggio opzionale */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Messaggio (opzionale)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Ciao ${creatorName.split(' ')[0]}, mi interessa la tua visione...`}
                rows={3}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            {/* Azioni */}
            <div className="flex items-center gap-3 pt-1">
              <Button size="sm" loading={isPending} onClick={handleSend} className="flex-1">
                Invia proposta
              </Button>
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-400 hover:border-neutral-500 hover:text-neutral-200 transition-colors"
              >
                Annulla
              </button>
            </div>

            <p className="text-xs text-neutral-700 text-center">
              Il creatore riceverà una notifica e potrà accettare o rifiutare.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
