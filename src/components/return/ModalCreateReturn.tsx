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
import { useSession } from "next-auth/react";

import { createReturnBatch } from "@/app/(protected)/returns/actions";
import ReturnForm, { DetailRow } from "./ReturnForm";
import { Button } from "@/components/ui/button";

/* lote que se presenta en el combobox */
interface BatchRow {
  id:   number;
  code: string;
  date: string;
}

/* estructuras que recibimos del endpoint /api/delivery-batches/[id] */
interface DeliveryAPI {
  eppId:   number;
  quantity:number;
  epp:     { code: string; name: string };
}
interface DeliveryBatchAPI {
  warehouseId:   number;
  warehouse:     { name: string };
  deliveries:    DeliveryAPI[];
}

export default function ModalCreateReturn({
  onClose,
  onCreated,
}: {
  onClose(): void;
  onCreated(): void;
}) {
  const { data: session } = useSession();
  const [batches, setBatches] = React.useState<BatchRow[]>([]);
  const [isPending, start] = useTransition();

  /* traemos sólo pedidos pendientes */
  React.useEffect(() => {
    fetch("/api/available-batches")
      .then((r) => r.json())
      .then(setBatches);
  }, []);

  /* devuelve el detalle tipado del pedido elegido */
  const fetchDetails = React.useCallback(
    async (batchId: number): Promise<DetailRow[]> => {
      const res = await fetch(`/api/delivery-batches/${batchId}`);
      const b: DeliveryBatchAPI = await res.json();

      return b.deliveries.map((d) => ({
        eppId:         d.eppId,
        warehouseId:   b.warehouseId,
        warehouseName: b.warehouse.name,
        delivered:     d.quantity,
        code:          d.epp.code,
        name:          d.epp.name,
      }));
    },
    [],
  );

  return (
    <Dialog open>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Devolución por pedido</DialogTitle>
            <DialogClose />
          </div>

          {session?.user && (
            <p className="text-sm text-muted-foreground">
              Usuario: {session.user.name ?? session.user.email}
            </p>
          )}
        </DialogHeader>

        <ReturnForm
          batches={batches}
          fetchDetails={fetchDetails}
          onSubmit={(values) =>
            start(async () => {
              try {
                const fd = new FormData();
                fd.append("payload", JSON.stringify(values));
                await createReturnBatch(fd);
                toast.success("Devolución registrada");
                onCreated();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Error al registrar");
              }
            })
          }
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
