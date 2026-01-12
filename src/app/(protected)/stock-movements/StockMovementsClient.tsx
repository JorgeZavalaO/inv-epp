"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Clock, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

import MovementTable, { Row as MovementRow } from "@/components/stock/MovementTable";
import ModalCreateMovement from "@/components/stock/ModalCreateMovement";
import ModalEditMovement from "@/components/stock/ModalEditMovement";
import ModalDeleteMovement from "@/components/stock/ModalDeleteMovement";
import ModalCreateEntryBatch from "@/components/stock/ModalCreateEntryBatch";
import ModalPendingApprovals from "@/components/stock/ModalPendingApprovals";
import { useStockMovementsExcelXlsx } from "@/lib/client-excel/useStockMovementsExcel";

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
  
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set("query", term);
    } else {
      params.delete("query");
    }
    params.set("page", "1");
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  /* control de modales */
  const [showCreate, setShowCreate] = useState(false);
  const [showBatch,  setShowBatch]  = useState(false);
  const [showPendingApprovals, setShowPendingApprovals] = useState(false);
  const [editing, setEditing] = useState<MovementRow | null>(null);
  const [deleting, setDeleting] = useState<MovementRow | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportMovements = useStockMovementsExcelXlsx();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      toast.loading("Generando Excel...");
      await exportMovements();
      toast.dismiss();
      toast.success("Excel descargado correctamente");
    } catch (error) {
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : "Error al exportar");
    } finally {
      setIsExporting(false);
    }
  };

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
        <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto..."
              className="pl-8"
              defaultValue={searchParams.get("query")?.toString()}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
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
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={isExporting}
            onClick={handleExport}
          >
            {isExporting && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
            {isExporting ? "Exportando..." : "📊 Exportar Excel"}
          </Button>
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
          <Link href={createPageURL(page - 1)}>
            <Button variant="outline">&larr; Anterior</Button>
          </Link>
        ) : (
          <div />
        )}
        {hasNext && (
          <Link href={createPageURL(page + 1)}>
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
