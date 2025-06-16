"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  }

  /* ---------- Estado ---------- */
  const [data, setData] = React.useState<ReturnBatchData | null>(null);

  React.useEffect(() => {
    fetch(`/api/return-batches/${batchId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [batchId]);

  /* ---------- UI ---------- */
  return (
    <Dialog open>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="flex items-center justify-between">
          <DialogTitle>Detalle devolución {data?.code ?? ""}</DialogTitle>
          <DialogClose onClick={onClose} />
        </DialogHeader>

        {!data && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin" />
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Almacén: {data.warehouse?.name ?? "—"}
            </p>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th>Código</th>
                  <th>Nombre</th>
                  <th className="text-center">Cant.</th>
                  <th className="text-center">Condición</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td>{it.epp.code}</td>
                    <td>{it.epp.name}</td>
                    <td className="text-center">{it.quantity}</td>
                    <td className="text-center">
                      <Badge
                        variant={it.condition === "REUSABLE" ? "default" : "destructive"}
                      >
                        {it.condition === "REUSABLE" ? "Reutilizable" : "Descartado"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.note && (
              <p className="text-sm mt-2">
                <strong>Nota:</strong> {data.note}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
