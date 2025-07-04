"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
//import { Loader2 } from "lucide-react";
import { useTransition, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import DeliveryBatchForm from "./DeliveryBatchForm";
import { DeliveryBatchValues } from "@/schemas/delivery-batch-schema";
import { updateDeliveryBatch } from "@/app/(protected)/deliveries/actions";

export default function ModalEditDeliveryBatch({
  batch,
  onClose,
  onSaved,
}: {
  batch: DeliveryBatchValues & { id: number; code: string };
  onClose(): void;
  onSaved(): void;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [collaborators, setCollaborators] = useState<{ id: number; label: string; position?: string; location?: string }[]>([]);
  const [warehouses, setWarehouses]       = useState<{ id: number; label: string }[]>([]);
  const [loadingCols, setLoadingCols]     = useState(true);
  const [loadingWhs, setLoadingWhs]       = useState(true);

  useEffect(() => {
    fetch("/api/collaborators")
      .then((r) => r.json())
      .then((rows: { id: number; name: string; position?: string; location?: string }[]) =>
        setCollaborators(rows.map((c) => ({
          id:       c.id,
          label:    c.name,
          position: c.position,
          location: c.location,
        })))
      )
      .catch(() => setCollaborators([]))
      .finally(() => setLoadingCols(false));

    fetch("/api/warehouses")
      .then((r) => r.json())
      .then((rows: { id: number; name: string }[]) =>
        setWarehouses(rows.map((w) => ({ id: w.id, label: w.name })))
      )
      .catch(() => setWarehouses([]))
      .finally(() => setLoadingWhs(false));
  }, []);

  const handleSave = (values: DeliveryBatchValues) => {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("payload", JSON.stringify({ ...values, id: batch.id }));
        await updateDeliveryBatch(fd);
        toast.success("Entrega actualizada");
        onSaved();
        router.refresh();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Ocurrió un error";
        toast.error(message);
      }
    });
  };

  return (
    <Dialog open>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editar entrega {batch.code}</DialogTitle>
        </DialogHeader>

        <DeliveryBatchForm
          defaultValues={batch}
          collaborators={loadingCols ? [] : collaborators}
          warehouses={loadingWhs ? [] : warehouses}
          onSubmit={handleSave}
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
