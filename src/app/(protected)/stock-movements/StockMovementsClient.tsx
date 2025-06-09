"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import MovementTable, { Row as MovementRow } from "@/components/stock/MovementTable";
import ModalCreateMovement from "@/components/stock/ModalCreateMovement";
import ModalEditMovement from "@/components/stock/ModalEditMovement";
import ModalDeleteMovement from "@/components/stock/ModalDeleteMovement";

interface Props {
  data: MovementRow[];
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export default function StockMovementsClient({
  data,
  page,
  hasPrev,
  hasNext,
}: Props) {
  /* control de modales */
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<MovementRow | null>(null);
  const [deleting, setDeleting] = useState<MovementRow | null>(null);

  return (
    <>
      {/* header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold">Movimientos de Stock</h1>
        <Button onClick={() => setShowCreate(true)}>+ Nuevo Movimiento</Button>
      </header>

      {/* tabla */}
      <div className="overflow-x-auto bg-white rounded-md shadow-sm mt-4">
        <MovementTable data={data} onEdit={setEditing} onDelete={setDeleting} />
      </div>

      {/* paginación */}
      <nav className="flex justify-between mt-4">
        {hasPrev ? (
          <Link href={`/stock-movements?page=${page - 1}`}>
            <Button variant="outline">&larr; Anterior</Button>
          </Link>
        ) : (
          <div />
        )}
        {hasNext && (
          <Link href={`/stock-movements?page=${page + 1}`}>
            <Button variant="outline">Siguiente &rarr;</Button>
          </Link>
        )}
      </nav>

      {/* modales */}
      {showCreate && <ModalCreateMovement onClose={() => setShowCreate(false)} />}
      {editing && (
        <ModalEditMovement
          movement={{
            ...editing,
            note: editing.note ?? undefined,
          }}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (deleting.type === "ENTRY" || deleting.type === "EXIT") && (
        <ModalDeleteMovement
          movement={{
            id: deleting.id,
            eppCode: deleting.eppCode,
            eppName: deleting.eppName,
            warehouse: deleting.warehouse,
            type: deleting.type,
            quantity: deleting.quantity,
          }}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
