"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { HifiDevice } from "@/lib/types";

interface ExcelExportButtonProps {
  devices: HifiDevice[];
}

function fmtEur(val: number | undefined | null): string | number {
  if (val == null) return "";
  return val;
}

export default function ExcelExportButton({ devices }: ExcelExportButtonProps) {
  const [generating, setGenerating] = useState(false);

  function handleExport() {
    setGenerating(true);
    try {
      // ── Sheet 1: Übersicht ──────────────────────────────────────────────────
      const rows: (string | number)[][] = [
        ["Nr.", "Marke", "Modell", "Kategorie", "Baujahr", "Beschreibung",
          "Kaufpreis (€)", "Zeitwert (€)", "Preisnotiz"],
      ];

      devices.forEach((d, idx) => {
        rows.push([
          idx + 1,
          d.brand,
          d.model,
          d.category,
          d.year ?? "",
          d.description ?? "",
          fmtEur(d.purchasePrice),
          fmtEur(d.currentValue),
          d.priceNote ?? "",
        ]);
      });

      // Summenzeile
      const dataRows = devices.length;
      rows.push([]);
      rows.push([
        "", "", "", "", "", "Gesamt Kaufpreis:",
        { f: `SUM(G2:G${dataRows + 1})` } as unknown as number,
        { f: `SUM(H2:H${dataRows + 1})` } as unknown as number,
        `Stand: ${new Date().toLocaleDateString("de-DE")}`,
      ]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = [
        { wch: 5 }, { wch: 18 }, { wch: 22 }, { wch: 20 },
        { wch: 8 }, { wch: 50 }, { wch: 14 }, { wch: 12 }, { wch: 40 },
      ];

      // Zahlenformat für Preisspalten
      for (let r = 2; r <= dataRows + 1; r++) {
        for (const col of ["G", "H"]) {
          const addr = `${col}${r}`;
          if (ws[addr] && typeof ws[addr].v === "number") {
            ws[addr].z = '#,##0.00 "€"';
          }
        }
      }

      // ── Sheet 2: Spezifikationen ────────────────────────────────────────────
      const specsRows: (string | number)[][] = [
        ["Marke", "Modell", "Eigenschaft", "Wert"],
      ];
      devices.forEach((d) => {
        const entries = Object.entries(d.specs ?? {});
        if (entries.length === 0) {
          specsRows.push([d.brand, d.model, "", ""]);
        } else {
          entries.forEach(([key, val], i) => {
            specsRows.push([i === 0 ? d.brand : "", i === 0 ? d.model : "", key, val]);
          });
        }
      });
      const wsSpecs = XLSX.utils.aoa_to_sheet(specsRows);
      wsSpecs["!cols"] = [{ wch: 18 }, { wch: 22 }, { wch: 28 }, { wch: 45 }];

      // ── Workbook zusammenstellen ────────────────────────────────────────────
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "HiFi-Sammlung");
      XLSX.utils.book_append_sheet(wb, wsSpecs, "Spezifikationen");

      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `HiFi-Sammlung_${date}.xlsx`);
    } finally {
      setGenerating(false);
    }
  }

  const withPrices = devices.filter((d) => d.purchasePrice != null || d.currentValue != null).length;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={handleExport}
        disabled={generating}
        className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
      >
        {generating ? <><span className="animate-spin">⟳</span> Erstelle …</> : <>📊 Als Excel exportieren</>}
      </button>
      <span className="text-xs text-zinc-600">
        {withPrices > 0
          ? `${withPrices} von ${devices.length} Geräten mit Preisangabe`
          : `Noch keine Preise eingetragen – auf der Geräteseite ergänzen`}
      </span>
    </div>
  );
}
