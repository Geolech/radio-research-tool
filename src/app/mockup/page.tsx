import Link from "next/link";

// ─── Phone frame wrapper ───────────────────────────────────────────────────────

function PhoneFrame({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-5 shrink-0">
      {/* Outer shell */}
      <div
        className="relative rounded-[3.2rem] bg-zinc-900 shadow-[0_0_0_1px_#27272a,0_32px_80px_rgba(0,0,0,0.8)] overflow-hidden"
        style={{ width: 290, height: 590, border: "7px solid #18181b" }}
      >
        {/* Side buttons (decorative) */}
        <div className="absolute -left-[9px] top-24 w-[3px] h-8 rounded-l bg-zinc-700" />
        <div className="absolute -left-[9px] top-36 w-[3px] h-12 rounded-l bg-zinc-700" />
        <div className="absolute -left-[9px] top-52 w-[3px] h-12 rounded-l bg-zinc-700" />
        <div className="absolute -right-[9px] top-32 w-[3px] h-16 rounded-r bg-zinc-700" />

        {/* Screen */}
        <div className="absolute inset-0 bg-zinc-950 overflow-hidden">
          {/* Dynamic Island */}
          <div
            className="absolute left-1/2 -translate-x-1/2 bg-black rounded-full z-20"
            style={{ top: 11, width: 110, height: 30 }}
          />
          {/* Status bar */}
          <div className="absolute top-0 left-0 right-0 h-12 flex items-start justify-between px-6 pt-2 z-10">
            <span className="text-[10px] font-semibold text-zinc-200 mt-1">9:41</span>
            <div className="flex items-center gap-1 mt-1">
              {/* Signal */}
              <svg width="14" height="10" viewBox="0 0 14 10" fill="#e4e4e7">
                <rect x="0"  y="6" width="2.5" height="4" rx="0.5" />
                <rect x="4"  y="4" width="2.5" height="6" rx="0.5" />
                <rect x="8"  y="2" width="2.5" height="8" rx="0.5" />
                <rect x="12" y="0" width="2.5" height="10" rx="0.5" opacity="0.3" />
              </svg>
              {/* WiFi */}
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none" stroke="#e4e4e7" strokeWidth="1.4" strokeLinecap="round">
                <path d="M1 3.5C3.5 1 10.5 1 13 3.5" opacity="0.4"/>
                <path d="M3 5.8C4.5 4 9.5 4 11 5.8"/>
                <path d="M5 8C5.8 7 8.2 7 9 8"/>
                <circle cx="7" cy="9.5" r="0.6" fill="#e4e4e7" stroke="none"/>
              </svg>
              {/* Battery */}
              <div className="flex items-center">
                <div className="w-5 h-2.5 rounded-[2px] border border-zinc-400 relative">
                  <div className="absolute inset-[1px] right-[1px] w-[80%] bg-zinc-200 rounded-[1px]" />
                </div>
                <div className="w-0.5 h-1.5 bg-zinc-400 rounded-r-sm" />
              </div>
            </div>
          </div>

          {/* Screen content */}
          <div className="absolute inset-0 pt-11 overflow-y-auto scrollbar-none">
            {children}
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-zinc-600 rounded-full z-10" />
        </div>
      </div>

      <p className="text-sm font-medium text-zinc-300 tracking-tight">{label}</p>
    </div>
  );
}

// ─── Hamburger button (reused in multiple screens) ────────────────────────────

function HamburgerBtn() {
  return (
    <div className="absolute top-12 right-3 w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center z-10 shadow">
      <svg width="14" height="11" viewBox="0 0 14 11" fill="none"
           stroke="#a1a1aa" strokeWidth="1.6" strokeLinecap="round">
        <line x1="0" y1="1"  x2="14" y2="1"  />
        <line x1="0" y1="5.5" x2="14" y2="5.5" />
        <line x1="0" y1="10" x2="14" y2="10" />
      </svg>
    </div>
  );
}

// ─── Screen 1: Startseite ─────────────────────────────────────────────────────

