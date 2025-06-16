"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RotateCcw } from "lucide-react";
import type { TooltipProps } from "recharts";

const COLORS = {
  REUSABLE: "#22c55e",
  DISCARDED: "#ef4444",
} as const;

const LABELS = {
  REUSABLE: "Reutilizable",
  DISCARDED: "Descartado",
} as const;

interface Props {
  /** Datos ya agregados por condición. */
  data: Array<{ condition: "REUSABLE" | "DISCARDED"; qty: number }>;
}

export default function ReturnsPieChart({ data }: Props) {
  //#region Transformación de datos
  const chartData = data.map((item) => ({
    name: LABELS[item.condition],
    value: item.qty,
    condition: item.condition,
  }));
  const total = data.reduce((sum, item) => sum + item.qty, 0);
  //#endregion

  //#region Custom tooltip
  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload?.length) {
      const slice = payload[0].payload as { name: string; value: number };
      const percentage = total
        ? ((slice.value / total) * 100).toFixed(1)
        : "0";
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{slice.name}</p>
          <p className="text-sm text-muted-foreground">
            {slice.value.toLocaleString()} unidades ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };
  //#endregion

  //#region Custom label
  interface CustomLabelProps {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    value: number;
  }
  const CustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    value,
  }: CustomLabelProps) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const percentage = total ? ((value / total) * 100).toFixed(0) : "0";
    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="font-medium text-sm"
      >
        {`${percentage}%`}
      </text>
    );
  };
  //#endregion

  /* ——— Sin datos ——— */
  if (!data.length || total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-red-600" />
            Devoluciones (30 d)
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-muted-foreground">
            No hay devoluciones en este período
          </p>
        </CardContent>
      </Card>
    );
  }

  /* ——— Pie chart ——— */
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-red-600" />
          Devoluciones (30 d)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Total: {total.toLocaleString()} unidades
        </p>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((slice, i) => (
                <Cell
                  key={`cell-${i}`}
                  fill={COLORS[slice.condition]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry) => (
                <span style={{ color: entry.color }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
