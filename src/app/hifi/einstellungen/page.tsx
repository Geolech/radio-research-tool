import StyleGuideEditor from "@/components/StyleGuideEditor";
import AdminUnlock from "@/components/AdminUnlock";
import Link from "next/link";
import { isAdmin, adminEnabled } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function EinstellungenPage() {
  const admin = await isAdmin();
  const enabled = adminEnabled();

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/hifi"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-amber-400 transition-colors mb-8"
        >
          ← Zurück zur Sammlung
        </Link>

        <div className="mb-10 border-b border-zinc-800 pb-8">
          <p className="text-xs font-medium uppercase tracking-widest text-amber-500 mb-2">
            App-Einstellungen
          </p>
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">
            Einstellungen
          </h1>
        </div>

        <AdminUnlock enabled={enabled} isAdmin={admin} />

        {admin && <StyleGuideEditor />}
      </div>
    </main>
  );
}
