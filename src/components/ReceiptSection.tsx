"use client";

import { useRef, useState } from "react";
import type { HifiDevice, ReceiptFile } from "@/lib/types";

// ─── Kleiner Hilfefunktionen ──────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function isPdf(r: ReceiptFile) {
  return r.mimeType === "application/pdf";
}

// ─── Einzelne Rechnung ────────────────────────────────────────────────────────

function ReceiptCard({
  receipt,
  deviceId,
  onDelete,
}: {
  receipt: ReceiptFile;
  deviceId: string;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return; }
    setDeleting(true);
    await fetch("/api/delete-receipt", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, receiptId: receipt.id }),
    });
    onDelete(receipt.id);
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900/60 p-3">
      {/* Vorschau / Icon */}
      <a
        href={receipt.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800 flex items-center justify-center hover:border-amber-500/50 transition-colors"
      >
        {isPdf(receipt) ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
               stroke="#B45309" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9" y1="15" x2="15" y2="15" />
            <line x1="9" y1="11" x2="11" y2="11" />
          </svg>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={receipt.url}
            alt={receipt.filename}
            className="w-full h-full object-cover"
          />
        )}
      </a>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200 truncate">{receipt.filename}</p>
        <p className="text-xs text-zinc-600 mt-0.5">
          {isPdf(receipt) ? "PDF" : "Foto"} · {formatDate(receipt.uploadedAt)}
        </p>
        <a
          href={receipt.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-amber-500 hover:text-amber-400 transition-colors"
        >
          Öffnen ↗
        </a>
      </div>

      {/* Löschen */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className={`flex-shrink-0 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
          confirming
            ? "border-red-500/60 bg-red-500/10 text-red-400 hover:bg-red-500/20"
            : "border-zinc-700 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400"
        }`}
      >
        {deleting ? "…" : confirming ? "Bestätigen" : "Löschen"}
      </button>
    </div>
  );
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export default function ReceiptSection({ device }: { device: HifiDevice }) {
  const [receipts,  setReceipts]  = useState<ReceiptFile[]>(device.receipts ?? []);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("deviceId", device.id);

      const res  = await fetch("/api/upload-receipt", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload fehlgeschlagen");

      setReceipts((prev) => [...prev, data.receipt as ReceiptFile]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Hochladen");
    } finally {
      setUploading(false);
      // Inputs zurücksetzen damit man dieselbe Datei nochmals wählen kann
      if (cameraRef.current) cameraRef.current.value = "";
      if (fileRef.current)   fileRef.current.value   = "";
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }

  function handleDelete(id: string) {
    setReceipts((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">

      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-500">
          Rechnungen &amp; Belege
        </p>
        <p className="text-xs text-zinc-600 mt-0.5">
          Für Versicherung und Garantie
        </p>
      </div>

      {/* Upload-Schaltflächen */}
      <div className="flex flex-wrap gap-2">

        {/* Foto aufnehmen (Kamera, primär mobil) */}
        <button
          onClick={() => cameraRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-700
                     bg-zinc-900 text-sm text-zinc-300 hover:border-amber-500/50
                     hover:text-amber-400 transition-colors disabled:opacity-40"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          Foto aufnehmen
        </button>
        {/* Versteckter Input für Kamera */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Datei hochladen (PDF oder Foto) */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-700
                     bg-zinc-900 text-sm text-zinc-300 hover:border-amber-500/50
                     hover:text-amber-400 transition-colors disabled:opacity-40"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          PDF oder Foto hochladen
        </button>
        {/* Versteckter Input für Datei-Upload */}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Lade-Indikator */}
      {uploading && (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="w-3.5 h-3.5 border border-zinc-600 border-t-amber-500 rounded-full animate-spin" />
          Wird hochgeladen …
        </div>
      )}

      {/* Fehlermeldung */}
      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Gespeicherte Rechnungen */}
      {receipts.length > 0 && (
        <div className="space-y-2">
          {receipts.map((r) => (
            <ReceiptCard key={r.id} receipt={r} deviceId={device.id} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {receipts.length === 0 && !uploading && (
        <p className="text-xs text-zinc-700 py-1">
          Noch keine Belege hinterlegt.
        </p>
      )}
    </div>
  );
}
