import type { Metadata, Viewport } from "next";
import { Mulish } from "next/font/google";
import "./globals.css";
import HamburgerMenu from "@/components/HamburgerMenu";
import AdminProvider from "@/components/AdminProvider";
import { getAllDevicesWithOverrides } from "@/lib/devices";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eceae3" },
    { media: "(prefers-color-scheme: dark)", color: "#141309" },
  ],
};

// Selbst gehostete Avenir-Verwandte (Fallback zu „Avenir Next" auf Apple-Geräten).
const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
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
  const admin = await isAdmin();
  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={`${mulish.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning: toleriert DOM-Injektionen von Browser-
          Erweiterungen (z. B. Synology Photos), die sonst im Dev-Modus die
          Hydration app-weit brechen und alle Buttons tot erscheinen lassen. */}
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <AdminProvider isAdmin={admin}>
          {children}
          <HamburgerMenu devices={devices} />
        </AdminProvider>
      </body>
    </html>
  );
}
