"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Box,
  Warehouse,
  Handshake,
  ClipboardList,
  FileBarChart2,
  ShieldCheck,
  Settings,
  RotateCcw,
  SendToBack
} from 'lucide-react';
import {
  SignedIn,
  SignedOut,
  UserButton,
  SignInButton,
  SignUpButton,
} from '@clerk/nextjs';

const sections = [
  { title: 'General', items: [{ href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> }] },
  { title: 'Gestión', items: [
      { href: '/warehouses', label: 'Almacenes', icon: <Warehouse size={18} /> },
      { href: '/epps', label: 'Inventario', icon: <Box size={18} /> },
      { href: '/stock-movements', label: 'Mov. Stock', icon: <SendToBack size={18} /> },
      { href: '/deliveries', label: 'Entregas', icon: <Handshake size={18} /> },
      { href: "/returns", label: "Devoluciones", icon: <RotateCcw size={18}/> },
      { href: '/requests', label: 'Solicitudes', icon: <ClipboardList size={18} /> },
    ]
  },
  { title: 'Análisis', items: [
      { href: '/reports', label: 'Reportes', icon: <FileBarChart2 size={18} /> },
      { href: '/audit', label: 'Auditoría', icon: <ShieldCheck size={18} /> },
    ]
  },
  { title: 'Admin', items: [{ href: '/settings', label: 'Configuración', icon: <Settings size={18} /> }] },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Sidebar" className="flex flex-col h-full justify-between">
      <div>
        {sections.map((sec) => (
          <div key={sec.title} className="mt-6">
            <p className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {sec.title}
            </p>
            <ul className="flex flex-col gap-1">
              {sec.items.map(({ href, label, icon }) => {
                const isActive = pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'mx-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-muted text-foreground font-medium'
                          : 'text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {icon}
                      <span className="truncate">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t pt-4 px-4">
        <SignedOut>
          <div className="flex flex-col gap-2">
            <SignInButton>
              <button className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100">Ingresar</button>
            </SignInButton>
            <SignUpButton>
              <button className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100">Registrarse</button>
            </SignUpButton>
          </div>
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </nav>
  );
}