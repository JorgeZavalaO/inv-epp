"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { LocationItem } from "@/lib/reports";
import { formatCurrency } from "@/lib/format";

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed"];

export default function TopLocationsChart({ data }: { data: LocationItem[] }) {
  const chart = data.map((d, i) => ({
    name: d.location ?? "Sin ubicación",
    value: d.qty,
    cost: d.cost,
    fill: COLORS[i % COLORS.length],
  }));

  return (
  <Card data-report-chart="top-ubicaciones">
      <CardHeader>
        <CardTitle>Departamentos/Sedes con mayor consumo</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        {chart.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chart} dataKey="value" nameKey="name" outerRadius={90} innerRadius={50}>
                {chart.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload as { name: string; value: number; cost: number };
                  return (
                    <div className="rounded-md border bg-white px-3 py-2 text-xs shadow-sm">
                      <p className="font-medium">{item.name}</p>
                      <p>{item.value} unidades</p>
                      <p className="text-muted-foreground">{formatCurrency(item.cost)}</p>
                    </div>
                  );
                }}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-80 flex items-center justify-center text-muted-foreground">Sin datos</div>
        )}
      </CardContent>
    </Card>
  );
}
