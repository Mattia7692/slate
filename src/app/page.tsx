'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { submitApplication } from '@/app/applications/actions'
import {
  Shield,
  FileText,
  Lock,
  TrendingUp,
  UserCheck,
  Camera,
  Receipt,
  X,
} from 'lucide-react'

// ── Tipi ──────────────────────────────────────────────────────

type Role = 'photographer' | 'model' | null

interface FormState {
  role: Role
  email: string
  portfolio: string
  bio: string
}

// ── Dati statici ───────────────────────────────────────────────

const FEATURES = [
  {
    icon: UserCheck,
    title: 'Profili verificati',
    text: 'Ogni iscritto viene approvato manualmente. Portfolio reali, esperienza documentata. Nessuno si inventa un curriculum.',
  },
  {
    icon: FileText,
    title: 'Brief contrattuale',
    text: 'Ogni collaborazione inizia con un brief scritto e firmato digitalmente. Niente accordi verbali, niente malintesi dopo lo shoot.',
  },
  {
    icon: Lock,
    title: 'Pagamento protetto',
    text: 'Il compenso viene bloccato in escrow prima dello shoot e rilasciato solo a completamento confermato da entrambe le parti.',
  },
  {
    icon: TrendingUp,
    title: 'Reputazione misurabile',
    text: 'Il tuo livello cresce con ogni lavoro completato e ogni recensione ricevuta. La tua storia su Slate parla per te.',
  },
]

const SAFETY_CARDS = [
  {
    icon: Shield,
    title: 'Per le modelle',
    text: 'Sai con chi lavori prima di trovarti in un posto che non conosci. Identità verificate, brief firmato, storico pubblico di ogni fotografo.',
  },
  {
    icon: Camera,
    title: 'Per i fotografi',
    text: 'Meno rischio di cancellazioni last-minute e no-show. Il compenso è già in escrow prima dello shoot. Le regole valgono per tutti.',
  },
  {
    icon: Receipt,
    title: 'Tutto tracciato',
    text: 'Brief, messaggi, pagamenti e recensioni restano nella piattaforma. Se nasce una disputa, c\'è tutto il necessario per risolverla.',
  },
]

const STEPS = [
  {
    n: 1,
    title: 'Richiedi un invito',
    text: 'Slate è ad accesso chiuso. Puoi essere invitato da un membro esistente o candidarti dalla lista d\'attesa.',
  },
  {
    n: 2,
    title: 'Il tuo profilo viene approvato',
    text: 'Carichi il portfolio, dichiari gli anni di esperienza con la tua prima foto professionale come prova. Il team valuta e approva.',
  },
  {
    n: 3,
    title: 'Trova il tuo match',
    text: 'Esplora i profili approvati. Proponi una collaborazione con un brief chiaro: tipo di shoot, data, location, deliverable.',
  },
  {
    n: 4,
    title: 'Il sistema decide chi paga chi',
    text: 'In base all\'esperienza relativa di entrambi — niente trattative, niente ambiguità. La piattaforma gestisce tutto in sicurezza.',
  },
  {
    n: 5,
    title: 'Cresci e accumula reputazione',
    text: 'Ogni shoot completato, ogni recensione costruisce il tuo livello. La tua storia su Slate parla per te.',
  },
]

const XP_LEVELS = [
  { n: 1, name: 'Newcomer', range: '0–499 xp',    color: 'bg-neutral-100 text-neutral-700',  dot: 'bg-neutral-400' },
  { n: 2, name: 'Rising',   range: '500–1.499 xp', color: 'bg-blue-50 text-blue-700',         dot: 'bg-blue-400' },
  { n: 3, name: 'Established', range: '1.500–3.999 xp', color: 'bg-violet-50 text-violet-700', dot: 'bg-violet-400' },
  { n: 4, name: 'Pro',      range: '4.000–9.999 xp', color: 'bg-amber-50 text-amber-700',     dot: 'bg-amber-400' },
  { n: 5, name: 'Master',   range: '10.000+ xp',  color: 'bg-rose-50 text-rose-700',          dot: 'bg-rose-400' },
]

