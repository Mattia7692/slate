import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { GenerateInviteButton } from './GenerateInviteButton'

export default async function InviteCodesPage() {
  const adminUser = await requireAdmin()
  const admin = createAdminClient()

  // Profilo dell'admin per usarlo come created_by
  const { data: adminProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('id', adminUser.id)
    .single()

  const { data: codes } = await admin
    .from('invite_codes')
    .select(`
      id,
      code,
      created_at,
      used_at,
      used_by,
      profiles!invite_codes_used_by_fkey ( full_name, role )
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Codici invito</h1>
        <GenerateInviteButton adminProfileId={adminProfile?.id ?? adminUser.id} />
      </div>

      {!codes?.length ? (
        <p className="text-sm text-neutral-500 py-12 text-center">Nessun codice invito generato.</p>
      ) : (
        <div className="space-y-2">
          {codes.map((c) => {
            const usedBy = (Array.isArray(c.profiles) ? c.profiles[0] : c.profiles) as { full_name: string; role: string } | null
            const isUsed = !!c.used_by

            return (
              <div
                key={c.id}
                className="flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900/50 px-5 py-4"
              >
                {/* Codice */}
                <span className="font-mono text-sm tracking-widest text-neutral-300 flex-1">
                  {c.code}
                </span>

                {/* Usato da */}
                <div className="text-right min-w-0">
                  {isUsed && usedBy ? (
                    <>
                      <p className="text-xs text-neutral-400 truncate">{usedBy.full_name}</p>
                      <p className="text-xs text-neutral-600">
                        {new Date(c.used_at!).toLocaleDateString('it-IT')}
                      </p>
                    </>
                  ) : (
                    <span className="text-xs text-neutral-600">Non usato</span>
                  )}
                </div>

                {/* Badge */}
                <span
                  className={[
                    'shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                    isUsed
                      ? 'bg-neutral-800 text-neutral-500 border-neutral-700'
                      : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
                  ].join(' ')}
                >
                  {isUsed ? 'Usato' : 'Disponibile'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
