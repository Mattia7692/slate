'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
    <section className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 space-y-4">
      <h2 className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Azioni profilo</h2>

      {/* Stato */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Stato account</p>
        <div className="flex flex-wrap gap-2">
          {currentStatus !== 'approved' && (
            <ActionBtn
              onClick={() => handleStatus(approveProfile)}
              disabled={isPending}
              color="green"
            >
              Approva
            </ActionBtn>
          )}
          {currentStatus !== 'suspended' && !isSelf && (
            <ActionBtn
              onClick={() => handleStatus(suspendProfile)}
              disabled={isPending}
              color="red"
            >
              Sospendi
            </ActionBtn>
          )}
          {currentStatus !== 'pending' && (
            <ActionBtn
              onClick={() => handleStatus(setPendingProfile)}
              disabled={isPending}
              color="neutral"
            >
              Rimetti in attesa
            </ActionBtn>
          )}
        </div>
      </div>

      {/* Modifica profilo */}
      {(!isFounderProfile || currentIsFounder) && (
        <div className="border-t border-orange-500/10 pt-3 space-y-1.5">
          <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Profilo</p>
          <Link
            href={`/admin/${profileId}/edit`}
            className="inline-flex items-center gap-1.5 text-sm text-neutral-300 hover:text-white transition-colors"
          >
            Modifica profilo
            <span className="text-neutral-600">→</span>
          </Link>
        </div>
      )}

      {/* Promuovi / Revoca admin */}
      {currentIsFounder && !isFounderProfile && (
        <div className="border-t border-orange-500/10 pt-3 space-y-1.5">
          <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Permessi</p>
          {confirmAdmin ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-400">
                {isAdmin
                  ? 'Rimuovere i permessi admin?'
                  : `Promuovere ${profileName.split(' ')[0]} ad admin?`}
              </span>
              <button
                onClick={handleToggleAdmin}
                disabled={isPending}
                className="text-xs font-medium px-2.5 py-1 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white transition-colors disabled:opacity-50"
              >
                {isPending ? '...' : 'Conferma'}
              </button>
              <button
                onClick={() => setConfirmAdmin(false)}
                className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Annulla
              </button>
            </div>
          ) : (
            <button
              onClick={handleToggleAdmin}
              className={[
                'text-sm font-medium transition-colors',
                isAdmin
                  ? 'text-red-400 hover:text-red-300'
                  : 'text-violet-400 hover:text-violet-300',
              ].join(' ')}
            >
              {isAdmin ? 'Revoca admin' : 'Promuovi ad admin'}
            </button>
          )}
        </div>
      )}

      {/* Elimina profilo */}
      {!isFounderProfile && !isSelf && (
        <div className="border-t border-orange-500/10 pt-3 space-y-1.5">
          <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Zona pericolosa</p>
          {confirmDelete ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-red-400 font-medium">
                Eliminare definitivamente {profileName}?
              </span>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="text-xs font-medium px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Eliminazione...' : 'Conferma'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Annulla
              </button>
            </div>
          ) : (
            <button
              onClick={handleDelete}
              className="text-sm text-neutral-600 hover:text-red-400 transition-colors"
            >
              Elimina profilo
            </button>
          )}
        </div>
      )}
    </section>
  )
}

function ActionBtn({
  children,
  onClick,
  disabled,
  color,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled: boolean
  color: 'green' | 'red' | 'neutral'
}) {
  const styles = {
    green: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25',
    red: 'bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25',
    neutral: 'bg-neutral-700/50 border-neutral-600/50 text-neutral-300 hover:bg-neutral-700',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50',
        styles[color],
      ].join(' ')}
    >
      {children}
    </button>
  )
}
