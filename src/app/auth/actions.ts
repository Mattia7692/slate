'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ============================================================
// LOGIN
// ============================================================

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/dashboard')
}

// ============================================================
// SIGNUP con codice invito
// ============================================================

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const inviteCode = (formData.get('invite_code') as string).trim().toUpperCase()

  // Verifica che il codice invito esista e non sia già stato usato
  // Usiamo il client admin per bypassare RLS
  const admin = createAdminClient()
  const { data: invite, error: inviteError } = await admin
    .from('invite_codes')
    .select('id, used_by')
    .eq('code', inviteCode)
    .single()

  if (inviteError || !invite) {
    redirect(`/auth/signup?error=${encodeURIComponent('Codice invito non valido.')}`)
  }

  if (invite.used_by) {
    redirect(`/auth/signup?error=${encodeURIComponent('Questo codice invito è già stato utilizzato.')}`)
  }

  // Registra l'utente
  const { data: authData, error: signupError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { invite_code: inviteCode },
    },
  })

  if (signupError || !authData.user) {
    redirect(`/auth/signup?error=${encodeURIComponent(signupError?.message ?? 'Errore durante la registrazione.')}`)
  }

  // Marca il codice invito come usato
  await admin
    .from('invite_codes')
    .update({ used_by: authData.user.id, used_at: new Date().toISOString() })
    .eq('id', invite.id)

  redirect('/onboarding')
}

// ============================================================
// LOGOUT
// ============================================================

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}
