'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sendDirectMessage } from '../actions'
import type { DirectMessageWithSender } from '@/types'

const TIPS: Record<'photographer' | 'model', string[]> = {
  photographer: [
    'Presenta il tuo stile e il tipo di shooting che hai in mente.',
    'Specifica location, data indicativa e cosa offri in cambio.',
  ],
  model: [
    'Racconta brevemente la tua esperienza e cosa stai cercando.',
    'Chiedi info su utilizzo delle foto, consegna e diritti d\'immagine.',
  ],
}

interface DirectChatBoxProps {
  conversationId: string
  currentUserId: string
  currentUserRole: 'photographer' | 'model'
  initialMessages: DirectMessageWithSender[]
}

export function DirectChatBox({ conversationId, currentUserId, currentUserRole, initialMessages }: DirectChatBoxProps) {
  const [messages, setMessages] = useState<DirectMessageWithSender[]>(initialMessages)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`dm-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('direct_messages')
            .select('*, sender:profiles!direct_messages_sender_id_fkey(id, full_name, role)')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) return prev
              return [...prev, data as DirectMessageWithSender]
            })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, supabase])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!text.trim() || sending) return
    setSending(true)
    const content = text
    setText('')
    await sendDirectMessage(conversationId, content)
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Notice trasparenza */}
      <div className="mx-4 mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 space-y-2">
        <p className="text-xs font-medium text-amber-400">
          🔒 Le conversazioni su Slate sono visibili agli amministratori — sii sempre corretto e rispettoso.
        </p>
        <ul className="space-y-1">
          {TIPS[currentUserRole].map((tip, i) => (
            <li key={i} className="text-xs text-amber-400/70 flex items-start gap-1.5">
              <span className="mt-px shrink-0">·</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

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
            <div key={msg.id} className={['flex gap-2', isMe ? 'flex-row-reverse' : 'flex-row'].join(' ')}>
              <div className={[
                'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                msg.sender.role === 'photographer' ? 'bg-sky-500/20 text-sky-400' : 'bg-rose-500/20 text-rose-400',
              ].join(' ')}>
                {msg.sender.role === 'photographer' ? 'F' : 'M'}
              </div>
              <div className={[
                'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                isMe ? 'rounded-tr-sm bg-white text-neutral-950' : 'rounded-tl-sm bg-neutral-800 text-neutral-100',
              ].join(' ')}>
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
