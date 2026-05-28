"use client";

import { useState } from "react";
import { HifiDevice } from "@/lib/types";

interface NotesEditorProps {
  device: HifiDevice;
}

type Step = "idle" | "editing" | "merging" | "preview";

export default function NotesEditor({ device }: NotesEditorProps) {
  const [step, setStep]             = useState<Step>("idle");
  const [notes, setNotes]           = useState(device.userNotes ?? "");
  const [mergedText, setMerged]     = useState("");
  const [rulesApplied, setRules]    = useState(0);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // ── Schritt 1 → 2: API-Merge mit Stilregeln ────────────────────────────────
  async function handleMerge() {
    const trimmed = notes.trim();
    if (!trimmed) return;

    setStep("merging");
    setError(null);

    try {
      const res = await fetch("/api/merge-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          existing: device.description ?? "",
          notes:    trimmed,
        }),
      });
      const data = await res.json() as {
        merged?: string;
        rulesApplied?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Fehler beim Zusammenführen");

      setMerged(data.merged ?? trimmed);
      setRules(data.rulesApplied ?? 0);
      setStep("preview");
      setSaved(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
      setStep("editing");
    }
  }

  // ── Schritt 2 → Speichern ───────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/save-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id:          device.id,
          description: mergedText,
          userNotes:   notes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler beim Speichern");
      setSaved(true);
      setStep("idle");
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setSaving(false);
    }
  }

  // ── Abbrechen ───────────────────────────────────────────────────────────────
  function handleCancel() {
    setNotes(device.userNotes ?? "");
    setMerged("");
    setStep("idle");
    setSaved(false);
    setError(null);
  }

  const hasNotes = (device.userNotes ?? "").trim().length > 0;

  return (
    <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-medium uppercase tracking-widest text-amber-500">
          Eigene Notizen &amp; Ergänzungen
        </h2>
        {step === "idle" && (
          <button
            onClick={() => { setStep("editing"); setSaved(false); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-400 hover:border-amber-500/40 hover:text-amber-400 transition-colors"
          >
            {hasNotes ? "✎ Bearbeiten" : "+ Hinzufügen"}
          </button>
        )}
      </div>

      {/* Feedback */}
      {saved && (
        <p className="text-xs text-emerald-400 font-medium mb-3">✓ Gespeichert und Beschreibung aktualisiert</p>
      )}
      {error && (
        <p className="text-xs text-red-400 mb-3">{error}</p>
      )}

      {/* ── IDLE: vorhandene Notizen anzeigen ──────────────────────────────── */}
      {step === "idle" && (
        hasNotes ? (
          <p className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed">
            {device.userNotes}
          </p>
        ) : (
          <p className="text-xs text-zinc-600 italic">
            Noch keine eigenen Notizen. Klicke „+ Hinzufügen" um Informationen zu ergänzen.
          </p>
        )
      )}

      {/* ── EDITING: Textarea + Merge-Button ───────────────────────────────── */}
      {step === "editing" && (
        <div className="space-y-4">
          {/* Bisherige Beschreibung als Referenz */}
          {device.description && (
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-3">
              <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500 mb-1.5">
                Bisherige Beschreibung
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed line-clamp-4">
                {device.description}
              </p>
            </div>
          )}

          {/* Eigene Notizen */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">
              Weitere Informationen
            </label>
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
              rows={5}
              placeholder={
                device.description
                  ? "Eigene Ergänzungen, Korrekturen oder persönliche Eindrücke …"
                  : "Beschreibung eingeben …"
              }
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/60 focus:outline-none resize-y leading-relaxed"
            />
            <p className="text-[10px] text-zinc-600 mt-1">
              Werbliche Phrasen werden beim Zusammenführen anhand deiner Stilregeln automatisch bereinigt.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCancel}
              className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleMerge}
              disabled={!notes.trim()}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 px-4 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {device.description ? "⇄ Mit bisherigem Text zusammenführen" : "Vorschau"}
            </button>
          </div>
        </div>
      )}

      {/* ── MERGING: Ladestate ─────────────────────────────────────────────── */}
      {step === "merging" && (
        <div className="flex items-center gap-3 py-4">
          <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          <p className="text-xs text-zinc-500">Texte werden zusammengeführt und bereinigt …</p>
        </div>
      )}

      {/* ── PREVIEW: Zusammengeführter Text ────────────────────────────────── */}
      {step === "preview" && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                Vorschau — bereinigter Text
              </p>
              {rulesApplied > 0 && (
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400">
                  {rulesApplied} Stilregel{rulesApplied !== 1 ? "n" : ""} angewendet
                </span>
              )}
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-zinc-800/60 p-4 max-h-64 overflow-y-auto">
              <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {mergedText}
              </p>
            </div>
            <p className="text-[10px] text-zinc-600 mt-1.5">
              Dieser Text ersetzt die bisherige Beschreibung und wird in der App und im PDF angezeigt.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setStep("editing")}
              className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ← Zurück
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              {saving ? "Speichere …" : "↓ Übernehmen"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
