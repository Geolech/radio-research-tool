"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { RadioResearchResult, NewsItem } from "@/app/api/radio-research/route";
import type { RSSItem, FeedResult } from "@/app/api/fetch-rss/route";

// ── Web-Quellen ──────────────────────────────────────────────────────────────

const WEB_SOURCES = [
  { id: "tagesschau.de", label: "Tagesschau" },
  { id: "spiegel.de", label: "Spiegel" },
  { id: "faz.net", label: "FAZ" },
  { id: "zeit.de", label: "ZEIT" },
  { id: "dw.com", label: "DW" },
  { id: "reuters.com", label: "Reuters" },
  { id: "bbc.com", label: "BBC" },
  { id: "apnews.com", label: "AP" },
];

const STORAGE_KEY = "radio-research-db-v2";

type StoredResult = RadioResearchResult & { id: string };

// ── Kleine Hilfskomponenten ──────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
  );
}

function ValidationBadge({ validated, count }: { validated: boolean; count: number }) {
  if (validated) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        {count} Quellen · verifiziert
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      1 Quelle · nicht verifiziert
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

function NewsCard({ item, rank }: { item: NewsItem; rank: number }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(item.radio_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 text-xs font-bold text-amber-400 border border-amber-500/20">
          {rank}
        </span>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <p className="font-semibold text-zinc-100 leading-snug">{item.headline}</p>
          <div className="flex flex-wrap items-center gap-2">
            <ValidationBadge validated={item.validated} count={item.source_count} />
            <span className="text-xs text-zinc-600">{item.sources.join(" · ")}</span>
          </div>
        </div>
      </div>
      <blockquote className="border-l-2 border-amber-500/30 pl-4 text-sm text-zinc-300 leading-relaxed">
        {item.radio_text}
      </blockquote>
      <button
        onClick={copy}
        className="self-end text-xs text-zinc-600 hover:text-amber-400 transition-colors"
      >
        {copied ? "✓ Kopiert" : "Sprechtext kopieren"}
      </button>
    </div>
  );
}

function CategorySection({
  title,
  items,
  color,
}: {
  title: string;
  items: NewsItem[];
  color: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className={`h-px flex-1 ${color}`} />
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">{title}</h3>
        <div className={`h-px flex-1 ${color}`} />
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <NewsCard key={item.rank} item={item} rank={item.rank} />
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

// ── Hauptkomponente ──────────────────────────────────────────────────────────

export default function RadioResearchPage() {
  // Konfiguration
  const [webSources, setWebSources] = useState<string[]>(WEB_SOURCES.map((s) => s.id));
  const [region, setRegion] = useState("OWL, Kreis Lippe, Detmold");
  const [deepSearch, setDeepSearch] = useState(false);

  // Zustand
  const [phase, setPhase] = useState<"idle" | "rss" | "ai" | "done" | "error">("idle");
  const [rssItems, setRssItems] = useState<RSSItem[]>([]);
  const [feedResults, setFeedResults] = useState<FeedResult[]>([]);
  const [result, setResult] = useState<RadioResearchResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rawPreview, setRawPreview] = useState<string | null>(null);

  // Datenbank
  const [db, setDb] = useState<StoredResult[]>([]);
  const [showDb, setShowDb] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDb(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const saveToDb = useCallback((r: RadioResearchResult) => {
    const entry: StoredResult = { ...r, id: crypto.randomUUID() };
    setDb((prev) => {
      const next = [entry, ...prev].slice(0, 100);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  function toggleWebSource(id: string) {
    setWebSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleResearch() {
    setPhase("rss");
    setErrorMsg(null);
    setRawPreview(null);
    setResult(null);
    setRssItems([]);
    setFeedResults([]);

    // Phase 1: RSS-Feeds laden
    let fetchedItems: RSSItem[] = [];
    try {
      const priorities = deepSearch
        ? ["primary", "secondary", "deep"]
        : ["primary", "secondary"];
      const rssRes = await fetch("/api/fetch-rss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priorities }),
      });
      const rssData: { items: RSSItem[]; feedResults: FeedResult[] } = await rssRes.json();
      fetchedItems = rssData.items ?? [];
      setRssItems(fetchedItems);
      setFeedResults(rssData.feedResults ?? []);
    } catch {
      // RSS-Fehler nicht fatal — Recherche trotzdem fortsetzen
      setFeedResults([]);
    }

    // Phase 2: KI-Recherche
    setPhase("ai");
    try {
      const aiRes = await fetch("/api/radio-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webSources, region, rssItems: fetchedItems }),
      });
      const data = await aiRes.json();
      if (!aiRes.ok) {
        if (data.rawPreview) setRawPreview(data.rawPreview);
        throw new Error(data.error ?? "Unbekannter Fehler");
      }
      setResult(data);
      saveToDb(data);
      setPhase("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Fehler";
      setErrorMsg(msg);
      // rawPreview is set from the API response body if available
      setPhase("error");
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

  const isRunning = phase === "rss" || phase === "ai";

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-10 border-b border-zinc-800 pb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-amber-400 transition-colors mb-6">
            ← Zurück zur Sammlung
          </Link>
          <p className="text-xs font-medium uppercase tracking-widest text-amber-500 mb-2">Radioredaktion OWL</p>
          <h1 className="text-4xl font-bold text-zinc-100 tracking-tight">Radio Research Tool</h1>
          <p className="mt-2 text-zinc-500 text-sm">
            News-Gathering mit Quellenvalidierung — Top 3 Welt · National · Regional
          </p>
        </div>

        {/* Konfiguration */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Web-Quellen</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {WEB_SOURCES.map((s) => {
              const active = webSources.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleWebSource(s.id)}
                  disabled={isRunning}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                    active
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                      : "border-zinc-700 bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Region</h2>
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            disabled={isRunning}
            placeholder="z. B. OWL, Kreis Lippe, Detmold"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20 mb-6 disabled:opacity-40"
          />

          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">RSS-Feeds</h2>
              <p className="text-xs text-zinc-600">
                Lemgo · TH OWL · LZ Kreis Lippe (primär/sekundär)
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-zinc-500">Lokal Deep Search</span>
              <button
                role="switch"
                aria-checked={deepSearch}
                onClick={() => setDeepSearch((v) => !v)}
                disabled={isRunning}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border transition-colors disabled:opacity-40 ${
                  deepSearch ? "border-amber-500/50 bg-amber-500/20" : "border-zinc-700 bg-zinc-800"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-3.5 w-3.5 rounded-full transition-transform ${
                    deepSearch ? "translate-x-4 bg-amber-400" : "translate-x-0 bg-zinc-600"
                  }`}
                />
              </button>
            </label>
          </div>
          {deepSearch && (
            <p className="text-xs text-zinc-600 -mt-4 mb-6 pl-1">
              Erweitert auf alle Lippe-Gemeinden via LZ-Feeds + TYPO3-Muster. Dauert länger.
            </p>
          )}

          <button
            onClick={handleResearch}
            disabled={isRunning || webSources.length === 0}
            className="w-full rounded-xl bg-amber-500 px-6 py-3.5 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isRunning && <Spinner />}
            {phase === "rss" && "Schritt 1/2: RSS-Feeds werden geladen…"}
            {phase === "ai" && "Schritt 2/2: KI recherchiert und verfasst Sprechtext…"}
            {(phase === "idle" || phase === "done" || phase === "error") && "Recherche starten"}
          </button>
        </div>

        {/* RSS-Status */}
        {feedResults.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">RSS-Feed-Status</p>
            <div className="flex flex-wrap gap-3">
              {feedResults.map((f) => (
                <div key={f.feedId} className="flex items-center gap-1.5">
                  <FeedStatusDot status={f.status} />
                  <span className="text-xs text-zinc-400">{f.feedName}</span>
                  {f.status === "ok" && (
                    <span className="text-xs text-zinc-600">({f.itemCount})</span>
                  )}
                  {f.error && (
                    <span className="text-xs text-zinc-600">({f.error})</span>
                  )}
                </div>
              ))}
            </div>
            {rssItems.length > 0 && (
              <p className="text-xs text-zinc-600 mt-2">
                {rssItems.length} Meldungen aus RSS-Feeds als Kontext an KI übergeben.
              </p>
            )}
          </div>
        )}

        {/* Fehler */}
        {phase === "error" && errorMsg && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 mb-6 space-y-2">
            <p className="text-sm font-medium text-red-400">{errorMsg}</p>
            {rawPreview && (
              <details className="text-xs">
                <summary className="text-zinc-500 cursor-pointer hover:text-zinc-300">KI-Antwort anzeigen (Debug)</summary>
                <pre className="mt-2 overflow-x-auto rounded bg-zinc-900 p-3 text-zinc-400 whitespace-pre-wrap">{rawPreview}</pre>
              </details>
            )}
          </div>
        )}

        {/* Ergebnisse */}
        {result && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-zinc-100">Nachrichtenbulletin</h2>
              <span className="text-xs text-zinc-600">
                {formatDate(result.searched_at)} · {result.region}
              </span>
            </div>
            <div className="space-y-10">
              <CategorySection
                title="Weltgeschehen"
                items={result.welt}
                color="bg-blue-500/20"
              />
              <CategorySection
                title="National"
                items={result.national}
                color="bg-purple-500/20"
              />
              <CategorySection
                title="Regional"
                items={result.regional}
                color="bg-green-500/20"
              />
            </div>
          </div>
        )}

        {/* Datenbank */}
        <div className="border-t border-zinc-800 pt-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowDb((v) => !v)}
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              {showDb ? "▼" : "▶"} Archiv ({db.length} Bulletins)
            </button>
            {db.length > 0 && (
              <div className="flex gap-4">
                <button onClick={exportCsv} className="text-xs text-zinc-500 hover:text-amber-400 transition-colors">
                  CSV exportieren
                </button>
                <button
                  onClick={() => {
                    setDb([]);
                    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
                  }}
                  className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                >
                  Archiv leeren
                </button>
              </div>
            )}
          </div>

          {showDb && db.length === 0 && (
            <p className="text-sm text-zinc-600">Noch keine gespeicherten Bulletins.</p>
          )}

          {showDb && db.length > 0 && (
            <div className="space-y-4">
              {db.map((r) => (
                <div key={r.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <p className="text-xs font-medium text-zinc-400">{formatDate(r.searched_at)}</p>
                    <span className="text-zinc-700">·</span>
                    <p className="text-xs text-zinc-500">{r.region}</p>
                    <span className="text-zinc-700">·</span>
                    <p className="text-xs text-zinc-600">
                      {r.welt.length + r.national.length + r.regional.length} Meldungen
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Welt", items: r.welt, color: "text-blue-400" },
                      { label: "National", items: r.national, color: "text-purple-400" },
                      { label: "Regional", items: r.regional, color: "text-green-400" },
                    ].map(({ label, items, color }) => (
                      <div key={label}>
                        <p className={`text-xs font-medium mb-1 ${color}`}>{label}</p>
                        <div className="space-y-1">
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
    </main>
  );
}
