"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { ReportsIndicators } from "@/lib/reports";

interface Props { indicators: ReportsIndicators | undefined }

const formatPct = (v: number) => (v * 100).toFixed(1) + "%";

export default function IndicatorsPanel({ indicators }: Props) {
  if (!indicators) return null;
  const i = indicators;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Indicadores de Gestión</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1 text-sm">
          <li className="flex justify-between"><span>Total entregado</span><span>{i.totalDeliveredQty}</span></li>
          <li className="flex justify-between"><span># líneas de entrega</span><span>{i.deliveriesCount}</span></li>
          <li className="flex justify-between"><span>Prom. ítems por línea</span><span>{i.avgItemsPerDelivery.toFixed(2)}</span></li>
          <li className="flex justify-between"><span>Solicitudes</span><span>{i.requestsCount}</span></li>
          <li className="flex justify-between"><span>Solicitudes completadas</span><span>{i.completedRequests} ({formatPct(i.requestsCompletionRate)})</span></li>
          <li className="flex justify-between"><span>Devueltos</span><span>{i.returnQty} ({formatPct(i.returnRate)})</span></li>
          <li className="flex justify-between"><span>Colaboradores únicos</span><span>{i.uniqueCollaborators}</span></li>
          <li className="flex justify-between"><span>EPPs únicos</span><span>{i.uniqueEpps}</span></li>
          <li className="flex justify-between"><span>Prom. diario entregado</span><span>{i.averageDailyDeliveredQty.toFixed(2)}</span></li>
        </ul>
      </CardContent>
    </Card>
  );
}
