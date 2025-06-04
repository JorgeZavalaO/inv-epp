"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateWarehouseAction } from "@/app/(protected)/warehouses/actions";
import { z } from "zod";

interface Props {
  warehouse: {
    id: number;
    name: string;
    location: string | null;
  };
  onClose: () => void;
}

const editWarehouseSchema = z.object({
  id: z.number().int().positive("ID inválido"),
  name: z.string().min(2, "El nombre es requerido"),
  location: z.string().optional(),
});

export default function ModalEditWarehouse({ warehouse, onClose }: Props) {
  const [name, setName] = useState(warehouse.name);
  const [location, setLocation] = useState(warehouse.location || "");
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = editWarehouseSchema.safeParse({
      id: warehouse.id,
      name,
      location,
    });

    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || "Datos inválidos");
      return;
    }

    const fd = new FormData();
    fd.append("id", parsed.data.id.toString());
    fd.append("name", parsed.data.name);
    fd.append("location", parsed.data.location ?? "");

    startTransition(async () => {
      try {
        await updateWarehouseAction(fd);
        toast.success("Almacén actualizado");
        onClose();
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Error al actualizar almacén";
        toast.error(errorMessage);
      }
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar almacén</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Nombre del almacén"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            placeholder="Ubicación (opcional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              Guardar cambios
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
