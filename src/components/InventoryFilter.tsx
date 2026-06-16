"use client";

import { useState } from "react";
import Link from "next/link";
import DeviceCard from "@/components/DeviceCard";
import type { HifiDevice, InventoryStatus, AnlageLocation } from "@/lib/types";
import { ANLAGE_LABELS } from "@/lib/types";

// ─── Typen & Konstanten ───────────────────────────────────────────────────────

type StatusFilter = InventoryStatus | "unassigned" | "all";
type AnlageFilter = AnlageLocation | "all";

const STATUS_OPTIONS: {
  value: StatusFilter;
  label: string;
  icon: string;
  activeClass: string;
}[] = [
  {
    value: "all",
    label: "Alle",
    icon: "",
    activeClass: "border-zinc-400 bg-zinc-800 text-zinc-100",
  },
  {
    value: "aktueller_bestand",
    label: "Aktueller Bestand",
    icon: "✓",
    activeClass: "border-emerald-500/70 bg-emerald-500/15 text-emerald-400",
  },
  {
    value: "ehemaliger_bestand",
    label: "Ehemaliger Bestand",
    icon: "↩",
    activeClass: "border-zinc-500/70 bg-zinc-700/40 text-zinc-300",
  },
  {
    value: "wunschgeraet",
    label: "Wunschgerät",
    icon: "★",
    activeClass: "border-amber-500/70 bg-amber-500/15 text-amber-400",
  },
  {
    value: "unassigned",
    label: "Nicht zugeordnet",
    icon: "○",
    activeClass: "border-zinc-600 bg-zinc-800/60 text-zinc-400",
  },
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
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-medium transition-all duration-150 ${
                active
                  ? opt.activeClass
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
              }`}
            >
              {opt.icon && (
                <span className={`text-[11px] ${active ? "" : "opacity-60"}`}>
                  {opt.icon}
                </span>
              )}
              {opt.label}
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                  active ? "bg-white/10" : "bg-zinc-800 text-zinc-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Anlage-Sub-Filter (nur bei "Aktueller Bestand") ──────────── */}
      {showAnlageFilter && (
        <div className="mb-6 flex flex-wrap gap-2 pl-1 border-l-2 border-emerald-500/30">
          {ANLAGE_OPTIONS.map((opt) => {
            const count  = countAnlage(devices, opt.value);
            const active = anlageFilter === opt.value;
            const label  = opt.value === "all" ? "Alle" : ANLAGE_LABELS[opt.value as AnlageLocation];
            const isDefekt = opt.value === "defekt";
            const isLager  = opt.value === "lagerbestand";
            return (
              <button
                key={opt.value}
                onClick={() => setAnlageFilter(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-150 ${
                  active
                    ? isDefekt
                      ? "border-red-500/60 bg-red-500/10 text-red-400"
                      : isLager
                        ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
                        : "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                    : "border-zinc-800 bg-zinc-900/30 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400"
                }`}
              >
                <span className="text-[11px]">{opt.icon}</span>
                {label}
                <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                  active ? "bg-white/10" : "bg-zinc-800 text-zinc-700"
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
