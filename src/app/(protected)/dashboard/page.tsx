// src/app/(protected)/dashboard/page.tsx
import { fetchDashboardData } from "@/lib/dashboard";
import KpiCard       from "@/components/dashboard/KpiCard";
import LowStockTable from "@/components/dashboard/LowStockTable";
import MovementsChart from "@/components/dashboard/MovementsChart";

export default async function DashboardPage() {
  const data = await fetchDashboardData();  // ← Llamada directa, sin fetch HTTP

  return (
    <section className="space-y-8 px-4 md:px-8 py-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="EPPs"        value={data.kpi.totalEpps} />
        <KpiCard title="Stock total" value={data.kpi.totalStock} />
        <KpiCard title="Entregas 7d" value={data.kpi.deliveries7} />
        <KpiCard title="Devoluciones 7d" value={data.kpi.returns7} />
      </div>

      <div className="bg-white rounded shadow">
        <h2 className="p-4 font-semibold">Entradas / Salidas (últimos 30 días)</h2>
        <MovementsChart raw={data.movementsMonth.map(item => ({
          ...item,
          _sum: { quantity: item._sum.quantity ?? 0 }
        }))} />
      </div>

      <div className="bg-white rounded shadow">
        <h2 className="p-4 font-semibold">Alertas de stock</h2>
        <LowStockTable data={data.lowStock} />
      </div>
    </section>
  );
}
