"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { TopItem } from "@/lib/reports";

const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6"]; 

export default function TopEppsChart({ data }: { data: TopItem[] }) {
  const items = data.map((d, i) => ({
    name: d.name.length > 18 ? d.name.slice(0,18) + "…" : d.name,
    full: d.name,
    qty: d.qty,
    fill: COLORS[i % COLORS.length],
  }));

  return (
  <Card data-report-chart="top-epps">
      <CardHeader>
        <CardTitle>Top 5 EPPs más solicitados</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        {items.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={items} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <XAxis type="number" fontSize={12} />
              <YAxis type="category" dataKey="name" width={120} fontSize={12} />
              <Tooltip formatter={(v) => [`${v}`, "Unidades"]} />
              <Bar dataKey="qty" radius={[0,4,4,0]}>
                {items.map((e,i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-80 flex items-center justify-center text-muted-foreground">Sin datos</div>
        )}
      </CardContent>
    </Card>
  );
}
