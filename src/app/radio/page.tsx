"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { RadioResearchResult, NewsItem } from "@/app/api/radio-research/route";
import type { RSSItem, FeedResult } from "@/app/api/fetch-rss/route";
import { rankRSSItems, rssToNewsItems } from "@/lib/rank-rss";
import RadioHamburgerMenu from "@/components/RadioHamburgerMenu";
import {
  type RadioFeed,
  type FeedCategory,
  type AiProfile,
  type AiProvider,
  DEFAULT_REGION,
  DEFAULT_STATION,
  PROVIDER_LABELS,
  DEFAULT_MODELS,
  CUSTOM_PRESETS,
  loadRegion,
  saveRegion,
  loadStation,
  saveStation,
  loadFeeds,
  saveFeeds,
  makeFeed,
  loadProfiles,
  saveProfiles,
  initSecureKeys,
  saveActiveId,
  getActiveProfile,
  makeProfile,
  aiHeaders,
  headersForProfile,
  discoveryHeader,
} from "@/lib/radio-config";
import type { DiscoveredFeed } from "@/app/api/discover-feeds/route";

const STORAGE_KEY = "radio-research-db-v2";

type StoredResult = RadioResearchResult & { id: string };

// ── Kleine Hilfskomponenten ──────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
  );
}

// Logo: Lupe mit Blick auf ein stilisiertes Radio (nutzt currentColor)
function RadioLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="25" cy="25" r="17" />
      <line x1="37.5" y1="37.5" x2="52" y2="52" strokeWidth={3.6} />
      <rect x="14" y="20" width="22" height="12" rx="2" />
      <circle cx="20" cy="26" r="3" />
      <line x1="27" y1="23.5" x2="32" y2="23.5" />
      <line x1="27" y1="26" x2="32" y2="26" />
      <line x1="27" y1="28.5" x2="32" y2="28.5" />
      <line x1="30" y1="20" x2="41" y2="7" />
      <circle cx="41" cy="7" r="1.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SourceBadge({ sourceType, validated, count }: { sourceType: string; validated: boolean; count: number }) {
  if (sourceType === "verified") return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      {count} Quellen · web-verifiziert
    </span>
  );
  if (sourceType === "rss" && validated) return (
    <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
      <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
      RSS · offizielle Quelle
    </span>
  );
  if (sourceType === "rss") return (
    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-600/50 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
      RSS · Medienquelle
    </span>
  );
  if (validated) return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      {count} Quellen · verifiziert
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      1 Quelle
    </span>
  );
}

function FeedStatusDot({ status }: { status: FeedResult["status"] }) {
  if (status === "ok")
    return <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" title="OK" />;
  if (status === "timeout")
    return <span className="inline-block h-2 w-2 rounded-full bg-amber-500" title="Timeout" />;
  return <span className="inline-block h-2 w-2 rounded-full bg-red-500" title="Fehler" />;
}

// ── Progress Stepper ─────────────────────────────────────────────────────────

type StepStatus = "pending" | "active" | "done" | "error";

function getSteps() {
  return [
    { id: "rss",   label: "RSS-Feeds laden",     detail: "Lemgo, TH OWL, LZ Kreis Lippe …" },
    { id: "texts", label: "Sprechtexte (Top 5)", detail: "KI formuliert Radio-Sprechtext für die 5 wichtigsten Meldungen …" },
    { id: "done",  label: "Bulletin fertig",      detail: "" },
  ];
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "done")
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-sm">
        ✓
      </span>
    );
  if (status === "active")
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/50">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </span>
    );
  if (status === "error")
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-sm">
        ✕
      </span>
    );
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800">
      <span className="h-2 w-2 rounded-full bg-zinc-600" />
    </span>
  );
}

