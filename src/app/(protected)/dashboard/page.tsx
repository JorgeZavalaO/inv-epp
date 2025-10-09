import { fetchDashboardData } from "@/lib/dashboard";
import EnhancedKpiCard from "@/components/dashboard/EnhancedKpiCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import NotificationBell from "@/components/dashboard/NotificationBell";
import MovementsChart from "@/components/dashboard/MovementsChart";
import TopDeliveredList from "@/components/dashboard/TopDeliveredList";

// OPTIMIZACIÓN: Cache de página de 2 minutos
export const revalidate = 120;

export default async function DashboardPage() {
  const data = await fetchDashboardData();

  // Los KPIs dinámicos vienen del backend
  const kpiItems = data.kpisList || [];

  // Convertir criticalAlerts a notificaciones
  const notifications = (data.criticalAlerts || []).map(alert => ({
    id: alert.id,
    title: alert.title,
    description: alert.description,
    time: alert.time || new Date(),
    read: false,
    type: alert.severity === 'high' ? 'error' as const : 
          alert.severity === 'medium' ? 'warning' as const : 'info' as const
  }));

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header con notificaciones */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard
          </h1>
        </div>
        <NotificationBell notifications={notifications} />
      </div>

      {/* KPIs Principales */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiItems.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-8">Sin datos de KPIs</div>
        ) : (
          kpiItems.slice(0, 4).map((item: any, index: number) => (
            <EnhancedKpiCard
              key={index}
              title={item.title}
              value={item.value}
              icon={item.icon}
              trend={item.trend}
              status={item.status}
              description={item.description}
            />
          ))
        )}
      </section>

      {/* Layout Principal: Gráfico de Movimientos + Actividad Reciente */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Movimientos de Inventario (2 columnas) */}
        <div className="lg:col-span-2">
          <MovementsChart data={data.movements || []} />
        </div>

        {/* Actividad Reciente (1 columna) */}
        <div className="lg:col-span-1">
          <RecentActivity activities={data.recentActivity || []} />
        </div>
      </div>

      {/* EPPs más entregados */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
          <TopDeliveredList data={data.topDelivered || []} />
        </div>
      </div>
    </div>
  );
}