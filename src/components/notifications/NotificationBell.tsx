'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { markNotificationRead, clearReadNotifications } from '@/app/invites/actions'
import { ProposalReviewModal } from './ProposalReviewModal'
import type { Notification, NotificationType } from '@/types'

interface NotificationBellProps {
  initialNotifications: Notification[]
  currentUserId: string
}

const TYPE_ICON: Record<NotificationType, string> = {
  invite_received: '📩',
  invite_accepted: '✅',
  invite_declined: '❌',
  project_update: '📋',
}

export function NotificationBell({ initialNotifications, currentUserId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [open, setOpen] = useState(false)
  const [openInviteId, setOpenInviteId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unread = notifications.filter((n) => !n.read).length

  // Chiudi dropdown cliccando fuori
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Supabase realtime
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUserId}` },
        (payload) => { setNotifications((prev) => [payload.new as Notification, ...prev]) }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUserId}` },
        (payload) => {
          setNotifications((prev) =>
            prev.map((n) => n.id === (payload.new as Notification).id ? (payload.new as Notification) : n)
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUserId])

  function handleNotificationClick(n: Notification) {
    // Inviti ricevuti → apri il modal proposta
    if (n.type === 'invite_received') {
      const inviteId = n.data?.invite_id as string | undefined
      if (!inviteId) return
      setOpen(false)
      setOpenInviteId(inviteId)
      // Segna come letta
      if (!n.read) {
        startTransition(async () => {
          await markNotificationRead(n.id)
          setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x))
        })
      }
      return
    }

    // Altre notifiche → naviga al progetto se presente
    if (!n.read) {
      startTransition(async () => {
        await markNotificationRead(n.id)
        setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x))
      })
    }
    const projectId = n.data?.project_id as string | undefined
    if (projectId) {
      setOpen(false)
      router.push(`/projects/${projectId}`)
    }
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="relative flex items-center justify-center w-8 h-8 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          aria-label="Notifiche"
        >
          <svg width="16" height="17" viewBox="0 0 16 17" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="1" x2="8" y2="2.5" />
            <path d="M3.5 13V7.5C3.5 5.015 5.515 3 8 3s4.5 2.015 4.5 4.5V13" />
            <line x1="1.5" y1="13" x2="14.5" y2="13" />
            <path d="M6.5 13.2a1.5 1.5 0 0 0 3 0" />
          </svg>
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center leading-none">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-10 w-80 rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Notifiche</p>
              {notifications.some((n) => n.read) && (
                <button
                  onClick={() => {
                    startTransition(async () => {
                      await clearReadNotifications()
                      setNotifications((prev) => prev.filter((n) => !n.read))
                    })
                  }}
                  className="text-[11px] text-neutral-600 hover:text-red-400 transition-colors"
                >
                  Elimina lette
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-neutral-600">Nessuna notifica</p>
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto divide-y divide-neutral-800/50">
                {notifications.map((n) => {
                  const isInvite = n.type === 'invite_received'
                  const hasAction = isInvite || !!(n.data?.project_id)
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={[
                        'px-4 py-3 transition-colors',
                        !n.read ? 'bg-neutral-900/60' : '',
                        hasAction ? 'cursor-pointer hover:bg-neutral-900' : '',
                      ].join(' ')}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-base leading-none mt-0.5 shrink-0">
                          {TYPE_ICON[n.type]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight">{n.title}</p>
                          {n.body && (
                            <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{n.body}</p>
                          )}
                          {isInvite && !n.read && (
                            <p className="text-[11px] text-neutral-500 mt-1">Tocca per vedere i dettagli →</p>
                          )}
                          <p className="text-[11px] text-neutral-700 mt-1">
                            {new Date(n.created_at).toLocaleDateString('it-IT', {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal proposta */}
      {openInviteId && (
        <ProposalReviewModal
          inviteId={openInviteId}
          currentUserId={currentUserId}
          onClose={() => {
            setOpenInviteId(null)
            setNotifications((prev) => prev.map((x) =>
              (x.data?.invite_id as string | undefined) === openInviteId ? { ...x, read: true } : x
            ))
          }}
        />
      )}
    </>
  )
}
