"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, RotateCcw } from "lucide-react";

export type KardexRow = {
  id: number;
  date: string;
  eppId: number;
  eppCode: string;
  eppName: string;
  warehouseId: number;
  warehouse: string;
  type: "ENTRY" | "EXIT" | "ADJUSTMENT";
  quantity: number;
  balance: number;
  previousBalance: number;
  operator: string | null;
  note: string | null;
  status: string | null;
  purchaseOrder: string | null;
  unitPrice: number | null;
};

type Props = {
  data: KardexRow[];
  totals: { entry: number; exit: number; adjustment: number };
  filters: {
    epps: Array<{ id: number; code: string; name: string }>;
    warehouses: Array<{ id: number; name: string }>;
  };
  selected: {
    query: string;
    eppId?: number;
    warehouseId?: number;
    type?: string;
    from?: string;
    to?: string;
  };
};

export default function KardexClient({ data, totals, filters, selected }: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const updateParam = (key: string, value?: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value.length > 0) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleSearch = useDebouncedCallback((term: string) => {
    updateParam("query", term);
  }, 300);

  const clearFilters = () => {
    router.replace(pathname);
  };

  const typeBadge = (t: KardexRow["type"]) => (
    <Badge variant={t === "ENTRY" ? "default" : t === "EXIT" ? "destructive" : "secondary"}>
      {t === "ENTRY" ? "Entrada" : t === "EXIT" ? "Salida" : "Ajuste"}
    </Badge>
  );

  const rows = useMemo(() => data, [data]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Kardex de Movimientos</h1>
        <p className="text-sm text-muted-foreground">
          Kardex completo y ordenado por fecha, con saldo acumulado por EPP y almacén.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar EPP, nota, OC..."
            className="pl-8"
            defaultValue={selected.query}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <Select
          value={selected.eppId ? String(selected.eppId) : "all"}
          onValueChange={(value) => updateParam("eppId", value === "all" ? undefined : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="EPP" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los EPP</SelectItem>
            {filters.epps.map((epp) => (
              <SelectItem key={epp.id} value={String(epp.id)}>
                {epp.code} - {epp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selected.warehouseId ? String(selected.warehouseId) : "all"}
          onValueChange={(value) => updateParam("warehouseId", value === "all" ? undefined : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Almacén" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los almacenes</SelectItem>
            {filters.warehouses.map((wh) => (
              <SelectItem key={wh.id} value={String(wh.id)}>
                {wh.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selected.type ?? "all"}
          onValueChange={(value) => updateParam("type", value === "all" ? undefined : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="ENTRY">Entrada</SelectItem>
            <SelectItem value="EXIT">Salida</SelectItem>
            <SelectItem value="ADJUSTMENT">Ajuste</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={selected.from ?? ""}
          onChange={(e) => updateParam("from", e.target.value)}
        />

        <Input
          type="date"
          value={selected.to ?? ""}
          onChange={(e) => updateParam("to", e.target.value)}
        />

        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={clearFilters}
        >
          <RotateCcw className="h-4 w-4" />
          Limpiar filtros
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-muted-foreground">Total Entradas</p>
          <p className="text-2xl font-bold text-emerald-600">{totals.entry}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-muted-foreground">Total Salidas</p>
          <p className="text-2xl font-bold text-rose-600">{totals.exit}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-muted-foreground">Total Ajustes</p>
          <p className="text-2xl font-bold text-amber-600">{totals.adjustment}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-muted-foreground">Movimientos</p>
          <p className="text-2xl font-bold">{rows.length}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>EPP</TableHead>
              <TableHead>Almacén</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Entrada</TableHead>
              <TableHead className="text-right">Salida</TableHead>
              <TableHead className="text-right">Ajuste</TableHead>
              <TableHead className="text-right">Saldo inicial</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Operador</TableHead>
              <TableHead>Nota</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-sm text-muted-foreground">
                  No hay movimientos para los filtros seleccionados.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const date = new Date(row.date);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">
                      {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{row.eppCode}</div>
                      <div className="text-xs text-muted-foreground">{row.eppName}</div>
                    </TableCell>
                    <TableCell>{row.warehouse}</TableCell>
                    <TableCell>{typeBadge(row.type)}</TableCell>
                    <TableCell className="text-right text-emerald-700">
                      {row.type === "ENTRY" ? row.quantity : "-"}
                    </TableCell>
                    <TableCell className="text-right text-rose-700">
                      {row.type === "EXIT" ? row.quantity : "-"}
                    </TableCell>
                    <TableCell className="text-right text-amber-700">
                      {row.type === "ADJUSTMENT" ? row.quantity : "-"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {row.previousBalance}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {row.balance}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.operator ?? "-"}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground">
                      {row.note ?? "-"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
