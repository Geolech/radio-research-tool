/**
 * Einmalige Datenmigration: JSON-Dateien → Supabase
 *
 * Voraussetzung: .env.local mit SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY
 * Aufruf:  node --env-file=.env.local scripts/migrate-to-supabase.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root      = join(__dirname, "..");

// ── Supabase-Client ───────────────────────────────────────────────────────────

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("❌  SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein.");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

function readJSON(relPath) {
  try { return JSON.parse(readFileSync(join(root, relPath), "utf-8")); }
  catch { return null; }
}

// camelCase → snake_case für Overrides-Felder
function overrideToRow(id, override) {
  const row = { id };
  if (override.description              != null) row.description              = override.description;
  if (override.specs                    != null) row.specs                    = override.specs;
  if (override.imageUrl                 != null) row.image_url                = override.imageUrl;
  if (override.officialImageUrl         != null) row.official_image_url       = override.officialImageUrl;
  if (override.officialImageAttribution != null) row.official_image_attribution = override.officialImageAttribution;
  if (override.officialImagePageUrl     != null) row.official_image_page_url  = override.officialImagePageUrl;
  if (override.purchasePrice            != null) row.purchase_price           = override.purchasePrice;
  if (override.currentValue             != null) row.current_value            = override.currentValue;
  if (override.priceNote                != null) row.price_note               = override.priceNote;
  if (override.inventoryStatus          != null) row.inventory_status         = override.inventoryStatus;
  if (override.anlageLocation           != null) row.anlage_location          = override.anlageLocation;
  if (override.receipts                 != null) row.receipts                 = override.receipts;
  if (override.userNotes                != null) row.user_notes               = override.userNotes;
  return row;
}

function deviceToRow(device) {
  return {
    id:       device.id,
    brand:    device.brand,
    model:    device.model,
    category: device.category,
    ...(device.year        != null ? { year:                    device.year }        : {}),
    ...(device.description != null ? { description:             device.description } : {}),
    ...(device.specs       != null ? { specs:                   device.specs }       : {}),
    ...(device.imageUrl    != null ? { image_url:               device.imageUrl }    : {}),
  };
}

// ── Migration ausführen ───────────────────────────────────────────────────────

async function main() {
  console.log("🚀  Starte Migration …\n");

  // 1. device_overrides
  const overrides = readJSON("src/lib/devices-overrides.json");
  if (overrides && Object.keys(overrides).length > 0) {
    const rows = Object.entries(overrides).map(([id, o]) => overrideToRow(id, o));
    console.log(`📦  Übertrage ${rows.length} Overrides → device_overrides …`);
    const { error } = await sb.from("device_overrides").upsert(rows);
    if (error) { console.error("  ❌ Fehler:", error.message); }
    else        { console.log("  ✓ Fertig"); }
  } else {
    console.log("ℹ️   Keine Overrides gefunden (devices-overrides.json leer oder fehlt).");
  }

  // 2. custom_devices
  const custom = readJSON("src/lib/devices-custom.json");
  if (Array.isArray(custom) && custom.length > 0) {
    const rows = custom.map(deviceToRow);
    console.log(`\n📦  Übertrage ${rows.length} Custom Devices → custom_devices …`);
    const { error } = await sb.from("custom_devices").upsert(rows);
    if (error) { console.error("  ❌ Fehler:", error.message); }
    else        { console.log("  ✓ Fertig"); }
  } else {
    console.log("\nℹ️   Keine Custom Devices gefunden (devices-custom.json leer oder fehlt).");
  }

  console.log("\n✅  Migration abgeschlossen.");
  console.log("   Du kannst die App jetzt auf Vercel deployen.\n");
}

main().catch((e) => { console.error("Unerwarteter Fehler:", e); process.exit(1); });
