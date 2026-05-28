import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const manualsPath = path.join(process.cwd(), "src/lib/devices-manuals.json");

export async function POST(req: NextRequest) {
  try {
    const { id, manuals } = await req.json();
    if (!id) return NextResponse.json({ error: "id erforderlich" }, { status: 400 });

    const existing = JSON.parse(fs.readFileSync(manualsPath, "utf-8"));
    existing[id] = manuals;
    fs.writeFileSync(manualsPath, JSON.stringify(existing, null, 2) + "\n");

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
