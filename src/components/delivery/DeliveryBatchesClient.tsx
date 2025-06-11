"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

import DeliveryBatchTable from "./DeliveryBatchTable";
import ModalCreateDeliveryBatch from "./ModalCreateDeliveryBatch";
import ModalEditDeliveryBatch from "./ModalEditDeliveryBatch";
import ModalDeleteDeliveryBatch from "./ModalDeleteDeliveryBatch";

import type { DeliveryBatchValues } from "@/schemas/delivery-batch-schema";

export interface BatchRow {
  id:           number;
  code:         string;
  date:         string;
  collaborator: string;
  operator:     string;
  items:        number;
}

interface ListItem {
  id:             number;
  code:           string;
  createdAt:      Date;
  collaboratorId: number;
  warehouseId:    number;
  note?:          string | null;
  collaborator:   { name: string };
  user:           { name: string | null; email: string };
  _count:         { deliveries: number };
  deliveries:     { eppId: number; quantity: number }[];
}

interface Props {
  list: ListItem[];
}

export default function DeliveryBatchesClient({ list }: Props) {
  const [showCreate, setShowCreate]   = useState(false);
  const [editingItem, setEditingItem] = useState<ListItem | null>(null);
  const [deleting, setDeleting]       = useState<{ id: number; code: string } | null>(null);
  const router = useRouter();

  // Memoizar el resumen de filas para no recalcular en cada render
  const data: BatchRow[] = useMemo(
    () =>
      list.map((b) => ({
        id:           b.id,
        code:         b.code,
        date:         b.createdAt.toISOString(),
        collaborator: b.collaborator.name,
        operator:     b.user.name ?? b.user.email,
        items:        b._count.deliveries,
      })),
    [list]
  );

  // Preparar el batch para el modal de edición
  const editingBatch =
    editingItem && ({
      id:             editingItem.id,
      code:           editingItem.code,
      collaboratorId: editingItem.collaboratorId,
      warehouseId:    editingItem.warehouseId,
      note:           editingItem.note ?? "",
      items: editingItem.deliveries.map((d) => ({
        eppId:       d.eppId,
        warehouseId: editingItem.warehouseId,
        quantity:    d.quantity,
      })),
    } as DeliveryBatchValues & { id: number; code: string });

  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Entregas</h1>
        <Button onClick={() => setShowCreate(true)}>+ Nueva entrega</Button>
      </div>

      <DeliveryBatchTable
        data={data}
        onEdit={(row) => {
          const match = list.find((b) => b.id === row.id);
          if (match) setEditingItem(match);
        }}
        onDelete={(row) => setDeleting({ id: row.id, code: row.code })}
      />

      {/* Modal Crear */}
      {showCreate && (
        <ModalCreateDeliveryBatch
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            router.refresh();
          }}
        />
      )}

      {/* Modal Editar */}
      {editingBatch && (
        <ModalEditDeliveryBatch
          batch={editingBatch}
          onClose={() => setEditingItem(null)}
          onSaved={() => {
            setEditingItem(null);
            router.refresh();
          }}
        />
      )}

      {/* Modal Eliminar */}
      {deleting && (
        <ModalDeleteDeliveryBatch
          batch={deleting}
          onClose={() => {
            setDeleting(null);
            router.refresh();
          }}
        />
      )}
    </section>
  );
}
