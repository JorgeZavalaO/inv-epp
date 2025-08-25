"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { deleteEpp } from "@/app/(protected)/epps/actions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ModalCreateEpp from "./ModalCreateEpp";
import ModalEditEpp   from "./ModalEditEpp";
import ModalViewEpp   from "./ModalViewEpp";
import ModalImportEpp from "./ModalImportEpp";
import ComboboxWarehouse from "@/components/ui/ComboboxWarehouse";

export type EppRow = {
  id:          number;
  code:        string;
  name:        string;
  category:    string;
  stock:       number;
  description: string | null;
  minStock:    number;
  hasMovement: boolean;
  items: {
    warehouseId:   number;
    warehouseName: string;
    quantity:      number;
  }[];
};

  type Warehouse = { id: number; name: string };

  export default function EppTable({ data, warehouses }: { data: EppRow[]; warehouses: Warehouse[] }) {
  const [pending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]       = useState<EppRow | null>(null);
  const [viewing, setViewing]       = useState<EppRow | null>(null);
  const [importing, setImporting]   = useState(false);
  const [deleting, setDeleting]     = useState<EppRow | null>(null);

  // Configuración de columnas básicas
  const [showCategory, setShowCategory] = useState(true);
  // Por defecto sólo mostrar total
  const [showTotal, setShowTotal]       = useState(true);
  // Dividir stock por almacenes (desactivado por defecto)
  const [splitStock, setSplitStock] = useState(false);

    // Cargar/guardar preferencias de columnas y división de stock
    useEffect(() => {
      try {
        const sc = localStorage.getItem("epps.columns.showCategory");
        const st = localStorage.getItem("epps.columns.showTotal");
        const ss = localStorage.getItem("epps.splitStock.enabled");
      if (sc != null) setShowCategory(sc === "1");
      if (st != null) setShowTotal(st === "1");
      if (ss != null) setSplitStock(ss === "1");
      } catch {}
    }, []);

    useEffect(() => {
      try {
        localStorage.setItem("epps.columns.showCategory", showCategory ? "1" : "0");
        localStorage.setItem("epps.columns.showTotal", showTotal ? "1" : "0");
        localStorage.setItem("epps.splitStock.enabled", splitStock ? "1" : "0");
      } catch {}
  }, [showCategory, showTotal, splitStock]);

    // Selección de dos almacenes
    const [warehouseAId, setWarehouseAId] = useState<number | null>(null);
    const [warehouseBId, setWarehouseBId] = useState<number | null>(null);

    // Cargar desde localStorage y defaults
    useEffect(() => {
      try {
        const a = localStorage.getItem("epps.stockWarehouseAId");
        const b = localStorage.getItem("epps.stockWarehouseBId");
        if (a) setWarehouseAId(Number(a));
        if (b) setWarehouseBId(Number(b));
      } catch {}
    }, []);

    useEffect(() => {
      if (warehouseAId == null || warehouseBId == null) {
        // Defaults a los dos primeros almacenes, si existen
        if (warehouses?.length) {
          setWarehouseAId((prev) => prev ?? warehouses[0]?.id ?? null);
          setWarehouseBId((prev) => prev ?? warehouses[1]?.id ?? warehouses[0]?.id ?? null);
        }
      }
    }, [warehouses, warehouseAId, warehouseBId]);

    useEffect(() => {
      try {
        if (warehouseAId != null) localStorage.setItem("epps.stockWarehouseAId", String(warehouseAId));
        if (warehouseBId != null) localStorage.setItem("epps.stockWarehouseBId", String(warehouseBId));
      } catch {}
    }, [warehouseAId, warehouseBId]);

    const getWarehouseName = useCallback(
      (id: number | null | undefined) =>
        warehouses.find((w) => w.id === id)?.name ?? (id ? `Almacén ${id}` : "Sin seleccionar"),
      [warehouses]
    );

    const qtyFor = useCallback((row: EppRow, wid: number | null) => {
      if (wid == null) return 0;
      const it = row.items.find((i) => i.warehouseId === wid);
      return it?.quantity ?? 0;
    }, []);

    const columns: ColumnDef<EppRow>[] = useMemo(() => {
      const cols: ColumnDef<EppRow>[] = [
        { accessorKey: "code", header: "Código" },
        { accessorKey: "name", header: "Nombre" },
      ];

      if (showCategory) cols.push({ accessorKey: "category", header: "Categoría" });

      if (splitStock) {
        cols.push(
          {
            id: "stockA",
            header: `Stock ${getWarehouseName(warehouseAId)}`,
            cell: ({ row }) => qtyFor(row.original, warehouseAId),
          },
          {
            id: "stockB",
            header: `Stock ${getWarehouseName(warehouseBId)}`,
            cell: ({ row }) => qtyFor(row.original, warehouseBId),
          }
        );
      }

      if (showTotal) cols.push({ accessorKey: "stock", header: "Total" });

      cols.push({
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => {
          const e = row.original;
          return (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setViewing(e)}>
                Ver
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setEditing(e)}>
                Editar
              </Button>
              <AlertDialog
                open={deleting?.id === e.id}
                onOpenChange={(o) => !o && setDeleting(null)}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleting(e)}
                    disabled={pending || e.hasMovement}
                  >
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {e.hasMovement
                        ? `No se puede eliminar "${e.name}"`
                        : `Eliminar "${e.name}"?`}
                    </AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex gap-2">
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={pending || e.hasMovement}
                      onClick={() =>
                        startTransition(async () => {
                          try {
                            await deleteEpp(e.id);
                            toast.success("EPP eliminado");
                            setDeleting(null);
                          } catch (err: unknown) {
                            const message =
                              err instanceof Error ? err.message : "Error desconocido";
                            toast.error(message);
                          }
                        })
                      }
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        },
      });

      return cols;
  }, [showCategory, showTotal, splitStock, warehouseAId, warehouseBId, deleting, pending, getWarehouseName, qtyFor]);

  return (
    <>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-4">
        <div className="flex flex-col md:flex-row gap-2 md:items-end">
          <div className="flex gap-2 items-center pt-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline">Configurar columnas</Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox id="col-category" checked={showCategory} onCheckedChange={() => setShowCategory(s => !s)} />
                    <label htmlFor="col-category" className="text-sm">Categoría</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="col-total" checked={showTotal} onCheckedChange={() => setShowTotal(s => !s)} />
                    <label htmlFor="col-total" className="text-sm">Total</label>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex items-center gap-2">
                    <Checkbox id="split-stock" checked={splitStock} onCheckedChange={() => setSplitStock(s => !s)} />
                    <label htmlFor="split-stock" className="text-sm">Dividir stock por almacenes</label>
                  </div>
                  {splitStock && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-sm text-muted-foreground mb-1">Almacén A</label>
                        <ComboboxWarehouse
                          value={warehouseAId}
                          onChange={(id) => {
                            // Evitar duplicados simples: si coincide con B, intercambiar
                            if (id != null && id === warehouseBId) {
                              setWarehouseBId(warehouseAId);
                            }
                            setWarehouseAId(id);
                          }}
                          options={warehouses.map((w) => ({ id: w.id, label: w.name }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-muted-foreground mb-1">Almacén B</label>
                        <ComboboxWarehouse
                          value={warehouseBId}
                          onChange={(id) => {
                            if (id != null && id === warehouseAId) {
                              setWarehouseAId(warehouseBId);
                            }
                            setWarehouseBId(id);
                          }}
                          options={warehouses.map((w) => ({ id: w.id, label: w.name }))}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end gap-2 mt-2">
                    <Button size="sm" variant="ghost" onClick={() => {
                      // reset defaults
                      setShowCategory(true);
                      setShowTotal(true);
                      setSplitStock(false);
                      setWarehouseAId(warehouses?.[0]?.id ?? null);
                      setWarehouseBId(warehouses?.[1]?.id ?? warehouses?.[0]?.id ?? null);
                      try {
                        localStorage.removeItem('epps.columns.showCategory');
                        localStorage.removeItem('epps.columns.showTotal');
                        localStorage.removeItem('epps.splitStock.enabled');
                        localStorage.removeItem('epps.stockWarehouseAId');
                        localStorage.removeItem('epps.stockWarehouseBId');
                      } catch {}
                    }}>Reset</Button>
                    <Button size="sm" onClick={() => { /* el estado ya está guardado automáticamente */
                      try {
                        if (warehouseAId != null) localStorage.setItem('epps.stockWarehouseAId', String(warehouseAId));
                        if (warehouseBId != null) localStorage.setItem('epps.stockWarehouseBId', String(warehouseBId));
                      } catch {}
                    }}>Guardar</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setImporting(true)}>
            Importar
          </Button>
          <Button className="ml-2" onClick={() => setShowCreate(true)}>
            + Nuevo EPP
          </Button>
        </div>
      </div>

      <DataTable columns={columns} data={data} />

      {showCreate && <ModalCreateEpp onClose={() => setShowCreate(false)} />}
      {editing && (
        <ModalEditEpp
          epp={{
            ...editing,
            items: editing.items.map(item => ({
              warehouseId: item.warehouseId,
              initialQty: item.quantity,
            })),
          }}
          onClose={() => setEditing(null)}
        />
      )}
      {viewing && <ModalViewEpp epp={viewing} onClose={() => setViewing(null)} />}
      {importing && <ModalImportEpp onClose={() => setImporting(false)} />}
    </>
  );
}
