-- ═══════════════════════════════════════════════════════════════════════════
-- HiFi-Bibliothek – Supabase Schema
-- Im Supabase Dashboard ausführen: SQL Editor → New query → Paste → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Overrides für hardcodierte Geräte ────────────────────────────────────────
-- Entspricht src/lib/devices-overrides.json
create table if not exists device_overrides (
  id                          text primary key,  -- z.B. "hifiman-ananda-nano"
  description                 text,
  specs                       jsonb,             -- { "Impedanz": "16 Ω", ... }
  image_url                   text,
  official_image_url          text,
  official_image_attribution  text,
  official_image_page_url     text,
  purchase_price              numeric,
  current_value               numeric,
  price_note                  text,
  inventory_status            text,              -- aktueller_bestand | ehemaliger_bestand | wunschgeraet
  anlage_location             text,              -- anlage_1 | anlage_2 | anlage_3 | lagerbestand | defekt
  receipts                    jsonb,             -- ReceiptFile[]
  user_notes                  text,
  updated_at                  timestamptz default now()
);

-- ── Benutzerdefinierte Geräte ────────────────────────────────────────────────
-- Entspricht src/lib/devices-custom.json
create table if not exists custom_devices (
  id                          text primary key,
  brand                       text not null,
  model                       text not null,
  category                    text not null,
  year                        integer,
  description                 text,
  image_url                   text,
  official_image_url          text,
  official_image_attribution  text,
  official_image_page_url     text,
  specs                       jsonb,
  purchase_price              numeric,
  current_value               numeric,
  price_note                  text,
  inventory_status            text,
  anlage_location             text,
  receipts                    jsonb,
  user_notes                  text,
  created_at                  timestamptz default now()
);

-- ── Storage Buckets ──────────────────────────────────────────────────────────
-- Im Supabase Dashboard: Storage → New bucket
--   Name: "receipts"     → Private bucket
-- (Gerätebilder bleiben im Git-Repo unter /public/images/devices/)

-- ── Timestamps automatisch aktualisieren ─────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists device_overrides_updated_at on device_overrides;
create trigger device_overrides_updated_at
  before update on device_overrides
  for each row execute function update_updated_at();

-- ── RLS deaktiviert (private App ohne Auth) ──────────────────────────────────
alter table device_overrides disable row level security;
alter table custom_devices   disable row level security;
