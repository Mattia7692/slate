'use server'

import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'noreply@slate-ecru-six.vercel.app'
const ADMIN_EMAIL = 'mattia.baldini@gmail.com'

export async function submitApplication(data: {
  role: 'photographer' | 'model'
  email: string
  portfolio_url: string
  bio: string
}) {
  const admin = createAdminClient()

  // Salva in DB
  const { data: app, error } = await admin
    .from('applications')
    .insert({
      role: data.role,
      email: data.email.trim().toLowerCase(),
      portfolio_url: data.portfolio_url.trim(),
      bio: data.bio.trim(),
      status: 'pending',
    })
    .select()
    .single()

  if (error) return { error: error.message }

  const roleLabel = data.role === 'photographer' ? 'Fotografo/a' : 'Modella/o'
  const dateLabel = new Date().toLocaleDateString('it-IT', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  // Email notifica admin
  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Nuova candidatura Slate — ${roleLabel} da ${data.email}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
        <h2 style="margin-bottom:4px">Nuova candidatura Slate</h2>
        <p style="color:#666;margin-top:0">${dateLabel}</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px">
          <tr><td style="padding:8px 0;color:#666;width:120px">Ruolo</td><td style="padding:8px 0;font-weight:600">${roleLabel}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Email</td><td style="padding:8px 0">${data.email}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Portfolio</td><td style="padding:8px 0"><a href="${data.portfolio_url}" style="color:#7c3aed">${data.portfolio_url}</a></td></tr>
        </table>
        <div style="margin-top:16px;padding:16px;background:#f5f5f5;border-radius:8px">
          <p style="margin:0;font-weight:600;margin-bottom:8px">Presentazione</p>
          <p style="margin:0;white-space:pre-wrap;color:#444">${data.bio}</p>
        </div>
        <p style="margin-top:24px"><a href="https://slate-ecru-six.vercel.app/admin/applications" style="background:#111;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px">Gestisci candidature →</a></p>
      </div>
    `,
  })

  // Email conferma candidato
  await resend.emails.send({
    from: FROM,
    to: data.email,
    subject: 'Candidatura Slate ricevuta',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
        <h2>Candidatura ricevuta</h2>
        <p style="color:#444;line-height:1.6">
          Abbiamo ricevuto la tua candidatura. La valuteremo entro 7 giorni e ti risponderemo a questo indirizzo.
        </p>
        <p style="color:#444;line-height:1.6">
          Nel frattempo, se conosci già qualcuno su Slate, chiedigli un codice invito — accelera i tempi.
        </p>
        <p style="margin-top:32px;color:#999;font-size:12px">Il team di Slate</p>
      </div>
    `,
  })

  // Notifiche in-app per tutti gli admin
  const { data: admins } = await admin
    .from('profiles')
    .select('id')
    .eq('is_admin', true)

  if (admins && admins.length > 0) {
    await admin.from('notifications').insert(
      admins.map((a) => ({
        profile_id: a.id,
        type: 'project_update' as const,
        title: 'Nuova candidatura',
        body: `${roleLabel} — ${data.email}`,
        invite_id: null,
        project_id: null,
      }))
    )
  }

  return { error: null }
}

// ── Approva / rifiuta candidatura ────────────────────────────────

export async function updateApplicationStatus(
  applicationId: string,
  status: 'approved' | 'rejected'
) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('applications')
    .update({ status })
    .eq('id', applicationId)

  if (error) return { error: error.message }
  return { error: null }
}
