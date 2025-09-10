"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Props {
  data: Array<{ category: string; qty: number; pct: number }>;
}

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#a855f7", "#f87171", "#84cc16"];

export default function CategoriesDistributionChart({ data }: Props) {
  const chart = data.map((d, i) => ({ name: d.category, value: d.qty, fill: COLORS[i % COLORS.length] }));

  return (
  <Card data-report-chart="categorias">
      <CardHeader>
        <CardTitle>Distribución por Categoría</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        {chart.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chart} dataKey="value" nameKey="name" outerRadius={95} innerRadius={50}>
                {chart.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, _name: string, payload: unknown) => {
                const p = payload as { payload?: { name?: string } } | undefined;
                return [value, p?.payload?.name];
              }} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">Sin datos</div>
        )}
      </CardContent>
    </Card>
  );
}
