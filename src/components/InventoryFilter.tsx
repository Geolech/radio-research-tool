"use client";

import { useState } from "react";
import Link from "next/link";
import DeviceCard from "@/components/DeviceCard";
import type { HifiDevice, InventoryStatus, AnlageLocation } from "@/lib/types";
import { ANLAGE_LABELS } from "@/lib/types";

// ─── Typen & Konstanten ───────────────────────────────────────────────────────

type StatusFilter = InventoryStatus | "unassigned" | "all";
type AnlageFilter = AnlageLocation | "all";

const MonitorSpeakerIcon = (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor"
       strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="1" width="9" height="14" rx="1.5" />
    <circle cx="8" cy="5"    r="1.5" />
    <circle cx="8" cy="10.5" r="3"   />
    <line x1="1" y1="15" x2="15" y2="1" />
  </svg>
);

const STATUS_OPTIONS: {
  value: StatusFilter;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "all",               label: "Alle",                icon: null },
  { value: "aktueller_bestand", label: "Aktueller Bestand",   icon: "✓" },
  { value: "ehemaliger_bestand",label: "Ehemaliger Bestand",  icon: MonitorSpeakerIcon },
  { value: "wunschgeraet",      label: "Wunschgerät",         icon: "★" },
  { value: "unassigned",        label: "Nicht zugeordnet",    icon: "○" },
];

const ANLAGE_OPTIONS: { value: AnlageFilter; icon: string }[] = [
  { value: "all",          icon: "—"  },
  { value: "anlage_1",     icon: "①"  },
  { value: "anlage_2",     icon: "②"  },
  { value: "anlage_3",     icon: "③"  },
  { value: "lagerbestand", icon: "📦" },
  { value: "defekt",       icon: "⚠"  },
];

// ─── Zähl-Helfer ──────────────────────────────────────────────────────────────

function countStatus(devices: HifiDevice[], status: StatusFilter): number {
  if (status === "all")        return devices.length;
  if (status === "unassigned") return devices.filter((d) => !d.inventoryStatus).length;
  return devices.filter((d) => d.inventoryStatus === status).length;
}

function countAnlage(devices: HifiDevice[], anlage: AnlageFilter): number {
  const active = devices.filter((d) => d.inventoryStatus === "aktueller_bestand");
  if (anlage === "all") return active.length;
  return active.filter((d) => d.anlageLocation === anlage).length;
}

// ─── Komponente ───────────────────────────────────────────────────────────────

export default function InventoryFilter({ devices }: { devices: HifiDevice[] }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [anlageFilter, setAnlageFilter] = useState<AnlageFilter>("all");

  // ── Filterlogik ────────────────────────────────────────────────────────────
  const filtered = devices.filter((d) => {
    if (statusFilter === "all")        return true;
    if (statusFilter === "unassigned") return !d.inventoryStatus;
    if (d.inventoryStatus !== statusFilter) return false;
    if (statusFilter === "aktueller_bestand" && anlageFilter !== "all") {
      return d.anlageLocation === anlageFilter;
    }
    return true;
  });

  function handleStatusClick(value: StatusFilter) {
    setStatusFilter(value);
    setAnlageFilter("all"); // Sub-Filter zurücksetzen
  }

  const showAnlageFilter = statusFilter === "aktueller_bestand";

  return (
    <div>
      {/* ── Haupt-Filterleiste ────────────────────────────────────────── */}
      <div className="mb-3 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => {
          const count  = countStatus(devices, opt.value);
          const active = statusFilter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => handleStatusClick(opt.value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "border-zinc-400 bg-zinc-700 text-zinc-100"
                  : "border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200"
              }`}
            >
              {opt.icon != null && <span className="flex items-center text-[11px]">{opt.icon}</span>}
              {opt.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                active ? "bg-white/15 text-zinc-200" : "bg-zinc-900 text-zinc-600"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Anlage-Sub-Filter (nur bei "Aktueller Bestand") ──────────── */}
      {showAnlageFilter && (
        <div className="mb-6 flex flex-wrap gap-2 pl-1 border-l-2 border-zinc-700">
          {ANLAGE_OPTIONS.map((opt) => {
            const count  = countAnlage(devices, opt.value);
            const active = anlageFilter === opt.value;
            const label  = opt.value === "all" ? "Alle" : ANLAGE_LABELS[opt.value as AnlageLocation];
            return (
              <button
                key={opt.value}
                onClick={() => setAnlageFilter(opt.value)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "border-zinc-400 bg-zinc-700 text-zinc-100"
                    : "border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200"
                }`}
              >
                <span className="text-[11px]">{opt.icon}</span>
                {label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                  active ? "bg-white/15 text-zinc-200" : "bg-zinc-900 text-zinc-600"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!showAnlageFilter && <div className="mb-6" />}

      {/* ── Ergebnis-Kopfzeile ────────────────────────────────────────── */}
      {statusFilter !== "all" && (
        <p className="text-xs text-zinc-600 mb-4">
          {filtered.length === 0
            ? "Keine Geräte in dieser Kategorie"
            : `${filtered.length} Gerät${filtered.length !== 1 ? "e" : ""}`}
        </p>
      )}

      {/* ── Grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((device) => (
          <DeviceCard key={device.id} device={device} />
        ))}

        {/* Gerät hinzufügen — nur bei "Alle" oder "Aktueller Bestand" anzeigen */}
        {(statusFilter === "all" || statusFilter === "aktueller_bestand") && (
          <Link href="/hifi/devices/new" className="group block">
            <div className="relative overflow-hidden rounded-2xl bg-zinc-900 border-2 border-dashed border-zinc-800 transition-all duration-300 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10">
              <div className="flex flex-col items-center justify-center gap-3 p-8 text-zinc-700 group-hover:text-zinc-400 transition-colors min-h-[200px]">
                <span className="text-4xl">+</span>
                <p className="text-sm font-medium text-center leading-snug">
                  Gerät hinzufügen
                </p>
              </div>
            </div>
          </Link>
        )}

        {/* Leer-Zustand */}
        {filtered.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4 py-16 flex flex-col items-center gap-3 text-zinc-700">
            <span className="text-4xl">◎</span>
            <p className="text-sm">Keine Geräte in dieser Kategorie</p>
            <button
              onClick={() => handleStatusClick("all")}
              className="text-xs text-amber-500 hover:text-amber-400 transition-colors mt-1"
            >
              Filter zurücksetzen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
