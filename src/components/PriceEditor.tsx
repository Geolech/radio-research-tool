"use client";

import { useState } from "react";
import { HifiDevice } from "@/lib/types";

interface PriceEditorProps {
  device: HifiDevice;
}

function formatEur(val: number): string {
  return val.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export default function PriceEditor({ device }: PriceEditorProps) {
  const [purchasePrice, setPurchasePrice] = useState(
    device.purchasePrice != null ? String(device.purchasePrice) : ""
  );
  const [currentValue, setCurrentValue] = useState(
    device.currentValue != null ? String(device.currentValue) : ""
  );
  const [priceNote, setPriceNote] = useState(device.priceNote ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [researching, setResearching] = useState(false);
  const [suggestion, setSuggestion] = useState<{ uvp: number | null; note: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const googleSearchUrl = `https://www.google.de/search?q=${encodeURIComponent(`${device.brand} ${device.model} Preis kaufen EUR`)}`;
  const idealoSearchUrl = `https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?q=${encodeURIComponent(`${device.brand} ${device.model}`)}`;

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const body: Record<string, unknown> = { id: device.id };
      const pp = parseFloat(purchasePrice.replace(",", "."));
      const cv = parseFloat(currentValue.replace(",", "."));
      body.purchasePrice = isNaN(pp) ? null : pp;
      body.currentValue = isNaN(cv) ? null : cv;
      body.priceNote = priceNote.trim() || null;
      const res = await fetch("/api/save-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Fehler beim Speichern");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setSaving(false);
    }
  }

  async function handleResearch() {
    setResearching(true);
    setSuggestion(null);
    setError(null);
    try {
      const res = await fetch("/api/research-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: device.brand, model: device.model, category: device.category }),
        signal: AbortSignal.timeout(28000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Recherche fehlgeschlagen");
      setSuggestion({ uvp: data.uvp ?? null, note: data.note ?? "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recherche fehlgeschlagen");
    } finally {
      setResearching(false);
    }
  }

  function acceptSuggestion() {
    if (!suggestion?.uvp) return;
    setCurrentValue(String(suggestion.uvp));
    if (suggestion.note) setPriceNote(suggestion.note);
    setSuggestion(null);
    setSaved(false);
  }

  const hasValues = purchasePrice.trim() !== "" || currentValue.trim() !== "";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">💶</span>
        <h3 className="text-sm font-semibold text-zinc-200">Preise & Wert</h3>
        {saved && <span className="text-xs text-emerald-400 font-medium ml-1">✓ Gespeichert</span>}
      </div>

      {/* Input fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-amber-500 mb-1.5">
            Kaufpreis
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={purchasePrice}
              onChange={(e) => { setPurchasePrice(e.target.value); setSaved(false); }}
              placeholder="z. B. 3500"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 pr-8 text-sm text-zinc-200 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-600">€</span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-amber-500 mb-1.5">
            Zeitwert
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={currentValue}
              onChange={(e) => { setCurrentValue(e.target.value); setSaved(false); }}
              placeholder="z. B. 2800"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 pr-8 text-sm text-zinc-200 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-600">€</span>
          </div>
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="block text-xs font-medium uppercase tracking-widest text-amber-500 mb-1.5">
          Notiz <span className="text-zinc-600 normal-case tracking-normal font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={priceNote}
          onChange={(e) => { setPriceNote(e.target.value); setSaved(false); }}
          placeholder="z. B. Neupreis 2022, idealo.de"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
        />
      </div>

      {/* KI suggestion */}
      {suggestion && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 space-y-2">
          <p className="text-xs text-zinc-400">
            <span className="font-medium text-amber-400">KI-Vorschlag:</span>{" "}
            {suggestion.uvp != null ? (
              <><span className="text-zinc-200 font-semibold">{formatEur(suggestion.uvp)}</span> · {suggestion.note}</>
            ) : (
              <span className="text-zinc-500">Kein Preis gefunden · {suggestion.note}</span>
            )}
          </p>
          {suggestion.uvp != null && (
            <div className="flex gap-2">
              <button
                onClick={acceptSuggestion}
                className="text-xs rounded-full bg-amber-500 px-3 py-1 font-medium text-zinc-900 hover:bg-amber-400 transition-colors"
              >
                Als Zeitwert übernehmen
              </button>
              <button
                onClick={() => setSuggestion(null)}
                className="text-xs rounded-full border border-zinc-700 px-3 py-1 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Verwerfen
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-800">
        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || !hasValues}
          className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? <><span className="animate-spin">⟳</span> Speichere …</> : <>↓ Speichern</>}
        </button>

        {/* KI research */}
        <button
          onClick={handleResearch}
          disabled={researching}
          className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-400 hover:bg-violet-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Claude recherchiert aktuellen Marktpreis via Websuche (~15 Sek.)"
        >
          {researching
            ? <><span className="animate-spin">⟳</span> Recherchiere …</>
            : <>🤖 KI recherchieren</>}
        </button>

        {/* External search links */}
        <a
          href={googleSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          🔍 Google
        </a>
        <a
          href={idealoSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          🔍 Idealo
        </a>
      </div>
    </div>
  );
}
