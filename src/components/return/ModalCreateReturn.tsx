"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTransition } from "react";
import { toast } from "sonner";
import { createReturnBatch } from "@/app/(protected)/returns/actions";
import ReturnForm from "./ReturnForm";
import { Button } from "@/components/ui/button";

interface DeliveryBatchRow {
  id: number;
  code: string;
  createdAt: string;
}

interface Delivery {
  eppId: number;
  quantity: number;
  epp: {
    code: string;
    name: string;
  };
}

export default function ModalCreateReturn({
  onClose,
  onCreated,
}: {
  onClose(): void;
  onCreated(): void;
}) {
  const [isPending, start] = useTransition();
  const [batches, setBatches] = React.useState<
    { id: number; code: string; date: string }[]
  >([]);

  // 1) Carga la lista de lotes una sola vez
  React.useEffect(() => {
    fetch("/api/delivery-batches")
      .then((r) => r.json())
      .then((rows: DeliveryBatchRow[]) =>
        setBatches(
          rows.map((b) => ({ id: b.id, code: b.code, date: b.createdAt }))
        )
      );
  }, []);

  // 2) Mantenemos fetchDetails estable con useCallback
  const fetchDetails = React.useCallback(
    async (batchId: number) => {
      const res = await fetch(`/api/delivery-batches/${batchId}`);
      const b = await res.json();
      return b.deliveries.map((d: Delivery) => ({
        eppId: d.eppId,
        warehouseId: b.warehouseId,
        delivered: d.quantity,
        code: d.epp.code,
        name: d.epp.name,
      }));
    },
    [] // solo se define una vez
  );

  return (
    <Dialog open>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="flex items-center justify-between">
          <DialogTitle>Devolución por lote</DialogTitle>
          <DialogClose />
        </DialogHeader>

        <ReturnForm
          batches={batches}
          fetchDetails={fetchDetails}
          onSubmit={(data) =>
            start(async () => {
              try {
                const fd = new FormData();
                fd.append("payload", JSON.stringify(data));
                await createReturnBatch(fd);
                toast.success("Devolución registrada");
                onCreated();
              } catch (e: unknown) {
                toast.error(
                  e instanceof Error ? e.message : "Error al registrar"
                );
              }
            })
          }
        />

        <DialogFooter>
          <div className="flex justify-end w-full">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
