"use client";

import {
  ResponsiveContainer,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { TooltipProps } from "recharts";

interface Props {
  data: Array<{ 
    date: string; 
    entry: number; 
    exit: number; 
    adjustment: number; 
  }>;
}

const COLORS = {
  entry: "#22c55e",
  exit: "#ef4444", 
  adjustment: "#f59e0b"
};

const LABELS = {
  entry: "Entradas",
  exit: "Salidas",
  adjustment: "Ajustes"
};

export default function MovementsChart({ data }: Props) {
  // Formatear datos para mejor visualización
  const formattedData = data.map(item => ({
    ...item,
    displayDate: format(parseISO(item.date), "dd MMM", { locale: es })
  }));

  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const isoDate = payload[0].payload.date;      // <- la fecha en formato "yyyy-MM-dd"
      const dateStr = format(parseISO(isoDate), "dd 'de' MMMM, yyyy", { locale: es });

      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{dateStr}</p>
          {payload.map((entry, i) => (
            <p key={i} style={{ color: entry.color }} className="text-sm">
              {LABELS[entry.dataKey as keyof typeof LABELS]}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Movimientos de Inventario</CardTitle>
          <p className="text-sm text-muted-foreground">Entradas y salidas de EPPs en los últimos 30 días</p>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-muted-foreground">No hay datos disponibles</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Movimientos de Inventario</CardTitle>
        <p className="text-sm text-muted-foreground">Entradas y salidas de EPPs en los últimos 30 días</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart 
            data={formattedData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="displayDate" 
              fontSize={12}
              tick={{ fill: 'currentColor' }}
            />
            <YAxis 
              fontSize={12}
              tick={{ fill: 'currentColor' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="entry" 
              stackId="1" 
              stroke={COLORS.entry}
              fill={COLORS.entry}
              fillOpacity={0.6}
              name={LABELS.entry}
            />
            <Area 
              type="monotone" 
              dataKey="exit" 
              stackId="1" 
              stroke={COLORS.exit}
              fill={COLORS.exit}
              fillOpacity={0.6}
              name={LABELS.exit}
            />
            <Area 
              type="monotone" 
              dataKey="adjustment" 
              stackId="1" 
              stroke={COLORS.adjustment}
              fill={COLORS.adjustment}
              fillOpacity={0.6}
              name={LABELS.adjustment}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}