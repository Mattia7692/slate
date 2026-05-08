'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { approveProfile, suspendProfile, setPendingProfile, deleteProfile } from '../actions'
import { toggleAdmin } from './toggleAdminAction'
import type { ProfileStatus } from '@/types'

interface Props {
  profileId: string
  currentStatus: ProfileStatus
  isAdmin: boolean
  isSelf: boolean
  isFounderProfile: boolean
  currentIsFounder: boolean
  profileName: string
}

export function AdminActionsPanel({
  profileId,
  currentStatus,
  isAdmin,
  isSelf,
  isFounderProfile,
  currentIsFounder,
  profileName,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [confirmAdmin, setConfirmAdmin] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  function handleStatus(action: (id: string) => Promise<{ error: string | null }>) {
    startTransition(async () => {
      const result = await action(profileId)
      if (!result.error) router.refresh()
      else alert(result.error)
    })
  }

  function handleToggleAdmin() {
    if (!confirmAdmin) { setConfirmAdmin(true); return }
    startTransition(async () => {
      const result = await toggleAdmin(profileId, !isAdmin)
      if (result.error) alert(result.error)
      setConfirmAdmin(false)
    })
  }

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    startTransition(async () => {
      const result = await deleteProfile(profileId)
      if (result?.error) alert(result.error)
    })
  }

  return (
    <section className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3 space-y-2">
      <h2 className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider px-1">Azioni profilo</h2>

      <div className="grid grid-cols-2 gap-2">
        {/* Colonna sinistra: gestione profilo */}
        <div className="flex flex-col gap-2">
          {(!isFounderProfile || currentIsFounder) && (
            <PanelBtn
              href={`/admin/${profileId}/edit`}
              color="neutral"
              disabled={isPending}
            >
              Modifica profilo
            </PanelBtn>
          )}
          {currentIsFounder && !isFounderProfile && (
            confirmAdmin ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] text-neutral-400 leading-tight px-0.5">
                  {isAdmin ? 'Rimuovere i permessi?' : `Promuovere ${profileName.split(' ')[0]}?`}
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={handleToggleAdmin}
                    disabled={isPending}
                    className="flex-1 text-xs font-medium py-1 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white transition-colors disabled:opacity-50"
                  >
                    {isPending ? '...' : 'Sì'}
                  </button>
                  <button
                    onClick={() => setConfirmAdmin(false)}
                    className="flex-1 text-xs py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 transition-colors"
                  >
                    No
                  </button>
                </div>
              </div>
            ) : (
              <PanelBtn
                onClick={handleToggleAdmin}
                color={isAdmin ? 'red' : 'violet'}
                disabled={isPending}
              >
                {isAdmin ? 'Revoca admin' : 'Promuovi admin'}
              </PanelBtn>
            )
          )}
          {currentStatus !== 'approved' && (
            <PanelBtn onClick={() => handleStatus(approveProfile)} color="green" disabled={isPending}>
              Approva
            </PanelBtn>
          )}
        </div>

        {/* Colonna destra: stato + elimina */}
        <div className="flex flex-col gap-2">
          {currentStatus !== 'suspended' && !isSelf && (
            <PanelBtn onClick={() => handleStatus(suspendProfile)} color="red" disabled={isPending}>
              Sospendi
            </PanelBtn>
          )}
          {currentStatus !== 'pending' && (
            <PanelBtn onClick={() => handleStatus(setPendingProfile)} color="neutral" disabled={isPending}>
              In attesa
            </PanelBtn>
          )}
          {!isFounderProfile && !isSelf && (
            confirmDelete ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] text-red-400 leading-tight px-0.5">Eliminare definitivamente?</p>
                <div className="flex gap-1.5">
                  <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="flex-1 text-xs font-medium py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-colors disabled:opacity-50"
                  >
                    {isPending ? '...' : 'Sì'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 text-xs py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 transition-colors"
                  >
                    No
                  </button>
                </div>
              </div>
            ) : (
              <PanelBtn onClick={handleDelete} color="ghost-red" disabled={isPending}>
                Elimina profilo
              </PanelBtn>
            )
          )}
        </div>
      </div>
    </section>
  )
}

type BtnColor = 'green' | 'red' | 'violet' | 'neutral' | 'ghost-red'

const COLOR_STYLES: Record<BtnColor, string> = {
  green:     'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25',
  red:       'bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25',
  violet:    'bg-violet-500/15 border-violet-500/30 text-violet-400 hover:bg-violet-500/25',
  neutral:   'bg-neutral-700/40 border-neutral-600/40 text-neutral-300 hover:bg-neutral-700/70',
  'ghost-red': 'bg-transparent border-neutral-700 text-neutral-500 hover:border-red-500/40 hover:text-red-400',
}

function PanelBtn({
  children,
  onClick,
  href,
  color,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  href?: string
  color: BtnColor
  disabled?: boolean
}) {
  const base = 'w-full text-xs font-medium px-2 py-2 rounded-lg border transition-colors disabled:opacity-50 text-center leading-tight'
  if (href) {
    return (
      <a href={href} className={[base, COLOR_STYLES[color]].join(' ')}>
        {children}
      </a>
    )
  }
  return (
    <button onClick={onClick} disabled={disabled} className={[base, COLOR_STYLES[color]].join(' ')}>
      {children}
    </button>
  )
}
