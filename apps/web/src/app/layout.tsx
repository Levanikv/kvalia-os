import type { Metadata, Viewport } from "next";
import "@kvalia/ui/tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "KVALIA OS",
  description: "Ton système de vie quotidienne : courses, sport, nutrition, finances, documents, avec un agent.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Kvalia" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFBFD" },
    { media: "(prefers-color-scheme: dark)", color: "#111115" },
  ],
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="min-h-dvh bg-canvas text-fg-primary antialiased">{children}</body>
    </html>
  );
}
