# Slate — CLAUDE.md

## Cos'è Slate

Slate è un marketplace esclusivo per professionisti della fotografia. Non è un social network né una directory — è il sistema operativo per gli shooting fotografici: dal primo contatto tra fotografo e modella fino alla consegna delle foto, tutto avviene dentro la piattaforma.

Il nome viene dal "ciak" (slate in inglese) — l'oggetto che segna l'inizio di ogni ripresa.

---

## Stack tecnico

- **Framework:** Next.js 16 con App Router e TypeScript
- **Styling:** Tailwind CSS
- **Database + Auth + Storage:** Supabase
- **Pagamenti:** Stripe Connect (escrow tra le parti)
- **Email:** Resend
- **Deploy:** Vercel

---

## Principi di prodotto

### Accesso esclusivo
- Si entra solo con un codice invito
- Ogni nuovo profilo viene approvato manualmente dall'admin prima di essere visibile
- L'esclusività è il prodotto, non un ostacolo

### Ruoli (v1)
Due soli ruoli nella versione 1:
- **Fotografo** — ha un portfolio, specializzazioni, attrezzatura
- **Modella / Modello** — ha un book, skill di posa, misure

### Sistema XP e livelli
Ogni utente accumula XP che determinano il suo livello. I livelli sono:

| Livello | Nome | XP richiesti |
|---------|------|-------------|
| 1 | Newcomer | 0–499 |
| 2 | Rising | 500–1.499 |
| 3 | Established | 1.500–3.999 |
| 4 | Pro | 4.000–9.999 |
| 5 | Master | 10.000+ |

**Come si guadagna XP:**
- Bonus anzianità una tantum (basato su anni nel settore, max 1.000 XP)
  - 1–2 anni: +100 XP
  - 3–5 anni: +250 XP
  - 6–10 anni: +500 XP
  - 11–20 anni: +800 XP
  - 20+ anni: +1.000 XP
- Shooting completato sulla piattaforma: +150 XP
- Recensione 5★ ricevuta: +75 XP
- Recensione 4★ ricevuta: +30 XP
- Shooting con un profilo Master: +50 XP bonus

**Penalità XP:**
- No-show: −200 XP
- Cancellazione last-minute (< 48h): −80 XP
- Segnalazione confermata dall'admin: −150 XP

### Regola del compenso
La logica chi-paga-chi è il cuore differenziante di Slate:
- **Fotografo ha livello più alto della modella** → la modella paga il fotografo
- **Modella ha livello più alto del fotografo** → il fotografo paga la modella
- **Livelli uguali** → TFP (Time For Print), nessuno paga, shoot gratuito

Questa logica replica esattamente come funziona il mercato reale: il meno esperto investe per imparare dal più esperto.

### Modello di business
Fee sulle transazioni, modello Airbnb — zero abbonamenti:
- ~10% su chi paga
- ~8% su chi riceve
- La fee copre: escrow sicuro, garanzie, supporto

La piattaforma guadagna solo quando crea valore reale.

---

## Flusso principale (v1)

1. L'utente riceve un codice invito
2. Si registra, sceglie il ruolo (fotografo o modella)
3. Compila il profilo: portfolio, anni di esperienza, foto più vecchia per certificare l'anzianità
4. L'admin approva il profilo → l'utente diventa visibile
5. Gli utenti esplorano i profili e inviano una proposta di collaborazione
6. La controparte accetta → si apre un progetto
7. Si compila il brief strutturato (tipo shoot, data, location, deliverable, utilizzo immagini)
8. La parte con livello inferiore effettua il pagamento → va in escrow
9. Lo shoot avviene
10. Entrambe le parti confermano il completamento → escrow rilasciato → XP assegnati → recensioni

---

## Struttura database (Supabase)

### Tabelle principali

**profiles**
- id (uuid, FK → auth.users)
- role: 'photographer' | 'model'
- full_name, bio, city, instagram_url
- avatar_url (storage path, nullable) — foto profilo
- years_in_industry (integer)
- oldest_photo_url (storage path)
- xp (integer, default 0)
- level (integer, computed 1–5)
- status: 'pending' | 'approved' | 'suspended'
- created_at

