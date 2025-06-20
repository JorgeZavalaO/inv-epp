import { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import { ensureClerkUser } from "@/lib/user-sync";
import SidebarNav from "@/components/SidebarNav";
import { getLowStockCount } from "@/lib/alerts";
import { AlertTriangle } from "lucide-react";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Sincroniza el usuario y obtiene la alerta de stock bajo
  await ensureClerkUser();
  const low = await getLowStockCount();

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden w-72 shrink-0 lg:block">
        <SidebarNav />
      </aside>

      {/* Contenido principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header con alertas */}
        <header className="border-b border-slate-200 bg-white shadow-sm">
          {/* Alerta de stock mínimo */}
          {low > 0 && (
            <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-6 py-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  {low} equipo{low > 1 ? "s" : ""} con stock crítico
                </span>
                <a
                  href="/dashboard"
                  className="text-sm text-amber-700 underline underline-offset-4 hover:text-amber-800"
                >
                  Ver detalles
                </a>
              </div>
            </div>
          )}

          {/* Breadcrumb/Title area si es necesario */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  Sistema EPP Manager
                </h1>
                <p className="text-sm text-slate-600">
                  Gestión corporativa de equipos de protección personal
                </p>
              </div>
              
              {/* Información de estado del sistema */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="text-xs text-slate-500">Sistema activo</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Área de contenido principal */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}