"use client";

import { useState, useEffect } from "react";
import type { RadioFeed } from "@/lib/radio-config";

type Props = {
  region: string;
  feeds: RadioFeed[];
  activeProfileLabel: string | null;
  onChangeRegion: () => void;
  onEditFeeds: () => void;
  onDiscoverFeeds: () => void;
  onApiKey: () => void;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-4 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">
        {title}
      </p>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="py-1"><div className="border-t border-zinc-800/70" /></div>;
}

export default function RadioHamburgerMenu({ region, feeds, activeProfileLabel, onChangeRegion, onEditFeeds, onDiscoverFeeds, onApiKey }: Props) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const run = (fn: () => void) => { close(); fn(); };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      {/* Hamburger-Button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Menü öffnen"
        className="fixed top-4 right-4 z-50 flex h-10 w-10 items-center justify-center
                   rounded-xl bg-zinc-900 border border-amber-500/40 shadow-lg
                   text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/70
                   transition-all duration-200"
      >
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none"
             stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <line x1="0" y1="1"  x2="18" y2="1"  />
          <line x1="0" y1="7"  x2="18" y2="7"  />
          <line x1="0" y1="13" x2="18" y2="13" />
        </svg>
      </button>

      {/* Backdrop */}
      <div
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-zinc-950 border-l-2 border-amber-500/60
                    shadow-2xl flex flex-col
                    transition-transform duration-300 ease-in-out
                    ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-amber-500/60 px-6 py-5 flex-shrink-0">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-amber-500 mb-1">
              Radioredaktion OWL
            </p>
            <p className="text-base font-bold text-zinc-100">Radio Research Tool</p>
          </div>
          <button
            onClick={close}
            aria-label="Menü schliessen"
            className="flex h-8 w-8 items-center justify-center rounded-lg
                       text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="1" y1="1" x2="11" y2="11" />
              <line x1="11" y1="1" x2="1"  y2="11" />
            </svg>
          </button>
        </div>

        {/* Nav-Inhalt */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">

          {/* Einstellungen */}
          <Section title="Einstellungen">
            <button
              onClick={() => run(onChangeRegion)}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm
                         text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
            >
              <span className="w-5 flex-shrink-0 text-center text-zinc-600">⌖</span>
              <span className="flex-1 text-left">Region ändern</span>
              <span className="text-xs text-zinc-600 truncate max-w-[45%]">{region}</span>
            </button>
            <button
              onClick={() => run(onEditFeeds)}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm
                         text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
            >
              <span className="w-5 flex-shrink-0 text-center text-zinc-600">≡</span>
              <span className="flex-1 text-left">RSS-Quellen editieren</span>
              <span className="text-xs text-zinc-600">{feeds.filter((f) => f.enabled).length}/{feeds.length}</span>
            </button>
            <button
              onClick={() => run(onDiscoverFeeds)}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm
                         text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
            >
              <span className="w-5 flex-shrink-0 text-center text-zinc-600">⌕</span>
              <span className="flex-1 text-left">RSS-Quellen suchen</span>
              <span className="text-xs text-amber-600/70">KI</span>
            </button>
            <button
              onClick={() => run(onApiKey)}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm
                         text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
            >
              <span className="w-5 flex-shrink-0 text-center text-zinc-600">🔑</span>
              <span className="flex-1 text-left">KI-Zugänge</span>
              <span className={`text-xs truncate max-w-[45%] ${activeProfileLabel ? "text-emerald-500/70" : "text-amber-500"}`}>
                {activeProfileLabel ?? "fehlt"}
              </span>
            </button>
          </Section>

          <Divider />

          {/* Über das Tool */}
          <Section title="Ueber das Tool">
            <div className="px-4 py-2 space-y-2.5">
              <p className="text-xs text-zinc-500 leading-relaxed">
                KI-gestuetztes News-Gathering fuer kleine Lokal- und Campusradios. Region und RSS-Quellen sind frei konfigurierbar.
              </p>
              <div className="space-y-1.5">
                {[
                  { label: "RSS-Bulletin", detail: "~5–10 s, algorithmisches Ranking" },
                  { label: "Sprechtexte", detail: "Top 5 automatisch, weitere auf Abruf" },
                  { label: "Editor", detail: "Sprechtexte bearbeiten & drucken" },
                  { label: "Quellen-Overlay", detail: "Quellseite per Klick oeffnen" },
                ].map(({ label, detail }) => (
                  <div key={label} className="flex flex-col">
                    <span className="text-xs font-medium text-zinc-300">{label}</span>
                    <span className="text-xs text-zinc-600">{detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <Divider />

          {/* Aktive RSS-Quellen */}
          <Section title="Aktive RSS-Quellen">
            <div className="space-y-0.5">
              {feeds.filter((f) => f.enabled).length === 0 && (
                <p className="px-4 py-2 text-xs text-zinc-600">Keine aktiven Quellen.</p>
              )}
              {feeds.filter((f) => f.enabled).map((f) => (
                <a
                  key={f.id}
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={close}
                  className="flex items-center gap-3 rounded-xl px-4 py-2 text-xs
                             text-zinc-400 hover:text-amber-400 hover:bg-zinc-900 transition-colors"
                >
                  <span className="w-5 flex-shrink-0 flex items-center justify-center text-zinc-700">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"
                         strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 2h4v1.5H3.5v5h5V7H10v3H2V2z" />
                      <path d="M7 2h3v3M10 2L6 6" />
                    </svg>
                  </span>
                  <span className="truncate">{f.name}</span>
                </a>
              ))}
            </div>
          </Section>

          <Divider />

          {/* Sprechtextregeln */}
          <Section title="Sprechtext-Regeln">
            <div className="px-4 py-2">
              <ul className="space-y-1.5 text-xs text-zinc-500">
                <li className="flex gap-2"><span className="text-amber-600 flex-shrink-0">·</span> Gesprochene Sprache, keine Abkürzungen</li>
                <li className="flex gap-2"><span className="text-amber-600 flex-shrink-0">·</span> Zahlen ausschreiben</li>
                <li className="flex gap-2"><span className="text-amber-600 flex-shrink-0">·</span> Maximal 3 Saetze pro Meldung</li>
                <li className="flex gap-2"><span className="text-amber-600 flex-shrink-0">·</span> Satz 1: Was passierte</li>
                <li className="flex gap-2"><span className="text-amber-600 flex-shrink-0">·</span> Satz 2: Kontext / Hintergrund</li>
                <li className="flex gap-2"><span className="text-amber-600 flex-shrink-0">·</span> Satz 3: Weiteres Detail</li>
              </ul>
            </div>
          </Section>

        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-zinc-800/70 px-6 py-4">
          <p className="text-xs text-zinc-700 leading-relaxed">
            Lehrprojekt · KI und Forschung
            <br />
            Technische Hochschule OWL
          </p>
        </div>
      </div>
    </>
  );
}
