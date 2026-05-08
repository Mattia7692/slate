'use client'

import { useState, useRef } from 'react'
import exifr from 'exifr'
import { createClient } from '@/lib/supabase/client'
import { updateOldestPhoto } from './actions'

interface Props {
  profileId: string
  initialSignedUrl: string | null
  initialDate: string | null
}

export function OldestPhotoSection({ profileId, initialSignedUrl, initialDate }: Props) {
  const [preview, setPreview] = useState<string | null>(initialSignedUrl)
  const [date, setDate] = useState<string | null>(initialDate)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleFile(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setError(null)

    // Preview ottimistico
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)

    // Leggi EXIF
    let exifDate: string | null = null
    try {
      const exif = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate'])
      const raw = exif?.DateTimeOriginal ?? exif?.CreateDate
      if (raw) {
        const d = raw instanceof Date ? raw : new Date(raw)
        if (!isNaN(d.getTime())) exifDate = d.toISOString()
      }
    } catch { /* nessun EXIF */ }
    setDate(exifDate)

    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${profileId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('oldest-photos')
        .upload(path, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw new Error(uploadError.message)

      // URL firmato per la preview (bucket privato)
      const { data: signed } = await supabase.storage
        .from('oldest-photos')
        .createSignedUrl(path, 3600)

      URL.revokeObjectURL(objectUrl)
      if (signed?.signedUrl) setPreview(signed.signedUrl)

      // Salviamo il public URL come riferimento nel DB (l'admin legge via signed URL server-side)
      const { data: pub } = supabase.storage.from('oldest-photos').getPublicUrl(path)
      const result = await updateOldestPhoto(pub.publicUrl, exifDate)
      if (result?.error) throw new Error(result.error)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il caricamento.')
      setPreview(initialSignedUrl)
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-neutral-700 bg-neutral-900/40 p-4">
      <div>
        <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
          Foto di anzianità
        </h2>
        <p className="text-xs text-neutral-600 mt-0.5">
          Visibile solo a te e agli amministratori — non appare nel tuo profilo pubblico
        </p>
      </div>

      {preview ? (
        <div className="space-y-3">
          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-neutral-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Foto anzianità" className="absolute inset-0 w-full h-full object-cover" />
          </div>

          {date ? (
            <p className="text-xs text-neutral-500">
              Data EXIF rilevata:{' '}
              <span className="text-neutral-300 font-medium">
                {new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </p>
          ) : (
            <p className="text-xs text-neutral-600">Dati EXIF non disponibili per questa foto.</p>
          )}

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-50"
          >
            {uploading ? 'Caricamento in corso...' : 'Sostituisci con una foto più vecchia →'}
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-40 rounded-xl border border-dashed border-neutral-700 active:border-neutral-500 hover:border-neutral-500 cursor-pointer transition-colors">
          <span className="text-2xl text-neutral-600 mb-2">📎</span>
          <span className="text-sm text-neutral-500">Carica la tua foto più vecchia</span>
          <span className="text-xs text-neutral-600 mt-1">JPG, PNG, WebP</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </section>
  )
}
