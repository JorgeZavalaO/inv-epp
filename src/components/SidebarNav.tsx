"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Box,
  Warehouse,
  Handshake,
  ClipboardList,
  FileBarChart2,
  ShieldCheck,
  Settings,
} from "lucide-react";

type LinkItem = { href: string; label: string; icon: React.ReactNode };

const sections: { title: string; items: LinkItem[] }[] = [
  {
    title: "General",
    items: [{ href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> }],
  },
  {
    title: "Gestión",
    items: [
      { href: "/epps", label: "Inventario", icon: <Box size={18} /> },
      { href: "/stock-movements", label: "Mov. de Stock", icon: <Warehouse size={18} /> },
      { href: "/deliveries", label: "Entregas", icon: <Handshake size={18} /> },
      { href: "/requests", label: "Solicitudes", icon: <ClipboardList size={18} /> },
    ],
  },
  {
    title: "Análisis",
    items: [
      { href: "/reports", label: "Reportes", icon: <FileBarChart2 size={18} /> },
      { href: "/audit", label: "Auditoría", icon: <ShieldCheck size={18} /> },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/settings", label: "Configuración", icon: <Settings size={18} /> },
    ],
  },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r bg-background">
      <header className="flex items-center gap-2 h-14 px-4 border-b">
        <span className="text-lg font-bold tracking-tight">EPP Manager</span>
      </header>

      <nav aria-label="Menú lateral" className="py-4">
        {sections.map((section) => (
          <div key={section.title} className="mt-4">
            <h2 className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {section.title}
            </h2>
            <ul className="flex flex-col gap-1">
              {section.items.map(({ href, label, icon }) => {
                const isActive = pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "mx-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive && "bg-muted font-medium"
                      )}
                    >
                      <span className="flex-shrink-0">{icon}</span>
                      <span className="truncate">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
