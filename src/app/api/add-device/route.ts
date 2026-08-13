import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/lib/security";
import fs from "fs";
import path from "path";
import { HifiDevice, DeviceCategory } from "@/lib/types";
import { getAllDevices } from "@/lib/devices";
import { getSupabaseClient } from "@/lib/supabase";

const CUSTOM_PATH = path.join(process.cwd(), "src/lib/devices-custom.json");

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const { brand, model, category, year } = (await req.json()) as {
      brand: string;
      model: string;
      category: DeviceCategory;
      year?: number;
    };

    if (!brand?.trim() || !model?.trim() || !category) {
      return NextResponse.json({ error: "brand, model und category erforderlich" }, { status: 400 });
    }

    // Eindeutige ID erzeugen
    const baseId  = `${toSlug(brand)}-${toSlug(model)}`;
    const existing = await getAllDevices();
    const existingIds = new Set(existing.map((d) => d.id));

    let id = baseId;
    let counter = 2;
    while (existingIds.has(id)) id = `${baseId}-${counter++}`;

    const newDevice: HifiDevice = {
      id,
      brand:    brand.trim(),
      model:    model.trim(),
      category,
      ...(year ? { year } : {}),
    };

    // ── Supabase ─────────────────────────────────────────────────────────────
    const sb = getSupabaseClient();
    if (sb) {
      const { error } = await sb.from("custom_devices").insert({
        id,
        brand:    newDevice.brand,
        model:    newDevice.model,
        category: newDevice.category,
        ...(year ? { year } : {}),
      });
      if (error) throw error;
      return NextResponse.json({ id, device: newDevice });
    }

    // ── JSON-Fallback ─────────────────────────────────────────────────────────
    let custom: HifiDevice[] = [];
    try { custom = JSON.parse(fs.readFileSync(CUSTOM_PATH, "utf-8")); } catch { /* start fresh */ }
    custom.push(newDevice);
    fs.writeFileSync(CUSTOM_PATH, JSON.stringify(custom, null, 2) + "\n");
    return NextResponse.json({ id, device: newDevice });

  } catch (err) {
    return serverError(err, "Fehler");
  }
}
