"use client";

import { useState } from "react";
import { HifiDevice } from "@/lib/types";

interface Review {
  title: string;
  url: string;
  source: string;
  type: string;
  language?: string;
  year?: string;
}

interface ReviewSectionProps {
  device: HifiDevice;
  savedReviews: Review[];
}

export default function ReviewSection({ device, savedReviews }: ReviewSectionProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(savedReviews.length > 0);
  const [reviews, setReviews] = useState<Review[]>(savedReviews);
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(savedReviews.map((_, i) => i))
  );
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"model" | "web" | null>(null);

  // Zusammenfassung
  const [summarizing, setSummarizing] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [summaryEdited, setSummaryEdited] = useState(false);
  const [summarySaving, setSummarySaving] = useState(false);
  const [summarySaved, setSummarySaved] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryNote, setSummaryNote] = useState<string | null>(null);

  async function handleSearch(forceWeb = false) {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/find-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: device.brand, model: device.model, category: device.category, forceWeb }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      const found: Review[] = data.reviews ?? [];
      setReviews(found);
      setSelected(new Set(found.map((_, i) => i)));
      setSource(data.source ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const toSave = reviews.filter((_, i) => selected.has(i));
      const res = await fetch("/api/save-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: device.id, reviews: toSave }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  async function handleSummarize() {
    setSummarizing(true);
    setSummaryText("");
    setSummaryError(null);
    setSummarySaved(false);
    setSummaryEdited(false);
    setSummaryNote(null);
    try {
      // Alle gespeicherten Testberichte übergeben (vollständige Objekte für Zitate)
      const sourceReviews = savedReviews.length > 0 ? savedReviews : reviews.filter((_, i) => selected.has(i));
      const res = await fetch("/api/summarize-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: device.brand, model: device.model, reviews: sourceReviews }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      setSummaryText(data.description ?? "");
      if (data.skippedNote) setSummaryNote(data.skippedNote);
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setSummarizing(false);
    }
  }

  async function handleSaveSummary() {
    setSummarySaving(true);
    setSummaryError(null);
    try {
      const res = await fetch("/api/save-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: device.id,
          description: summaryText,
          specs: device.specs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      setSummarySaved(true);
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : "Fehler beim Speichern");
    } finally {
      setSummarySaving(false);
    }
  }

  const selectedCount = selected.size;
  const hasSavedReviews = savedReviews.length > 0;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg">📰</span>
          <h3 className="text-sm font-semibold text-zinc-200">Testberichte</h3>
          {source === "model" && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
              Modellwissen · ca. Anfang 2025
            </span>
          )}
          {source === "web" && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Web-Suche · aktuell
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {source === "model" && !loading && (
            <button
              onClick={() => handleSearch(true)}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-600 bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-400 hover:bg-zinc-700 transition-colors"
            >
              ↺ Im Web aktualisieren
            </button>
          )}
          <button
            onClick={() => handleSearch(false)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <><span className="animate-spin">⟳</span> Suche …</> : <>✦ Suchen</>}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Testberichte-Liste */}
      {reviews.length > 0 ? (
        <div className="space-y-2">
          {reviews.map((r, i) => {
            const isSelected = selected.has(i);
            const isDe = r.language?.toLowerCase().includes("deutsch");
            return (
              <div
                key={i}
                onClick={() => toggleSelect(i)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                  isSelected ? "border-amber-500/40 bg-amber-500/5" : "border-zinc-700 bg-zinc-800 opacity-50"
                }`}
              >
                <div className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                  isSelected ? "border-amber-500 bg-amber-500" : "border-zinc-600 bg-transparent"
                }`}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-zinc-900" fill="none" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">{r.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <p className="text-xs text-zinc-500">{r.type} · {r.source}{r.year ? ` · ${r.year}` : ""}</p>
                    {r.language && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        isDe ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-zinc-700 text-zinc-400"
                      }`}>{r.language}</span>
                    )}
                  </div>
                </div>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 rounded-lg bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-amber-500 hover:text-zinc-900 transition-colors"
                >
                  Öffnen ↗
                </a>
              </div>
            );
          })}

          <div className="pt-3 border-t border-zinc-800 flex items-center gap-3">
            {saved ? (
              <p className="text-xs text-emerald-400 font-medium">✓ Gespeichert</p>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving || selectedCount === 0}
                className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Speichere …" : `↓ ${selectedCount} übernehmen`}
              </button>
            )}
            <p className="text-xs text-zinc-600">{selectedCount} von {reviews.length} ausgewählt</p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-zinc-600 italic">
          {loading ? "Suche läuft …" : "Noch keine Testberichte hinterlegt. Oben suchen."}
        </p>
      )}

      {/* Zusammenfassung – nur wenn gespeicherte Berichte vorhanden */}
      {hasSavedReviews && (
        <div className="pt-4 border-t border-zinc-800">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-medium uppercase tracking-widest text-amber-500">
                Beschreibung aus Testberichten
              </p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700/60 text-zinc-400 border border-zinc-600">
                🤖 KI-Auswertung · ohne Gewähr
              </span>
            </div>
            <button
              onClick={handleSummarize}
              disabled={summarizing}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {summarizing ? <><span className="animate-spin">⟳</span> Lese Berichte …</> : <>✦ Zusammenfassen</>}
            </button>
          </div>

          {summaryError && <p className="text-xs text-red-400 mb-2">{summaryError}</p>}

          {summaryNote && (
            <p className="text-xs text-zinc-500 italic mb-2">ℹ {summaryNote}</p>
          )}

          {summaryText && (
            <div className="space-y-3">
              <textarea
                value={summaryText}
                onChange={(e) => { setSummaryText(e.target.value); setSummaryEdited(true); setSummarySaved(false); }}
                rows={4}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-200 leading-relaxed focus:border-amber-500 focus:outline-none resize-none"
              />
              <div className="flex items-center gap-3">
                {summarySaved ? (
                  <p className="text-xs text-emerald-400 font-medium">✓ Beschreibung gespeichert</p>
                ) : (
                  <button
                    onClick={handleSaveSummary}
                    disabled={summarySaving}
                    className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-amber-400 transition-colors disabled:opacity-50"
                  >
                    {summarySaving ? "Speichere …" : "↓ Als Beschreibung übernehmen"}
                  </button>
                )}
                {summaryEdited && !summarySaved && (
                  <p className="text-xs text-zinc-600 italic">Bearbeitet</p>
                )}
              </div>
            </div>
          )}

          {!summaryText && !summarizing && (
            <p className="text-xs text-zinc-600 italic">
              Liest die gespeicherten Testberichte und erstellt eine faktenbasierte Beschreibung mit Quellenangaben. Keine wörtlichen Zitate – ausschließlich sinngemäße Paraphrasen.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
