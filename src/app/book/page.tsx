import Link from "next/link";
import BookClient from "./BookClient";
import { getAllDevicesWithOverrides } from "@/lib/devices";

export const dynamic = "force-dynamic";

export default async function BookPage() {
  const devices = await getAllDevicesWithOverrides();

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10">
      <div className="mx-auto max-w-5xl flex flex-col items-center gap-8">

        {/* Header */}
        <div className="w-full flex items-start justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs text-zinc-600 hover:text-amber-400 transition-colors mb-4"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                   stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 2L4 7l5 5" />
              </svg>
              Zurück zur Sammlung
            </Link>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-1">
              Blätterbuch
            </p>
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
              HiFi-Bibliothek
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              {devices.length} Geräte · PDF-Blätterkatalog
            </p>
          </div>
        </div>

        {/* Flipbook — lädt PDF über /api/export-pdf */}
        <BookClient />

      </div>
    </main>
  );
}
