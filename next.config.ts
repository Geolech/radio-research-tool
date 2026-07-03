import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone-Output: erzeugt einen eigenständigen Node-Server (.next/standalone),
  // den die Electron-App intern startet — autark, ohne Dev-Server.
  output: "standalone",
  // Next 16 blockt Dev-Ressourcen (HMR, Fonts) für fremde Origins. Da wir im Dev
  // teils über 127.0.0.1 statt localhost zugreifen (Orion-Kompatibilität), müssen
  // beide erlaubt sein — sonst hydratisiert die App nicht (alle Buttons tot).
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
