'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { proposeCollaboration } from './actions'

interface ProposeButtonProps {
  targetProfileId: string
  targetName: string
}

export function ProposeButton({ targetProfileId, targetName }: ProposeButtonProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handlePropose() {
    startTransition(async () => {
      const result = await proposeCollaboration(targetProfileId)
      if (result.projectId) {
        router.push(`/projects/${result.projectId}`)
      } else if (result.error) {
        alert(result.error)
      }
    })
  }

  return (
    <Button size="lg" loading={isPending} onClick={handlePropose}>
      Proponi collaborazione a {targetName}
    </Button>
  )
}
