import { createClient } from '@supabase/supabase-js'

// Client con service role — bypassa RLS completamente.
// Da usare SOLO in Server Components / Server Actions / Route Handlers.
// Mai esporre al browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY non configurata.')
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
