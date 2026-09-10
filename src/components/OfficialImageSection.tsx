"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { IconX } from "@tabler/icons-react";
import { HifiDevice } from "@/lib/types";
import type { OfficialImage } from "@/app/api/find-product-image/route";

interface OfficialImageSectionProps {
  device: HifiDevice;
}

const SOURCE_LABEL: Record<OfficialImage["source"], string> = {
  wikimedia: "Wikimedia Commons",
  press: "Pressebild",
  manufacturer: "Hersteller",
};

const SOURCE_COLOR: Record<OfficialImage["source"], string> = {
  wikimedia: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  press: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  manufacturer: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function OfficialImageSection({ device }: OfficialImageSectionProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!device.officialImageUrl);
  const [collapsed, setCollapsed] = useState(!!device.officialImageUrl); // collapse if already saved
  const [image, setImage] = useState<OfficialImage | null>(
    device.officialImageUrl
      ? {
          url: device.officialImageUrl,
          attribution: device.officialImageAttribution ?? "",
          pageUrl: device.officialImagePageUrl,
          source: "press",
          license: "",
        }
      : null
  );
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSearch() {
    setLoading(true);
    setError(null);
    setSaved(false);
    setImgError(false);
    setCollapsed(false);
    setSearchAttempted(true);
    setImage(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 28000);
    try {
      const res = await fetch("/api/find-product-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: device.brand, model: device.model }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kein Bild gefunden");
      setImage(data.image);
      setError(null);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setError("Suche hat zu lange gedauert.");
      } else {
        setError(e instanceof Error ? e.message : "Fehler");
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setSaved(false);
    setImgError(false);
    setCollapsed(false);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("deviceId", device.id);
      const res = await fetch("/api/upload-image", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload fehlgeschlagen");
      setImage({
        url: data.url,
        attribution: "Eigenes Bild",
        pageUrl: undefined,
        source: "manufacturer",
        license: "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Only for Wikimedia (freely licensed) – fetch server-side to bypass hotlink protection
  async function handleFetchLocally() {
    if (!image) return;
    setFetching(true);
    setError(null);
    try {
      const res = await fetch("/api/fetch-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: image.url, deviceId: device.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Abruf fehlgeschlagen");
      setImage({ ...image, url: data.url });
      setImgError(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Abruf fehlgeschlagen");
    } finally {
      setFetching(false);
    }
  }

  async function handleSave() {
    if (!image) return;
    setSaving(true);
    try {
      const res = await fetch("/api/save-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: device.id,
          officialImageUrl: image.url,
          officialImageAttribution: image.attribution,
          officialImagePageUrl: image.pageUrl ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler beim Speichern");
      setSaved(true);
      setCollapsed(true); // close preview after saving
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  // Gefundenes (noch nicht gespeichertes) Bild ablehnen → zurück zur Suche
  function handleDiscard() {
    setImage(null);
    setSaved(false);
    setImgError(false);
    setError(null);
    setFetching(false);
    setSearchAttempted(false);
  }

  const sourceKey = image?.source ?? "press";
  const isWikimedia = image?.source === "wikimedia";

  // Copyright-blocked: press image that can't be displayed or downloaded
  const isCopyrightBlocked = image && imgError && !isWikimedia;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleUpload}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-lg">🖼</span>
          <h3 className="text-sm font-semibold text-zinc-200">Offizielles Produktbild</h3>
          {saved && collapsed && (
            <span className="text-xs text-emerald-400 font-medium">✓ Gespeichert</span>
          )}
          {image && !collapsed && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SOURCE_COLOR[sourceKey]}`}>
              {SOURCE_LABEL[sourceKey]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-400 hover:bg-zinc-700 transition-colors"
            >
              ↺ Ändern
            </button>
          )}
          {!collapsed && (
            <button
              onClick={handleSearch}
              disabled={loading || uploading}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <><span className="animate-spin">⟳</span> Suche …</> : <>✦ Pressebild suchen</>}
            </button>
          )}
        </div>
      </div>

      {/* Collapsed state – nothing more to show */}
      {collapsed && <div />}

      {/* Expanded content */}
      {!collapsed && (
        <>
          {error && (
            <p className="text-xs text-red-400 rounded-lg bg-red-500/10 px-3 py-2">{error}</p>
          )}

          {/* Initial hint + upload alternative */}
          {!searchAttempted && !image && !loading && (
            <div className="flex items-center gap-3">
              <p className="text-xs text-zinc-600 italic flex-1">
                Sucht in Wikimedia Commons (frei lizenziert) und Hersteller-Pressebereichen.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors disabled:opacity-50"
              >
                {uploading ? <span className="animate-spin">⟳</span> : <>📁 Hochladen</>}
              </button>
            </div>
          )}

          {/* Copyright blocked: press image not loadable */}
          {isCopyrightBlocked && (
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-4 space-y-3 text-center">
              <p className="text-xs text-zinc-400 leading-relaxed">
                <span className="text-amber-400 font-medium">⚠ Kein rechtegeklärtes Bild verfügbar.</span><br />
                Das gefundene Pressebild steht nicht zur freien Nutzung bereit
                und kann aus Copyright-Gründen nicht gespeichert werden.<br />
                Bitte lade ein eigenes Foto hoch.
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-600 bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-600 transition-colors disabled:opacity-50"
                >
                  {uploading ? <><span className="animate-spin">⟳</span> Lade hoch …</> : <>📁 Eigenes Foto hochladen</>}
                </button>
                <button
                  onClick={handleDiscard}
                  title="Bild verwerfen"
                  className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
                >
                  <IconX size={13} stroke={2} /> Verwerfen
                </button>
              </div>
              {image.pageUrl && (
                <a href={image.pageUrl} target="_blank" rel="noopener noreferrer"
                  className="block text-xs text-zinc-600 hover:text-amber-400 transition-colors">
                  Quelle ansehen ↗
                </a>
              )}
            </div>
          )}

          {/* No result after search */}
          {searchAttempted && !image && !loading && (
            <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-800/50 px-4 py-4 flex flex-col items-center gap-2 text-center">
              <p className="text-xs text-zinc-500">
                Kein rechtegeklärtes Bild gefunden – eigenes Foto hochladen:
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-600 bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-600 transition-colors disabled:opacity-50"
              >
                {uploading ? <><span className="animate-spin">⟳</span> Lade hoch …</> : <>📁 Bild hochladen</>}
              </button>
              <p className="text-xs text-zinc-600">JPEG, PNG oder WebP · max. 10 MB</p>
            </div>
          )}

          {/* Image preview – shown only when image available AND not copyright-blocked */}
          {image && !isCopyrightBlocked && (
            <div className="space-y-3">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-zinc-800">
                {!imgError ? (
                  <Image
                    src={image.url}
                    alt={`${device.brand} ${device.model} – offizielles Bild`}
                    fill
                    className="object-contain"
                    onError={() => setImgError(true)}
                    unoptimized
                  />
                ) : isWikimedia ? (
                  // Wikimedia: freely licensed → offer local download
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                    <p className="text-xs text-zinc-500">
                      Vorschau nicht verfügbar – Bild einmalig herunterladen (Wikimedia Commons, frei lizenziert):
                    </p>
                    <button
                      onClick={handleFetchLocally}
                      disabled={fetching}
                      className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-amber-400 transition-colors disabled:opacity-50"
                    >
                      {fetching
                        ? <><span className="animate-spin">⟳</span> Lade herunter …</>
                        : <>⬇ Lokal speichern</>}
                    </button>
                  </div>
                ) : null /* copyright-blocked case handled above */}
              </div>

              {/* Attribution + actions */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  {image.attribution && (
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      <span className="font-medium text-zinc-400">©</span>{" "}
                      {image.attribution}
                      {image.pageUrl && (
                        <> · <a href={image.pageUrl} target="_blank" rel="noopener noreferrer"
                          className="text-amber-400 hover:underline">Quelle ↗</a></>
                      )}
                    </p>
                  )}
                  {image.license && (
                    <p className="text-xs text-zinc-600 mt-0.5">{image.license}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                    title="Eigenes Foto hochladen"
                  >
                    {uploading ? <span className="animate-spin">⟳</span> : <>📁</>}
                  </button>

                  {saved ? (
                    <p className="text-xs text-emerald-400 font-medium">✓ Gespeichert</p>
                  ) : (
                    <>
                      <button
                        onClick={handleDiscard}
                        disabled={saving}
                        title="Bild verwerfen"
                        className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors disabled:opacity-50"
                      >
                        <IconX size={13} stroke={2} /> Verwerfen
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving || (imgError && !isWikimedia)}
                        className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? "Speichere …" : "↓ Übernehmen"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
