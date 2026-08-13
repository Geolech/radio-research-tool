"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { IconCamera, IconLoader2, IconPhotoOff } from "@tabler/icons-react";

interface HeroPhotoUploadProps {
  deviceId: string;
  currentImageUrl?: string;
}

export default function HeroPhotoUpload({ deviceId, currentImageUrl }: HeroPhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const displayUrl = previewUrl ?? currentImageUrl;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Instant local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("deviceId", deviceId);
      const res = await fetch("/api/upload-own-photo", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload fehlgeschlagen");
      // Replace object URL with the saved server URL
      setPreviewUrl(data.url);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-900 group">
      {/* Photo display */}
      {displayUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displayUrl}
          alt="Eigenes Foto"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <IconPhotoOff size={56} className="text-zinc-700" stroke={1.3} />
        </div>
      )}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/60 via-transparent to-transparent" />

      {/* Badge */}
      {displayUrl && (
        <span className="absolute bottom-2 left-2 text-xs px-2 py-0.5 rounded-full bg-zinc-900/80 text-zinc-400 border border-zinc-700">
          Eigenes Foto
        </span>
      )}

      {/* Upload button – visible on hover or always if no photo */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={`absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all
          ${displayUrl
            ? "opacity-0 group-hover:opacity-100 bg-zinc-900/90 border border-zinc-600 text-zinc-300 hover:text-amber-400 hover:border-amber-500/50"
            : "opacity-100 bg-amber-500 text-zinc-900 font-semibold hover:bg-amber-400"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        title="Eigenes Foto hochladen"
      >
        {uploading
          ? <><IconLoader2 size={13} className="animate-spin" /> Lade hoch …</>
          : <><IconCamera size={13} stroke={1.8} /> {displayUrl ? "Foto ändern" : "Foto hochladen"}</>}
      </button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Error */}
      {error && (
        <div className="absolute inset-x-2 bottom-10 rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-1.5">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