function ProgressStepper({
  phase,
  rssItemCount,
  elapsedMs,
}: {
  phase: string;
  rssItemCount: number;
  elapsedMs: number;
}) {
  const STEPS = getSteps();
  const stepStatuses: Record<string, StepStatus> = {
    rss:   phase === "rss"   ? "active" : ["texts","done","error"].includes(phase) ? "done" : "pending",
    texts: phase === "texts" ? "active" : ["done","error"].includes(phase)         ? "done" : "pending",
    done:  phase === "done"  ? "done"   : phase === "error" ? "error" : "pending",
  };

  const progressPct = phase === "rss" ? 20 : phase === "texts" ? 60 : phase === "done" ? 100 : 0;
  const elapsed = elapsedMs > 0 ? `${Math.floor(elapsedMs / 1000)}s` : null;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 mb-4">
      <div className="mb-5 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-500 transition-all duration-700 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const status = stepStatuses[step.id];
          const isActive = status === "active";
          return (
            <div key={step.id} className="flex items-start gap-3">
              <StepIcon status={status} />
              <div className="flex-1 min-w-0 pt-0.5">
                <p className={`text-sm font-medium leading-none ${
                  isActive ? "text-amber-400" :
                  status === "done" ? "text-zinc-300" : "text-zinc-600"
                }`}>
                  {step.label}
                  {isActive && elapsed && (
                    <span className="ml-2 text-xs font-normal text-zinc-500">{elapsed}</span>
                  )}
                </p>
                {isActive && (
                  <p className="mt-1 text-xs text-zinc-500">
                    {i === 0 ? step.detail :
                     i === 1 && rssItemCount > 0
                       ? `${rssItemCount} Meldungen geladen · ` + step.detail
                       : step.detail}
                  </p>
                )}
                {status === "done" && i === 0 && rssItemCount > 0 && (
                  <p className="mt-0.5 text-xs text-zinc-600">{rssItemCount} Meldungen geladen</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-center text-zinc-600">
        {phase === "texts" ? "Sprechtexte für Top 5 werden geschrieben …"
          : phase === "rss" ? "Feeds werden parallel geladen …"
          : ""}
      </p>
    </div>
  );
}

function NewsCard({
  item,
  rank,
  generating = false,
  onGenerate,
  onSendToEditor,
  onOpenSource,
}: {
  item: NewsItem;
  rank: number;
  generating?: boolean;
  onGenerate?: () => void;
  onSendToEditor?: (text: string) => void;
  onOpenSource?: (url: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(item.radio_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 text-xs font-bold text-amber-400 border border-amber-500/20">
          {rank}
        </span>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <p className="font-semibold text-zinc-100 leading-snug text-sm">{item.headline}</p>
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge sourceType={item.source_type ?? "web"} validated={item.validated} count={item.source_count} />
            {item.url && onOpenSource ? (
              <button
                onClick={() => onOpenSource(item.url!)}
                className="text-xs text-zinc-500 hover:text-amber-400 transition-colors underline underline-offset-2"
              >
                {item.sources.join(" · ")}
              </button>
            ) : (
              <span className="text-xs text-zinc-600">{item.sources.join(" · ")}</span>
            )}
          </div>
        </div>
      </div>

      {generating ? (
        <p className="text-xs text-zinc-600 italic pl-4 border-l-2 border-zinc-800 flex items-center gap-2">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent flex-shrink-0" />
          Sprechtext wird generiert …
        </p>
      ) : item.radio_text ? (
        <>
          <blockquote className="border-l-2 border-amber-500/30 pl-4 text-sm text-zinc-300 leading-relaxed">
            {item.radio_text}
          </blockquote>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              onClick={() => onSendToEditor?.(item.radio_text)}
              className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
            >
              ✎ In Editor bearbeiten
            </button>
            <div className="flex items-center gap-3">
              {onGenerate && (
                <button onClick={onGenerate} className="text-xs text-zinc-500 hover:text-amber-400 transition-colors flex items-center gap-1" title="Neuen Sprechtext aus der Quelle erzeugen">
                  ↻ Erneut generieren
                </button>
              )}
              <button onClick={copy} className="text-xs text-zinc-600 hover:text-amber-400 transition-colors">
                {copied ? "✓ Kopiert" : "Sprechtext kopieren"}
              </button>
            </div>
          </div>
        </>
      ) : onGenerate ? (
        <button
          onClick={onGenerate}
          className="self-start ml-4 mt-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:border-amber-500/50 hover:text-amber-400 transition-colors flex items-center gap-1.5"
        >
          <span>✦</span> Sprechtext generieren
        </button>
      ) : null}
    </div>
  );
}

// ── Quellen-Overlay ──────────────────────────────────────────────────────────

function SourceOverlay({ url, onClose }: { url: string; onClose: () => void }) {
  const [blocked, setBlocked] = useState(false);

  return (
    <div className="fixed bottom-0 right-0 w-1/2 h-1/2 z-50 flex flex-col shadow-2xl border border-zinc-700 rounded-tl-xl overflow-hidden">
      {/* Titelleiste */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-amber-500/40 flex-shrink-0">
        <span className="text-xs text-zinc-400 truncate max-w-[70%]">{url}</span>
        <div className="flex items-center gap-3">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 hover:text-amber-400 transition-colors"
          >
            ↗ Im Browser öffnen
          </a>
          <button
            onClick={onClose}
            className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-zinc-950 hover:bg-amber-400 transition-colors"
          >
            ✕ Schliessen
          </button>
        </div>
      </div>

      {/* Inhalt */}
      {blocked ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-zinc-950 px-8 text-center">
          <p className="text-sm text-zinc-400">
            Diese Seite erlaubt keine Einbettung (X-Frame-Options).
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition-colors"
          >
            ↗ Quelle im Browser öffnen
          </a>
        </div>
      ) : (
        <iframe
          src={url}
          className="flex-1 w-full bg-white"
          onError={() => setBlocked(true)}
          sandbox="allow-scripts allow-same-origin allow-popups"
          title="Quelle"
        />
      )}
    </div>
  );
}

function CategorySection({
  title,
  items,
  color,
  generatingRanks,
  onGenerate,
  onSendToEditor,
  onOpenSource,
}: {
  title: string;
  items: NewsItem[];
  color: string;
  generatingRanks?: Set<number>;
  onGenerate?: (item: NewsItem, category: string) => void;
  onSendToEditor?: (text: string) => void;
  onOpenSource?: (url: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className={`h-px flex-1 ${color}`} />
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">{title}</h3>
        <div className={`h-px flex-1 ${color}`} />
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <NewsCard
            key={item.rank}
            item={item}
            rank={item.rank}
            generating={generatingRanks?.has(item.rank)}
            onGenerate={
              onGenerate && !generatingRanks?.has(item.rank)
                ? () => onGenerate(item, title)
                : undefined
            }
            onSendToEditor={item.radio_text ? onSendToEditor : undefined}
            onOpenSource={onOpenSource}
          />
        ))}
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Editor Panel ─────────────────────────────────────────────────────────────

function EditorPanel({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  function handlePrint() {
    const win = window.open("", "_blank", "width=800,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>Radio Bulletin</title>
<style>
  body {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 14pt;
    line-height: 2;
    margin: 2.5cm 3cm;
    color: #000;
  }
  pre {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    white-space: pre-wrap;
    word-wrap: break-word;
    margin: 0;
  }
</style>
</head>
<body><pre>${value.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></body>
</html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  function handleClear() {
    onChange("");
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-zinc-300 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 bg-zinc-50 flex-shrink-0">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Editor
        </span>
        <div className="flex items-center gap-3">
          {value && (
            <button
              onClick={handleClear}
              className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
            >
              Leeren
            </button>
          )}
          <button
            onClick={handlePrint}
            disabled={!value.trim()}
            className="rounded-lg bg-zinc-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            🖨 Drucken
          </button>
        </div>
      </div>

      {/* Textbereich */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={"Wähle in einer Meldung „In Editor bearbeiten“ — der Sprechtext erscheint hier und kann bearbeitet werden."}
        className="flex-1 resize-none px-5 py-4 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none bg-white leading-relaxed font-serif"
        spellCheck
        lang="de"
      />
    </div>
  );
}

// ── Modal-Hülle ────────────────────────────────────────────────────────────────

function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative z-10 flex max-h-[85vh] w-full ${wide ? "max-w-2xl" : "max-w-lg"} flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl`}
      >
        <div className="flex items-start justify-between border-b border-zinc-800 px-5 py-4 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-zinc-100">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Schliessen"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex-shrink-0 border-t border-zinc-800 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

// ── Region ändern ──────────────────────────────────────────────────────────────

function RegionModal({
  region,
  station,
  onSave,
  onClose,
}: {
  region: string;
  station: string;
  onSave: (station: string, region: string) => void;
  onClose: () => void;
}) {
  const [reg, setReg] = useState(region);
  const [name, setName] = useState(station);
  return (
    <Modal
      title="Sender & Region"
      subtitle="Sendername (Branding) und Sendegebiet für Bulletins & Feed-Suche."
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Abbrechen</button>
          <button
            onClick={() => onSave(name, reg)}
            disabled={!reg.trim()}
            className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-40 transition-colors"
          >
            Speichern
          </button>
        </div>
      }
    >
      <label className="block text-xs font-medium uppercase tracking-widest text-zinc-500 mb-2">Sendername</label>
      <input
        type="text"
        value={name}
        autoFocus
        onChange={(e) => setName(e.target.value)}
        placeholder="z. B. Campusradio Münster"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none mb-4"
      />

      <label className="block text-xs font-medium uppercase tracking-widest text-zinc-500 mb-2">Sendegebiet</label>
      <input
        type="text"
        value={reg}
        onChange={(e) => setReg(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && reg.trim()) onSave(name, reg); }}
        placeholder="z. B. Münster, NRW"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
      />
      <p className="mt-2 text-xs text-zinc-600">
        Der Sendername erscheint in der Kopfzeile. Die Region möglichst eindeutig angeben
        (z. B. mit Bundesland), damit die Feed-Suche das Zentrum korrekt bestimmt.
      </p>
    </Modal>
  );
}

// ── KI-Zugänge verwalten (mehrere Anbieter) ───────────────────────────────────

function AiAccessModal({
  profiles,
  activeId,
  onSave,
  onClose,
}: {
  profiles: AiProfile[];
  activeId: string;
  onSave: (profiles: AiProfile[], activeId: string) => void;
  onClose: () => void;
}) {
  const [list, setList] = useState<AiProfile[]>(() => profiles.map((p) => ({ ...p })));
  const [active, setActive] = useState(activeId || (profiles[0]?.id ?? ""));
  const [reveal, setReveal] = useState<Set<string>>(new Set());

  // Testlauf-Ergebnis je Profil
  type TestResult = { state: "running" } | { state: "ok"; sample: string } | { state: "err"; msg: string };
  const [tests, setTests] = useState<Record<string, TestResult>>({});

  async function testProfile(p: AiProfile) {
    setTests((t) => ({ ...t, [p.id]: { state: "running" } }));
    try {
      const r = await fetch("/api/radio-research", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headersForProfile(p) },
        body: JSON.stringify({ step: "test" }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error ?? "Keine Antwort");
      setTests((t) => ({ ...t, [p.id]: { state: "ok", sample: data.sample ?? "" } }));
    } catch (e) {
      setTests((t) => ({ ...t, [p.id]: { state: "err", msg: e instanceof Error ? e.message : "Fehler" } }));
    }
  }

  // Neuer Zugang
  const [newProvider, setNewProvider] = useState<AiProvider>("openai");
  const [newLabel, setNewLabel] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newBaseUrl, setNewBaseUrl] = useState("");

  function update(id: string, patch: Partial<AiProfile>) {
    setList((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function remove(id: string) {
    setList((prev) => prev.filter((p) => p.id !== id));
    if (active === id) setActive("");
  }
  // custom: braucht Base-URL + Modell (Key optional); sonst: Key
  const canAdd = newProvider === "custom"
    ? !!(newBaseUrl.trim() && newModel.trim())
    : !!newKey.trim();

  function add() {
    if (!canAdd) return;
    const p = makeProfile(newProvider, newLabel, newKey, newModel, newBaseUrl);
    setList((prev) => [...prev, p]);
    if (!active) setActive(p.id);
    setNewLabel(""); setNewKey(""); setNewModel(""); setNewBaseUrl("");
  }
  function toggleReveal(id: string) {
    setReveal((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  const hasAnthropic = list.some((p) => p.provider === "anthropic" && p.key.trim());

  return (
    <Modal
      title="KI-Zugänge"
      subtitle="Mehrere Anbieter hinterlegen und den aktiven Zugang wählen. Keys bleiben lokal."
      onClose={onClose}
      wide
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Abbrechen</button>
          <button
            onClick={() => onSave(list, active || (list[0]?.id ?? ""))}
            className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition-colors"
          >
            Speichern
          </button>
        </div>
      }
    >
      <div className="space-y-2">
        {list.map((p) => {
          const isActive = active === p.id;
          const t = tests[p.id];
          return (
            <div key={p.id} className={`rounded-lg border px-3 py-2.5 ${isActive ? "border-amber-500/50 bg-amber-500/5" : "border-zinc-800 bg-zinc-900"}`}>
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setActive(p.id)}
                  title="Als aktiven Zugang wählen"
                  className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border text-[9px] ${
                    isActive ? "border-amber-400 bg-amber-400 text-zinc-950" : "border-zinc-600"
                  }`}
                >
                  {isActive ? "✓" : ""}
                </button>
                <input
                  value={p.label}
                  onChange={(e) => update(p.id, { label: e.target.value })}
                  className="flex-1 min-w-0 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-zinc-100 hover:border-zinc-700 focus:border-amber-500/50 focus:bg-zinc-800 focus:outline-none"
                />
                <select
                  value={p.provider}
                  onChange={(e) => update(p.id, { provider: e.target.value as AiProvider, model: DEFAULT_MODELS[e.target.value as AiProvider] || p.model })}
                  className="flex-shrink-0 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="anthropic">Anthropic</option>
                  <option value="openai">OpenAI</option>
                  <option value="custom">Custom</option>
                </select>
                <button onClick={() => remove(p.id)} title="Entfernen" className="flex-shrink-0 text-zinc-600 hover:text-red-400 transition-colors px-1">✕</button>
              </div>
              {p.provider === "custom" && (
                <div className="pl-6 mb-2">
                  <input
                    value={p.baseUrl ?? ""}
                    onChange={(e) => update(p.id, { baseUrl: e.target.value })}
                    placeholder="Endpoint-URL (z. B. http://localhost:11434/v1)"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
                  />
                </div>
              )}
              <div className="flex gap-2 pl-6">
                <input
                  type={reveal.has(p.id) ? "text" : "password"}
                  value={p.key}
                  onChange={(e) => update(p.id, { key: e.target.value })}
                  placeholder={p.provider === "openai" ? "sk-…" : p.provider === "custom" ? "API-Key (optional bei lokalem LLM)" : "sk-ant-…"}
                  className="flex-1 min-w-0 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
                />
                <button onClick={() => toggleReveal(p.id)} className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
                  {reveal.has(p.id) ? "verbergen" : "zeigen"}
                </button>
                <input
                  value={p.model}
                  onChange={(e) => update(p.id, { model: e.target.value })}
                  placeholder="Modell"
                  className="w-40 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
                />
              </div>
              {/* Testlauf: prüft, ob dieser Zugang antwortet */}
              <div className="flex items-center gap-2 pl-6 mt-2 min-w-0">
                <button
                  onClick={() => testProfile(p)}
                  disabled={t?.state === "running"}
                  className="flex-shrink-0 rounded-full border border-zinc-700 bg-zinc-800/60 px-3 py-1 text-xs text-zinc-300 hover:text-amber-400 hover:bg-zinc-700/60 disabled:opacity-40 transition-colors"
                >
                  {t?.state === "running" ? "Teste …" : "Testlauf"}
                </button>
                {t && t.state === "ok" && (
                  <span className="min-w-0 truncate text-xs text-emerald-400" title={t.sample}>
                    {`✓ antwortet — „${t.sample}“`}
                  </span>
                )}
                {t && t.state === "err" && (
                  <span className="min-w-0 truncate text-xs text-red-400" title={t.msg}>
                    ✕ {t.msg}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {list.length === 0 && <p className="text-sm text-zinc-600 py-3 text-center">Noch kein Zugang hinterlegt — unten hinzufügen.</p>}
      </div>

      {/* Neuer Zugang */}
      <div className="mt-4 rounded-lg border border-dashed border-zinc-700 p-3">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 mb-2">Zugang hinzufügen</p>
        <div className="flex gap-2 mb-2">
          <select
            value={newProvider}
            onChange={(e) => { const v = e.target.value as AiProvider; setNewProvider(v); if (v !== "custom") setNewModel(""); }}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-2 text-sm text-zinc-200 focus:outline-none"
          >
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI (GPT)</option>
            <option value="custom">OpenAI-kompatibel (Custom)</option>
          </select>
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder={`Name (z. B. „${newProvider === "openai" ? "OpenAI Redaktion" : newProvider === "custom" ? "Infomaniak / Lokales LLM" : "Anthropic privat"}")`}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
          />
        </div>

        {newProvider === "custom" && (
          <div className="mb-2 space-y-2">
            <input
              value={newBaseUrl}
              onChange={(e) => setNewBaseUrl(e.target.value)}
              placeholder="Endpoint-URL (OpenAI-kompatibel)"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
            />
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-zinc-600 self-center">Vorlagen:</span>
              {CUSTOM_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => { setNewBaseUrl(preset.baseUrl); if (!newModel.trim()) setNewModel(preset.model); }}
                  className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="password"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder={newProvider === "openai" ? "OpenAI-API-Key (sk-…)" : newProvider === "custom" ? "API-Key (optional bei lokalem LLM)" : "Anthropic-API-Key (sk-ant-…)"}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
          />
          <input
            value={newModel}
            onChange={(e) => setNewModel(e.target.value)}
            placeholder={DEFAULT_MODELS[newProvider] || "Modellname"}
            className="w-40 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-2 text-sm text-zinc-300 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
          />
          <button
            onClick={add}
            disabled={!canAdd}
            title={canAdd ? "Zugang hinzufügen" : (newProvider === "custom" ? "Endpoint-URL und Modellname erforderlich" : "API-Key erforderlich")}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            + Hinzufügen
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
          {newProvider === "custom"
            ? "Custom-Zugang: Endpoint-URL UND Modellname erforderlich (z. B. llama3.1 oder mixtral), API-Key optional."
            : newProvider === "openai"
            ? "OpenAI: API-Key erforderlich (Modell optional, Standard gpt-4o)."
            : "Anthropic: API-Key erforderlich (Modell optional, Standard claude-sonnet-4-6)."}
          {" Danach "}<span className="text-zinc-300">{"„+ Hinzufügen“"}</span>{" klicken und unten mit "}<span className="text-amber-400">{"„Speichern“"}</span>{" übernehmen — erst dann erscheint der Zugang im KI-Dropdown."}
        </p>
      </div>

      {!hasAnthropic && (
        <p className="mt-3 text-xs text-amber-600/80 flex items-start gap-1.5">
          <span className="flex-shrink-0 mt-0.5">⚠</span>
          <span>Die RSS-Quellen-Suche nutzt Anthropics Web-Suche und benötigt einen Anthropic-Zugang. Ohne ihn funktioniert nur die Texterzeugung (z. B. mit OpenAI).</span>
        </p>
      )}
      <p className="mt-2 text-xs text-zinc-600 leading-relaxed">
        Keys gibt es unter <span className="text-amber-400">console.anthropic.com</span> bzw. <span className="text-amber-400">platform.openai.com</span>. Es entstehen Kosten gemäß deinem Tarif beim jeweiligen Anbieter.
      </p>
    </Modal>
  );
}

// ── RSS-Quellen editieren ────────────────────────────────────────────────────

function FeedEditorModal({ feeds, onSave, onClose }: { feeds: RadioFeed[]; onSave: (f: RadioFeed[]) => void; onClose: () => void }) {
  const [list, setList] = useState<RadioFeed[]>(() => feeds.map((f) => ({ ...f })));
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [newOfficial, setNewOfficial] = useState(true);

  function update(id: string, patch: Partial<RadioFeed>) {
    setList((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }
  function remove(id: string) {
    setList((prev) => prev.filter((f) => f.id !== id));
  }
  function add() {
    const url = newUrl.trim();
    if (!url) return;
    const cat: FeedCategory = newOfficial ? "regional-official" : "regional-media";
    setList((prev) => [...prev, makeFeed(url, newName, cat)]);
    setNewUrl(""); setNewName(""); setNewOfficial(true);
  }

  return (
    <Modal
      title="RSS-Quellen editieren"
      subtitle={`${list.filter((f) => f.enabled).length} aktiv · ${list.length} gesamt`}
      onClose={onClose}
      wide
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Abbrechen</button>
          <button onClick={() => onSave(list)} className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition-colors">Speichern</button>
        </div>
      }
    >
      <div className="space-y-2">
        {list.map((f) => (
          <div key={f.id} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
            <button
              onClick={() => update(f.id, { enabled: !f.enabled })}
              title={f.enabled ? "Aktiv" : "Inaktiv"}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border transition-colors ${
                f.enabled ? "border-amber-500/50 bg-amber-500/20" : "border-zinc-700 bg-zinc-800"
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 h-3.5 w-3.5 rounded-full transition-transform ${f.enabled ? "translate-x-4 bg-amber-400" : "translate-x-0 bg-zinc-600"}`} />
            </button>
            <div className="flex-1 min-w-0 space-y-1">
              <input
                value={f.name}
                onChange={(e) => update(f.id, { name: e.target.value })}
                className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-zinc-100 hover:border-zinc-700 focus:border-amber-500/50 focus:bg-zinc-800 focus:outline-none"
              />
              <input
                value={f.url}
                onChange={(e) => update(f.id, { url: e.target.value })}
                className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-zinc-500 hover:border-zinc-700 focus:border-amber-500/50 focus:bg-zinc-800 focus:outline-none"
              />
            </div>
            <label className="flex flex-shrink-0 items-center gap-1 text-xs text-zinc-500" title="Offizielle Quelle (Stadt/Hochschule) — wird beim Ranking bevorzugt">
              <input
                type="checkbox"
                checked={f.category === "regional-official" || f.category === "education"}
                onChange={(e) => update(f.id, { category: e.target.checked ? "regional-official" : "regional-media" })}
                className="accent-amber-500"
              />
              offiziell
            </label>
            <button onClick={() => remove(f.id)} title="Entfernen" className="flex-shrink-0 text-zinc-600 hover:text-red-400 transition-colors px-1">✕</button>
          </div>
        ))}
        {list.length === 0 && <p className="text-sm text-zinc-600 py-4 text-center">{"Keine Quellen. Füge unten welche hinzu oder nutze „RSS-Quellen suchen“."}</p>}
      </div>

      {/* Neu hinzufügen */}
      <div className="mt-4 rounded-lg border border-dashed border-zinc-700 p-3">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 mb-2">Quelle hinzufügen</p>
        <div className="space-y-2">
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Feed-URL (https://…/rss)"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
          />
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Anzeigename (optional)"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
            />
            <label className="flex items-center gap-1.5 text-xs text-zinc-400">
              <input type="checkbox" checked={newOfficial} onChange={(e) => setNewOfficial(e.target.checked)} className="accent-amber-500" />
              offiziell
            </label>
            <button
              onClick={add}
              disabled={!newUrl.trim()}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:border-amber-500/50 hover:text-amber-400 disabled:opacity-40 transition-colors"
            >
              + Hinzufügen
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── RSS-Quellen in der Region suchen ──────────────────────────────────────────

function FeedDiscoveryModal({ region, onAdd, onClose }: { region: string; onAdd: (sel: DiscoveredFeed[]) => void; onClose: () => void }) {
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">("idle");
  const [results, setResults] = useState<DiscoveredFeed[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  async function search() {
    setPhase("running");
    setError(null);
    setResults([]);
    setSelected(new Set());
    setElapsed(0);
    const t0 = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    try {
      const r = await fetch("/api/discover-feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...discoveryHeader() },
        body: JSON.stringify({ region }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Fehler");
      const feeds: DiscoveredFeed[] = data.feeds ?? [];
      setResults(feeds);
      // Verifizierte standardmäßig vorauswählen
      setSelected(new Set(feeds.filter((f) => f.verified).map((f) => f.url)));
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
      setPhase("error");
    } finally {
      clearInterval(timer);
    }
  }

  function toggle(url: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(url)) n.delete(url); else n.add(url);
      return n;
    });
  }

  const chosen = results.filter((f) => selected.has(f.url));

  return (
    <Modal
      title="RSS-Quellen suchen"
      subtitle={`Umkreis ~30 km um: ${region}`}
      onClose={onClose}
      wide
      footer={
        phase === "done" ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-zinc-500">{chosen.length} ausgewählt</span>
            <div className="flex gap-2">
              <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Abbrechen</button>
              <button
                onClick={() => onAdd(chosen)}
                disabled={chosen.length === 0}
                className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-40 transition-colors"
              >
                Auswahl übernehmen
              </button>
            </div>
          </div>
        ) : undefined
      }
    >
      {phase === "idle" && (
        <div className="space-y-4 py-2">
          <p className="text-sm text-zinc-400">
            Es wird das Zentrum der Region bestimmt und nach offiziellen RSS-Feeds von Städten und öffentlichen
            Institutionen im Umkreis von etwa 30 km gesucht. Gefundene Feeds werden direkt auf Funktion geprüft.
          </p>
          <p className="text-xs text-amber-600/80 flex items-start gap-1.5">
            <span className="flex-shrink-0 mt-0.5">⚠</span>
            <span>Diese Suche nutzt die KI-Websuche und erzeugt API-Kosten. Sie dauert typischerweise ~30–90 Sekunden.</span>
          </p>
          <button onClick={search} className="w-full rounded-xl bg-amber-500 px-4 py-2.5 font-semibold text-sm text-zinc-950 hover:bg-amber-400 transition-colors">
            🔍 Suche starten
          </button>
        </div>
      )}

      {phase === "running" && (
        <div className="flex flex-col items-center justify-center gap-3 py-10">
          <Spinner />
          <p className="text-sm text-zinc-400">Suche läuft … {elapsed}s</p>
          <p className="text-xs text-zinc-600">KI durchsucht das Web und prüft gefundene Feeds.</p>
        </div>
      )}

      {phase === "error" && (
        <div className="space-y-4 py-4">
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={search} className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-amber-500/50 hover:text-amber-400 transition-colors">
            Erneut versuchen
          </button>
        </div>
      )}

      {phase === "done" && (
        <div className="space-y-2">
          {results.length === 0 && <p className="text-sm text-zinc-500 py-4 text-center">Keine Feeds gefunden. Versuche eine präzisere Region.</p>}
          {results.map((f) => {
            const isSel = selected.has(f.url);
            return (
              <button
                key={f.url}
                onClick={() => toggle(f.url)}
                className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                  isSel ? "border-amber-500/50 bg-amber-500/10" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                }`}
              >
                <span className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-[10px] ${
                  isSel ? "border-amber-400 bg-amber-400 text-zinc-950" : "border-zinc-600"
                }`}>
                  {isSel ? "✓" : ""}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-100 truncate">{f.name}</span>
                    {f.verified ? (
                      <span className="flex-shrink-0 text-xs text-emerald-400">✓ {f.itemCount}</span>
                    ) : (
                      <span className="flex-shrink-0 text-xs text-red-400/70">✕ tot</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 truncate">{f.url}</p>
                  {f.location && <p className="text-xs text-zinc-600">{f.location}</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// ── Hauptkomponente ──────────────────────────────────────────────────────────

export default function RadioResearchPage() {
  // Konfiguration (nutzerverwaltet, localStorage)
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [station, setStation] = useState(DEFAULT_STATION);
  const [feeds, setFeeds] = useState<RadioFeed[]>([]);

  // Einstellungs-Modals
  const [modal, setModal] = useState<null | "region" | "feeds" | "discover" | "apikey">(null);

  // KI-Zugänge (Profile) + aktiver Zugang
  const [profiles, setProfiles] = useState<AiProfile[]>([]);
  const [activeId, setActiveId] = useState("");

  // Zustand
  const [phase, setPhase] = useState<"idle" | "rss" | "texts" | "done" | "error">("idle");
  const [rssItems, setRssItems] = useState<RSSItem[]>([]);
  const [feedResults, setFeedResults] = useState<FeedResult[]>([]);
  const [result, setResult] = useState<RadioResearchResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rawPreview, setRawPreview] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Einzel-Sprechtext-Generierung
  const [generatingRanks, setGeneratingRanks] = useState<Set<number>>(new Set());

  // Editor
  const [editorText, setEditorText] = useState("");

  // Quellen-Overlay
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);

  // Datenbank
  const [db, setDb] = useState<StoredResult[]>([]);
  const [showDb, setShowDb] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDb(JSON.parse(raw));
    } catch { /* ignore */ }
    setRegion(loadRegion());
    setStation(loadStation());
    setFeeds(loadFeeds());
    // Keys ggf. entschlüsseln (Electron), dann Profile laden.
    (async () => {
      await initSecureKeys();
      setProfiles(loadProfiles());
      setActiveId(getActiveProfile()?.id ?? "");
    })();
  }, []);

  const activeProfile = profiles.find((p) => p.id === activeId) ?? profiles[0] ?? null;

  // ── Config-Handler ─────────────────────────────────────────────────────────
  function handleSaveRegion(next: string) {
    const clean = next.trim() || DEFAULT_REGION;
    setRegion(clean);
    saveRegion(clean);
  }

  function handleSaveStation(next: string) {
    const clean = next.trim() || DEFAULT_STATION;
    setStation(clean);
    saveStation(clean);
  }

  function handleSaveProfiles(next: AiProfile[], nextActive: string) {
    setProfiles(next);
    void saveProfiles(next); // async (Verschlüsselung); Cache wird synchron gefüllt
    const valid = next.some((p) => p.id === nextActive) ? nextActive : (next[0]?.id ?? "");
    setActiveId(valid);
    saveActiveId(valid);
  }

  function handleSwitchActive(id: string) {
    setActiveId(id);
    saveActiveId(id);
  }

  function handleSaveFeeds(next: RadioFeed[]) {
    setFeeds(next);
    saveFeeds(next);
  }

  function handleAddDiscovered(selected: DiscoveredFeed[]) {
    const existing = new Set(feeds.map((f) => f.url.replace(/\/$/, "").toLowerCase()));
    const additions = selected
      .filter((d) => !existing.has(d.url.replace(/\/$/, "").toLowerCase()))
      .map((d) => makeFeed(d.url, d.name, d.category));
    if (additions.length === 0) return;
    handleSaveFeeds([...feeds, ...additions]);
  }

  const saveToDb = useCallback((r: RadioResearchResult) => {
    const entry: StoredResult = { ...r, id: crypto.randomUUID() };
    setDb((prev) => {
      const next = [entry, ...prev].slice(0, 100);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  function handleSendToEditor(text: string) {
    setEditorText((prev) => prev ? prev + "\n\n" + text : text);
  }

  async function handleResearch() {
    setPhase("rss");
    setErrorMsg(null);
    setRawPreview(null);
    setResult(null);
    setRssItems([]);
    setFeedResults([]);
    setElapsedMs(0);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - (startTimeRef.current ?? Date.now()));
    }, 1000);

    const stopTimer = () => { if (timerRef.current) clearInterval(timerRef.current); };
    const fail = (e: unknown) => {
      setErrorMsg(e instanceof Error ? e.message : "Fehler");
      setPhase("error");
      stopTimer();
    };

    // ── Schritt 1: RSS-Feeds laden ─────────────────────────────────────────
    let fetchedItems: RSSItem[] = [];
    try {
      const activeFeeds = feeds
        .filter((f) => f.enabled)
        .map((f) => ({ id: f.id, name: f.name, url: f.url, category: f.category }));
      const rssRes = await fetch("/api/fetch-rss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feeds: activeFeeds }),
      });
      const rssData: { items: RSSItem[]; feedResults: FeedResult[] } = await rssRes.json();
      fetchedItems = rssData.items ?? [];
      setRssItems(fetchedItems);
      setFeedResults(rssData.feedResults ?? []);
    } catch { setFeedResults([]); }

    // ── RSS-Modus ──────────────────────────────────────────────────────────
    {
      const ranked    = rankRSSItems(fetchedItems);
      const newsItems = rssToNewsItems(ranked);
      const top5      = newsItems.slice(0, 5);

      const initialResult: RadioResearchResult = {
        welt:        [],
        national:    [],
        regional:    newsItems,
        searched_at: new Date().toISOString(),
        region:      region?.trim() || DEFAULT_REGION,
        mode:        "rss",
      };
      setResult(initialResult);

      setPhase("texts");
      try {
        const itemsForText = top5.map(i => ({
          category: "Regional", rank: i.rank, headline: i.headline, sources: i.sources, summary: i.description,
        }));
        const r = await fetch("/api/radio-research", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...aiHeaders() },
          body: JSON.stringify({ mode: "rss", step: "texts", itemsForText }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Fehler");

        const texts: Array<{ category: string; rank: number; radio_text: string }> = data.texts ?? [];
        // Texte je Rang sammeln (Batch + ggf. Einzel-Fallback), Endstand lokal bauen —
        // saveToDb NICHT in einem setState-Updater aufrufen (unpur → doppelte
        // Archiv-Einträge im Dev-StrictMode).
        const batchTexts = new Map<number, string>();
        for (const t of texts) if (t.radio_text?.trim()) batchTexts.set(t.rank, t.radio_text);

        setResult(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            regional: prev.regional.map(item =>
              batchTexts.has(item.rank) ? { ...item, radio_text: batchTexts.get(item.rank)! } : item
            ),
          };
        });

        // Fallback: was der Batch nicht (sauber) geliefert hat, einzeln nachgenerieren.
        // Robust bei kleinen Modellen mit unsauberem JSON; kostet nur bei Bedarf extra.
        // (Eigene Map-Kopie — batchTexts ist von der setResult-Closure eingefroren.)
        const allTexts = new Map(batchTexts);
        const missing = top5.filter(i => !allTexts.has(i.rank));
        for (const item of missing) {
          const single = await generateSingleText(item, "Regional");
          if (single) allTexts.set(item.rank, single);
        }

        // Endstand aus lokalen Daten bauen und einmal speichern
        const finalResult: RadioResearchResult = {
          ...initialResult,
          regional: newsItems.map(item =>
            allTexts.has(item.rank) ? { ...item, radio_text: allTexts.get(item.rank)! } : item
          ),
        };
        setResult(finalResult);
        saveToDb(finalResult);
        setPhase("done");
        stopTimer();
      } catch (e) { return fail(e); }
      return;
    }

  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // Liefert den erzeugten Text zurück (oder null), damit Aufrufer den Endstand
  // lokal weiterverwenden können; aktualisiert zusätzlich selbst das result-State.
  async function generateSingleText(item: NewsItem, category: string): Promise<string | null> {
    setGeneratingRanks(prev => new Set(prev).add(item.rank));
    try {
      const r = await fetch("/api/radio-research", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...aiHeaders() },
        body: JSON.stringify({
          mode: "rss",
          step: "texts",
          itemsForText: [{ category, rank: item.rank, headline: item.headline, sources: item.sources, summary: item.description }],
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Fehler");
      const texts: Array<{ category: string; rank: number; radio_text: string }> = data.texts ?? [];
      if (texts.length > 0 && texts[0].radio_text?.trim()) {
        setResult(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            regional: prev.regional.map(i =>
              i.rank === item.rank ? { ...i, radio_text: texts[0].radio_text } : i
            ),
          };
        });
        return texts[0].radio_text;
      }
      return null;
    } catch {
      return null;
    }
    finally {
      setGeneratingRanks(prev => { const n = new Set(prev); n.delete(item.rank); return n; });
    }
  }

  function exportCsv() {
    const rows = [["Datum", "Region", "Kategorie", "Rang", "Meldung", "Quellen", "Verifiziert", "Sprechtext"]];
    for (const r of db) {
      for (const [cat, items] of [
        ["Welt", r.welt],
        ["National", r.national],
        ["Regional", r.regional],
      ] as [string, NewsItem[]][]) {
        for (const item of items) {
          rows.push([
            formatDate(r.searched_at),
            r.region,
            cat,
            String(item.rank),
            item.headline,
            item.sources.join("; "),
            item.validated ? "ja" : "nein",
            item.radio_text,
          ]);
        }
      }
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `radio-bulletin-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isRunning = phase === "rss" || phase === "texts";

  return (
    <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden">

      {/* Scrollbar-Styling */}
      <style>{`
        .panel-scroll::-webkit-scrollbar { width: 8px; }
        .panel-scroll::-webkit-scrollbar-track { background: #18181b; }
        .panel-scroll::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
        .panel-scroll::-webkit-scrollbar-thumb:hover { background: #52525b; }
        .panel-scroll { scrollbar-width: thin; scrollbar-color: #3f3f46 #18181b; }
      `}</style>

      {/* Header (HiFi-Stil: hellere Karte, Eyebrow = Sendername, Untertitel mit Region, Logo-Badge) */}
      <header className="flex-shrink-0" style={{ background: "#1c1c1f" }}>
        <div className="flex items-center justify-between gap-4 pl-6 pr-20 py-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-amber-500 saturate-[0.65] leading-none mb-1.5 truncate">
              {station}
            </p>
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight leading-none">
              Radio Research Tool
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500 truncate">
              KI-gestütztes Nachrichten-Bulletin aus RSS-Quellen
              {region?.trim() ? ` der Region ${region}` : ""}
            </p>
          </div>
          {/* Logo-Badge: Lupe mit Blick auf ein stilisiertes Radio (~30 % entsättigt) */}
          <div className="flex-shrink-0 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/35 bg-amber-500/[0.07] saturate-[0.7]">
            <RadioLogo className="h-8 w-8 text-amber-500" />
          </div>
        </div>
        {/* feine Amber-Linie wie in der HiFi-App */}
        <div className="h-px bg-gradient-to-r from-amber-500/40 via-amber-500/15 to-transparent" />
      </header>

      {/* Hauptbereich: obere Hälfte 2-spaltig + untere Hälfte Editor */}
      <div className="flex-1 flex flex-col min-h-0">

        {/* Obere Hälfte */}
        <div className="flex-1 min-h-0 flex border-b border-zinc-800 overflow-hidden">

          {/* Linkes Panel: Steuerung */}
          <div className="panel-scroll w-1/2 overflow-y-scroll border-r border-zinc-800 p-4">

            {/* Konfiguration */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 mb-4">

              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Region</h2>
                  <p className="text-sm text-zinc-200 truncate">{region}</p>
                </div>
                <button
                  onClick={() => setModal("region")}
                  disabled={isRunning}
                  className="flex-shrink-0 text-xs text-zinc-500 hover:text-amber-400 transition-colors disabled:opacity-40"
                >
                  ändern
                </button>
              </div>

              <div className="flex items-start justify-between border-t border-zinc-800 pt-3">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-0.5">RSS-Quellen</h2>
                  <p className="text-xs text-zinc-600">
                    {feeds.filter((f) => f.enabled).length} aktiv · {feeds.length} gesamt
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={() => setModal("feeds")}
                    disabled={isRunning}
                    className="text-xs text-zinc-500 hover:text-amber-400 transition-colors disabled:opacity-40"
                  >
                    editieren
                  </button>
                  <button
                    onClick={() => setModal("discover")}
                    disabled={isRunning}
                    className="text-xs text-zinc-500 hover:text-amber-400 transition-colors disabled:opacity-40"
                  >
                    suchen
                  </button>
                </div>
              </div>

            </div>

            {/* Aktions-Button */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 mb-4">
              {/* KI-Zugang: aktiver Anbieter, im Betrieb umschaltbar */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-zinc-500 flex-shrink-0">KI</span>
                {profiles.length > 0 ? (
                  <select
                    value={activeId}
                    onChange={(e) => handleSwitchActive(e.target.value)}
                    disabled={isRunning}
                    className="flex-1 min-w-0 rounded-full border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700/60 focus:border-zinc-600 focus:outline-none disabled:opacity-40 transition-colors"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}{p.label !== PROVIDER_LABELS[p.provider] ? ` · ${PROVIDER_LABELS[p.provider]}` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <button
                    onClick={() => setModal("apikey")}
                    className="flex-1 rounded-full border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700/60 hover:text-zinc-100 transition-colors"
                  >
                    KI-Zugang einrichten →
                  </button>
                )}
                {profiles.length > 0 && (
                  <button
                    onClick={() => setModal("apikey")}
                    title="KI-Zugänge verwalten: Anbieter hinzufügen, Key/Modell bearbeiten"
                    className="flex-shrink-0 rounded-full border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-400 hover:text-amber-400 hover:bg-zinc-700/60 transition-colors"
                  >
                    Verwalten
                  </button>
                )}
              </div>

              <button
                onClick={() => handleResearch()}
                disabled={isRunning}
                className="w-full rounded-full border border-amber-500/50 bg-amber-500/15 px-4 py-2.5 font-medium text-sm text-amber-400 hover:bg-amber-500/25 hover:text-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isRunning && <Spinner />}
                {isRunning ? "Läuft …" : "📋 RSS-Bulletin erstellen"}
              </button>
              <p className="mt-2 text-xs text-zinc-600 text-center">~5–10 s</p>
            </div>

            {/* Fortschritt */}
            {phase !== "idle" && (
              <ProgressStepper
                phase={phase}
                rssItemCount={rssItems.length}
                elapsedMs={elapsedMs}
              />
            )}

            {/* Feed-Status */}
            {feedResults.length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Feed-Status</p>
                <div className="flex flex-wrap gap-2">
                  {feedResults.map((f) => (
                    <div key={f.feedId} className="flex items-center gap-1.5">
                      <FeedStatusDot status={f.status} />
                      <span className="text-xs text-zinc-400">{f.feedName}</span>
                      {f.status === "ok" && (
                        <span className="text-xs text-zinc-600">({f.itemCount})</span>
                      )}
                      {f.resolvedUrl && (
                        <span className="text-xs text-amber-500/70" title={`Fallback aktiv: ${f.resolvedUrl}`}>
                          ↩ Fallback
                        </span>
                      )}
                      {f.error && (
                        <span className="text-xs text-zinc-600">({f.error})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fehler */}
            {phase === "error" && errorMsg && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 mb-4 space-y-2">
                <p className="text-sm font-medium text-red-400">{errorMsg}</p>
                {rawPreview && (
                  <details className="text-xs">
                    <summary className="text-zinc-500 cursor-pointer hover:text-zinc-300">KI-Antwort (Debug)</summary>
                    <pre className="mt-2 overflow-x-auto rounded bg-zinc-900 p-3 text-zinc-400 whitespace-pre-wrap">{rawPreview}</pre>
                  </details>
                )}
              </div>
            )}

            {/* Archiv */}
            <div className="border-t border-zinc-800 pt-4">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setShowDb((v) => !v)}
                  className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  {showDb ? "▼" : "▶"} Archiv ({db.length})
                </button>
                {db.length > 0 && (
                  <div className="flex gap-3">
                    <button onClick={exportCsv} className="text-xs text-zinc-500 hover:text-amber-400 transition-colors">
                      CSV
                    </button>
                    <button
                      onClick={() => {
                        setDb([]);
                        try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
                      }}
                      className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      Leeren
                    </button>
                  </div>
                )}
              </div>

              {showDb && db.length === 0 && (
                <p className="text-sm text-zinc-600">Keine gespeicherten Bulletins.</p>
              )}

              {showDb && db.length > 0 && (
                <div className="space-y-3">
                  {db.map((r) => (
                    <div key={r.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-xs font-medium text-zinc-400">{formatDate(r.searched_at)}</p>
                        <span className="text-zinc-700">·</span>
                        <p className="text-xs text-zinc-500">{r.region}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Welt", items: r.welt, color: "text-blue-400" },
                          { label: "National", items: r.national, color: "text-purple-400" },
                          { label: "Regional", items: r.regional, color: "text-green-400" },
                        ].map(({ label, items, color }) => (
                          <div key={label}>
                            <p className={`text-xs font-medium mb-1 ${color}`}>{label}</p>
                            <div className="space-y-0.5">
                              {items.map((item) => (
                                <p key={item.rank} className="text-xs text-zinc-500 truncate">{item.rank}. {item.headline}</p>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rechtes Panel: Bulletin */}
          <div className="panel-scroll w-1/2 overflow-y-scroll p-4">
            {!result && phase === "idle" && (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-zinc-600 text-center">
                  Starte eine Recherche,<br />um das Bulletin zu sehen.
                </p>
              </div>
            )}
            {result && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-zinc-100">Nachrichtenbulletin</h2>
                  <span className="text-xs text-zinc-600">
                    {formatDate(result.searched_at)} · {result.region}
                  </span>
                </div>
                <div className="space-y-8">
                  <CategorySection
                    title="Weltgeschehen"
                    items={result.welt}
                    color="bg-blue-500/20"
                    generatingRanks={generatingRanks}
                    onGenerate={generateSingleText}
                    onSendToEditor={handleSendToEditor}
                    onOpenSource={setOverlayUrl}
                  />
                  <CategorySection
                    title="National"
                    items={result.national}
                    color="bg-purple-500/20"
                    generatingRanks={generatingRanks}
                    onGenerate={generateSingleText}
                    onSendToEditor={handleSendToEditor}
                    onOpenSource={setOverlayUrl}
                  />
                  <CategorySection
                    title="Regional"
                    items={result.regional}
                    color="bg-green-500/20"
                    generatingRanks={generatingRanks}
                    onGenerate={generateSingleText}
                    onSendToEditor={handleSendToEditor}
                    onOpenSource={setOverlayUrl}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Untere Hälfte: Editor */}
        <div className="flex-1 min-h-0 p-4">
          <EditorPanel value={editorText} onChange={setEditorText} />
        </div>
      </div>

      {/* Quellen-Overlay */}
      {overlayUrl && (
        <SourceOverlay url={overlayUrl} onClose={() => setOverlayUrl(null)} />
      )}

      {/* Radio-Hamburger-Menü */}
      <RadioHamburgerMenu
        station={station}
        feeds={feeds}
        activeProfileLabel={activeProfile?.label ?? null}
        onChangeRegion={() => setModal("region")}
        onEditFeeds={() => setModal("feeds")}
        onDiscoverFeeds={() => setModal("discover")}
        onApiKey={() => setModal("apikey")}
      />

      {/* Einstellungs-Modals */}
      {modal === "region" && (
        <RegionModal
          region={region}
          station={station}
          onSave={(s, r) => { handleSaveStation(s); handleSaveRegion(r); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "feeds" && (
        <FeedEditorModal
          feeds={feeds}
          onSave={(f) => { handleSaveFeeds(f); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "discover" && (
        <FeedDiscoveryModal
          region={region}
          onAdd={(sel) => { handleAddDiscovered(sel); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "apikey" && (
        <AiAccessModal
          profiles={profiles}
          activeId={activeId}
          onSave={(ps, act) => { handleSaveProfiles(ps, act); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
