"use client";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LowStockRow } from "@/lib/dashboard";
import { AlertTriangle } from "lucide-react";

interface Props {
  data: LowStockRow[];
}

export default function LowStockTable({ data }: Props) {
  /** Determina la etiqueta y el estilo según el % de stock restante. */
  const getStockStatus = (current: number, min: number) => {
    /** Si por error minStock es 0 evitamos división por cero. */
    const percentage = min ? (current / min) * 100 : 100;

    if (percentage === 0) {
      return { label: "Sin stock", variant: "destructive" as const };
    }
    if (percentage < 50) {
      return { label: "Crítico", variant: "destructive" as const };
    }
    return { label: "Bajo", variant: "secondary" as const };
  };

  /* ——— Caso sin filas ——— */
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Stock bajo
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p className="text-muted-foreground">
              ¡Excelente! No hay EPPs con stock bajo
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ——— Tabla con top-15 de EPPs críticos ——— */
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          Top&nbsp;15 con stock bajo
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-right">Stock actual</TableHead>
              <TableHead className="text-right">Stock mínimo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => {
              const status = getStockStatus(row.totalStock, row.minStock);
              return (
                <TableRow
                  key={row.id}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="font-mono text-sm">{row.code}</TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="truncate" title={row.name}>
                      {row.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={status.variant} className="text-xs">
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <span
                      className={
                        row.totalStock === 0
                          ? "text-red-600 font-bold"
                          : "text-foreground"
                      }
                    >
                      {row.totalStock.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {row.minStock.toLocaleString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
