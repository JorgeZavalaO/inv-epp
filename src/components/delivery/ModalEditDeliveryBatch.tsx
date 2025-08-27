"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
        const res = await updateDeliveryBatch(fd);
        // res expected { id, code }
        toast.success(`Entrega actualizada: ${res.code}`);
        onSaved();
        router.refresh();
      } catch (err: unknown) {
        let errorMessage = "Ocurrió un error";
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === "object" && err !== null && "message" in err) {
          // @ts-expect-error allow reading message property on unknown object
          errorMessage = err.message;
        }
        toast.error(errorMessage);
      }
    });
  };

  return (
    <Dialog open>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Editar entrega {batch.code}</DialogTitle>
        </DialogHeader>
  <div className="flex-1 overflow-auto hide-scrollbar">
          <DeliveryBatchForm
            defaultValues={batch}
            collaborators={loadingCols ? [] : collaborators}
            warehouses={loadingWhs ? [] : warehouses}
            onSubmit={handleSave}
            onCancel={onClose}
            isPending={isPending}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
