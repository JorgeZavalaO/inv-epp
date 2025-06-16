import { Suspense } from "react";
import { fetchDashboardData } from "@/lib/dashboard";
import KpiCard from "@/components/dashboard/KpiCard";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import { 
  Package, 
  Boxes, 
  Truck, 
  RotateCcw, 
  AlertTriangle 
} from "lucide-react";

export default async function DashboardPage() {
  const data = await fetchDashboardData();

  const kpiItems = [
    {
      title: "EPPs",
      value: data.kpis.totalEpps,
      icon: <Package className="w-4 h-4 text-blue-600" />,
    },
    {
      title: "Stock total",
      value: data.kpis.totalStock.toLocaleString(),
      icon: <Boxes className="w-4 h-4 text-green-600" />,
    },
    {
      title: "Stock bajo",
      value: data.kpis.lowStockEpps,
      icon: <AlertTriangle className="w-4 h-4 text-orange-600" />,
    },
    {
      title: "Entregas (7 d)",
      value: data.kpis.deliveries7,
      icon: <Truck className="w-4 h-4 text-purple-600" />,
    },
    {
      title: "Devoluciones (7 d)", 
      value: data.kpis.returns7,
      icon: <RotateCcw className="w-4 h-4 text-red-600" />,
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen general del sistema de gestión de EPP
        </p>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiItems.map((item, index) => (
          <KpiCard
            key={index}
            title={item.title}
            value={item.value}
            icon={item.icon}
          />
        ))}
      </section>

      {/* Charts Section */}
      <Suspense 
        fallback={
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-muted/50 rounded-lg animate-pulse" />
            <div className="h-96 bg-muted/50 rounded-lg animate-pulse" />
            <div className="lg:col-span-2 h-96 bg-muted/50 rounded-lg animate-pulse" />
            <div className="h-96 bg-muted/50 rounded-lg animate-pulse" />
          </div>
        }
      >
        <DashboardCharts data={data} />
      </Suspense>
    </div>
  );
}