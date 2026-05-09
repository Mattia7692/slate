'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sendMessage } from './actions'
import type { MessageWithSender } from '@/types'

interface ChatBoxProps {
  projectId: string
  currentUserId: string
  initialMessages: MessageWithSender[]
}

export function ChatBox({ projectId, currentUserId, initialMessages }: ChatBoxProps) {
  const [messages, setMessages] = useState<MessageWithSender[]>(initialMessages)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  // Stable client ref — avoids recreating the client on every render
  const supabaseRef = useRef(createClient())

  // Realtime subscription
  useEffect(() => {
    const supabase = supabaseRef.current
    const channel = supabase
      .channel(`project-chat-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `project_id=eq.${projectId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select('*, sender:profiles!messages_sender_id_fkey(id, full_name, role)')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) return prev
              return [...prev, data as MessageWithSender]
            })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId])

  // Scroll to bottom su nuovi messaggi
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!text.trim() || sending) return
    const content = text.trim()
    setSending(true)
    setText('')
    await sendMessage(projectId, content)
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-96 rounded-xl border border-neutral-800 bg-neutral-900/30 overflow-hidden">
      {/* Messaggi */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-neutral-600 text-center py-8">
            Nessun messaggio. Inizia la conversazione.
          </p>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId

          return (
            <div
              key={msg.id}
              className={['flex gap-2', isMe ? 'flex-row-reverse' : 'flex-row'].join(' ')}
            >
              {/* Avatar */}
              <div className={[
                'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                msg.sender.role === 'photographer' ? 'bg-sky-500/20 text-sky-400' : 'bg-rose-500/20 text-rose-400',
              ].join(' ')}>
                {msg.sender.role === 'photographer' ? 'F' : 'M'}
              </div>

              {/* Bubble */}
              <div
                className={[
                  'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                  isMe
                    ? 'rounded-tr-sm bg-white text-neutral-950'
                    : 'rounded-tl-sm bg-neutral-800 text-neutral-100',
                ].join(' ')}
              >
                {!isMe && (
                  <p className="text-xs font-medium mb-0.5 opacity-60">{msg.sender.full_name}</p>
                )}
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <p className={['text-xs mt-0.5', isMe ? 'text-neutral-500' : 'text-neutral-600'].join(' ')}>
                  {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-neutral-800 p-3 flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Scrivi un messaggio... (Invio per inviare)"
          rows={1}
          className="flex-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3.5 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 resize-none"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="rounded-lg bg-white text-neutral-950 px-3.5 py-2 text-sm font-medium disabled:opacity-40 hover:bg-neutral-100 transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          Invia
        </button>
      </div>
    </div>
  )
}
