import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export async function GET() {
  const sb = getSupabaseClient();
  if (!sb) return NextResponse.json({ error: "Supabase nicht konfiguriert" }, { status: 503 });

  const { data, error } = await sb
    .from("app_settings")
    .select("value")
    .eq("key", "style_guide")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ content: data?.value ?? "" });
}

export async function POST(req: NextRequest) {
  const sb = getSupabaseClient();
  if (!sb) return NextResponse.json({ error: "Supabase nicht konfiguriert" }, { status: 503 });

  const { content } = await req.json() as { content: string };
  if (typeof content !== "string") {
    return NextResponse.json({ error: "content erforderlich" }, { status: 400 });
  }

  const { error } = await sb.from("app_settings").upsert({ key: "style_guide", value: content });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
