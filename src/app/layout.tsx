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
  title: 'EPP Manager - Gestión de Equipos de Protección Personal',
  description: 'Sistema corporativo para la gestión eficiente de Equipos de Protección Personal. Control de inventario, entregas y trazabilidad.',
  keywords: 'EPP, equipos protección personal, gestión inventario, seguridad industrial, sistema corporativo',
  openGraph: {
    title: 'EPP Manager - Sistema Corporativo',
    description: 'Gestión Profesional de Equipos de Protección Personal',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="es" className="h-full">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full bg-slate-50 text-slate-900`}>
          {children}
          <Analytics /> 
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}