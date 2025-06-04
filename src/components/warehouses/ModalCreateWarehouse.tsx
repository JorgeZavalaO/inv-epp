"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createWarehouseAction } from "@/app/(protected)/warehouses/actions";

interface Props {
  onClose: () => void;
}

export default function ModalCreateWarehouse({ onClose }: Props) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("name", name);
    if (location) fd.append("location", location);

    startTransition(async () => {
      try {
        await createWarehouseAction(fd);
        toast.success("Almacén creado");
        onClose();
      } catch (err: unknown) {
        if (err instanceof Error) {
          toast.error(err.message || "Error al crear almacén");
        } else {
          toast.error("Error al crear almacén");
        }
      }
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo almacén</DialogTitle>
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
              Crear
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
