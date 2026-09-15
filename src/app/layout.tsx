import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { BASE_PATH } from "@/lib/basePath";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "YourFin", template: "%s · YourFin" },
  description: "Your money, Your control. Budget, suivi des dépenses et analyse — gratuit et local.",
  applicationName: "YourFin",
  manifest: `${BASE_PATH}/manifest.webmanifest`,
  appleWebApp: { capable: true, statusBarStyle: "default", title: "YourFin" },
  icons: {
    apple: `${BASE_PATH}/icons/apple-touch-icon.png`,
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
};

/* Applique le thème avant le premier rendu pour éviter le flash clair/sombre.
   La préférence est écrite dans localStorage par useTheme (clé "yf-theme"). */
const themeScript = `(function(){try{var t=localStorage.getItem("yf-theme");var d=t==="dark"||((!t||t==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AppShell>{children}</AppShell>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
