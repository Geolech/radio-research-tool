"use client";

import { useState } from "react";
import { IconCheck, IconStar, IconBox, IconAlertTriangle } from "@tabler/icons-react";
import type { HifiDevice, InventoryStatus, AnlageLocation } from "@/lib/types";
import { ANLAGE_LABELS } from "@/lib/types";

// ─── Konfiguration ────────────────────────────────────────────────────────────

// Stilisierter 2-Wege-Monitor mit Diagonale (= „ehemaliger Bestand")
const MonitorSpeakerIcon = (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor"
       strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="1" width="9" height="14" rx="1.5" />
    <circle cx="8" cy="5"    r="1.5" />
    <circle cx="8" cy="10.5" r="3"   />
    <line x1="1" y1="15" x2="15" y2="1" />
  </svg>
);

const STATUS_OPTIONS: { value: InventoryStatus; label: string; icon: React.ReactNode; color: string }[] = [
  {
    value: "aktueller_bestand",
    label: "Aktueller Bestand",
    icon: <IconCheck size={15} stroke={2.5} />,
    color: "emerald",
  },
  {
    value: "ehemaliger_bestand",
    label: "Ehemaliger Bestand",
    icon: MonitorSpeakerIcon,
    color: "zinc",
  },
  {
    value: "wunschgeraet",
    label: "Wunschgerät",
    icon: <IconStar size={14} stroke={2} />,
    color: "amber",
  },
];

const ANLAGE_OPTIONS: AnlageLocation[] = [
  "anlage_1",
  "anlage_2",
  "anlage_3",
  "lagerbestand",
  "defekt",
];

const ANLAGE_ICONS: Record<AnlageLocation, React.ReactNode> = {
  anlage_1:     "①",
  anlage_2:     "②",
  anlage_3:     "③",
  lagerbestand: <IconBox size={13} stroke={2} />,
  defekt:       <IconAlertTriangle size={13} stroke={2} />,
};

// ─── Farb-Hilfsfunktion ────────────────────────────────────────────────────────

function statusClasses(color: string, active: boolean) {
  if (!active) {
    return "border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300";
  }
  if (color === "emerald") return "border-emerald-500/60 bg-emerald-500/10 text-emerald-400";
  if (color === "amber")   return "border-amber-500/60  bg-amber-500/10  text-amber-400";
  return "border-zinc-500/60 bg-zinc-800 text-zinc-300";
}

// ─── Komponente ───────────────────────────────────────────────────────────────

export default function InventorySelector({ device }: { device: HifiDevice }) {
  const [status,   setStatus]   = useState<InventoryStatus | null>(device.inventoryStatus ?? null);
  const [anlage,   setAnlage]   = useState<AnlageLocation  | null>(device.anlageLocation  ?? null);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  async function save(
    newStatus: InventoryStatus | null,
    newAnlage: AnlageLocation | null,
  ) {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/save-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: device.id,
          inventoryStatus: newStatus ?? null,
          anlageLocation:  newAnlage ?? null,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function handleStatusClick(value: InventoryStatus) {
    // Toggle: nochmaliger Klick entfernt die Auswahl
    const newStatus = status === value ? null : value;
    // Anlage nur sinnvoll bei "aktueller_bestand"
    const newAnlage = newStatus === "aktueller_bestand" ? anlage : null;
    setStatus(newStatus);
    setAnlage(newAnlage);
    save(newStatus, newAnlage);
  }

  function handleAnlageClick(value: AnlageLocation) {
    const newAnlage = anlage === value ? null : value;
    setAnlage(newAnlage);
    save(status, newAnlage);
  }

  return (
    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500">
            Bestand
          </p>
          <p className="text-xs text-zinc-600 mt-0.5">Zuordnung des Geräts</p>
        </div>
        {saving && (
          <span className="text-xs text-zinc-600 animate-pulse">Speichern …</span>
        )}
        {saved && !saving && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-500"><IconCheck size={13} stroke={2.5} /> Gespeichert</span>
        )}
      </div>

      {/* Haupt-Status */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => {
          const active = status === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => handleStatusClick(opt.value)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150 ${statusClasses(opt.color, active)}`}
            >
              {/* Checkbox-Indikator */}
              <span
                className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 text-[10px] transition-colors ${
                  active
                    ? opt.color === "emerald"
                      ? "border-emerald-500 bg-emerald-500 text-zinc-900"
                      : opt.color === "amber"
                        ? "border-amber-500 bg-amber-500 text-zinc-900"
                        : "border-zinc-400 bg-zinc-400 text-zinc-900"
                    : "border-zinc-600 bg-transparent"
                }`}
              >
                {active && opt.icon}
              </span>
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Sub-Status: Anlage-Zuordnung (nur bei "Aktueller Bestand") */}
      {status === "aktueller_bestand" && (
        <div className="pt-1 space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">
            Zugeordnet zu
          </p>
          <div className="flex flex-wrap gap-2">
            {ANLAGE_OPTIONS.map((loc) => {
              const active = anlage === loc;
              const isDefekt = loc === "defekt";
              return (
                <button
                  key={loc}
                  onClick={() => handleAnlageClick(loc)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all duration-150 ${
                    active
                      ? isDefekt
                        ? "border-red-500/60 bg-red-500/10 text-red-400"
                        : loc === "lagerbestand"
                          ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
                          : "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                      : "border-zinc-700 bg-zinc-900/50 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center border flex-shrink-0 ${
                      active
                        ? isDefekt
                          ? "border-red-500 bg-red-500 text-zinc-900"
                          : loc === "lagerbestand"
                            ? "border-blue-400 bg-blue-400 text-zinc-900"
                            : "border-emerald-500 bg-emerald-500 text-zinc-900"
                        : "border-zinc-600"
                    }`}
                  >
                    {active && <IconCheck size={11} stroke={3} />}
                  </span>
                  <span>{ANLAGE_ICONS[loc]}</span>
                  {ANLAGE_LABELS[loc]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Status-Badge wenn ehemaliger Bestand oder Wunschgerät */}
      {status === "ehemaliger_bestand" && (
        <p className="text-xs text-zinc-600 border border-zinc-800 rounded-lg px-3 py-2">
          Dieses Gerät gehört nicht mehr zur aktiven Sammlung.
        </p>
      )}
      {status === "wunschgeraet" && (
        <p className="text-xs text-zinc-600 border border-amber-900/30 bg-amber-500/5 rounded-lg px-3 py-2">
          Auf der Wunschliste - noch nicht im Besitz.
        </p>
      )}
    </div>
  );
}
