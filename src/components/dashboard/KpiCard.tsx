"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function KpiCard({
  title,
  value,
  delta,
}: {
  title: string;
  value: string | number;
  delta?: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
        {delta !== undefined && (
          <p
            className={`text-xs ${
              delta >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {delta >= 0 ? "+" : ""}
            {delta} vs 7 d
          </p>
        )}
      </CardContent>
    </Card>
  );
}
