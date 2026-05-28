"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { HifiDevice } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Group devices by category; sort devices within each category by brand+model. */
function groupByCategory(devices: HifiDevice[]): Map<string, HifiDevice[]> {
  const map = new Map<string, HifiDevice[]>();
  for (const d of devices) {
    if (!map.has(d.category)) map.set(d.category, []);
    map.get(d.category)!.push(d);
  }
  for (const devs of map.values()) {
    devs.sort((a, b) =>
      `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`, "de")
    );
  }
  // Sort categories alphabetically
  return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b, "de")));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NavItem({
  href,
  label,
  icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-colors ${
        active
          ? "bg-amber-500/10 text-amber-400"
          : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
      }`}
    >
      <span className={`w-5 flex-shrink-0 flex items-center justify-center ${active ? "text-amber-500" : "text-zinc-600"}`}>
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}

function CategoryGroup({
  category,
  devices,
  activeId,
  expanded,
  onToggle,
  onNavigate,
}: {
  category: string;
  devices: HifiDevice[];
  activeId: string | null;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const hasActive = devices.some((d) => d.id === activeId);

  return (
    <div>
      {/* Category header – toggle button */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-4 py-2 rounded-xl text-xs transition-colors ${
          hasActive
            ? "text-amber-400 bg-amber-500/5"
            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
        }`}
      >
        <span className="font-semibold uppercase tracking-widest">{category}</span>
        <span className="flex items-center gap-1.5">
          <span className="text-zinc-700">{devices.length}</span>
          <svg
            width="10" height="10" viewBox="0 0 10 10" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          >
            <path d="M2 3.5L5 6.5l3-3" />
          </svg>
        </span>
      </button>

      {/* Device list */}
      {expanded && (
        <div className="mt-0.5 ml-4 border-l border-zinc-800 pl-3 pb-1 space-y-0.5">
          {devices.map((d) => {
            const isActive = d.id === activeId;
            return (
              <Link
                key={d.id}
                href={`/devices/${d.id}`}
                onClick={onNavigate}
                className={`flex flex-col rounded-lg px-3 py-2 text-xs transition-colors ${
                  isActive
                    ? "bg-amber-500/10 text-amber-300"
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                <span className={`font-medium leading-snug ${isActive ? "text-amber-300" : "text-zinc-300"}`}>
                  {d.brand} {d.model}
                </span>
                {d.year && (
                  <span className="text-zinc-700 text-[10px]">{d.year}</span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HamburgerMenu({ devices }: { devices: HifiDevice[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Derive the active device id and its category from the current path
  const activeDeviceId =
    pathname.startsWith("/devices/") && !pathname.startsWith("/devices/new")
      ? pathname.split("/devices/")[1]
      : null;
  const activeDevice = activeDeviceId ? devices.find((d) => d.id === activeDeviceId) : null;
  const activeCategory = activeDevice?.category ?? null;

  // Track which category groups are expanded
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => (activeCategory ? new Set([activeCategory]) : new Set())
  );

  // Auto-expand the active category when navigating
  useEffect(() => {
    if (activeCategory) {
      setExpandedCategories((prev) => new Set([...prev, activeCategory]));
    }
  }, [activeCategory]);

  const close = () => setOpen(false);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close on route change
  useEffect(() => { close(); }, [pathname]);

  const grouped = groupByCategory(devices);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  return (
    <>
      {/* ── Hamburger button ── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Menü öffnen"
        className="fixed top-4 right-4 z-50 flex h-10 w-10 items-center justify-center
                   rounded-xl bg-zinc-900 border border-zinc-800 shadow-lg
                   text-zinc-400 hover:text-amber-400 hover:border-amber-500/40
                   transition-all duration-200"
      >
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none"
             stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <line x1="0" y1="1"  x2="18" y2="1"  />
          <line x1="0" y1="7"  x2="18" y2="7"  />
          <line x1="0" y1="13" x2="18" y2="13" />
        </svg>
      </button>

      {/* ── Backdrop ── */}
      <div
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* ── Drawer ── */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-zinc-950 border-l border-zinc-800
                    shadow-2xl flex flex-col
                    transition-transform duration-300 ease-in-out
                    ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-5 flex-shrink-0">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-amber-500 mb-1">
              Navigation
            </p>
            <p className="text-base font-bold text-zinc-100">HiFi-Bibliothek</p>
          </div>
          <button
            onClick={close}
            aria-label="Menü schließen"
            className="flex h-8 w-8 items-center justify-center rounded-lg
                       text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="1" y1="1" x2="11" y2="11" />
              <line x1="11" y1="1" x2="1"  y2="11" />
            </svg>
          </button>
        </div>

        {/* Scrollable nav content */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">

          {/* Main pages */}
          <NavItem href="/" label="HiFi-Bibliothek" active={pathname === "/"} onClick={close}
            icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 6.5L8 1l7 5.5V15H1V6.5z" /></svg>}
          />
          <NavItem href="/devices/new" label="Gerät hinzufügen" active={pathname === "/devices/new"} onClick={close}
            icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="8" y1="2" x2="8" y2="14" /><line x1="2" y1="8" x2="14" y2="8" /></svg>}
          />

          <div className="py-1"><div className="border-t border-zinc-800/70" /></div>

          {/* PDF export */}
          <a href="/api/export-pdf" download onClick={close}
             className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm
                        text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors">
            <span className="w-5 flex-shrink-0 flex items-center justify-center text-zinc-600">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h10M8 2v8M5 7l3 3 3-3" />
              </svg>
            </span>
            <span>PDF exportieren</span>
          </a>

          {/* ── Geräte-Inhaltsverzeichnis ── */}
          <div className="py-1"><div className="border-t border-zinc-800/70" /></div>

          <p className="px-4 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">
            Geräte · {devices.length}
          </p>

          {Array.from(grouped.entries()).map(([cat, devs]) => (
            <CategoryGroup
              key={cat}
              category={cat}
              devices={devs}
              activeId={activeDeviceId}
              expanded={expandedCategories.has(cat)}
              onToggle={() => toggleCategory(cat)}
              onNavigate={close}
            />
          ))}

          <div className="py-1"><div className="border-t border-zinc-800/70" /></div>

          {/* Mockup + Impressum */}
          <NavItem href="/book" label="Blätterbuch" active={pathname === "/book"} onClick={close}
            icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2h5v12H2z"/><path d="M9 2h5v12H9z"/><line x1="7" y1="8" x2="9" y2="8"/></svg>}
          />
          <NavItem href="/mockup" label="Mobile Mockup" active={pathname === "/mockup"} onClick={close}
            icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="1" width="8" height="14" rx="2" /><line x1="7" y1="12.5" x2="9" y2="12.5" strokeWidth="1.8" /></svg>}
          />
          <NavItem href="/impressum" label="Impressum" active={pathname === "/impressum"} onClick={close}
            icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="7" /><line x1="8" y1="7" x2="8" y2="11" /><circle cx="8" cy="5" r="0.7" fill="currentColor" stroke="none" /></svg>}
          />

        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-zinc-800/70 px-6 py-4">
          <p className="text-xs text-zinc-700 leading-relaxed">
            Lehrprojekt · KI und Forschung
            <br />
            Technische Hochschule OWL
          </p>
        </div>
      </div>
    </>
  );
}
