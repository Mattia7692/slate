'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { readPhotoExif, type PhotoExif } from '@/lib/exif'
import { updateOldestPhoto, clearOldestPhoto } from './actions'

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
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleFile(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setError(null)
    setConfirmDelete(false)

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

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    setError(null)
    const result = await clearOldestPhoto()
    if (result?.error) {
      setError(result.error)
      setDeleting(false)
      return
    }
    setPreview(null)
    setDate(null)
    setExif(null)
    setConfirmDelete(false)
    setDeleting(false)
  }

  const hasExif = date || exif?.camera || exif?.lens || exif?.aperture || exif?.shutter || exif?.iso

  return (
    <section className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-medium text-amber-400 uppercase tracking-wider">
            Prima foto professionale
          </h2>
          <p className="text-xs text-neutral-600 mt-0.5">
            Visibile solo a te e agli amministratori — non appare nel tuo profilo pubblico
          </p>
        </div>
      </div>

      {preview ? (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Foto */}
            <div className="relative w-full sm:w-56 aspect-video rounded-xl overflow-hidden border border-neutral-800 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Prima foto professionale" className="absolute inset-0 w-full h-full object-cover" />
            </div>

            {/* EXIF panel */}
            <div className="flex-1 rounded-xl border border-neutral-800 bg-neutral-900 p-3 space-y-2 text-xs font-mono">
              <p className="text-neutral-500 uppercase tracking-wider text-[10px] mb-2">Metadati EXIF</p>
              {hasExif ? (
                <>
                  <ExifRow label="Data" value={date ? new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : null} />
                  <ExifRow label="Camera" value={exif?.camera ?? null} />
                  <ExifRow label="Obiettivo" value={exif?.lens ?? null} />
                  <ExifRow label="Focale" value={exif?.focal_length ?? null} />
                  <ExifRow label="Apertura" value={exif?.aperture ?? null} />
                  <ExifRow label="Esposizione" value={exif?.shutter ?? null} />
                  <ExifRow label="ISO" value={exif?.iso != null ? String(exif.iso) : null} />
                </>
              ) : (
                <p className="text-neutral-600 text-[11px] font-sans">Nessun dato EXIF disponibile.</p>
              )}
            </div>
          </div>

          {/* Azioni */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => { setConfirmDelete(false); inputRef.current?.click() }}
              disabled={uploading || deleting}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-50"
            >
              {uploading ? 'Caricamento in corso...' : 'Sostituisci →'}
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={uploading || deleting}
              className={[
                'text-xs transition-colors disabled:opacity-50',
                confirmDelete
                  ? 'text-red-400 hover:text-red-300 font-medium'
                  : 'text-neutral-600 hover:text-red-400',
              ].join(' ')}
            >
              {deleting ? 'Eliminazione...' : confirmDelete ? 'Conferma eliminazione' : 'Elimina foto'}
            </button>

            {confirmDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
              >
                Annulla
              </button>
            )}
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-40 rounded-xl border border-dashed border-amber-500/30 hover:border-amber-500/60 cursor-pointer transition-colors">
          <span className="text-2xl text-neutral-600 mb-2">📎</span>
          <span className="text-sm text-neutral-500">Carica la tua prima foto professionale</span>
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
