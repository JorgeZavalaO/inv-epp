"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { MonthlyPoint } from "@/lib/reports";

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const labelFromYYYYMM = (ym: string) => {
  const [, m] = ym.split("-");
  const idx = Math.max(1, Math.min(12, Number(m))) - 1;
  return MONTHS[idx] + " " + ym.slice(2,4); // Ej: Ene 25
};

export default function MonthlyConsumptionChart({ data }: { data: MonthlyPoint[] }) {
  const chart = data.map(d => ({ name: labelFromYYYYMM(d.month), qty: d.qty }));

  return (
  <Card data-report-chart="consumo-mensual">
      <CardHeader>
        <CardTitle>Consumo de EPPs por Mes</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Bar dataKey="qty" fill="#4f46e5" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
