"use client";

import React, { useEffect, useState } from "react";

type DashboardData = {
  kpi: {
    totalEpps: number;
    totalStock: number;
    deliveries7: number;
    returns7: number;
  };
  movementsMonth: Array<{ type: string; _sum: { quantity: number } }>;
  lowStock: Array<{ id: number; code: string; name: string; totalStock: number; minStock: number }>;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error(err));
  }, []);

  if (!data) return <p>Cargando...</p>;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="mt-4 space-y-2">
        <p>Total EPPs: {data.kpi.totalEpps}</p>
        <p>Total Stock: {data.kpi.totalStock}</p>
        <p>Entregas (7d): {data.kpi.deliveries7}</p>
        <p>Devoluciones (7d): {data.kpi.returns7}</p>
        {/* Aquí podrías mostrar movementsMonth y lowStock */}
      </div>
    </main>
  );
}