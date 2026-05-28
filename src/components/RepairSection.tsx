"use client";

import { useState, useEffect } from "react";
import { HifiDevice } from "@/lib/types";

interface RepairSectionProps {
  device: HifiDevice;
}

const LOCATION_KEY = "hifi-repair-location";

export default function RepairSection({ device }: RepairSectionProps) {
  const [location, setLocation] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(LOCATION_KEY);
    if (stored) setLocation(stored);
  }, []);

  function handleLocationChange(val: string) {
    setLocation(val);
    localStorage.setItem(LOCATION_KEY, val);
  }

  const loc = location.trim();

  const links = [
    {
      label: "Google Maps",
      sublabel: loc
        ? `HiFi-Händler & Werkstätten bei ${loc}`
        : "Ort eingeben für lokale Suche",
      href: loc
        ? `https://www.google.com/maps/search/${encodeURIComponent(`HiFi Reparatur Händler ${loc}`)}`
        : null,
      badge: "Maps",
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      icon: "📍",
    },
    {
      label: "Google Suche",
      sublabel: loc
        ? `${device.brand} Händler & Service bei ${loc}`
        : "Ort eingeben für lokale Suche",
      href: loc
        ? `https://www.google.com/search?q=${encodeURIComponent(`${device.brand} ${device.model} Händler Reparatur ${loc}`)}`
        : null,
      badge: "Google",
      badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      icon: "🔍",
    },
    {
      label: `${device.brand} Hersteller`,
      sublabel: "Direkt beim Hersteller nach Service anfragen",
      href: `https://www.google.com/search?q=${encodeURIComponent(`${device.brand} offizieller Vertrieb Service Deutschland`)}`,
      badge: "Hersteller",
      badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      icon: "🏭",
    },
  ];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg">🔧</span>
        <h3 className="text-sm font-semibold text-zinc-200">Reparaturbetriebe</h3>
      </div>

      {/* Location input */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 shrink-0">📍 Ort:</span>
        <input
          type="text"
          value={location}
          onChange={(e) => handleLocationChange(e.target.value)}
          placeholder="z. B. Lemgo, Detmold, Bielefeld …"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
        />
      </div>

      <p className="text-xs text-zinc-500">
        Suche direkt auf den Plattformen – Ergebnisse sind immer aktuell und ohne Gewähr.
      </p>

      {/* Link cards */}
      <div className="grid gap-2">
        {links.map((link) => {
          const isDisabled = !link.href;
          const inner = (
            <div
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors group ${
                isDisabled
                  ? "border-zinc-800 bg-zinc-800/50 opacity-40 cursor-not-allowed"
                  : "border-zinc-700 bg-zinc-800 hover:border-amber-500/40 hover:bg-amber-500/5 cursor-pointer"
              }`}
            >
              <span className="text-base shrink-0">{link.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100">
                  {link.label}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">{link.sublabel}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border font-medium ${link.badgeColor}`}
                >
                  {link.badge}
                </span>
                {!isDisabled && (
                  <span className="text-zinc-600 group-hover:text-amber-500 transition-colors">
                    ↗
                  </span>
                )}
              </div>
            </div>
          );

          return link.href ? (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {inner}
            </a>
          ) : (
            <div key={link.label}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}
