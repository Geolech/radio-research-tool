"use client";

import { useState } from "react";
import { HifiDevice } from "@/lib/types";

interface SpecsEditorProps {
  device: HifiDevice;
}

type SpecRow = { key: string; value: string };

export default function SpecsEditor({ device }: SpecsEditorProps) {
  const initialRows: SpecRow[] = Object.entries(device.specs ?? {}).map(
    ([key, value]) => ({ key, value })
  );

  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<SpecRow[]>(initialRows);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(index: number, field: "key" | "value", val: string) {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, [field]: val } : row)));
    setSaved(false);
  }

  function removeRow(index: number) {
    setRows((r) => r.filter((_, i) => i !== index));
    setSaved(false);
  }

  function addRow() {
    setRows((r) => [...r, { key: "", value: "" }]);
    setSaved(false);
  }

  function handleCancel() {
    setRows(initialRows);
    setEditing(false);
    setSaved(false);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const specs = Object.fromEntries(
        rows.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value])
      );
      const res = await fetch("/api/save-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: device.id,
          description: device.description,
          specs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      setSaved(true);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-medium uppercase tracking-widest text-amber-500">
          Technische Daten
        </h2>
        {!editing ? (
          <button
            onClick={() => { setEditing(true); setSaved(false); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-400 hover:border-amber-500/40 hover:text-amber-400 transition-colors"
          >
            ✎ Bearbeiten
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-zinc-900 hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              {saving ? "Speichere …" : "↓ Übernehmen"}
            </button>
          </div>
        )}
      </div>

      {saved && (
        <p className="text-xs text-emerald-400 font-medium mb-3">✓ Gespeichert</p>
      )}
      {error && (
        <p className="text-xs text-red-400 mb-3">{error}</p>
      )}

      {!editing ? (
        /* Leseansicht */
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
          {rows.length > 0 ? rows.map(({ key, value }) => (
            <div key={key} className="flex justify-between px-5 py-3 text-sm">
              <span className="text-zinc-500">{key}</span>
              <span className="text-zinc-200 text-right">{value}</span>
            </div>
          )) : (
            <p className="px-5 py-4 text-xs text-zinc-600 italic">Noch keine Daten eingetragen.</p>
          )}
        </div>
      ) : (
        /* Bearbeitungsansicht */
        <div className="rounded-2xl border border-amber-500/20 bg-zinc-900 p-4 space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={row.key}
                onChange={(e) => updateRow(i, "key", e.target.value)}
                placeholder="Eigenschaft"
                className="w-2/5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-400 focus:border-amber-500 focus:outline-none"
              />
              <input
                value={row.value}
                onChange={(e) => updateRow(i, "value", e.target.value)}
                placeholder="Wert"
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none"
              />
              <button
                onClick={() => removeRow(i)}
                className="text-zinc-600 hover:text-red-400 transition-colors text-xl leading-none px-1"
                title="Zeile entfernen"
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={addRow}
            className="text-xs text-zinc-500 hover:text-amber-400 transition-colors pt-1"
          >
            + Zeile hinzufügen
          </button>
        </div>
      )}
    </section>
  );
}
