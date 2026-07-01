import { InventoryStatus, AnlageLocation, ReceiptFile } from "./types";

// Zentrale Definition der Override-Felder — Single Source of Truth für das
// Mapping zwischen TypeScript (camelCase) und Supabase-Spalten (snake_case).
// Ein neues Feld hier ergänzen genügt; devices.ts und die save-device-Route
// leiten sich daraus ab.

export type OverrideData = {
  description?: string;
  specs?: Record<string, string>;
  imageUrl?: string;
  officialImageUrl?: string;
  officialImageAttribution?: string;
  officialImagePageUrl?: string;
  purchasePrice?: number | null;
  currentValue?: number | null;
  priceNote?: string | null;
  inventoryStatus?: InventoryStatus | null;
  anlageLocation?: AnlageLocation | null;
  receipts?: ReceiptFile[];
  userNotes?: string;
};

/** camelCase-Feld → Supabase-Spaltenname */
export const OVERRIDE_COLUMNS: Record<keyof OverrideData, string> = {
  description:              "description",
  specs:                    "specs",
  imageUrl:                 "image_url",
  officialImageUrl:         "official_image_url",
  officialImageAttribution: "official_image_attribution",
  officialImagePageUrl:     "official_image_page_url",
  purchasePrice:            "purchase_price",
  currentValue:             "current_value",
  priceNote:                "price_note",
  inventoryStatus:          "inventory_status",
  anlageLocation:           "anlage_location",
  receipts:                 "receipts",
  userNotes:                "user_notes",
};

/** Supabase-Row (snake_case) → Override (camelCase), nur nicht-null Werte */
export function rowToOverride(row: Record<string, unknown>): OverrideData {
  const out: Record<string, unknown> = {};
  for (const [key, col] of Object.entries(OVERRIDE_COLUMNS)) {
    const v = row[col];
    if (v !== null && v !== undefined) out[key] = v;
  }
  return out as OverrideData;
}

/** Teil-Override (camelCase) → Supabase-Row (snake_case), nur definierte Felder */
export function overrideToRow(data: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [key, col] of Object.entries(OVERRIDE_COLUMNS)) {
    if (data[key] !== undefined) row[col] = data[key];
  }
  return row;
}
