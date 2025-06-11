"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label }  from "@/components/ui/label";

import { EppRow } from "./EppTable";

export default function ModalViewEpp({
  epp,
  onClose,
}: {
  epp: EppRow;
  onClose(): void;
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Detalle de EPP</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Código:</Label>
            <p>{epp.code}</p>
          </div>
          <div>
            <Label>Nombre:</Label>
            <p>{epp.name}</p>
          </div>
          <div>
            <Label>Categoría:</Label>
            <p>{epp.category}</p>
          </div>
          <div>
            <Label>Descripción:</Label>
            <p>{epp.description || "-"}</p>
          </div>
          <div>
            <Label>Stock mínimo:</Label>
            <p>{epp.minStock}</p>
          </div>
          <div>
            <Label>Stock actual:</Label>
            <p>{epp.stock}</p>
          </div>
          <div>
            <Label>Inventario por almacén:</Label>
            <table className="w-full text-sm border">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Almacén</th>
                  <th className="p-2 text-right">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {epp.items.map((it) => (
                  <tr key={it.warehouseId} className="border-b">
                    <td className="p-2">{it.warehouseName}</td>
                    <td className="p-2 text-right">{it.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
