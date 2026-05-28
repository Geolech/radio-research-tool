"use client";

import { useState } from "react";
import { HifiDevice } from "@/lib/types";

interface Manual {
  title: string;
  url: string;
  source: string;
  type: string;
  language?: string;
}

interface ManualSectionProps {
  device: HifiDevice;
  savedManuals: Manual[];
}

export default function ManualSection({ device, savedManuals }: ManualSectionProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(savedManuals.length > 0);
  const [manuals, setManuals] = useState<Manual[]>(savedManuals);
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(savedManuals.map((_, i) => i))
  );
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"model" | "web" | null>(null);

  async function handleSearch(forceWeb = false) {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/find-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: device.brand, model: device.model, forceWeb }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      const found: Manual[] = data.manuals ?? [];
      setManuals(found);
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
      const toSave = manuals.filter((_, i) => selected.has(i));
      const res = await fetch("/api/save-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: device.id, manuals: toSave }),
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

  const selectedCount = selected.size;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg">📄</span>
          <h3 className="text-sm font-semibold text-zinc-200">Bedienungsanleitungen</h3>
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

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      {manuals.length > 0 ? (
        <div className="space-y-2">
          {manuals.map((m, i) => {
            const isSelected = selected.has(i);
            return (
              <div
                key={i}
                onClick={() => toggleSelect(i)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                  isSelected
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-zinc-700 bg-zinc-800 opacity-50"
                }`}
              >
                {/* Checkbox */}
                <div className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                  isSelected ? "border-amber-500 bg-amber-500" : "border-zinc-600 bg-transparent"
                }`}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-zinc-900" fill="none" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">{m.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-zinc-500">{m.type} · {m.source}</p>
                    {m.language && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        m.language.toLowerCase().includes("deutsch")
                          ? "bg-green-500/10 text-green-400 border border-green-500/20"
                          : "bg-zinc-700 text-zinc-400"
                      }`}>
                        {m.language}
                      </span>
                    )}
                  </div>
                </div>

                <a
                  href={m.url}
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
            <p className="text-xs text-zinc-600">
              {selectedCount} von {manuals.length} ausgewählt
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-zinc-600 italic">
          {loading ? "Suche läuft …" : "Noch keine Anleitungen hinterlegt. Oben suchen."}
        </p>
      )}
    </div>
  );
}
