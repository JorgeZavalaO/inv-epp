"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

import MovementTable, { Row as MovementRow } from "@/components/stock/MovementTable";
import ModalCreateMovement from "@/components/stock/ModalCreateMovement";
import ModalEditMovement from "@/components/stock/ModalEditMovement";
import ModalDeleteMovement from "@/components/stock/ModalDeleteMovement";
import ModalCreateEntryBatch from "@/components/stock/ModalCreateEntryBatch";
import ModalPendingApprovals from "@/components/stock/ModalPendingApprovals";

interface Props {
  data: MovementRow[];
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
  pendingCount?: number;
}

export default function StockMovementsClient({
  data,
  page,
  hasPrev,
  hasNext,
  pendingCount = 0,
}: Props) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  /* control de modales */
  const [showCreate, setShowCreate] = useState(false);
  const [showBatch,  setShowBatch]  = useState(false);
  const [showPendingApprovals, setShowPendingApprovals] = useState(false);
  const [editing, setEditing] = useState<MovementRow | null>(null);
  const [deleting, setDeleting] = useState<MovementRow | null>(null);

  return (
    <>
      {/* header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Movimientos de Stock</h1>
          {!isAdmin && (
            <p className="text-sm text-muted-foreground mt-1">
              Los movimientos que crees serán enviados para aprobación de un administrador
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {isAdmin && pendingCount > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowPendingApprovals(true)}
              className="relative"
            >
              <Clock className="h-4 w-4 mr-2" />
              Aprobaciones Pendientes
              <Badge variant="destructive" className="ml-2">
                {pendingCount}
              </Badge>
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowBatch(true)}>
            + Entrada múltiple
          </Button>
          <Button onClick={() => setShowCreate(true)}>+ Movimiento simple</Button>
        </div>
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
      {showBatch  && <ModalCreateEntryBatch onClose={() => setShowBatch(false)} />}
      {showPendingApprovals && <ModalPendingApprovals onClose={() => setShowPendingApprovals(false)} />}
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
