"use client";

import nextDynamic from "next/dynamic";

// BookViewer ist browser-only (PDF.js + Canvas)
const BookViewer = nextDynamic(
  () => import("@/components/BookViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-2xl h-64 rounded-2xl bg-zinc-900 border border-zinc-800 animate-pulse" />
    ),
  }
);

export default function BookClient() {
  return <BookViewer />;
}
