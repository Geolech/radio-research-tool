import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import HamburgerMenu from "@/components/HamburgerMenu";
import { getAllDevicesWithOverrides } from "@/lib/devices";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#09090b",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HiFi-Bibliothek",
  description: "Persönliche HiFi-Gerätesammlung",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const devices = await getAllDevicesWithOverrides();
  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning: toleriert DOM-Injektionen von Browser-
          Erweiterungen (z. B. Synology Photos), die sonst im Dev-Modus die
          Hydration app-weit brechen und alle Buttons tot erscheinen lassen. */}
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
        <HamburgerMenu devices={devices} />
      </body>
    </html>
  );
}
