"use client";

import { useState } from "react";
import { IconFileTypePdf, IconLoader2 } from "@tabler/icons-react";

export default function PdfExportButton({ deviceCount }: { deviceCount: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/export-pdf");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "PDF-Generierung fehlgeschlagen");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `HiFi-Sammlung_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-[3px] border border-rule bg-surface px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-soft hover:text-accent hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={`DIN A5 PDF · Titelseite, Inhaltsverzeichnis, ${deviceCount} Geräte, Versicherungsübersicht`}
      >
        {loading
          ? <><IconLoader2 size={13} className="animate-spin" /> PDF wird erstellt …</>
          : <><IconFileTypePdf size={13} stroke={1.8} /> PDF exportieren</>}
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
