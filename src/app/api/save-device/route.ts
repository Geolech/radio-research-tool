import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSupabaseClient } from "@/lib/supabase";
import { OVERRIDE_COLUMNS, overrideToRow } from "@/lib/device-overrides";

const overridesPath = path.join(process.cwd(), "src/lib/devices-overrides.json");

export async function POST(req: NextRequest) {
  try {
    const { id, ...body } = await req.json();
    if (!id) return NextResponse.json({ error: "id erforderlich" }, { status: 400 });

    // Nur bekannte Override-Felder übernehmen (Whitelist aus zentraler Definition)
    const patch: Record<string, unknown> = {};
    for (const key of Object.keys(OVERRIDE_COLUMNS)) {
      if (body[key] !== undefined) patch[key] = body[key];
    }

    // ── Supabase ─────────────────────────────────────────────────────────────
    const sb = getSupabaseClient();
    if (sb) {
      // specs partiell mergen — Read nur, wenn specs tatsächlich betroffen sind
      if (patch.specs !== undefined) {
        const { data: existing } = await sb
          .from("device_overrides")
          .select("specs")
          .eq("id", id)
          .maybeSingle();
        patch.specs = { ...(existing?.specs ?? {}), ...(patch.specs as object) };
      }

      const { error } = await sb.from("device_overrides").upsert({ id, ...overrideToRow(patch) });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    // ── JSON-Fallback (lokale Entwicklung ohne Supabase) ─────────────────────
    const store   = JSON.parse(fs.readFileSync(overridesPath, "utf-8"));
    const current = store[id] ?? {};
    if (patch.specs !== undefined) {
      patch.specs = { ...(current.specs ?? {}), ...(patch.specs as object) };
    }
    store[id] = { ...current, ...patch };
    fs.writeFileSync(overridesPath, JSON.stringify(store, null, 2) + "\n");
    return NextResponse.json({ ok: true });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
