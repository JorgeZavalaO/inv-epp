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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface Props {
  batchId: number;
  onClose(): void;
}

export default function ModalViewReturn({ batchId, onClose }: Props) {
  /* ---------- Tipado ---------- */
  interface ReturnBatchItem {
    id: number;
    epp: { code: string; name: string };
    quantity: number;
    condition: "REUSABLE" | "DISCARDED";
  }
  interface ReturnBatchData {
    code: string;
    warehouse?: { name: string | null };
    items: ReturnBatchItem[];
    note?: string | null;
    cancelledDeliveryBatch?: { code: string } | null;
  }

  /* ---------- Estado ---------- */
  const [open, setOpen] = React.useState(true);
  const [data, setData] = React.useState<ReturnBatchData | null>(null);

  React.useEffect(() => {
    fetch(`/api/return-batches/${batchId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [batchId]);

  /* ---------- Handlers ---------- */
  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setOpen(false);
      onClose();
    }
  };

  /* ---------- UI ---------- */
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl sm:rounded-2xl">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-semibold">
                  Detalle devolución&nbsp;{data?.code ?? ""}
                </DialogTitle>
                {data?.cancelledDeliveryBatch && (
                  <Badge variant="outline" className="text-xs">
                    Anulación {data.cancelledDeliveryBatch.code}
                  </Badge>
                )}
              </div>
              {data?.warehouse?.name && (
                <p className="text-sm text-muted-foreground">
                  Almacén: {data.warehouse.name}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Loader */}
        {!data && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {/* Contenido */}
        {data && (
          <div className="space-y-4">
            <ScrollArea className="max-h-[50vh]">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-background/90 backdrop-blur">
                  <tr>
                    <th className="py-2 text-left">Código</th>
                    <th className="py-2 text-left">Nombre</th>
                    <th className="py-2 text-center">Cant.</th>
                    <th className="py-2 text-center">Condición</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((it, i) => (
                    <tr
                      key={it.id}
                      className={i % 2 ? "bg-muted/30" : undefined}
                    >
                      <td className="py-2">{it.epp.code}</td>
                      <td className="py-2">{it.epp.name}</td>
                      <td className="py-2 text-center">{it.quantity}</td>
                      <td className="py-2 text-center">
                        <Badge
                          variant={
                            it.condition === "REUSABLE"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {it.condition === "REUSABLE"
                            ? "Reutilizable"
                            : "Descartado"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>

            {data.note && (
              <p className="text-sm">
                <strong>Nota:</strong> {data.note}
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
