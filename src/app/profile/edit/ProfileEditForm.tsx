'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { updateProfile, deletePortfolioItem, addPortfolioItem } from './actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ProfileAvatarUpload } from '@/components/profile/ProfileAvatarUpload'
import type { Profile, PortfolioItem } from '@/types'

interface Props {
  profile: Profile
  portfolioItems: PortfolioItem[]
}

export function ProfileEditForm({ profile, portfolioItems: initialItems }: Props) {
  const [portfolioItems, setPortfolioItems] = useState(initialItems)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url ?? null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const supabase = createClient()

  async function handleAddPhoto(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)

    try {
      const uid = profile.id
      const ts = Date.now()

      for (let i = 0; i < Math.min(files.length, 10 - portfolioItems.length); i++) {
        const file = files[i]
        const ext = file.name.split('.').pop()
        const path = `${uid}/${ts}-${i}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('portfolio')
          .upload(path, file, { cacheControl: '3600', upsert: false })

        if (uploadError) throw new Error(uploadError.message)

        const { data } = supabase.storage.from('portfolio').getPublicUrl(path)
        const result = await addPortfolioItem(data.publicUrl)
        if (result.error) throw new Error(result.error)

        setPortfolioItems((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            profile_id: uid,
            image_url: data.publicUrl,
            caption: null,
            order_index: prev.length,
            created_at: new Date().toISOString(),
          },
        ])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il caricamento.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(itemId: string) {
    const result = await deletePortfolioItem(itemId)
    if (result.error) { setError(result.error); return }
    setPortfolioItems((prev) => prev.filter((i) => i.id !== itemId))
  }

  return (
    <form
      action={(formData) => {
        setError(null)
        startTransition(async () => {
          const result = await updateProfile(formData)
          if (result?.error) setError(result.error)
        })
      }}
      className="space-y-8"
    >
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Campo hidden avatar_url */}
      <input type="hidden" name="avatar_url" value={avatarUrl ?? ''} />

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <ProfileAvatarUpload
          profileId={profile.id}
          avatarUrl={avatarUrl}
          role={profile.role}
          onUpload={setAvatarUrl}
        />
        <div>
          <p className="text-sm font-medium">Foto profilo</p>
          <p className="text-xs text-neutral-500 mt-0.5">Clicca sull&apos;icona per caricare</p>
        </div>
      </div>

      {/* Campi testo */}
      <section className="space-y-4">
        <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Informazioni</h2>

        <Input
          label="Nome completo"
          name="full_name"
          defaultValue={profile.full_name}
          required
          minLength={2}
          placeholder="Mario Rossi"
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-300">Bio</label>
          <textarea
            name="bio"
            defaultValue={profile.bio ?? ''}
            placeholder="Racconta chi sei, il tuo stile, cosa cerchi..."
            rows={4}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20 resize-none"
          />
        </div>

        <Input
          label="Città"
          name="city"
          defaultValue={profile.city ?? ''}
          placeholder="Milano"
        />

        <Input
          label="Instagram"
          name="instagram_url"
          defaultValue={profile.instagram_url ?? ''}
          placeholder="@username"
        />
      </section>

      {/* Portfolio */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Portfolio / Book
          </h2>
          <span className="text-xs text-neutral-600">{portfolioItems.length}/10</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {portfolioItems.map((item) => (
            <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden border border-neutral-700 group">
              <Image src={item.image_url} alt="Portfolio" fill className="object-cover" />
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white cursor-pointer"
              >
                Rimuovi
              </button>
            </div>
          ))}

          {portfolioItems.length < 10 && (
            <label className={[
              'aspect-square rounded-lg border border-dashed border-neutral-700 hover:border-neutral-500 cursor-pointer transition-colors flex items-center justify-center',
              uploading ? 'opacity-50 pointer-events-none' : '',
            ].join(' ')}>
              <span className="text-2xl text-neutral-600">{uploading ? '…' : '+'}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleAddPhoto(e.target.files)}
              />
            </label>
          )}
        </div>
      </section>

      <Button type="submit" loading={isPending} className="w-full">
        Salva modifiche
      </Button>
    </form>
  )
}
