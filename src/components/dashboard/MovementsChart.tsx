"use client";
import { AreaChart, Area, Tooltip, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";
//import { format } from "date-fns";

type Point = { date: string; entradas: number; salidas: number };

export default function MovementsChart({ raw }: { raw: { type: string; _sum: { quantity: number } }[] }) {
  // Normalizamos a un solo punto: [{date:'Entradas', entradas:.., salidas:..}]
  const entradas = raw.find((m) => m.type === "ENTRY")?._sum.quantity ?? 0;
  const salidas  = raw.find((m) => m.type === "EXIT")?._sum.quantity ?? 0;
  const data: Point[] = [{ date: "Últimos 30 d", entradas, salidas }];

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={(v) => v} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Area type="monotone" dataKey="entradas" stackId="1" stroke="#16a34a" fill="#16a34a33" />
        <Area type="monotone" dataKey="salidas"  stackId="1" stroke="#dc2626" fill="#dc262633" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
