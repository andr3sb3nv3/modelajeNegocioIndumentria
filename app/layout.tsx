import type { Metadata, Viewport } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Modelaje de negocio · Indumentaria",
  description: "Modelaje de negocio con datos ficticios. Ventas, stock, costos, informes y planificación para marcas de indumentaria.",
  applicationName: "Modelaje de negocio",
  appleWebApp: { capable: true, title: "Modelaje de negocio · Indumentaria", statusBarStyle: "default" },
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};
export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Manrope:wght@400;500;600;700&display=swap" />
        {/* Modo noche: se aplica antes de pintar para que no haya destello blanco */}
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('modelaje-tema')==='noche')document.documentElement.dataset.tema='noche'}catch(e){}" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
