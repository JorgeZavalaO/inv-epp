import { type Metadata } from 'next';
import {
  ClerkProvider,
} from '@clerk/nextjs';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from "@vercel/speed-insights/next"

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EPP Manager',
  description: 'Gestión de Equipos de Protección Personal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="es">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900`}>
          <header className="sticky top-0 z-50 bg-white shadow-sm px-6 py-3">
            <h1 className="text-xl font-bold">EPP Manager</h1>
          </header>
          <main className="min-h-screen mt-4">{children}</main>
          <Analytics />
          <SpeedInsights />
          <footer className="bg-white border-t py-4 px-6 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} EPP Manager. Todos los derechos reservados.
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
