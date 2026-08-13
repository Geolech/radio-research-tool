"use client";

import { useState, useEffect } from "react";
import { IconCheck, IconDeviceFloppy } from "@tabler/icons-react";

export default function StyleGuideEditor() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/style-guide")
      .then((r) => r.json())
      .then((d) => { setContent(d.content ?? ""); setLoading(false); })
      .catch(() => { setError("Stilregeln konnten nicht geladen werden."); setLoading(false); });
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/style-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-widest text-amber-500">
            Schreibstil &amp; Textregeln
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Markdown-Format · Änderungen wirken sofort bei der nächsten Textzusammenführung
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-amber-400 transition-colors disabled:opacity-50"
        >
          {saving ? "Speichere …" : <><IconDeviceFloppy size={13} stroke={1.8} /> Speichern</>}
        </button>
      </div>

      {saved  && <p className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium mb-3"><IconCheck size={13} stroke={2.5} /> Gespeichert</p>}
      {error  && <p className="text-xs text-red-400 mb-3">{error}</p>}

      {/* Format-Hilfe */}
      <div className="rounded-xl border border-zinc-700/60 bg-zinc-800/40 p-4 mb-4 space-y-2 text-xs text-zinc-500">
        <p className="font-medium text-zinc-400">Format:</p>
        <p><span className="text-zinc-300">## Entfernen</span> - eine Phrase pro Zeile mit <span className="text-zinc-300">- phrase</span></p>
        <p><span className="text-zinc-300">## Umformulieren</span> - <span className="text-zinc-300">- "original" → "ersatz"</span> oder <span className="text-zinc-300">→ entfernen</span></p>
        <p><span className="text-zinc-300">## Eigene Stilreferenzen</span> - Beispieltexte als Tonvorlage (werden nicht automatisch angewendet)</p>
      </div>

      {/* Editor */}
      {loading ? (
        <div className="h-96 rounded-xl bg-zinc-800 animate-pulse" />
      ) : (
        <textarea
          value={content}
          onChange={(e) => { setContent(e.target.value); setSaved(false); }}
          rows={28}
          spellCheck={false}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-300 font-mono placeholder:text-zinc-600 focus:border-amber-500/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 resize-y leading-relaxed"
        />
      )}
    </section>
  );
}
