import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { RepairShop } from "@/app/api/find-repair/route";

export async function POST(req: Request) {
  try {
    const { id, shops } = await req.json() as { id: string; shops: RepairShop[] };
    if (!id || !Array.isArray(shops)) {
      return NextResponse.json({ error: "id und shops erforderlich" }, { status: 400 });
    }

    const dataPath = path.join(process.cwd(), "src/lib/devices-repairs.json");
    let allData: Record<string, RepairShop[]> = {};
    try {
      allData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    } catch {}

    allData[id] = shops;
    fs.writeFileSync(dataPath, JSON.stringify(allData, null, 2));

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fehler" },
      { status: 500 }
    );
  }
}
