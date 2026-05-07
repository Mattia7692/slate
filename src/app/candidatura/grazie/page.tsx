import Link from 'next/link'

export default function GraziePage() {
  return (
    <div className="bg-white min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-lg space-y-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-neutral-400 uppercase">
          Slate
        </p>

        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-snug">
            Grazie per esserti candidato.
          </h1>
          <div className="text-neutral-500 leading-relaxed space-y-4 text-base">
            <p>
              Il fatto che tu abbia scelto Slate significa che hai capito qualcosa di importante:
              che lavorare bene richiede un ambiente fatto bene.
            </p>
            <p>
              L&apos;approvazione dei profili è manuale — non per burocrazia, ma perché ogni persona
              che entra nella community è una scelta deliberata. Tieni d&apos;occhio la tua email:
              avrai nostre notizie presto.
            </p>
            <p className="text-sm">
              Nel frattempo, se conosci già qualcuno su Slate, chiedigli un codice invito —
              accelera i tempi.
            </p>
          </div>
        </div>

        <p className="text-sm text-neutral-400 font-medium">Il team di Slate</p>

        <Link
          href="/"
          className="inline-block text-xs text-neutral-400 hover:text-neutral-700 transition-colors underline underline-offset-4"
        >
          Torna alla home
        </Link>
      </div>
    </div>
  )
}
