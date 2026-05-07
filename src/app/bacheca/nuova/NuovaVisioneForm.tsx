'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createVision } from '../actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { UserRole } from '@/types'

const OPPOSITE: Record<UserRole, UserRole> = {
  photographer: 'model',
  model: 'photographer',
}

const ROLE_LABEL: Record<UserRole, string> = {
  photographer: 'un fotografo',
  model: 'una modella / modello',
}

export function NuovaVisioneForm({ currentRole }: { currentRole: UserRole }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Per default cerchi il ruolo opposto al tuo
  const roleNeeded = OPPOSITE[currentRole]

  const supabase = createClient()

  function handleImages(files: FileList | null) {
    if (!files) return
    const newFiles = Array.from(files).slice(0, 10 - imageFiles.length)
    setImageFiles((prev) => [...prev, ...newFiles])
    setImagePreviews((prev) => [...prev, ...newFiles.map((f) => URL.createObjectURL(f))])
  }

  function removeImage(i: number) {
    setImageFiles((prev) => prev.filter((_, idx) => idx !== i))
    setImagePreviews((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function uploadFile(file: File, path: string): Promise<string> {
    const { error } = await supabase.storage.from('visions').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })
    if (error) throw new Error(error.message)
    const { data } = supabase.storage.from('visions').getPublicUrl(path)
    return data.publicUrl
  }

  function handleSubmit() {
    if (!title.trim()) { setError('Il titolo è obbligatorio.'); return }
    if (imageFiles.length === 0) { setError('Carica almeno un\'immagine.'); return }

    setError(null)
    startTransition(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Sessione scaduta.')

        const ts = Date.now()
        const urls: string[] = []
        for (let i = 0; i < imageFiles.length; i++) {
          const ext = imageFiles[i].name.split('.').pop()
          const url = await uploadFile(imageFiles[i], `${user.id}/${ts}-${i}.${ext}`)
          urls.push(url)
        }

        const result = await createVision({
          title,
          description,
          role_needed: roleNeeded,
          image_urls: urls,
        })

        if (result?.error) setError(result.error)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore imprevisto.')
      }
    })
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <Input
        label="Titolo"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Es. Editorial dark fashion, Roma, giugno"
      />

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-neutral-300">Descrizione</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Racconta la tua idea: stile, mood, location, riferimenti..."
          rows={4}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20 resize-none"
        />
      </div>

      {/* Ruolo cercato — automatico, non modificabile */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-neutral-500">Stai cercando</p>
          <p className="text-sm font-medium mt-0.5">{ROLE_LABEL[roleNeeded]}</p>
        </div>
        <span className="text-xs text-neutral-600">basato sul tuo ruolo</span>
      </div>

      {/* Immagini */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-neutral-300">Immagini</label>
          <span className={['text-xs font-medium', imageFiles.length > 0 ? 'text-emerald-400' : 'text-neutral-600'].join(' ')}>
            {imageFiles.length}/10
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {imagePreviews.map((src, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-neutral-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <button
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 bg-black/60 rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-black/80 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
          {imageFiles.length < 10 && (
            <label className="aspect-square rounded-lg border border-dashed border-neutral-700 hover:border-neutral-500 cursor-pointer transition-colors flex items-center justify-center">
              <span className="text-2xl text-neutral-600">+</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImages(e.target.files)} />
            </label>
          )}
        </div>
        <p className="text-xs text-neutral-600">Almeno 1 immagine obbligatoria · max 10</p>
      </div>

      <Button onClick={handleSubmit} loading={isPending} className="w-full">
        Pubblica visione
      </Button>
    </div>
  )
}
