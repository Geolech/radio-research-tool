"use client";

import { HifiDevice } from "@/lib/types";

interface PriceSectionProps {
  device: HifiDevice;
}

function searchQuery(brand: string, model: string) {
  return encodeURIComponent(`${brand} ${model}`);
}

export default function PriceSection({ device }: PriceSectionProps) {
  const q = searchQuery(device.brand, device.model);
  const qSlug = `${device.brand} ${device.model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const links = [
    {
      label: "eBay – Aktuelle Angebote",
      sublabel: "Gebraucht & Neuware",
      href: `https://www.ebay.de/sch/i.html?_nkw=${q}&_sacat=0&_sop=12`,
      badge: "eBay",
      badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    {
      label: "eBay – Verkaufte Artikel",
      sublabel: "Reale Gebrauchtpreise als Referenz",
      href: `https://www.ebay.de/sch/i.html?_nkw=${q}&_sacat=0&LH_Complete=1&LH_Sold=1&_sop=13`,
      badge: "eBay",
      badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    {
      label: "Kleinanzeigen",
      sublabel: "Private Verkäufer in Deutschland",
      href: `https://www.kleinanzeigen.de/s-${qSlug}/k0`,
      badge: "Kleinanzeigen",
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
  ];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4 col-span-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg">💰</span>
        <h3 className="text-sm font-semibold text-zinc-200">Gebrauchtpreise</h3>
      </div>

      <p className="text-xs text-zinc-500">
        Direkt auf der jeweiligen Plattform suchen – Preise und Angebote sind immer aktuell.
      </p>

      <div className="grid gap-2 sm:grid-cols-3">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 hover:border-amber-500/40 hover:bg-amber-500/5 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs px-2 py-0.5 rounded-full border font-medium ${link.badgeColor}`}
              >
                {link.badge}
              </span>
              <span className="text-zinc-600 group-hover:text-amber-500 transition-colors text-sm">
                ↗
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100">
                {link.label}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">{link.sublabel}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
