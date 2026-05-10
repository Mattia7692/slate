'use client'

import { useState } from 'react'

const EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Il tuo invito su Slate</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#0a0a0a;min-height:100vh;">
<tr>
<td align="center" style="padding:48px 24px;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;">
  <tr>
  <td align="center" style="padding-bottom:40px;">
    <span style="font-size:13px;font-weight:700;letter-spacing:0.25em;color:#ffffff;text-transform:uppercase;opacity:0.9;">SLATE</span>
  </td>
  </tr>
  <tr>
  <td style="background-color:#111111;border:1px solid #1f1f1f;border-radius:20px;padding:40px 40px 36px;">
    <p style="margin:0 0 12px;font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#525252;">Il tuo invito</p>
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:600;color:#f5f5f5;line-height:1.3;letter-spacing:-0.01em;">Sei invitato a<br>far parte di Slate.</h1>
    <p style="margin:0 0 28px;font-size:14px;color:#737373;line-height:1.7;">La tua candidatura è stata approvata. Usa il codice qui sotto per completare la registrazione e costruire il tuo profilo.</p>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:32px;">
    <tr>
      <td style="background-color:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:24px;text-align:center;">
        <p style="margin:0 0 8px;font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#525252;">Il tuo codice invito</p>
        <p style="margin:0;font-size:28px;font-weight:700;letter-spacing:0.18em;color:#ffffff;">{{INVITE_CODE}}</p>
      </td>
    </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
    <tr><td style="border-top:1px solid #1f1f1f;"></td></tr>
    </table>
    <p style="margin:0 0 20px;font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#525252;">Prima di registrarti, tieni a portata di mano</p>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:16px;">
    <tr>
      <td style="vertical-align:top;width:28px;"><div style="width:20px;height:20px;background-color:#1a1a1a;border:1px solid #2a2a2a;border-radius:50%;text-align:center;line-height:20px;font-size:10px;font-weight:700;color:#525252;">1</div></td>
      <td style="vertical-align:top;padding-left:10px;">
        <p style="margin:0;font-size:13px;font-weight:600;color:#d4d4d4;line-height:1.4;">La tua prima foto professionale</p>
        <p style="margin:4px 0 0;font-size:12px;color:#525252;line-height:1.6;">Il primo scatto che hai fatto come fotografo, o la prima foto in cui hai posato come modella. Caricarla darà credibilità agli anni di esperienza che dichiarerai — non deve essere tecnicamente perfetta, deve essere onesta.</p>
      </td>
    </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:16px;">
    <tr>
      <td style="vertical-align:top;width:28px;"><div style="width:20px;height:20px;background-color:#1a1a1a;border:1px solid #2a2a2a;border-radius:50%;text-align:center;line-height:20px;font-size:10px;font-weight:700;color:#525252;">2</div></td>
      <td style="vertical-align:top;padding-left:10px;">
        <p style="margin:0;font-size:13px;font-weight:600;color:#d4d4d4;line-height:1.4;">Una foto profilo</p>
        <p style="margin:4px 0 0;font-size:12px;color:#525252;line-height:1.6;">La foto con cui gli altri ti riconosceranno su Slate. Sceglila con cura.</p>
      </td>
    </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:32px;">
    <tr>
      <td style="vertical-align:top;width:28px;"><div style="width:20px;height:20px;background-color:#1a1a1a;border:1px solid #2a2a2a;border-radius:50%;text-align:center;line-height:20px;font-size:10px;font-weight:700;color:#525252;">3</div></td>
      <td style="vertical-align:top;padding-left:10px;">
        <p style="margin:0;font-size:13px;font-weight:600;color:#d4d4d4;line-height:1.4;">Almeno tre foto del tuo portfolio</p>
        <p style="margin:4px 0 0;font-size:12px;color:#525252;line-height:1.6;">Le immagini che meglio rappresentano il tuo stile e la qualità del tuo lavoro. Puoi aggiungerne fino a dieci. Tutto potrà essere aggiornato in seguito, ma almeno tre sono necessarie per completare il profilo.</p>
      </td>
    </tr>
    </table>
    <p style="margin:0 0 32px;font-size:12px;color:#3a3a3a;line-height:1.7;font-style:italic;text-align:center;">Registrati quando hai tutto a portata di mano —<br>l'onboarding è pensato per essere fatto in un'unica sessione.</p>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:32px;">
    <tr><td style="border-top:1px solid #1f1f1f;"></td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center">
        <a href="{{INVITE_URL}}" style="display:inline-block;background-color:#ffffff;color:#0a0a0a;font-size:13px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.01em;">Inizia la registrazione →</a>
      </td>
    </tr>
    </table>
  </td>
  </tr>
  <tr>
  <td style="padding:20px 4px 0;">
    <p style="margin:0;font-size:11px;color:#3a3a3a;line-height:1.8;">Se pensi di aver ricevuto questa email per errore, ignorala — non succederà nulla.<br>Il codice invito non ha scadenza.</p>
  </td>
  </tr>
  <tr>
  <td align="center" style="padding-top:40px;">
    <p style="margin:0;font-size:10px;letter-spacing:0.1em;color:#2a2a2a;text-transform:uppercase;">Slate &mdash; Photography Marketplace</p>
  </td>
  </tr>
</table>
</td>
</tr>
</table>
</body>
</html>`

interface Props {
  code: string
}

export function InviteCodeActions({ code }: Props) {
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function copyCode() {
    navigator.clipboard.writeText(code)
    showToast('Codice copiato')
  }

  function copyEmail() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const inviteUrl = `${appUrl}/auth/signup?code=${code}`
    const html = EMAIL_TEMPLATE
      .replace(/\{\{INVITE_CODE\}\}/g, code)
      .replace(/\{\{INVITE_URL\}\}/g, inviteUrl)
    navigator.clipboard.writeText(html)
    showToast('Email copiata negli appunti')
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={copyCode}
        className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
      >
        Copia codice
      </button>
      <span className="text-neutral-700">·</span>
      <button
        onClick={copyEmail}
        className="text-xs text-amber-600 hover:text-amber-400 transition-colors cursor-pointer"
      >
        Copia email HTML
      </button>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-neutral-900 border border-neutral-700 px-4 py-2.5 text-sm text-neutral-100 shadow-xl pointer-events-none animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}