**portfolio_items**
- id, profile_id (FK)
- image_url, caption
- order_index
- created_at

**invite_codes**
- id, code (unique)
- created_by (FK profiles)
- used_by (FK profiles, nullable)
- used_at

**projects**
- id
- photographer_id (FK profiles)
- model_id (FK profiles)
- status: 'proposed' | 'accepted' | 'brief_signed' | 'paid' | 'completed' | 'disputed' | 'cancelled'
- payer_role: 'photographer' | 'model' | 'tfp'
- amount (integer, centesimi)
- stripe_payment_intent_id
- created_at

**briefs**
- id, project_id (FK, unique)
- shoot_type (es. 'fashion editorial', 'commercial', 'beauty')
- shoot_date
- duration_hours
- location_description
- deliverables_count
- delivery_days
- usage: 'portfolio_only' | 'social' | 'commercial'
- notes
- signed_by_photographer_at
- signed_by_model_at

**reviews**
- id, project_id (FK)
- reviewer_id (FK profiles)
- reviewee_id (FK profiles)
- rating (1–5)
- comment
- created_at

**messages**
- id, project_id (FK)
- sender_id (FK profiles)
- content
- created_at

---

## Struttura cartelle Next.js

```
/app
  /auth
    /login
    /signup
    /invite/[code]
  /onboarding         ← completamento profilo post-signup
  /dashboard          ← home dopo login
  /explore            ← sfoglia profili
  /profile
    /[id]             ← profilo pubblico
    /edit             ← modifica il proprio profilo
  /projects
    /[id]             ← progetto specifico (brief, chat, stato)
  /admin                   ← pannello admin con sidebar (solo ADMIN_EMAILS)
    /invite-codes          ← gestione codici invito
    /onboarding-preview    ← anteprima flusso onboarding
    /[id]                  ← dettaglio e approvazione profilo
/components
  /ui                 ← componenti base (button, card, badge, input)
  /profile            ← ProfileCard, PortfolioGrid, XPBadge, ProfileAvatar, ProfileAvatarUpload
  /project            ← BriefForm, ChatBox, ProjectStatus
/lib
  /supabase           ← client, server, proxy (middleware Next.js 16)
  /stripe             ← helpers pagamento
  /xp                 ← logica calcolo livelli e XP
  /utils
/types
  index.ts            ← tutti i tipi TypeScript
```

---

## Variabili d'ambiente necessarie (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Convenzioni di codice

- Componenti React in PascalCase
- Funzioni e variabili in camelCase
- Tipi TypeScript sempre espliciti, no `any`
- Chiamate Supabase sempre con gestione errori
- Stripe amounts sempre in centesimi (integer)
- Date sempre in ISO 8601, timezone UTC
- Testi UI in italiano per la v1

---

## Stato attuale del progetto

**v1 in sviluppo — scope:**
- Registrazione con codice invito ✓ funzionante
- Onboarding profilo (ruolo, bio, portfolio, foto anzianità) ✓ funzionante
- Modifica profilo (/profile/edit) ✓ funzionante
- Foto profilo con badge ruolo (avatar_url su profiles) ✓ funzionante
- Pannello admin con sidebar ✓ funzionante
  - Gestione profili (approvazione/sospensione) ✓
  - Codici invito ✓
  - Anteprima onboarding ✓
- Sistema XP e livelli ✓ logica implementata
- Profilo pubblico /profile/[id] ✓ funzionante
- Middleware auth (proxy.ts — Next.js 16) ✓ funzionante
- Esplora profili con filtri — da fare
- Brief strutturato — da fare
- Pagamento escrow con Stripe Connect — da fare
- Recensioni post-shoot — da fare
- Chat di progetto — da fare

**v2 — rimandato:**
- MUA, stylist, location
- Moodboard visuale
- Garanzie assicurative
- App mobile
- AI matching
