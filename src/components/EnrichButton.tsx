"use client";

import { useState } from "react";
import { IconLoader2, IconSparkles, IconBook, IconRobot, IconCheck } from "@tabler/icons-react";
import { HifiDevice } from "@/lib/types";

interface EnrichButtonProps {
  device: HifiDevice;
}

type SpecRow = { key: string; value: string };
type Source = "model" | "wikipedia" | "combined" | null;

export default function EnrichButton({ device }: EnrichButtonProps) {
  const [loading, setLoading] = useState(false);
  const [loadingWiki, setLoadingWiki] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<Source>(null);
  const [articleUrl, setArticleUrl] = useState<string | null>(null);
  const [articleTitle, setArticleTitle] = useState<string | null>(null);

  // Editable state – pre-filled from saved device data if available
  const [description, setDescription] = useState(device.description ?? "");
  const [specRows, setSpecRows] = useState<SpecRow[]>(
    Object.entries(device.specs ?? {}).map(([key, value]) => ({ key, value }))
  );
  const [hasResult, setHasResult] = useState(
    !!(device.description || (device.specs && Object.keys(device.specs).length > 0))
  );

  async function handleEnrich() {
    setLoading(true);
    setError(null);
    setSaved(false);
    setArticleUrl(null);
    try {
      const res = await fetch("/api/enrich-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: device.brand, model: device.model, category: device.category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      setDescription(data.description ?? "");
      setSpecRows(Object.entries(data.specs ?? {}).map(([key, value]) => ({ key, value: value as string })));
      setSource("model");
      setHasResult(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  async function handleEnrichWikipedia() {
    setLoadingWiki(true);
    setError(null);
    setSaved(false);
    setArticleUrl(null);
    try {
      const existingSpecs = hasResult
        ? Object.fromEntries(specRows.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value]))
        : undefined;
      const res = await fetch("/api/enrich-from-wikipedia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: device.brand,
          model: device.model,
          category: device.category,
          ...(hasResult && { existingDescription: description, existingSpecs }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      setDescription(data.description ?? "");
      setSpecRows(Object.entries(data.specs ?? {}).map(([key, value]) => ({ key, value: value as string })));
      setSource(hasResult ? "combined" : "wikipedia");
      setArticleUrl(data.articleUrl ?? null);
      setArticleTitle(data.articleTitle ?? null);
      setHasResult(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setLoadingWiki(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const specs = Object.fromEntries(
        specRows.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value])
      );
      const res = await fetch("/api/save-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: device.id, description, specs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler beim Speichern");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  function updateSpec(index: number, field: "key" | "value", val: string) {
    setSpecRows((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: val } : r)));
  }

  function removeSpec(index: number) {
    setSpecRows((rows) => rows.filter((_, i) => i !== index));
  }

  function addSpec() {
    setSpecRows((rows) => [...rows, { key: "", value: "" }]);
  }

  const isLoading = loading || loadingWiki;

  return (
    <div className="mt-6">
      {/* Buttons row */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleEnrich}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? <><IconLoader2 size={14} className="animate-spin" /> Recherchiere …</>
            : <><IconSparkles size={14} stroke={1.8} /> Beschreibung via Web recherchieren</>}
        </button>

        <button
          onClick={handleEnrichWikipedia}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingWiki
            ? <><IconLoader2 size={14} className="animate-spin" /> Wikipedia …</>
            : hasResult ? <><IconBook size={14} stroke={1.8} /> Mit Wikipedia anreichern</> : <><IconBook size={14} stroke={1.8} /> Von Wikipedia</>}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {hasResult && (
        <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-5">

          {/* Source badge */}
          <div className="flex items-center gap-2 flex-wrap">
            {source === "wikipedia" && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 font-medium">
                <IconBook size={12} stroke={1.8} /> Wikipedia · CC BY-SA
              </span>
            )}
            {source === "model" && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 font-medium">
                <IconRobot size={12} stroke={1.8} /> KI-Modellwissen · ohne Gewähr
              </span>
            )}
            {source === "combined" && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 font-medium">
                <IconRobot size={12} stroke={1.8} /><IconBook size={12} stroke={1.8} /> Web & Wikipedia · ohne Gewähr
              </span>
            )}
            {(source === "wikipedia" || source === "combined") && articleUrl && (
              <a
                href={articleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-500 hover:text-accent transition-colors truncate max-w-xs"
              >
                {articleTitle} ↗
              </a>
            )}
          </div>

          {/* Beschreibung */}
          <div>
            <label className="text-xs font-medium uppercase tracking-widest text-amber-500 mb-2 block">
              Beschreibung
            </label>
            <textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); setSaved(false); }}
              rows={4}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 leading-relaxed focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 resize-none"
            />
          </div>

          {/* Specs */}
          <div>
            <label className="text-xs font-medium uppercase tracking-widest text-amber-500 mb-2 block">
              Spezifikationen
            </label>
            <div className="space-y-2">
              {specRows.map((row, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={row.key}
                    onChange={(e) => { updateSpec(i, "key", e.target.value); setSaved(false); }}
                    placeholder="Eigenschaft"
                    className="w-2/5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
                  />
                  <input
                    value={row.value}
                    onChange={(e) => { updateSpec(i, "value", e.target.value); setSaved(false); }}
                    placeholder="Wert"
                    className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
                  />
                  <button
                    onClick={() => removeSpec(i)}
                    className="text-zinc-600 hover:text-red-400 transition-colors px-1 text-lg leading-none"
                    title="Zeile entfernen"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={addSpec}
                className="text-xs text-zinc-500 hover:text-amber-400 transition-colors mt-1"
              >
                + Zeile hinzufügen
              </button>
            </div>
          </div>

          {/* Attribution note for Wikipedia */}
          {(source === "wikipedia" || source === "combined") && (
            <p className="text-xs text-zinc-600 leading-relaxed border-t border-zinc-800 pt-3">
              Quelle: Wikipedia, lizenziert unter{" "}
              <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer"
                className="text-accent hover:underline">CC BY-SA 4.0</a>.
              Bitte bei Weitergabe Quelle und Lizenz angeben.
            </p>
          )}

          {/* Aktionen */}
          <div className="flex items-center gap-3 pt-1 border-t border-zinc-800">
            {saved ? (
              <p className="inline-flex items-center gap-1 text-sm text-emerald-400 font-medium"><IconCheck size={15} stroke={2.5} /> Gespeichert</p>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <><IconLoader2 size={14} className="animate-spin" /> Speichere …</> : <><IconCheck size={14} stroke={2.5} /> Übernehmen</>}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
