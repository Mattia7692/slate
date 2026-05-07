'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { approveProfile, suspendProfile, setPendingProfile } from '../actions'
import type { ProfileStatus } from '@/types'

interface AdminProfileActionsProps {
  profileId: string
  currentStatus: ProfileStatus
  isSelf?: boolean
}

export function AdminProfileActions({ profileId, currentStatus, isSelf = false }: AdminProfileActionsProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function handleAction(action: (id: string) => Promise<{ error: string | null }>) {
    startTransition(async () => {
      const result = await action(profileId)
      if (!result.error) {
        router.refresh()
      } else {
        alert(result.error)
      }
    })
  }

  return (
    <div className="flex gap-2 shrink-0">
      {currentStatus !== 'approved' && (
        <Button
          size="sm"
          variant="primary"
          loading={isPending}
          onClick={() => handleAction(approveProfile)}
        >
          Approva
        </Button>
      )}
      {currentStatus !== 'suspended' && !isSelf && (
        <Button
          size="sm"
          variant="danger"
          loading={isPending}
          onClick={() => handleAction(suspendProfile)}
        >
          Sospendi
        </Button>
      )}
      {currentStatus !== 'pending' && (
        <Button
          size="sm"
          variant="ghost"
          loading={isPending}
          onClick={() => handleAction(setPendingProfile)}
        >
          Rimetti in attesa
        </Button>
      )}
    </div>
  )
}
