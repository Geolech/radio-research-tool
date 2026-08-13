"use client";

import { useState } from "react";
import { IconLock, IconLockOpen, IconLogout, IconLoader2 } from "@tabler/icons-react";

export default function AdminUnlock({
  enabled,
  isAdmin,
}: {
  enabled: boolean;
  isAdmin: boolean;
}) {
  const [token, setToken] = useState("");
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlock() {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Freischalten fehlgeschlagen");
      }
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
      setBusy(false);
    }
  }

  async function lock() {
    setBusy(true);
    await fetch("/api/admin", { method: "DELETE" }).catch(() => {});
    window.location.reload();
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 mb-8">
      <div className="flex items-center gap-2 mb-3">
        {isAdmin
          ? <IconLockOpen size={16} className="text-emerald-500" />
          : <IconLock size={16} className="text-amber-500" />}
        <h2 className="text-xs font-medium uppercase tracking-widest text-amber-500">
          Owner-Zugang
        </h2>
      </div>

      {!enabled ? (
        <p className="text-sm text-zinc-500">
          Owner-Modus ist nicht konfiguriert. Setze die Umgebungsvariable
          <code className="mx-1 text-zinc-300">ADMIN_TOKEN</code> (z. B. auf Vercel),
          damit die Sammlung öffentlich nur lesbar ist und Bearbeiten ein Token erfordert.
        </p>
      ) : isAdmin ? (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-emerald-400">Als Owner angemeldet - Bearbeiten ist freigeschaltet.</p>
          <button
            onClick={lock}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <IconLogout size={13} stroke={1.8} /> Abmelden
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500">
            Gib dein Owner-Token ein, um Bearbeiten freizuschalten. Besucher sehen die
            Sammlung weiterhin nur lesend.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={token}
              onChange={(e) => { setToken(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter" && token) unlock(); }}
              placeholder="Owner-Token …"
              autoComplete="off"
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
            />
            <button
              onClick={unlock}
              disabled={busy || !token}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2.5 text-xs font-semibold text-zinc-900 hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              {busy ? <IconLoader2 size={14} className="animate-spin" /> : <IconLockOpen size={14} stroke={1.8} />}
              Freischalten
            </button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}
    </section>
  );
}
