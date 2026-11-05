"use client";

import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { MonthlyPoint } from "@/lib/reports";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const labelFromYYYYMM = (ym: string) => {
  const [, m] = ym.split("-");
  const idx = Math.max(1, Math.min(12, Number(m))) - 1;
  return MONTHS[idx] + " " + ym.slice(2,4); // Ej: Ene 25
};

export default function MonthlyConsumptionChart({ data }: { data: MonthlyPoint[] }) {
  const chart = data.map(d => ({ name: labelFromYYYYMM(d.month), qty: d.qty, cost: d.cost }));

  return (
  <Card data-report-chart="consumo-mensual">
      <CardHeader>
        <CardTitle>Consumo y costo por Mes</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chart} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis yAxisId="qty" fontSize={12} />
            <YAxis
              yAxisId="cost"
              orientation="right"
              fontSize={12}
              tickFormatter={(value) => formatCompactCurrency(Number(value))}
            />
            <Tooltip
              formatter={(value, name) =>
                name === "Costo"
                  ? [formatCurrency(Number(value)), "Costo"]
                  : [`${value}`, "Unidades"]
              }
            />
            <Legend />
            <Bar yAxisId="qty" dataKey="qty" name="Unidades" fill="#4f46e5" radius={[4,4,0,0]} />
            <Line
              yAxisId="cost"
              type="monotone"
              dataKey="cost"
              name="Costo"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
