"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { IconCheck, IconStar, IconPhotoOff } from "@tabler/icons-react";
import { HifiDevice, InventoryStatus, ANLAGE_LABELS } from "@/lib/types";
import { useAdmin } from "@/components/AdminProvider";

// ─── Icons ────────────────────────────────────────────────────────────────────

const MonitorSpeakerIcon = (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor"
       strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="1" width="9" height="14" rx="1.5" />
    <circle cx="8" cy="5"    r="1.5" />
    <circle cx="8" cy="10.5" r="3"   />
    <line x1="1" y1="15" x2="15" y2="1" />
  </svg>
);

// ─── Status-Konfiguration ─────────────────────────────────────────────────────

const STATUS_BUTTONS: {
  value: InventoryStatus;
  icon: React.ReactNode;
  label: string;
  activeClass: string;
  inactiveClass: string;
}[] = [
  {
    value: "aktueller_bestand",
    icon: <IconCheck size={15} stroke={2.5} />,
    label: "Aktueller Bestand",
    activeClass:   "bg-emerald-700 border-emerald-700 text-white",
    inactiveClass: "border-zinc-700 text-zinc-600 hover:border-emerald-700/60 hover:text-emerald-600",
  },
  {
    value: "ehemaliger_bestand",
    icon: MonitorSpeakerIcon,
    label: "Ehemaliger Bestand",
    activeClass:   "bg-zinc-500 border-zinc-500 text-zinc-900",
    inactiveClass: "border-zinc-700 text-zinc-600 hover:border-zinc-500/60 hover:text-zinc-400",
  },
  {
    value: "wunschgeraet",
    icon: <IconStar size={14} stroke={2} />,
    label: "Wunschgerät",
    activeClass:   "bg-amber-500 border-amber-500 text-zinc-900",
    inactiveClass: "border-zinc-700 text-zinc-600 hover:border-amber-500/60 hover:text-amber-400",
  },
];

// ─── Komponente ───────────────────────────────────────────────────────────────

export default function DeviceCard({ device }: { device: HifiDevice }) {
  const admin = useAdmin();
  const [status,  setStatus]  = useState<InventoryStatus | null>(device.inventoryStatus ?? null);
  const [saving,  setSaving]  = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  async function handleStatus(e: React.MouseEvent, value: InventoryStatus) {
    e.preventDefault();
    e.stopPropagation();

    // Nochmaliger Klick = deaktivieren
    const next = status === value ? null : value;
    setStatus(next);
    setSaving(true);

    await fetch("/api/save-device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: device.id,
        inventoryStatus: next,
        // Anlage-Sub-Status nur löschen, wenn Status entfernt wird
        ...(next === null ? { anlageLocation: null } : {}),
      }),
    });

    setSaving(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1200);
  }

  // Badge-Label (Anlage-Subposition oder Fallback)
  const badgeLabel =
    status === "aktueller_bestand"
      ? device.anlageLocation
        ? ANLAGE_LABELS[device.anlageLocation]
        : "Bestand"
      : status === "ehemaliger_bestand"
        ? "Ehemalig"
        : status === "wunschgeraet"
          ? "Wunsch"
          : null;

  const badgeClass =
    status === "aktueller_bestand"
      ? device.anlageLocation === "defekt"
        ? "bg-red-500/10 border-red-500/30 text-red-400"
        : "bg-emerald-900/50 border-emerald-700/40 text-emerald-400"
      : status === "wunschgeraet"
        ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
        : "bg-zinc-800 border-zinc-700 text-zinc-500";

  return (
    <Link href={`/hifi/devices/${device.id}`} className="group block">
      <div className="relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 transition-all duration-300 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10">

        {/* Bild */}
        <div className="relative aspect-[4/3] overflow-hidden bg-zinc-800">
          {device.imageUrl ? (
            <Image
              src={device.imageUrl}
              alt={`${device.brand} ${device.model}`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <IconPhotoOff size={36} className="text-zinc-600" stroke={1.5} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-transparent to-transparent" />
        </div>

        {/* Info */}
        <div className="p-4 pb-3">
          {/* Kategorie + Bestands-Badge */}
          <div className="flex items-start justify-between gap-2">
            <span className="inline-block rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500 border border-amber-500/20">
              {device.category}
            </span>
            {badgeLabel && (
              <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium border ${badgeClass}`}>
                {badgeLabel}
              </span>
            )}
          </div>

          <h2 className="mt-2 text-base font-semibold text-zinc-100 leading-tight">
            {device.brand}
          </h2>
          <p className="text-sm text-zinc-400">{device.model}</p>
          {device.description && (
            <p className="mt-2 text-xs text-zinc-500 line-clamp-2">
              {device.description}
            </p>
          )}
        </div>

        {/* ── Status-Picker (unten rechts) — nur für Owner ─────────────── */}
        {admin && (
        <div className="flex items-center justify-between px-4 pb-3 pt-1">
          {/* Spar-Feedback */}
          <span className={`inline-flex items-center transition-opacity duration-300 ${
            saving     ? "text-zinc-600 opacity-100" :
            justSaved  ? "text-emerald-500 opacity-100" :
                        "opacity-0"
          }`}>
            {saving
              ? <span className="text-[10px]">…</span>
              : <IconCheck size={13} stroke={2.5} />}
          </span>

          {/* Drei Häkchen-Buttons */}
          <div className="flex items-center gap-1.5">
            {STATUS_BUTTONS.map((btn) => {
              const active = status === btn.value;
              return (
                <button
                  key={btn.value}
                  onClick={(e) => handleStatus(e, btn.value)}
                  title={btn.label}
                  aria-label={btn.label}
                  className={`w-7 h-7 rounded-lg border text-xs font-bold flex items-center justify-center
                              transition-all duration-150 ${active ? btn.activeClass : btn.inactiveClass}`}
                >
                  {btn.icon}
                </button>
              );
            })}
          </div>
        </div>
        )}

      </div>
    </Link>
  );
}
