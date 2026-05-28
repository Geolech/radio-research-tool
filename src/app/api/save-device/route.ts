import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSupabaseClient } from "@/lib/supabase";

const overridesPath = path.join(process.cwd(), "src/lib/devices-overrides.json");

export async function POST(req: NextRequest) {
  try {
    const {
      id, description, specs,
      imageUrl, officialImageUrl, officialImageAttribution, officialImagePageUrl,
      purchasePrice, currentValue, priceNote,
      inventoryStatus, anlageLocation, userNotes,
    } = await req.json();
    if (!id) return NextResponse.json({ error: "id erforderlich" }, { status: 400 });

    // ── Supabase ─────────────────────────────────────────────────────────────
    const sb = getSupabaseClient();
    if (sb) {
      // Bestehenden Eintrag laden, um specs zu mergen
      const { data: existing } = await sb
        .from("device_overrides")
        .select("specs")
        .eq("id", id)
        .maybeSingle();

      const mergedSpecs = specs !== undefined
        ? { ...(existing?.specs ?? {}), ...specs }
        : undefined;

      const upsertData: Record<string, unknown> = { id };
      if (description              !== undefined) upsertData.description              = description;
      if (mergedSpecs              !== undefined) upsertData.specs                    = mergedSpecs;
      if (imageUrl                 !== undefined) upsertData.image_url                = imageUrl;
      if (officialImageUrl         !== undefined) upsertData.official_image_url       = officialImageUrl;
      if (officialImageAttribution !== undefined) upsertData.official_image_attribution = officialImageAttribution;
      if (officialImagePageUrl     !== undefined) upsertData.official_image_page_url  = officialImagePageUrl;
      if (purchasePrice            !== undefined) upsertData.purchase_price           = purchasePrice;
      if (currentValue             !== undefined) upsertData.current_value            = currentValue;
      if (priceNote                !== undefined) upsertData.price_note               = priceNote;
      if (inventoryStatus          !== undefined) upsertData.inventory_status         = inventoryStatus;
      if (anlageLocation           !== undefined) upsertData.anlage_location          = anlageLocation;
      if (userNotes                !== undefined) upsertData.user_notes               = userNotes;

      const { error } = await sb.from("device_overrides").upsert(upsertData);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    // ── JSON-Fallback (lokale Entwicklung ohne Supabase) ─────────────────────
    const existing = JSON.parse(fs.readFileSync(overridesPath, "utf-8"));
    const current  = existing[id] ?? {};
    const updates: Record<string, unknown> = {};
    if (description              !== undefined) updates.description              = description;
    if (specs                    !== undefined) updates.specs                    = { ...current.specs, ...specs };
    if (imageUrl                 !== undefined) updates.imageUrl                 = imageUrl;
    if (officialImageUrl         !== undefined) updates.officialImageUrl         = officialImageUrl;
    if (officialImageAttribution !== undefined) updates.officialImageAttribution = officialImageAttribution;
    if (officialImagePageUrl     !== undefined) updates.officialImagePageUrl     = officialImagePageUrl;
    if (purchasePrice            !== undefined) updates.purchasePrice            = purchasePrice;
    if (currentValue             !== undefined) updates.currentValue             = currentValue;
    if (priceNote                !== undefined) updates.priceNote                = priceNote;
    if (inventoryStatus          !== undefined) updates.inventoryStatus          = inventoryStatus;
    if (anlageLocation           !== undefined) updates.anlageLocation           = anlageLocation;
    if (userNotes                !== undefined) updates.userNotes                = userNotes;

    existing[id] = { ...current, ...updates };
    fs.writeFileSync(overridesPath, JSON.stringify(existing, null, 2) + "\n");
    return NextResponse.json({ ok: true });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
