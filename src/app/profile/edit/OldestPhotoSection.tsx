'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { readPhotoExif, type PhotoExif } from '@/lib/exif'
import { updateOldestPhoto } from './actions'

interface Props {
  profileId: string
  initialSignedUrl: string | null
  initialDate: string | null
  initialExif: PhotoExif | null
}

export function OldestPhotoSection({ profileId, initialSignedUrl, initialDate, initialExif }: Props) {
  const [preview, setPreview] = useState<string | null>(initialSignedUrl)
  const [date, setDate] = useState<string | null>(initialDate)
  const [exif, setExif] = useState<PhotoExif | null>(initialExif)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleFile(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setError(null)

    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)

    const photoExif = await readPhotoExif(file)
    setExif(photoExif)
    setDate(photoExif?.date ?? null)

    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${profileId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('oldest-photos')
        .upload(path, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw new Error(uploadError.message)

      const { data: signed } = await supabase.storage
        .from('oldest-photos')
        .createSignedUrl(path, 3600)

      URL.revokeObjectURL(objectUrl)
      if (signed?.signedUrl) setPreview(signed.signedUrl)

      const { data: pub } = supabase.storage.from('oldest-photos').getPublicUrl(path)
      const result = await updateOldestPhoto(pub.publicUrl, photoExif?.date ?? null, photoExif as unknown as Record<string, unknown> | null)
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
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative w-full sm:w-56 aspect-video rounded-xl overflow-hidden border border-neutral-800 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Foto anzianità" className="absolute inset-0 w-full h-full object-cover" />
            </div>

            {/* EXIF panel — stile Lightroom */}
            <div className="flex-1 rounded-xl border border-neutral-800 bg-neutral-900 p-3 space-y-2 text-xs font-mono">
              <p className="text-neutral-500 uppercase tracking-wider text-[10px] mb-2">Metadati EXIF</p>
              <ExifRow label="Data" value={date ? new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : null} />
              <ExifRow label="Camera" value={exif?.camera ?? null} />
              <ExifRow label="Obiettivo" value={exif?.lens ?? null} />
              <ExifRow label="Focale" value={exif?.focal_length ?? null} />
              <ExifRow label="Apertura" value={exif?.aperture ?? null} />
              <ExifRow label="Esposizione" value={exif?.shutter ?? null} />
              <ExifRow label="ISO" value={exif?.iso != null ? String(exif.iso) : null} />
              {!date && !exif?.camera && !exif?.lens && (
                <p className="text-neutral-600 text-[11px] font-sans">Nessun dato EXIF disponibile.</p>
              )}
            </div>
          </div>

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

function ExifRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-neutral-600 text-[10px] uppercase tracking-wider shrink-0">{label}</span>
      <span className="text-neutral-300 text-right">{value}</span>
    </div>
  )
}
