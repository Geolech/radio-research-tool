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
    activeClass:   "bg-accent border-accent text-paper",
    inactiveClass: "border-rule text-ink-soft hover:border-accent hover:text-accent",
  },
  {
    value: "ehemaliger_bestand",
    icon: MonitorSpeakerIcon,
    label: "Ehemaliger Bestand",
    activeClass:   "bg-ink border-ink text-paper",
    inactiveClass: "border-rule text-ink-soft hover:border-accent hover:text-accent",
  },
  {
    value: "wunschgeraet",
    icon: <IconStar size={14} stroke={2} />,
    label: "Wunschgerät",
    activeClass:   "bg-accent border-accent text-paper",
    inactiveClass: "border-rule text-ink-soft hover:border-accent hover:text-accent",
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

  // Kartenvorschau: rohe Markdown-Überschrift/-Zeichen aus der Beschreibung entfernen
  const preview = (device.description ?? "")
    .replace(/^\s*#{1,6}\s+.*(?:\n|$)/, "")
    .replace(/[#*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const badgeClass =
    status === "aktueller_bestand"
      ? device.anlageLocation === "defekt"
        ? "border-red-500/50 text-red-700"
        : "border-accent/50 text-accent"
      : status === "wunschgeraet"
        ? "border-ink/30 text-ink-soft"
        : "border-rule text-ink-soft";

  return (
    <Link href={`/hifi/devices/${device.id}`} className="group block">
      {/* Foto im Rahmen */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-[3px] border border-rule bg-surface-2">
        {device.imageUrl ? (
          <Image
            src={device.imageUrl}
            alt={`${device.brand} ${device.model}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <IconPhotoOff size={34} className="text-ink-soft/60" stroke={1.4} />
          </div>
        )}
      </div>

      {/* Kopfzeile: Kategorie + Status */}
      <div className="mt-3 flex items-baseline justify-between gap-2 pb-2 border-b border-rule">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
          {device.category}
        </span>
        {badgeLabel && (
          <span className={`flex-shrink-0 font-mono text-[9.5px] uppercase tracking-wider px-2 py-0.5 border rounded-[2px] ${badgeClass}`}>
            {badgeLabel}
          </span>
        )}
      </div>

      {/* Name + Beschreibung */}
      <h2 className="font-display font-bold text-lg leading-tight mt-2 text-ink group-hover:text-accent transition-colors">
        {device.brand} <span className="italic font-medium text-ink-soft">{device.model}</span>
      </h2>
      {preview && (
        <p className="mt-1.5 text-[13px] text-ink-soft leading-snug line-clamp-2">
          {preview}
        </p>
      )}

      {/* ── Status-Picker — nur für Owner ─────────────────────────────── */}
      {admin && (
        <div className="mt-3 flex items-center justify-between">
          <span className={`inline-flex items-center text-accent transition-opacity duration-300 ${
            saving ? "opacity-100" : justSaved ? "opacity-100" : "opacity-0"
          }`}>
            {saving ? <span className="text-[10px]">…</span> : <IconCheck size={13} stroke={2.5} />}
          </span>
          <div className="flex items-center gap-1.5">
            {STATUS_BUTTONS.map((btn) => {
              const active = status === btn.value;
              return (
                <button
                  key={btn.value}
                  onClick={(e) => handleStatus(e, btn.value)}
                  title={btn.label}
                  aria-label={btn.label}
                  className={`w-7 h-7 rounded-[3px] border flex items-center justify-center
                              transition-colors duration-150 ${active ? btn.activeClass : btn.inactiveClass}`}
                >
                  {btn.icon}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Link>
  );
}
