import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone-Output: erzeugt einen eigenständigen Node-Server (.next/standalone),
  // den die Electron-App intern startet — autark, ohne Dev-Server.
  output: "standalone",
};

export default nextConfig;
