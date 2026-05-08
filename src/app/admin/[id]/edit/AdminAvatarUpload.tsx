'use client'

import { useRef, useState, useTransition } from 'react'
import { uploadAvatarAdmin } from './actions'
import type { UserRole } from '@/types'

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface Props {
  profileId: string
  avatarUrl: string | null
  fullName: string
  role: UserRole
}

export function AdminAvatarUpload({ profileId, avatarUrl, fullName, role }: Props) {
  const [preview, setPreview] = useState<string | null>(avatarUrl)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)

    // Ottimistic preview
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)

    const fd = new FormData()
    fd.append('file', file)

    startTransition(async () => {
      const result = await uploadAvatarAdmin(profileId, fd)
      URL.revokeObjectURL(objectUrl)
      if (result.error) {
        setError(result.error)
        setPreview(avatarUrl)
      } else if (result.url) {
        setPreview(result.url)
      }
    })
  }

  const roleLabel = role === 'photographer' ? 'Fotografo' : 'Modella / Modello'

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Foto profilo</p>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          title="Cambia foto profilo"
          className="relative w-16 h-16 rounded-2xl bg-neutral-800 overflow-hidden flex items-center justify-center group focus:outline-none shrink-0"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-neutral-500">{getInitials(fullName)}</span>
          )}

          {/* Overlay hover */}
          <span className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {isPending ? (
              <span className="text-xs text-white">…</span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            )}
          </span>
        </button>

        <div className="text-xs text-neutral-500 leading-relaxed">
          <p className="font-medium text-neutral-300">{fullName}</p>
          <p>{roleLabel}</p>
          <p className="mt-1 text-neutral-600">Clicca l&apos;immagine per cambiare</p>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  )
}