// ── Componente principale ──────────────────────────────────────

export default function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>({ role: null, email: '', portfolio: '', bio: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function openModal() {
    setModalOpen(true)
    setForm({ role: null, email: '', portfolio: '', bio: '' })
    setErrors({})
    setSubmitError(null)
  }

  function closeModal() {
    setModalOpen(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const newErrors: Partial<Record<keyof FormState, string>> = {}
    if (!form.role) newErrors.role = 'Seleziona il tuo ruolo.'
    if (!form.email.trim()) newErrors.email = "L'email è obbligatoria."
    if (!form.portfolio.trim()) newErrors.portfolio = 'Inserisci il portfolio o il profilo Instagram.'
    if (!form.bio.trim()) newErrors.bio = 'Presentati brevemente.'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    setSubmitError(null)
    startTransition(async () => {
      const result = await submitApplication({
        role: form.role!,
        email: form.email,
        portfolio_url: form.portfolio,
        bio: form.bio,
      })
      if (result.error) {
        setSubmitError("Errore durante l'invio. Riprova tra qualche secondo.")
        return
      }
      router.push('/candidatura/grazie')
    })
  }

  return (
    <div className="bg-white text-neutral-900 antialiased">

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-28 md:py-40 max-w-3xl mx-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Slate" className="h-16 w-auto mx-auto mb-8 invert mix-blend-multiply" />
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
          La fotografia professionale merita un posto serio.
        </h1>
        <div className="text-lg md:text-xl text-neutral-500 leading-relaxed mb-10 max-w-xl space-y-5">
          <p>Slate è una piattaforma per far lavorare insieme fotografi e modelle che hanno una passione profonda per quello che fanno.</p>
          <p>È una comunità fondata su tre valori: apertura radicale — verso le persone, le idee e le visioni creative degli altri; espressione autentica — la libertà di portare il proprio stile e la propria voce senza doverli giustificare; responsabilità concreta — nei confronti del proprio lavoro, degli impegni presi e delle persone con cui si collabora.</p>
          <p>Si entra su invito. Si resta per scelta.</p>
        </div>
        <button
          onClick={openModal}
          className="bg-neutral-900 text-white rounded-full px-8 py-4 text-sm font-semibold hover:bg-neutral-700 transition-colors touch-manipulation"
        >
          Richiedi l&apos;accesso
        </button>
        <p className="text-xs text-neutral-400 mt-4">
          Ogni profilo viene approvato manualmente
        </p>
      </section>

      {/* ── MANIFESTO ─────────────────────────────────────────── */}
      <section className="border-t border-neutral-100 px-6 py-24">
        <div className="max-w-2xl mx-auto space-y-10">
          <p className="text-sm font-semibold tracking-[0.25em] text-neutral-400 uppercase">
            Il Manifesto
          </p>
          <div className="space-y-7 text-lg text-neutral-700 leading-[1.85]">
            <p>
              Il mondo della fotografia ha un problema. Molti lo conoscono, molti se ne lamentano, ma pochi propongono soluzioni.
            </p>
            <p>
              Il problema è la sovrapposizione di due mercati che non dovrebbero mescolarsi. Da un lato c&apos;è il mercato utilitaristico: chi usa la macchina fotografica come pretesto e chi si offre di posare per ragioni che hanno poco a che fare con la fotografia. È un mercato che esiste, funziona e non sta a noi giudicare.
            </p>
            <p>
              Dall&apos;altro c&apos;è il mercato creativo: fotografi che vogliono creare qualcosa di bello e modelle che trovano soddisfazione nel contribuire a quella bellezza. Persone che investono talento e dedizione nel proprio lavoro — e che si aspettano lo stesso dall&apos;altra parte.
            </p>
            <p>
              Quando questi due mondi si mescolano, chi lavora seriamente finisce per pagarne il prezzo. Le aspettative sono sbagliate dall&apos;inizio, perché le motivazioni di partenza sono diverse. Il tempo viene sprecato in collaborazioni che non avrebbero dovuto nascere. La fiducia si erode a ogni esperienza andata male. E il rispetto — quello vero, per il proprio lavoro, per le competenze dell&apos;altro, per il valore del tempo di ciascuno — diventa sempre più raro. Non perché le persone serie siano poche, ma perché vengono continuamente mescolate con chi serio non è, e non ha nessuna intenzione di esserlo.
            </p>
            <p className="font-medium text-neutral-900">
              La soluzione che proponiamo è semplice: separare questi due mercati in modo netto. Slate ha scelto il mercato creativo. Se appartieni a questo mondo, sei nel posto giusto.
            </p>
          </div>
        </div>
      </section>

      {/* ── COSA OFFRE SLATE ──────────────────────────────────── */}
      <section className="border-t border-neutral-100 px-6 py-24 bg-neutral-50">
        <div className="max-w-4xl mx-auto space-y-12">
          <p className="text-sm font-semibold tracking-[0.25em] text-neutral-400 uppercase">
            Cosa offre Slate
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="bg-white rounded-2xl p-7 space-y-3 border border-neutral-100">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                  <Icon size={20} className="text-neutral-600" />
                </div>
                <h3 className="font-semibold text-neutral-900">{title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SICUREZZA ─────────────────────────────────────────── */}
      <section className="border-t border-violet-100 px-6 py-24 bg-violet-50">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            {/* Sinistra */}
            <div className="space-y-5">
              <h2 className="text-3xl font-bold tracking-tight leading-snug">
                Un posto più sicuro per lavorare.
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                Organizzare uno shooting su WhatsApp o in DM su Instagram è normale. Ma normale non vuol dire sicuro. Slate porta ordine, tracciabilità e protezione dove prima c&apos;era solo buona fede.
              </p>
            </div>
            {/* Destra */}
            <div className="space-y-3">
              {SAFETY_CARDS.map(({ icon: Icon, title, text }) => (
                <div key={title} className="bg-white rounded-xl p-5 border border-violet-100 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                      <Icon size={16} className="text-violet-600" />
                    </div>
                    <h3 className="font-semibold text-sm">{title}</h3>
                  </div>
                  <p className="text-sm text-neutral-500 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── COME FUNZIONA ─────────────────────────────────────── */}
      <section className="border-t border-neutral-100 px-6 py-24">
        <div className="max-w-2xl mx-auto space-y-12">
          <p className="text-sm font-semibold tracking-[0.25em] text-neutral-400 uppercase">
            Come funziona
          </p>
          <div className="space-y-8">
            {STEPS.map(({ n, title, text }) => (
              <div key={n} className="flex gap-6">
                <div className="shrink-0 w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center text-sm font-semibold text-neutral-500">
                  {n}
                </div>
                <div className="space-y-1 pt-1">
                  <h3 className="font-semibold text-neutral-900">{title}</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVELLI XP ────────────────────────────────────────── */}
      <section className="border-t border-neutral-100 px-6 py-24 bg-neutral-50">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="space-y-4 max-w-2xl">
            <p className="text-sm font-semibold tracking-[0.25em] text-neutral-400 uppercase">
              Il sistema di livelli
            </p>
            <h2 className="text-3xl font-bold tracking-tight">
              L&apos;esperienza si guadagna, non si dichiara.
            </h2>
            <p className="text-neutral-500 leading-relaxed">
              Il tuo livello è calcolato sulla base degli anni nel settore — certificati dalla data della tua prima foto professionale — da te scattata o in cui hai posato — e dai lavori completati in piattaforma. Nessuno può comprarsi la reputazione.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {XP_LEVELS.map(({ n, name, range, color, dot }) => (
              <div key={n} className={['rounded-2xl p-5 space-y-3', color].join(' ')}>
                <div className={['w-2.5 h-2.5 rounded-full', dot].join(' ')} />
                <div>
                  <p className="text-xs font-semibold opacity-60 mb-0.5">Lv. {n}</p>
                  <p className="font-bold">{name}</p>
                  <p className="text-xs opacity-60 mt-1">{range}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINALE ────────────────────────────────────────── */}
      <section className="border-t border-neutral-100 px-6 py-28 text-center">
        <div className="max-w-xl mx-auto space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Sei pronto a lavorare con persone serie?
          </h2>
          <p className="text-neutral-500 leading-relaxed">
            Slate è aperta a fotografe, fotografi, modelle e modelli — e presto a MUA, stylist, stage designer, body painter e tutte le figure professionali legate al mondo della creatività. Se sai quello che vali e lo dimostri con il lavoro, questo è il tuo posto.
          </p>
          <button
            onClick={openModal}
            className="bg-neutral-900 text-white rounded-full px-8 py-4 text-sm font-semibold hover:bg-neutral-700 transition-colors touch-manipulation"
          >
            Richiedi l&apos;accesso
          </button>
        </div>
      </section>

      {/* ── FOOTER minimalista ────────────────────────────────── */}
      <footer className="border-t border-neutral-100 px-6 py-8 flex items-center justify-between text-xs text-neutral-400">
        <span className="font-semibold tracking-tight text-neutral-900">Slate</span>
        <Link href="/auth/login" className="hover:text-neutral-600 transition-colors">
          Accedi →
        </Link>
      </footer>

      {/* ── MODAL CANDIDATURA ─────────────────────────────────── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm cursor-pointer"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl cursor-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header modal */}
            <div className="flex items-center justify-between px-8 pt-8 pb-6 border-b border-neutral-100">
              <div>
                <h2 className="text-lg font-bold">Richiedi l&apos;accesso</h2>
                <p className="text-sm text-neutral-500 mt-0.5">Valutiamo ogni candidatura manualmente.</p>
              </div>
              <button
                onClick={closeModal}
                className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">
                {/* Ruolo */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">Sei</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'photographer' as Role, label: 'Fotografo/a' },
                      { value: 'model' as Role, label: 'Modella/o' },
                    ].map(({ value, label }) => (
                      <button
                        key={value!}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, role: value }))}
                        className={[
                          'rounded-xl border-2 py-4 text-sm font-medium transition-colors',
                          form.role === value
                            ? 'border-neutral-900 bg-neutral-900 text-white'
                            : 'border-neutral-200 text-neutral-600 hover:border-neutral-400',
                        ].join(' ')}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {errors.role && <p className="text-xs text-red-500">{errors.role}</p>}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-700">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="tu@esempio.com"
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-400 transition-colors"
                  />
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>

                {/* Portfolio */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-700">Portfolio o profilo Instagram</label>
                  <input
                    type="text"
                    value={form.portfolio}
                    onChange={(e) => setForm((f) => ({ ...f, portfolio: e.target.value }))}
                    placeholder="https://... oppure @username"
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-400 transition-colors"
                  />
                  {errors.portfolio && <p className="text-xs text-red-500">{errors.portfolio}</p>}
                </div>

                {/* Bio */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-700">Presentati in poche righe</label>
                  <textarea
                    value={form.bio}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                    placeholder="Chi sei, da quanto tempo lavori nel settore, che tipo di lavoro fai..."
                    rows={4}
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-400 transition-colors resize-none"
                  />
                  {errors.bio && <p className="text-xs text-red-500">{errors.bio}</p>}
                </div>

                {submitError && (
                  <p className="text-xs text-red-500 text-center">{submitError}</p>
                )}
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-neutral-900 text-white rounded-xl py-4 text-sm font-semibold hover:bg-neutral-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isPending && (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {isPending ? 'Invio in corso...' : 'Invia candidatura'}
                </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
