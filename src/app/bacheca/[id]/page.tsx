import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppNav } from '@/components/layout/AppNav'
import { PartecipaModal } from './PartecipaModal'
import { CloseVisionButton } from './CloseVisionButton'
import type { VisionWithCreator, Notification } from '@/types'

const ROLE_LABEL = { photographer: 'Fotografo', model: 'Modella / Modello' }
const ROLE_STYLE = {
  photographer: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  model: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
}

export default async function VisionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()
  const [{ data: rawVision }, { data: myProfile }, { data: rawNotifications }] = await Promise.all([
    supabase
      .from('visions')
      .select(`
        *,
        creator:profiles!visions_creator_id_fkey(id, full_name, role, avatar_url, level),
        images:vision_images(id, image_url, order_index)
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('profiles')
      .select('id, role, level, status, full_name, avatar_url')
      .eq('id', user.id)
      .single(),
    adminClient.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
  ])

  const notifications = (rawNotifications ?? []) as Notification[]
  const userInitials = (myProfile?.full_name ?? '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  if (!rawVision) notFound()
  const vision = rawVision as unknown as VisionWithCreator

  const isOwner = user.id === vision.creator_id
  const canPartecipa =
    !isOwner &&
    myProfile?.status === 'approved' &&
    myProfile?.role !== vision.creator.role  // opposite roles required

  const sortedImages = [...vision.images].sort((a, b) => a.order_index - b.order_index)

  return (
    <div className="min-h-screen">
      <AppNav userInitials={userInitials} userId={user.id} avatarUrl={myProfile?.avatar_url ?? null} notifications={notifications} />

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        {/* Gallery */}
        {sortedImages.length > 0 && (
          <div className={[
            'grid gap-2',
            sortedImages.length === 1 ? 'grid-cols-1' :
            sortedImages.length === 2 ? 'grid-cols-2' :
            'grid-cols-3',
          ].join(' ')}>
            {sortedImages.map((img, i) => (
              <div
                key={img.id}
                className={[
                  'relative overflow-hidden rounded-xl bg-neutral-800',
                  sortedImages.length >= 3 && i === 0 ? 'col-span-2 row-span-2' : '',
                  'aspect-square',
                ].join(' ')}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.image_url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold leading-tight">{vision.title}</h1>
              <p className="text-xs text-neutral-600">
                {new Date(vision.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <span className={[
              'text-xs font-semibold px-3 py-1 rounded-full border shrink-0',
              ROLE_STYLE[vision.role_needed],
            ].join(' ')}>
              Cerca {ROLE_LABEL[vision.role_needed]}
            </span>
          </div>

          {vision.description && (
            <p className="text-sm text-neutral-400 leading-relaxed whitespace-pre-wrap">
              {vision.description}
            </p>
          )}
        </div>

        {/* Creator */}
        <div className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-3">
          <Link href={`/profile/${vision.creator.id}`} className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-full bg-neutral-700 overflow-hidden shrink-0">
              {vision.creator.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={vision.creator.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-neutral-500">
                  {vision.creator.full_name[0]}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium">{vision.creator.full_name}</p>
              <p className="text-xs text-neutral-500">
                {ROLE_LABEL[vision.creator.role]} · Lv.{vision.creator.level}
              </p>
            </div>
          </Link>
          {isOwner && (
            <span className="text-xs text-neutral-600 font-medium">La tua visione</span>
          )}
        </div>

        {/* CTA */}
        {vision.status === 'open' && (
          <div className="pt-2">
            {canPartecipa && myProfile ? (
              <PartecipaModal
                creatorId={vision.creator.id}
                creatorName={vision.creator.full_name}
                creatorLevel={vision.creator.level}
                creatorRole={vision.creator.role}
                currentLevel={myProfile.level}
                currentRole={myProfile.role}
              />
            ) : isOwner ? (
              <CloseVisionButton visionId={vision.id} />
            ) : !canPartecipa && myProfile?.status === 'approved' ? (
              <p className="text-sm text-neutral-600">
                Solo {ROLE_LABEL[vision.role_needed].toLowerCase() === 'fotografo' ? 'i fotografi' : 'le modelle e i modelli'} possono partecipare a questa visione.
              </p>
            ) : null}
          </div>
        )}

        {vision.status === 'closed' && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 px-5 py-4 text-sm text-neutral-500">
            Questa visione è chiusa.
          </div>
        )}
      </div>
    </div>
  )
}
