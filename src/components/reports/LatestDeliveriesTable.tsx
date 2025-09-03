"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { LatestDeliveryRow } from "@/lib/reports";
import { format } from "date-fns";

export default function LatestDeliveriesTable({ data }: { data: LatestDeliveryRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Últimas entregas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-600">
              <tr>
                <th className="py-2 pr-2">Fecha</th>
                <th className="py-2 pr-2">Código</th>
                <th className="py-2 pr-2">EPP</th>
                <th className="py-2 pr-2">Cant.</th>
                <th className="py-2 pr-2">Colaborador</th>
                <th className="py-2 pr-2">Almacén</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2 pr-2 whitespace-nowrap">{format(new Date(r.date), "dd/MM/yyyy HH:mm")}</td>
                  <td className="py-2 pr-2">{r.batchCode}</td>
                  <td className="py-2 pr-2">{r.eppName}</td>
                  <td className="py-2 pr-2">{r.qty}</td>
                  <td className="py-2 pr-2">{r.collaborator ?? "—"}</td>
                  <td className="py-2 pr-2">{r.warehouse}</td>
                </tr>
              ))}
              {!data.length && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted-foreground">No hay entregas recientes</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
