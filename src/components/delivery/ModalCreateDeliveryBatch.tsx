"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTransition, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import DeliveryBatchForm from "./DeliveryBatchForm";
import { DeliveryBatchValues } from "@/schemas/delivery-batch-schema";
import { createDeliveryBatch } from "@/app/(protected)/deliveries/actions";

export default function ModalCreateDeliveryBatch({ onClose, onCreated }: { onClose(): void; onCreated(): void }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [collaborators, setCollaborators] = useState<{ id: number; name: string; position?: string; location?: string }[]>([]);
  const [warehouses, setWarehouses]       = useState<{ id: number; name: string }[]>([]);
  const [loadingCols, setLoadingCols]     = useState(true);
  const [loadingWhs, setLoadingWhs]       = useState(true);

  useEffect(() => {
    fetch("/api/collaborators")
      .then((r) => r.json())
      .then((rows) => setCollaborators(rows))
      .catch(() => setCollaborators([]))
      .finally(() => setLoadingCols(false));

    fetch("/api/warehouses")
      .then((r) => r.json())
      .then((rows) => setWarehouses(rows))
      .catch(() => setWarehouses([]))
      .finally(() => setLoadingWhs(false));
  }, []);

  const handleCreate = (values: DeliveryBatchValues) => {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("payload", JSON.stringify(values));
        await createDeliveryBatch(fd);
        toast.success("Entrega registrada");
        onCreated();
        router.refresh();
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Ocurrió un error";
        toast.error(errorMessage);
      }
    });
  };

  return (
    <Dialog open>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Nueva entrega</DialogTitle>
        </DialogHeader>
        <DeliveryBatchForm
          collaborators={loadingCols ? [] : collaborators.map(c => ({ id: c.id, label: c.name, position: c.position, location: c.location }))}
          warehouses={loadingWhs ? [] : warehouses.map(w => ({ id: w.id, label: w.name }))}
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