function StartseiteMockup() {
  const cards = [
    { brand: "HiFiMAN",      model: "Ananda Nano",  cat: "Kopfhörer",          img: "/images/devices/hifiman-ananda-nano.jpeg"  },
    { brand: "Lehmann Audio",model: "Drachenfels",  cat: "Kopfhörerverstärker", img: "/images/devices/lehmann-drachenfels.jpeg"  },
    { brand: "Luxman",       model: "SQ-N150",      cat: "Verstärker",          img: "/images/devices/luxman-sqn150.jpeg"        },
    { brand: "Klipsch",      model: "Heresy IV",    cat: "Lautsprecher",        img: "/images/devices/klipsch-heresy.jpeg"       },
  ];

  return (
    <div className="relative bg-zinc-950 min-h-full px-3 pb-8">
      <HamburgerBtn />

      {/* Header */}
      <div className="pt-3 pb-3 border-b border-zinc-800 pr-10">
        <p className="text-[7px] font-semibold uppercase tracking-[0.18em] text-amber-500 mb-0.5">
          Privatsammlung
        </p>
        <h1 className="text-[17px] font-bold text-zinc-100 leading-tight">HiFi-Bibliothek</h1>
        <p className="text-[9px] text-zinc-500 mt-0.5">16 Geräte · 7 Kategorien</p>
      </div>

      {/* Export buttons */}
      <div className="flex gap-2 py-2.5">
        {["↓ Excel", "↓ PDF"].map((lbl) => (
          <div key={lbl}
               className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <span className="text-[8px] text-zinc-400">{lbl}</span>
          </div>
        ))}
      </div>

      {/* Device grid */}
      <div className="grid grid-cols-2 gap-2">
        {cards.map((c) => (
          <div key={c.model} className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div className="relative h-[72px] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.img} alt={c.model}
                   className="w-full h-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <p className="absolute bottom-1 left-2 text-[6.5px] font-semibold uppercase tracking-wide text-amber-400">
                {c.cat}
              </p>
            </div>
            <div className="px-2 py-1.5">
              <p className="text-[7px] text-zinc-500 leading-none">{c.brand}</p>
              <p className="text-[9px] font-semibold text-zinc-100 leading-snug mt-0.5">{c.model}</p>
            </div>
          </div>
        ))}

        {/* Add card */}
        <div className="rounded-xl border-2 border-dashed border-zinc-800 h-[108px] flex flex-col items-center justify-center gap-1">
          <span className="text-2xl text-zinc-700 leading-none">+</span>
          <p className="text-[8px] text-zinc-700">Gerät hinzufügen</p>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 2: Geräteseite ────────────────────────────────────────────────────

function GeraeteMockup() {
  const specs = [
    ["Bauform",        "Ohrumschließend, offen"],
    ["Wandlerprinzip", "Planardynamisch"],
    ["Impedanz",       "16 Ω"],
    ["Schalldruckpegel","103 dB"],
  ];

  return (
    <div className="relative bg-zinc-950 min-h-full pb-8">
      {/* Back + hamburger */}
      <div className="absolute top-12 left-3 w-8 h-8 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center z-10">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
             stroke="#a1a1aa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 1L3 5l4 4" />
        </svg>
      </div>
      <HamburgerBtn />

      {/* Hero photo */}
      <div className="relative h-52 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/devices/hifiman-ananda-nano.jpeg" alt="HiFiMAN Ananda Nano"
             className="w-full h-full object-cover opacity-75" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />

        {/* Upload hint */}
        <div className="absolute top-14 right-3 px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40">
          <p className="text-[7px] text-amber-400">📷 Foto</p>
        </div>

        {/* Name overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-3 bg-gradient-to-t from-black/90">
          <p className="text-[7px] uppercase tracking-widest text-amber-500 mb-0.5">Kopfhörer</p>
          <p className="text-[16px] font-bold text-white leading-tight">HiFiMAN</p>
          <p className="text-[11px] text-zinc-300">Ananda Nano</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pt-3 space-y-3">

        {/* Description */}
        <p className="text-[8.5px] text-zinc-400 leading-relaxed">
          Planardynamischer Over-Ear-Kopfhörer mit Nano-Magnettechnologie und offenem Rücken.
          Extrem leicht und luftig in der Wiedergabe.
        </p>

        {/* Specs */}
        <div>
          <p className="text-[7px] font-semibold uppercase tracking-widest text-amber-500 mb-1.5">
            Spezifikationen
          </p>
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            {specs.map(([k, v], i) => (
              <div key={k}
                   className={`flex px-3 py-1.5 ${i < specs.length - 1 ? "border-b border-zinc-800" : ""}`}>
                <span className="text-[8px] text-zinc-500 w-28 shrink-0">{k}</span>
                <span className="text-[8px] text-zinc-200">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Price editor */}
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5">
          <p className="text-[7px] font-semibold uppercase tracking-widest text-amber-500 mb-2">
            Preise
          </p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {[["Kaufpreis", "1.299 €"], ["Zeitwert", "–"]].map(([lbl, val]) => (
              <div key={lbl}>
                <p className="text-[7px] text-zinc-500 mb-0.5">{lbl}</p>
                <div className="rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1">
                  <p className="text-[9px] text-zinc-300">{val}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            <div className="flex-1 rounded-lg bg-amber-600/20 border border-amber-600/40 py-1 text-center">
              <p className="text-[7.5px] text-amber-400 font-medium">↓ Speichern</p>
            </div>
            <div className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 py-1 text-center">
              <p className="text-[7.5px] text-zinc-400">🤖 KI-Preis</p>
            </div>
          </div>
        </div>

        {/* Enrich button */}
        <div className="flex gap-1.5">
          <div className="flex-1 rounded-lg bg-zinc-900 border border-zinc-700 py-1.5 text-center">
            <p className="text-[7.5px] text-zinc-400">📖 Wikipedia</p>
          </div>
          <div className="flex-1 rounded-lg bg-zinc-900 border border-zinc-700 py-1.5 text-center">
            <p className="text-[7.5px] text-zinc-400">✦ Modellwissen</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 3: Impressum ──────────────────────────────────────────────────────

function ImpressumMockup() {
  return (
    <div className="relative bg-zinc-950 min-h-full px-3 pb-8">
      <HamburgerBtn />

      {/* Back link */}
      <div className="flex items-center gap-1 pt-3 mb-3">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
             stroke="#71717a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 1L3 5l4 4" />
        </svg>
        <span className="text-[8px] text-zinc-600">Zurück</span>
      </div>

      {/* Header */}
      <div className="pb-3 border-b border-zinc-800 pr-10">
        <p className="text-[7px] font-semibold uppercase tracking-[0.18em] text-amber-500 mb-0.5">
          Rechtliche Hinweise
        </p>
        <h1 className="text-[17px] font-bold text-zinc-100">Impressum</h1>
      </div>

      <div className="pt-3 space-y-4">

        {/* Section: TMG */}
        <div>
          <p className="text-[7px] font-semibold uppercase tracking-widest text-amber-500 mb-1.5">
            Angaben gemäß § 5 TMG
          </p>
          <div className="space-y-0.5">
            {["Frank Lechtenberg", "TH Ostwestfalen-Lippe", "Liebigstraße 87", "32657 Lemgo"].map((line) => (
              <p key={line} className="text-[8.5px] text-zinc-300">{line}</p>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-800" />

        {/* Section: Projekt */}
        <div>
          <p className="text-[7px] font-semibold uppercase tracking-widest text-amber-500 mb-1.5">
            Über dieses Projekt
          </p>
          <p className="text-[8.5px] text-zinc-400 leading-relaxed">
            Lehrprojekt im Rahmen des Forschungsschwerpunkts{" "}
            <span className="text-zinc-200">KI und Forschung</span> an der TH OWL.
            Demonstration von Large Language Models zur Anreicherung einer HiFi-Sammlung.
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-800" />

        {/* Section: Haftung */}
        <div>
          <p className="text-[7px] font-semibold uppercase tracking-widest text-amber-500 mb-1.5">
            Haftungsausschluss
          </p>
          <p className="text-[8.5px] text-zinc-400 leading-relaxed">
            KI-generierte Inhalte wurden nicht vollständig manuell geprüft und können
            Ungenauigkeiten enthalten.
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-800" />

        {/* Technologien */}
        <div>
          <p className="text-[7px] font-semibold uppercase tracking-widest text-amber-500 mb-1.5">
            Technologien
          </p>
          <div className="space-y-0.5">
            {[
              ["Next.js", "React Framework"],
              ["Claude API", "Anthropic"],
              ["Tailwind CSS", "Styling"],
              ["@react-pdf", "PDF Export"],
            ].map(([tech, desc]) => (
              <div key={tech} className="flex gap-2">
                <span className="text-[8px] text-zinc-300 w-20 shrink-0">{tech}</span>
                <span className="text-[8px] text-zinc-600">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[7px] text-zinc-700 pt-2 border-t border-zinc-800">Stand: Mai 2026</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MockupPage() {
  return (
    <main className="min-h-screen bg-[#0c0c0e] px-6 py-12">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-12">
          <Link href="/"
                className="inline-flex items-center gap-2 text-xs text-zinc-600 hover:text-amber-400 transition-colors mb-8">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                 stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 2L4 7l5 5" />
            </svg>
            Zurück zur App
          </Link>

          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-2">
            Design-Vorschau
          </p>
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight mb-2">
            Mobile Mockup
          </h1>
          <p className="text-zinc-500 text-sm max-w-lg">
            Entwurf der nativen App-Ansichten für iOS & Android.
            Alle drei Kernseiten im iPhone-Format.
          </p>
        </div>

        {/* Phone frames */}
        <div className="flex flex-wrap gap-12 justify-center lg:justify-start">
          <PhoneFrame label="Startseite">
            <StartseiteMockup />
          </PhoneFrame>

          <PhoneFrame label="Geräteseite">
            <GeraeteMockup />
          </PhoneFrame>

          <PhoneFrame label="Impressum">
            <ImpressumMockup />
          </PhoneFrame>
        </div>

        {/* Notes */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl">
          {[
            {
              title: "Startseite",
              notes: ["2-spaltiges Card-Grid", "Foto-Thumbnail mit Kategorie-Label", "Export-Buttons kompakt oben", "'+'-Karte am Ende des Grids"],
            },
            {
              title: "Geräteseite",
              notes: ["Vollbild-Hero-Foto", "Scrollbarer Infobereich", "Inline-Preiseditor", "KI-Enrich-Buttons"],
            },
            {
              title: "Impressum",
              notes: ["Saubere Abschnitts-Struktur", "Amber-Überschriften", "Zurück-Navigation", "Technologieliste"],
            },
          ].map((s) => (
            <div key={s.title} className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-3">{s.title}</p>
              <ul className="space-y-1.5">
                {s.notes.map((n) => (
                  <li key={n} className="flex items-start gap-2 text-xs text-zinc-500">
                    <span className="text-amber-600 mt-0.5">·</span>
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
