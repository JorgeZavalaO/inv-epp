"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Box,
  Warehouse,
  Handshake,
  // ClipboardList,
  // FileBarChart2,
  // ShieldCheck,
  Settings,
  RotateCcw,
  SendToBack,
  Users,
  ChevronRight,
  Building2
} from 'lucide-react';
import {
  SignedIn,
  SignedOut,
  UserButton,
  SignInButton,
} from '@clerk/nextjs';

const sections = [
  { 
    title: 'Panel Principal', 
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, description: 'Vista general' }
    ] 
  },
  { 
    title: 'Inventario', 
    items: [
      { href: '/warehouses', label: 'Almacenes', icon: <Warehouse size={18} />, description: 'Centros de almacenamiento' },
      { href: '/epps', label: 'Equipos EPP', icon: <Box size={18} />, description: 'Catálogo de equipos' },
      { href: '/stock-movements', label: 'Movimientos', icon: <SendToBack size={18} />, description: 'Historial de stock' },
    ]
  },
  { 
    title: 'Operaciones', 
    items: [
      { href: '/deliveries', label: 'Entregas', icon: <Handshake size={18} />, description: 'Asignaciones activas' },
      { href: "/returns", label: "Devoluciones", icon: <RotateCcw size={18}/>, description: 'Equipos devueltos' },
      // { href: '/requests', label: 'Solicitudes', icon: <ClipboardList size={18} />, description: 'Pedidos pendientes' },
      { href: '/collaborators', label: 'Colaboradores', icon: <Users size={18} />, description: 'Personal registrado' },
    ]
  },
  // { 
  //   title: 'Reportes', 
  //   items: [
  //     { href: '/reports', label: 'Informes', icon: <FileBarChart2 size={18} />, description: 'Reportes y métricas' },
  //     { href: '/audit', label: 'Auditoría', icon: <ShieldCheck size={18} />, description: 'Control y trazabilidad' },
  //   ]
  // },
  { 
    title: 'Sistema', 
    items: [
      { href: '/settings', label: 'Configuración', icon: <Settings size={18} />, description: 'Parámetros generales' }
    ] 
  },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header del sistema */}
      <div className="border-b border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">EPP Manager</h2>
            <p className="text-xs text-slate-500">Sistema Corporativo</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {sections.map((section) => (
          <div key={section.title} className="mb-6">
            <div className="mb-2 px-4">
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {section.title}
              </h3>
            </div>
            
            <div className="space-y-1 px-2">
              {section.items.map(({ href, label, icon, description }) => {
                const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
                
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    <div className={cn(
                      'mr-3 flex h-5 w-5 items-center justify-center',
                      isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-700'
                    )}>
                      {icon}
                    </div>
                    <div className="flex-1 truncate">
                      <div className="truncate">{label}</div>
                      <div className="text-xs text-slate-500 truncate">
                        {description}
                      </div>
                    </div>
                    {isActive && (
                      <ChevronRight className="h-4 w-4 text-blue-600" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-200 p-4">
        <SignedOut>
          <SignInButton>
            <button className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700">
              Iniciar Sesión
            </button>
          </SignInButton>
        </SignedOut>
        
        <SignedIn>
          <div className="flex items-center space-x-3">
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                  userButtonPopoverCard: "shadow-lg border border-slate-200",
                }
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-900">
                Usuario Activo
              </div>
              <div className="text-xs text-slate-500">
                Seguridad Industrial
              </div>
            </div>
          </div>
        </SignedIn>
      </div>
    </div>
  );
}