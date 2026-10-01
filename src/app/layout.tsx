import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://labuild.vercel.app"),
  title: "LaBuild — Rutina y Nutrición",
  description:
    "Controla tu rutina semanal de entrenamiento, rachas, penitencias y alimentación para ganar masa muscular.",
  manifest: "/manifest.json",
  applicationName: "LaBuild",
  appleWebApp: {
    capable: true,
    title: "LaBuild",
    // Tema negro: evita el rebote blanco al abrir desde la pantalla de inicio.
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "LaBuild — Rutina y Nutrición",
    description:
      "Tu rutina, tu racha, tu masa. Controla entrenamiento y alimentación para ganar masa muscular.",
    type: "website",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0f14",
  width: "device-width",
  initialScale: 1,
  // Permite zoom: la app no debe bloquear el zoom del usuario.
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        {/* iOS no lee el manifest para "añadir a pantalla de inicio": usa apple-touch-icon. */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>{children}</body>
    </html>
  );
}