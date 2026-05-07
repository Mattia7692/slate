'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types'

const ROLE_BADGE: Record<UserRole, string> = {
  photographer: '📷',
  model: '🧍',
}

interface ProfileAvatarUploadProps {
  profileId: string
  avatarUrl: string | null
  role: UserRole
  onUpload: (url: string) => void
}

export function ProfileAvatarUpload({ profileId, avatarUrl, role, onUpload }: ProfileAvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(avatarUrl)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleFile(file: File | undefined) {
    if (!file) return
    setUploading(true)

    try {
      const ext = file.name.split('.').pop()
      const path = `${profileId}/avatar.${ext}`

      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { cacheControl: '3600', upsert: true })

      if (error) throw error

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      // Bust cache aggiungendo timestamp
      const url = `${data.publicUrl}?t=${Date.now()}`
      setPreview(url)
      onUpload(url)
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative shrink-0 w-16 h-16">
      {/* Avatar / placeholder */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative w-full h-full rounded-2xl bg-neutral-800 overflow-hidden flex items-center justify-center cursor-pointer group focus:outline-none"
        title="Cambia foto profilo"
      >
        {preview ? (
          <Image src={preview} alt="Avatar" fill className="object-cover" />
        ) : (
          <span className="text-3xl">{ROLE_BADGE[role]}</span>
        )}

        {/* Overlay hover */}
        <span className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading ? (
            <span className="text-xs text-white">…</span>
          ) : (
            <span className="text-lg">📸</span>
          )}
        </span>
      </button>

      {/* Badge ruolo */}
      {preview && (
        <span className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-neutral-900 border border-neutral-700 text-lg leading-none pointer-events-none">
          {ROLE_BADGE[role]}
        </span>
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
