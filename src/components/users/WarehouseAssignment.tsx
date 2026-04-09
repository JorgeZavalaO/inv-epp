"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Warehouse, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type WarehouseOption = {
  id: number;
  name: string;
  location: string | null;
};

type WarehouseAssignmentProps = {
  userId: string;
  userName: string;
};

export default function WarehouseAssignment({
  userId,
  userName,
}: WarehouseAssignmentProps) {
  const [allWarehouses, setAllWarehouses] = useState<WarehouseOption[]>([]);
  const [assignedIds, setAssignedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [warehousesRes, assignedRes] = await Promise.all([
        fetch("/api/warehouses"),
        fetch(`/api/users/${userId}/warehouses`),
      ]);

      if (!warehousesRes.ok || !assignedRes.ok) {
        throw new Error("Error al cargar datos de almacenes");
      }

      const warehousesData = await warehousesRes.json();
      const assignedData = await assignedRes.json();

      // La API de warehouses puede devolver { warehouses: [...] } o directamente un array
      const warehouses: WarehouseOption[] = Array.isArray(warehousesData)
        ? warehousesData
        : warehousesData.warehouses ?? [];

      setAllWarehouses(warehouses);
      setAssignedIds(assignedData.warehouseIds ?? []);
    } catch (err) {
      toast.error("Error al cargar almacenes");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleWarehouse = (warehouseId: number) => {
    setAssignedIds((prev) =>
      prev.includes(warehouseId)
        ? prev.filter((id) => id !== warehouseId)
        : [...prev, warehouseId]
    );
  };

  const handleSelectAll = () => {
    setAssignedIds(allWarehouses.map((w) => w.id));
  };

  const handleClearAll = () => {
    setAssignedIds([]);
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/users/${userId}/warehouses`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ warehouseIds: assignedIds }),
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error ?? "Error al guardar");
        }
        toast.success(
          `Almacenes actualizados para ${userName} (${assignedIds.length} asignado${assignedIds.length !== 1 ? "s" : ""})`
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al guardar asignaciones");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Warehouse className="h-4 w-4" />
              Almacenes Asignados
            </CardTitle>
            <CardDescription>
              Este usuario solo podrá operar en los almacenes seleccionados
            </CardDescription>
          </div>
          <Badge variant={assignedIds.length === 0 ? "destructive" : "secondary"}>
            {assignedIds.length} / {allWarehouses.length}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {assignedIds.length === 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Sin almacenes asignados — el usuario no podrá realizar operaciones
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={allWarehouses.length === 0 || isPending}
          >
            Seleccionar todos
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            disabled={isPending}
          >
            Quitar todos
          </Button>
        </div>

        <ScrollArea className="h-48 rounded-md border p-3">
          {allWarehouses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay almacenes registrados
            </p>
          ) : (
            <div className="space-y-2">
              {allWarehouses.map((warehouse) => (
                <div key={warehouse.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={`warehouse-${warehouse.id}`}
                    checked={assignedIds.includes(warehouse.id)}
                    onCheckedChange={() => toggleWarehouse(warehouse.id)}
                    disabled={isPending}
                  />
                  <Label
                    htmlFor={`warehouse-${warehouse.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <span className="font-medium">{warehouse.name}</span>
                    {warehouse.location && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {warehouse.location}
                      </span>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isPending} size="sm">
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar asignaciones
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
