import Link from "next/link";

export default function ImpressumPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12">
      <div className="mx-auto max-w-2xl">

        {/* Back link */}
        <Link
          href="/hifi"
          className="inline-flex items-center gap-2 text-xs text-zinc-600 hover:text-amber-400 transition-colors mb-10"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
               stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 2L4 7l5 5" />
          </svg>
          Zurück zur Bibliothek
        </Link>

        {/* Header */}
        <div className="mb-10 border-b border-zinc-800 pb-8">
          <p className="text-xs font-medium uppercase tracking-widest text-amber-500 mb-2">
            Rechtliche Hinweise
          </p>
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">
            Impressum
          </h1>
        </div>

        <div className="space-y-10 text-sm text-zinc-400 leading-relaxed">

          {/* Angaben nach TMG */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-4">
              Angaben gemäß § 5 TMG
            </h2>
            <div className="space-y-1 text-zinc-300">
              <p className="font-medium">Frank Lechtenberg</p>
              <p>Technische Hochschule Ostwestfalen-Lippe (TH OWL)</p>
              <p>Liebigstraße 87</p>
              <p>32657 Lemgo</p>
            </div>
          </section>

          {/* Projekt */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-4">
              Über dieses Projekt
            </h2>
            <p>
              Diese Anwendung ist ein Lehrprojekt im Rahmen des Forschungsschwerpunkts
              <span className="text-zinc-200"> KI und Forschung </span>
              an der Technischen Hochschule Ostwestfalen-Lippe (TH OWL).
            </p>
            <p className="mt-3">
              Ziel ist die exemplarische Demonstration des Einsatzes von Large Language Models
              (Claude von Anthropic) zur KI-gestützten Anreicherung und Verwaltung einer
              privaten HiFi-Gerätesammlung. Die Anwendung dient ausschließlich
              Lehr- und Demonstrationszwecken.
            </p>
          </section>

          {/* Haftungsausschluss */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-4">
              Haftungsausschluss
            </h2>
            <p>
              Die durch KI-Modelle generierten Inhalte (Beschreibungen, technische Daten,
              Preisschätzungen) wurden nicht vollständig manuell geprüft und können
              Ungenauigkeiten enthalten. Eine Haftung für die Richtigkeit, Vollständigkeit
              oder Aktualität dieser Informationen wird ausgeschlossen.
            </p>
            <p className="mt-3">
              Alle Marken- und Produktbezeichnungen sind Eigentum ihrer jeweiligen Inhaber
              und werden hier ausschließlich zu Informationszwecken verwendet.
            </p>
          </section>

          {/* Technologie */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-4">
              Eingesetzte Technologien
            </h2>
            <ul className="space-y-1 text-zinc-500">
              {[
                ["Next.js", "React-Framework (Vercel)"],
                ["Claude API", "KI-Sprachmodell (Anthropic)"],
                ["Tailwind CSS", "Utility-first CSS-Framework"],
                ["@react-pdf/renderer", "PDF-Generierung"],
                ["SheetJS (xlsx)", "Excel-Export"],
              ].map(([tech, desc]) => (
                <li key={tech} className="flex gap-2">
                  <span className="text-zinc-300 min-w-[160px]">{tech}</span>
                  <span>{desc}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Datum */}
          <p className="text-xs text-zinc-700 pt-4 border-t border-zinc-800">
            Stand: Mai 2026
          </p>

        </div>
      </div>
    </main>
  );
}
