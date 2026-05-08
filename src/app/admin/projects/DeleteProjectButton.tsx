'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteProject } from './actions'

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const [confirm, setConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm) { setConfirm(true); return }
    startTransition(async () => {
      const result = await deleteProject(projectId)
      if (result.error) { alert(result.error); return }
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2">
      {confirm && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirm(false) }}
          className="text-[11px] text-neutral-600 hover:text-neutral-400 transition-colors"
        >
          Annulla
        </button>
      )}
      <button
        onClick={handleClick}
        disabled={isPending}
        className={[
          'text-[11px] font-medium transition-colors disabled:opacity-50',
          confirm ? 'text-red-400 hover:text-red-300' : 'text-neutral-600 hover:text-red-400',
        ].join(' ')}
      >
        {isPending ? '...' : confirm ? 'Conferma' : 'Elimina'}
      </button>
    </div>
  )
}
