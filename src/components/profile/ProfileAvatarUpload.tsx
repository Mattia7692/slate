'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types'

const ROLE_COLOR: Record<UserRole, string> = {
  photographer: 'bg-sky-500/20 text-sky-400',
  model:        'bg-rose-500/20 text-rose-400',
}

const ROLE_DOT: Record<UserRole, string> = {
  photographer: 'bg-sky-500',
  model:        'bg-rose-500',
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
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={[
          'relative w-full h-full rounded-2xl overflow-hidden flex items-center justify-center cursor-pointer group focus:outline-none font-semibold text-2xl',
          preview ? 'bg-neutral-800' : ROLE_COLOR[role],
        ].join(' ')}
        title="Cambia foto profilo"
      >
        {preview ? (
          <Image src={preview} alt="Avatar" fill className="object-cover" />
        ) : (
          <span>{role === 'photographer' ? 'F' : 'M'}</span>
        )}

        <span className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading ? (
            <span className="text-xs text-white">…</span>
          ) : (
            <span className="text-sm text-white font-medium">Cambia</span>
          )}
        </span>
      </button>

      {/* Dot ruolo */}
      <span
        className={[
          'absolute bottom-0 right-0 translate-x-0.5 translate-y-0.5 w-4 h-4 rounded-full border-2 border-neutral-950 pointer-events-none',
          ROLE_DOT[role],
        ].join(' ')}
      />

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
