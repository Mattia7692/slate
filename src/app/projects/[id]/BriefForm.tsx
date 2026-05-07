'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { saveBrief, signBrief } from './actions'
import type { Brief, BriefFormData, ShootUsage } from '@/types'

const SHOOT_TYPES = [
  'Fashion editorial',
  'Commercial',
  'Beauty',
  'Ritratto',
  'Lingerie / Swimwear',
  'Artistico / Fine Art',
  'Sportivo',
  'Corporate',
  'Altro',
]

const USAGE_OPTIONS: { value: ShootUsage; label: string; sub: string }[] = [
  { value: 'portfolio_only', label: 'Solo portfolio', sub: 'Uso personale, no pubblicazione commerciale' },
  { value: 'social', label: 'Social media', sub: 'Pubblicazione su canali social personali' },
  { value: 'commercial', label: 'Commerciale', sub: 'Pubblicità, stampa, uso commerciale' },
]

interface BriefFormProps {
  projectId: string
  existingBrief: Brief | null
  mySignedAt: string | null
  otherSignedAt: string | null
  canEdit: boolean
}

export function BriefForm({
  projectId,
  existingBrief,
  mySignedAt,
  otherSignedAt,
  canEdit,
}: BriefFormProps) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(!existingBrief)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [form, setForm] = useState<BriefFormData>({
    shoot_type: existingBrief?.shoot_type ?? '',
    shoot_date: existingBrief?.shoot_date ?? '',
    duration_hours: existingBrief?.duration_hours ?? 4,
    location_description: existingBrief?.location_description ?? '',
    deliverables_count: existingBrief?.deliverables_count ?? 20,
    delivery_days: existingBrief?.delivery_days ?? 14,
    usage: existingBrief?.usage ?? 'portfolio_only',
    notes: existingBrief?.notes ?? '',
  })

  function set<K extends keyof BriefFormData>(key: K, value: BriefFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await saveBrief(projectId, form)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess('Brief salvato.')
        setIsEditing(false)
      }
    })
  }

  function handleSign() {
    setError(null)
    startTransition(async () => {
      const result = await signBrief(projectId)
      if (result.error) setError(result.error)
    })
  }

  // ── Read-only view ─────────────────────────────────────────────
  if (!isEditing && existingBrief) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo di shoot" value={existingBrief.shoot_type} />
          <Field label="Data" value={new Date(existingBrief.shoot_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })} />
          <Field label="Durata" value={`${existingBrief.duration_hours} ore`} />
          <Field label="Location" value={existingBrief.location_description} />
          <Field label="Foto da consegnare" value={`${existingBrief.deliverables_count} foto`} />
          <Field label="Tempi consegna" value={`${existingBrief.delivery_days} giorni`} />
          <Field
            label="Utilizzo immagini"
            value={USAGE_OPTIONS.find((u) => u.value === existingBrief.usage)?.label ?? existingBrief.usage}
          />
        </div>

        {existingBrief.notes && (
          <Field label="Note" value={existingBrief.notes} />
        )}

        {/* Firme */}
        <div className="flex gap-3 pt-2 flex-wrap">
          <SignBadge label="Fotografo" signedAt={existingBrief.signed_by_photographer_at} />
          <SignBadge label="Modella / Modello" signedAt={existingBrief.signed_by_model_at} />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3">
          {canEdit && !mySignedAt && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setIsEditing(true)} disabled={isPending}>
                Modifica
              </Button>
              <Button size="sm" loading={isPending} onClick={handleSign}>
                Firma brief
              </Button>
            </>
          )}
          {mySignedAt && !otherSignedAt && (
            <p className="text-sm text-neutral-500">
              Hai firmato. In attesa della firma dell&apos;altro partecipante.
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── Form edit ──────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {success}
        </div>
      )}

      {/* Tipo shoot */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-300">Tipo di shoot</label>
        <div className="flex flex-wrap gap-2">
          {SHOOT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set('shoot_type', t)}
              className={[
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                form.shoot_type === t
                  ? 'border-white bg-white/10 text-white'
                  : 'border-neutral-700 text-neutral-400 hover:border-neutral-500',
              ].join(' ')}
            >
              {t}
            </button>
          ))}
        </div>
        {form.shoot_type === 'Altro' && (
          <Input
            placeholder="Descrivi il tipo di shoot"
            value={form.shoot_type === 'Altro' ? '' : form.shoot_type}
            onChange={(e) => set('shoot_type', e.target.value)}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Data shoot"
          type="date"
          value={form.shoot_date}
          onChange={(e) => set('shoot_date', e.target.value)}
          required
        />
        <Input
          label="Durata (ore)"
          type="number"
          min={1}
          max={12}
          step={0.5}
          value={form.duration_hours}
          onChange={(e) => set('duration_hours', parseFloat(e.target.value) || 1)}
          required
        />
        <Input
          label="Foto da consegnare"
          type="number"
          min={1}
          value={form.deliverables_count}
          onChange={(e) => set('deliverables_count', parseInt(e.target.value) || 1)}
          required
        />
        <Input
          label="Giorni per la consegna"
          type="number"
          min={1}
          value={form.delivery_days}
          onChange={(e) => set('delivery_days', parseInt(e.target.value) || 1)}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-300">Location</label>
        <textarea
          value={form.location_description}
          onChange={(e) => set('location_description', e.target.value)}
          placeholder="Descrivi la location: indirizzo, studio, esterno..."
          rows={2}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20 resize-none"
        />
      </div>

      {/* Utilizzo */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-neutral-300">Utilizzo delle immagini</label>
        {USAGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => set('usage', opt.value)}
            className={[
              'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors cursor-pointer',
              form.usage === opt.value
                ? 'border-white bg-white/5'
                : 'border-neutral-800 hover:border-neutral-600',
            ].join(' ')}
          >
            <div
              className={[
                'mt-0.5 w-4 h-4 rounded-full border-2 shrink-0',
                form.usage === opt.value ? 'border-white bg-white' : 'border-neutral-600',
              ].join(' ')}
            />
            <div>
              <p className="text-sm font-medium">{opt.label}</p>
              <p className="text-xs text-neutral-500 mt-0.5">{opt.sub}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-300">
          Note <span className="text-neutral-600 font-normal">(opzionale)</span>
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Moodboard, riferimenti, richieste particolari..."
          rows={3}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:border-neutral-500 focus:ring-neutral-500/20 resize-none"
        />
      </div>

      <div className="flex gap-3">
        {existingBrief && (
          <Button variant="secondary" onClick={() => setIsEditing(false)} disabled={isPending}>
            Annulla
          </Button>
        )}
        <Button loading={isPending} onClick={handleSave}>
          Salva brief
        </Button>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-sm text-neutral-200">{value}</p>
    </div>
  )
}

function SignBadge({ label, signedAt }: { label: string; signedAt: string | null }) {
  return (
    <div
      className={[
        'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs',
        signedAt
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
          : 'border-neutral-700 text-neutral-500',
      ].join(' ')}
    >
      <span>{signedAt ? '✓' : '○'}</span>
      <span>{label}</span>
      {signedAt && (
        <span className="text-emerald-600">
          {new Date(signedAt).toLocaleDateString('it-IT')}
        </span>
      )}
    </div>
  )
}
