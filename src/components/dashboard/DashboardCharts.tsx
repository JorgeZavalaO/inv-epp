"use client";

import dynamic from "next/dynamic";
import { DashboardData } from "@/lib/dashboard";

// Importaciones dinámicas para evitar problemas de SSR
const MovementsChart = dynamic(
  () => import("@/components/dashboard/MovementsChart"),
  { 
    ssr: false,
    loading: () => <div className="h-72 bg-muted/50 rounded animate-pulse" />
  }
);

const LowStockTable = dynamic(
  () => import("@/components/dashboard/LowStockTable"),
  { 
    ssr: false,
    loading: () => <div className="h-72 bg-muted/50 rounded animate-pulse" />
  }
);

const ReturnsPieChart = dynamic(
  () => import("@/components/dashboard/ReturnsPieChart"),
  { 
    ssr: false,
    loading: () => <div className="h-72 bg-muted/50 rounded animate-pulse" />
  }
);

const TopDeliveredChart = dynamic(
  () => import("@/components/dashboard/TopDeliveredChart"),
  { 
    ssr: false,
    loading: () => <div className="h-72 bg-muted/50 rounded animate-pulse" />
  }
);

interface Props {
  data: DashboardData;
}

export default function DashboardCharts({ data }: Props) {
  return (
    <>
      {/* Primera fila de gráficos */}
      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MovementsChart data={data.movements} />
        </div>
        <ReturnsPieChart data={data.returnsPie} />
      </section>

      {/* Segunda fila de gráficos */}
      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 order-2 lg:order-none">
          <LowStockTable data={data.lowStockList} />
        </div>
        <TopDeliveredChart data={data.topDelivered} />
      </section>
    </>
  );
}