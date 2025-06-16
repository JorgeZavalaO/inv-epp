"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import type { TooltipProps } from "recharts";

const COLORS = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
];

interface Props {
  data: Array<{ name: string; qty: number }>;
}

export default function TopDeliveredChart({ data }: Props) {
  // Truncar nombres largos para el eje Y
  const formattedData = data.map((item, index) => ({
    ...item,
    displayName:
      item.name.length > 15 ? `${item.name.slice(0, 15)}...` : item.name,
    color: COLORS[index % COLORS.length],
  }));

  /* ——— Tooltip seguro ——— */
  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload?.length) {
      const slice = payload[0].payload as { name: string; qty: number };
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg max-w-xs">
          <p className="font-medium text-sm mb-1">{slice.name}</p>
          <p className="text-muted-foreground text-xs">
            Entregado:&nbsp;
            <span className="font-medium text-foreground">
              {slice.qty.toLocaleString()} unidades
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  /* ——— Sin datos ——— */
  if (!data?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Top&nbsp;5 entregados (30&nbsp;d)
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-muted-foreground">No hay entregas en este período</p>
        </CardContent>
      </Card>
    );
  }

  /* ——— Gráfico ——— */
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Top&nbsp;5 entregados (30&nbsp;d)
        </CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={formattedData}
            layout="horizontal"
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis type="number" fontSize={12} />
            <YAxis
              type="category"
              dataKey="displayName"
              fontSize={11}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="qty" radius={[0, 4, 4, 0]}>
              {formattedData.map((entry, i) => (
                <Cell key={`cell-${i}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
