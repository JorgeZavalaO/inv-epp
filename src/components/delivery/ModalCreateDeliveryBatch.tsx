"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button }     from "@/components/ui/button";
import { useTransition, useEffect, useState } from "react";
import { toast }      from "sonner";
import { useRouter }  from "next/navigation";

import DeliveryBatchForm from "./DeliveryBatchForm";
import { DeliveryBatchValues } from "@/schemas/delivery-batch-schema";
import { createDeliveryBatch } from "@/app/(protected)/deliveries/actions";

export default function ModalCreateDeliveryBatch({
  onClose,
  onCreated,
}: {
  onClose(): void;
  onCreated(): void;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [collaborators, setCollaborators] = useState<
    { id: number; name: string; position?: string; location?: string }[]
  >([]);
  const [warehouses, setWarehouses] = useState<
    { id: number; name: string }[]
  >([]);

  useEffect(() => {
    fetch("/api/collaborators")
      .then((r) => r.json())
      .then(setCollaborators)
      .catch(() => setCollaborators([]));

    fetch("/api/warehouses")
      .then((r) => r.json())
      .then(setWarehouses)
      .catch(() => setWarehouses([]));
  }, []);

  const handleCreate = (values: DeliveryBatchValues) => {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("payload", JSON.stringify(values));
        await createDeliveryBatch(fd);
        router.refresh();
        toast.success("Entrega registrada");
        onCreated();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Ocurrió un error";
        toast.error(message);
      }
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Nueva entrega</DialogTitle>
        </DialogHeader>

        <DeliveryBatchForm
          collaborators={collaborators.map((c) => ({
            id: c.id,
            label: c.name,
            position: c.position,
            location: c.location,
          }))}
          warehouses={warehouses.map((w) => ({ id: w.id, label: w.name }))}
          onSubmit={handleCreate}
        />

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
