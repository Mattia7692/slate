'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { generateInviteCode } from './actions'

export function GenerateInviteButton({ adminProfileId }: { adminProfileId: string }) {
  const [isPending, startTransition] = useTransition()
  const [newCode, setNewCode] = useState<string | null>(null)
  const router = useRouter()

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateInviteCode(adminProfileId)
      if (result.code) {
        setNewCode(result.code)
        router.refresh()
      } else if (result.error) {
        alert(result.error)
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      {newCode && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
          <span className="font-mono text-sm text-emerald-400 tracking-widest">{newCode}</span>
          <button
            onClick={() => { navigator.clipboard.writeText(newCode); }}
            className="text-xs text-emerald-600 hover:text-emerald-400 transition-colors cursor-pointer"
          >
            Copia
          </button>
        </div>
      )}
      <Button size="sm" loading={isPending} onClick={handleGenerate}>
        Genera codice
      </Button>
    </div>
  )
}
