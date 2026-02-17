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

export default async function ReportsPage({ searchParams }: { searchParams?: Promise<{ year?: string; warehouseId?: string; category?: string; collaboratorId?: string; location?: string; from?: string; to?: string }> }) {
  // Verificar permisos
  const canAccess = await hasPermission('reports_export');
  
  if (!canAccess) {
    redirect('/dashboard');
  }
  
  const sp = (await searchParams) ?? {};
  const year = Number(sp.year ?? new Date().getFullYear());
  const warehouseId = sp.warehouseId ? Number(sp.warehouseId) : undefined;
  const category = sp.category || undefined;
  const collaboratorId = sp.collaboratorId ? Number(sp.collaboratorId) : undefined;
  const location = sp.location || undefined;
  const from = sp.from || undefined;
  const to = sp.to || undefined;
  const [data, filterData] = await Promise.all([
    fetchReportsData(year, { warehouseId, category, collaboratorId, location, from, to }),
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
        collaborators={filterData.collaborators}
        locations={filterData.locations}
        selected={{ year, warehouseId, category, collaboratorId, location }}
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

        <section className="grid gap-6 lg:grid-cols-4">
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-muted-foreground">Traslados</p>
            <p className="text-2xl font-bold">{data.transferSummary?.totalTransfers ?? 0}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-muted-foreground">Unidades trasladadas</p>
            <p className="text-2xl font-bold text-indigo-600">{data.transferSummary?.totalUnits ?? 0}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-muted-foreground">Pendientes</p>
            <p className="text-2xl font-bold text-amber-600">{data.transferSummary?.pending ?? 0}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-muted-foreground">Aprobados / Rechazados</p>
            <p className="text-2xl font-bold text-emerald-600">
              {data.transferSummary?.approved ?? 0}
              <span className="text-muted-foreground"> / </span>
              <span className="text-rose-600">{data.transferSummary?.rejected ?? 0}</span>
            </p>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold mb-3">Últimos traslados</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Código</th>
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2 pr-4">EPP</th>
                  <th className="py-2 pr-4">Cantidad</th>
                  <th className="py-2 pr-4">Origen</th>
                  <th className="py-2 pr-4">Destino</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(data.latestTransfers ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-muted-foreground">
                      No hay traslados para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  (data.latestTransfers ?? []).map((tr) => (
                    <tr key={`${tr.code}-${tr.date}`} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono">{tr.code}</td>
                      <td className="py-2 pr-4">{new Date(tr.date).toLocaleDateString()}</td>
                      <td className="py-2 pr-4">{tr.eppName}</td>
                      <td className="py-2 pr-4">{tr.quantity}</td>
                      <td className="py-2 pr-4">{tr.fromWarehouse}</td>
                      <td className="py-2 pr-4">{tr.toWarehouse}</td>
                      <td className="py-2">{tr.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </Suspense>
    </div>
  );
}
