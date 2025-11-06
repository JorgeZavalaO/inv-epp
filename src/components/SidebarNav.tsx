"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Box,
  Warehouse,
  Handshake,
  Settings,
  RotateCcw,
  SendToBack,
  Users,
  ChevronRight,
  Building2,
  ShieldCheck
} from 'lucide-react';
import { UserMenu } from '@/components/auth/UserMenu';

// Mapeo de rutas a permisos requeridos (si la ruta necesita alguno de estos permisos)
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/dashboard': [], // Accesible para todos los autenticados
  '/warehouses': ['warehouses_manage', 'warehouses_export'],
  '/epps': ['epps_manage'],
  '/stock-movements': ['stock_movements_manage'],
  '/deliveries': ['deliveries_manage', 'deliveries_export'],
  '/returns': ['returns_manage'],
  '/collaborators': ['collaborators_manage'],
  '/reports': ['reports_export'],
  '/audit-logs': ['audit_view'],
  '/settings': ['settings_update'],
  '/users': ['user_view'],
  '/performance': [], // Accesible para admins (se verifica en el componente)
};

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
  { 
    title: 'Reportes', 
    items: [
      { href: '/reports', label: 'Informes', icon: <LayoutDashboard size={18} />, description: 'Reportes y métricas' },
      { href: '/audit-logs', label: 'Auditoría', icon: <ShieldCheck size={18} />, description: 'Historial de cambios' },
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
      { href: '/settings', label: 'Configuración', icon: <Settings size={18} />, description: 'Parámetros generales' },
      { href: '/users', label: 'Usuarios', icon: <ShieldCheck size={18} />, description: 'Gestión de usuarios' },
      { href: '/performance', label: 'Performance', icon: <ShieldCheck size={18} />, description: 'Monitoreo del sistema' }
    ] 
  },
];

type SidebarNavProps = {
  userPermissions: string[];
};

export default function SidebarNav({ userPermissions }: SidebarNavProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  // Verificar si el usuario puede acceder a una ruta
  const canAccessRoute = (href: string): boolean => {
    // Dashboard siempre es accesible
    if (href === '/dashboard') return true;
    
    // Los ADMIN tienen acceso a todo
    if (session?.user?.role === 'ADMIN') return true;
    
    // Obtener permisos requeridos para esta ruta
    const requiredPermissions = ROUTE_PERMISSIONS[href] || [];
    
    // Si no hay permisos requeridos, es accesible
    if (requiredPermissions.length === 0) return true;
    
    // Verificar si tiene al menos uno de los permisos requeridos
    return requiredPermissions.some(perm => userPermissions.includes(perm));
  };

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
        {sections.map((section) => {
          // Filtrar items según permisos
          const accessibleItems = section.items.filter(item => canAccessRoute(item.href));
          
          // Si no hay items accesibles en esta sección, no mostrarla
          if (accessibleItems.length === 0) return null;
          
          return (
            <div key={section.title} className="mb-6">
              <div className="mb-2 px-4">
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {section.title}
                </h3>
              </div>
              
              <div className="space-y-1 px-2">
                {accessibleItems.map(({ href, label, icon, description }) => {
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
        );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-200 p-4">
        <UserMenu />
      </div>
    </div>
  );
}