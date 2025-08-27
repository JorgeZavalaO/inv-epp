"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
        const res = await createDeliveryBatch(fd);
        // res expected { id, code }
        toast.success(`Entrega registrada: ${res.code}`);
        onCreated();
        router.refresh();
      } catch (err: unknown) {
        let errorMessage = "Ocurrió un error";
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === "object" && err !== null && "message" in err) {
          // @ts-expect-error allow reading message property on unknown object
          errorMessage = err.message;
        }
        // Mostrar detalles si vienen como ZodError
        if (errorMessage.includes("Error de validación")) {
          toast.error(errorMessage, { duration: 6000 });
        } else {
          toast.error(errorMessage);
        }
      }
    });
  };

  return (
    <Dialog open>
      <DialogContent className="max-w-7xl min-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Nueva entrega</DialogTitle>
        </DialogHeader>
  <div className="flex-1 overflow-auto hide-scrollbar">
          <DeliveryBatchForm
            collaborators={loadingCols ? [] : collaborators.map(c => ({ id: c.id, label: c.name, position: c.position, location: c.location }))}
            warehouses={loadingWhs ? [] : warehouses.map(w => ({ id: w.id, label: w.name }))}
            onSubmit={handleCreate}
            onCancel={onClose}
            isPending={isPending}
          />
  </div>
      </DialogContent>
    </Dialog>
  );
}
