import { fetchDashboardData } from "@/lib/dashboard";
import KpiCard from "@/components/dashboard/KpiCard";
import LowStockTable from "@/components/dashboard/LowStockTable";
import MovementsChart from "@/components/dashboard/MovementsChart";

export default async function DashboardPage() {
  const data = await fetchDashboardData(); 
  type MovementEntry = typeof data.movementsMonth[number];

  const formattedMovements: Array<MovementEntry & { _sum: { quantity: number } }> = 
    data.movementsMonth.map((item: MovementEntry) => ({
      ...item,
      _sum: { quantity: item._sum.quantity ?? 0 },
    }));

  return (
    <section className="space-y-8 px-4 md:px-8 py-6">
      {/* Título general */}
      <header>
        <h1 className="text-4xl font-bold">Dashboard</h1>
      </header>

      {/* 4 tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="EPPs" value={data.kpi.totalEpps} />
        <KpiCard title="Stock total" value={data.kpi.totalStock} />
        <KpiCard title="Entregas (7 días)" value={data.kpi.deliveries7} />
        <KpiCard title="Devoluciones (7 días)" value={data.kpi.returns7} />
      </div>

      {/* Gráfico de Movimientos en los últimos 30 días */}
      <div className="bg-white rounded-lg shadow-md">
        <h2 className="p-4 text-lg font-semibold">
          Entradas / Salidas (últimos 30 días)
        </h2>
        <div className="px-4 pb-4">
          <MovementsChart raw={formattedMovements} />
        </div>
      </div>

      {/* Tabla de Alertas de stock bajo */}
      <div className="bg-white rounded-lg shadow-md">
        <h2 className="p-4 text-lg font-semibold">Alertas de stock</h2>
        <div className="px-4 pb-4">
          <LowStockTable data={data.lowStock} />
        </div>
      </div>
    </section>
  );
}
