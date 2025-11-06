import { Suspense } from "react";
import { fetchReportsData, fetchReportFilterData } from "@/lib/reports";
import MonthlyConsumptionChart from "@/components/reports/MonthlyConsumptionChart";
import TopEppsChart from "@/components/reports/TopEppsChart";
import TopLocationsChart from "@/components/reports/TopLocationsChart";
import LatestDeliveriesTable from "@/components/reports/LatestDeliveriesTable";
import CategoriesDistributionChart from "@/components/reports/CategoriesDistributionChart";
import IndicatorsPanel from "@/components/reports/IndicatorsPanel";
import ReportsFilters from "./reports-filters";
import { hasPermission } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

export default async function ReportsPage({ searchParams }: { searchParams?: Promise<{ year?: string; warehouseId?: string; category?: string; from?: string; to?: string }> }) {
  // Verificar permisos
  const canAccess = await hasPermission('reports_export');
  
  if (!canAccess) {
    redirect('/dashboard');
  }
  
  const sp = (await searchParams) ?? {};
  const year = Number(sp.year ?? new Date().getFullYear());
  const warehouseId = sp.warehouseId ? Number(sp.warehouseId) : undefined;
  const category = sp.category || undefined;
  const from = sp.from || undefined;
  const to = sp.to || undefined;
  const [data, filterData] = await Promise.all([
    fetchReportsData(year, { warehouseId, category, from, to }),
    fetchReportFilterData(),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
  <p className="text-muted-foreground">Consumo y métricas de entregas</p>
      </div>

      <ReportsFilters
        year={data.year}
        warehouses={filterData.warehouses}
        categories={filterData.categories}
        selected={{ year, warehouseId, category }}
      />

      <Suspense fallback={<div className="grid gap-6 lg:grid-cols-3"><div className="h-80 bg-muted/50 rounded-lg animate-pulse lg:col-span-3"/></div>}>
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <MonthlyConsumptionChart data={data.monthly} />
            {data.categories && <CategoriesDistributionChart data={data.categories} />}
          </div>
          <IndicatorsPanel indicators={data.indicators} />
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <TopEppsChart data={data.topEpps} />
          <TopLocationsChart data={data.topLocations} />
          <LatestDeliveriesTable data={data.latest} />
        </section>
      </Suspense>
    </div>
  );
}
