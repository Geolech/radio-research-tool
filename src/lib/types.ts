// ─── Bestand ──────────────────────────────────────────────────────────────────

export type InventoryStatus =
  | "aktueller_bestand"
  | "ehemaliger_bestand"
  | "wunschgeraet";

/** Unterposition innerhalb "Aktueller Bestand" */
export type AnlageLocation =
  | "anlage_1"
  | "anlage_2"
  | "anlage_3"
  | "lagerbestand"
  | "defekt";

export const ANLAGE_LABELS: Record<AnlageLocation, string> = {
  anlage_1:    "Anlage 1",
  anlage_2:    "Anlage 2",
  anlage_3:    "Anlage 3",
  lagerbestand: "Lagerbestand",
  defekt:      "Defekt",
};

// ─── Rechnungen ───────────────────────────────────────────────────────────────

export interface ReceiptFile {
  id: string;         // timestamp-basierte ID
  filename: string;   // Originalname
  url: string;        // /receipts/{deviceId}/{id}_{filename}
  uploadedAt: string; // ISO-String
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
}

// ─── Kategorien ───────────────────────────────────────────────────────────────

export type DeviceCategory =
  | "Verstärker"
  | "Vorverstärker"
  | "Endstufe"
  | "Kopfhörerverstärker"
  | "CD-Spieler"
  | "Plattenspieler"
  | "Tuner"
  | "Kassettendeck"
  | "Lautsprecher"
  | "Kopfhörer"
  | "DAC"
  | "Streaming"
  | "Sonstiges";

export interface HifiDevice {
  id: string;
  brand: string;
  model: string;
  category: DeviceCategory;
  year?: number;
  description?: string;
  imageUrl?: string;
  officialImageUrl?: string;
  officialImageAttribution?: string;
  officialImagePageUrl?: string;
  specs?: Record<string, string>;
  purchasePrice?: number | null;
  currentValue?: number | null;
  priceNote?: string | null;
  // Bestand
  inventoryStatus?: InventoryStatus | null;
  anlageLocation?: AnlageLocation | null;
  // Rechnungen
  receipts?: ReceiptFile[];
  // Eigene Notizen (separat gespeichert; werden bei Merge in description übernommen)
  userNotes?: string;
}
