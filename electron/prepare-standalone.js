// Bereitet den Next.js-Standalone-Output für das Electron-Paket vor.
// Next kopiert .next/static und public NICHT automatisch in .next/standalone —
// das holen wir hier nach, damit der gebündelte Server autark läuft.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");

if (!fs.existsSync(standalone)) {
  console.error("✗ .next/standalone fehlt — bitte zuerst `next build` ausführen.");
  process.exit(1);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  return true;
}

// .next/static → .next/standalone/.next/static
const staticOk = copyDir(
  path.join(root, ".next", "static"),
  path.join(standalone, ".next", "static")
);
// public → .next/standalone/public
const publicOk = copyDir(
  path.join(root, "public"),
  path.join(standalone, "public")
);

console.log(`✓ Standalone vorbereitet (static: ${staticOk ? "ok" : "—"}, public: ${publicOk ? "ok" : "—"})`);
