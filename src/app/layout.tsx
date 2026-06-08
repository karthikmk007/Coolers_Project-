import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/layout/Providers";
import {
  Fraunces,
  Archivo,
  JetBrains_Mono,
  Bebas_Neue,
  DM_Sans,
} from "next/font/google";
import "./globals.css";

// ── Legacy fonts (existing pages) ────────────────────────────
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

// ── CRACKED v3 fonts ──────────────────────────────────────────
const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

// ── Metadata + viewport ───────────────────────────────────────
export const metadata: Metadata = {
  title: "CRACKED — What's Cracking Near You",
  description:
    "Rate, discover, and track every RTD cooler, seltzer, and cider at Ontario LCBO. Vivino for the cooler aisle.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#F97316",
};

// ── Root layout ───────────────────────────────────────────────
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const fontVars = [
    fraunces.variable,
    archivo.variable,
    jetbrainsMono.variable,
    bebasNeue.variable,
    dmSans.variable,
  ].join(" ");

  return (
    <html lang="en" suppressHydrationWarning className={`${fontVars} h-full`}>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-cracked-cream text-cracked-dark antialiased"
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
