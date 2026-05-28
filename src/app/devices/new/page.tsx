"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DeviceCategory } from "@/lib/types";

const CATEGORIES: DeviceCategory[] = [
  "Verstärker", "Vorverstärker", "Endstufe", "Kopfhörerverstärker",
  "CD-Spieler", "Plattenspieler", "Tuner", "Kassettendeck",
  "Lautsprecher", "Kopfhörer", "DAC", "Streaming", "Sonstiges",
];

export default function NewDevicePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [category, setCategory] = useState<DeviceCategory>("Verstärker");
  const [year, setYear] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!brand.trim() || !model.trim()) {
      setError("Bitte Marke und Modell eingeben.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // 1. Create device
      const res = await fetch("/api/add-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: brand.trim(),
          model: model.trim(),
          category,
          ...(year ? { year: parseInt(year) } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler beim Anlegen");

      const deviceId: string = data.id;

      // 2. Upload photo if selected
      if (photoFile) {
        const formData = new FormData();
        formData.append("file", photoFile);
        formData.append("deviceId", deviceId);
        const photoRes = await fetch("/api/upload-own-photo", { method: "POST", body: formData });
        if (!photoRes.ok) {
          // Photo upload failed – still navigate, photo can be added later
          console.warn("Foto-Upload fehlgeschlagen, Gerät wurde trotzdem angelegt.");
        }
      }

      router.push(`/devices/${deviceId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12">
      <div className="mx-auto max-w-lg">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-amber-400 transition-colors mb-8"
        >
          ← Zurück zur Sammlung
        </Link>

        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-widest text-amber-500 mb-2">
            Neues Gerät
          </p>
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">
            Zur Sammlung hinzufügen
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Photo upload area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-900 border-2 border-dashed border-zinc-700 hover:border-amber-500/50 transition-colors cursor-pointer group"
          >
            {photoPreview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="Vorschau" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-zinc-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-sm font-medium text-white">📷 Foto ändern</span>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-zinc-600 group-hover:text-zinc-400 transition-colors">
                <span className="text-5xl">📷</span>
                <p className="text-sm font-medium">Eigenes Foto hinzufügen</p>
                <p className="text-xs text-zinc-700">JPEG, PNG oder WebP · optional</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </div>

          {/* Brand */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-amber-500 mb-1.5">
              Marke *
            </label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="z. B. Luxman"
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-amber-500 mb-1.5">
              Modell *
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="z. B. L-550AXII"
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-amber-500 mb-1.5">
              Kategorie *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DeviceCategory)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Year (optional) */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-amber-500 mb-1.5">
              Baujahr <span className="text-zinc-600 normal-case tracking-normal font-normal">(optional)</span>
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="z. B. 1985"
              min={1900}
              max={new Date().getFullYear()}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 rounded-lg bg-red-500/10 px-4 py-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || !brand.trim() || !model.trim()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving
              ? <><span className="animate-spin">⟳</span> Wird angelegt …</>
              : <>+ Zur Sammlung hinzufügen</>}
          </button>
        </form>
      </div>
    </main>
  );
}
