"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  CheckCircle2, 
  XCircle, 
  Clock,
  User,
  Package,
  Warehouse,
  Loader2,
  AlertCircle
} from "lucide-react";
import { formatDateLima } from "@/lib/formatDate";
import { getPendingMovements, approveMovement, rejectMovement } from "@/app/(protected)/stock-movements/actions";
import SmartPagination from "@/components/delivery/SmartPagination";
import PageSizeSelector from "@/components/delivery/PageSizeSelector";

type PendingMovement = {
  id: number;
  type: string;
  quantity: number;
  note: string | null;
  createdAt: Date;
  epp: {
    name: string;
    code: string;
  };
  warehouse: {
    name: string;
  };
  user: {
    name: string | null;
    email: string;
    role: string;
  };
};

type Props = {
  onClose: () => void;
};

export default function ModalPendingApprovals({ onClose }: Props) {
  const router = useRouter();
  const [movements, setMovements] = useState<PendingMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectingMovement, setRejectingMovement] = useState<number | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [rejectionError, setRejectionError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null>(null);

  const loadPendingMovements = useCallback(async (page = currentPage, limit = pageSize) => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const result = await getPendingMovements({ page, pageSize: limit });
      setMovements(result.movements as PendingMovement[]);
      setPagination(result.pagination);
      setCurrentPage(result.pagination.page);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Error al cargar movimientos pendientes");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    loadPendingMovements();
  }, [loadPendingMovements]);

  const handleApprove = async (movementId: number) => {
    setActionError(null);
    setProcessingId(movementId);
    try {
      const result = await approveMovement(movementId);
      toast.success(result.message);
      await loadPendingMovements(currentPage, pageSize);
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Error al aprobar");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (movementId: number) => {
    if (!rejectionNote.trim()) {
      setRejectionError("Debes proporcionar una razón para el rechazo");
      return;
    }

    setRejectionError(null);
    setActionError(null);
    setProcessingId(movementId);
    try {
      const result = await rejectMovement(movementId, rejectionNote);
      toast.success(result.message);
      setRejectingMovement(null);
      setRejectionNote("");
      setRejectionError(null);
      await loadPendingMovements(currentPage, pageSize);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al rechazar";
      setRejectionError(message);
      setActionError(message);
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectionDialog = (movementId: number) => {
    setRejectingMovement(movementId);
    setRejectionNote("");
    setRejectionError(null);
  };

  const closeRejectionDialog = () => {
    if (processingId !== null) return;
    setRejectingMovement(null);
    setRejectionNote("");
    setRejectionError(null);
  };

  const typeLabels: Record<string, string> = {
    ENTRY: "Entrada",
    EXIT: "Salida",
    ADJUSTMENT: "Ajuste",
    TRANSFER_IN: "Transferencia Entrada",
    TRANSFER_OUT: "Transferencia Salida",
  };

  const typeColors: Record<string, string> = {
    ENTRY: "bg-green-100 text-green-800",
    EXIT: "bg-red-100 text-red-800",
    ADJUSTMENT: "bg-blue-100 text-blue-800",
    TRANSFER_IN: "bg-purple-100 text-purple-800",
    TRANSFER_OUT: "bg-orange-100 text-orange-800",
  };

  const roleLabels: Record<string, string> = {
    ADMIN: "Administrador",
    SUPERVISOR: "Supervisor",
    WAREHOUSE_MANAGER: "Gerente de Almacén",
    OPERATOR: "Operador",
    VIEWER: "Visualizador",
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open && processingId === null) onClose(); }}>
        <DialogContent className="flex max-h-[90vh] max-w-[calc(100%-2rem)] flex-col overflow-hidden sm:max-w-7xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Movimientos pendientes de aprobación
            </DialogTitle>
            <DialogDescription>
              Revisa y aprueba o rechaza los movimientos de stock solicitados por otros usuarios.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
             {loadError && !isLoading && (
               <div className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800" role="alert">
                 <span>{loadError}</span>
                 <Button type="button" variant="outline" size="sm" onClick={() => loadPendingMovements()} className="min-h-11 shrink-0">Reintentar</Button>
               </div>
             )}
             {actionError && (
               <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800" role="alert">
                 {actionError}
               </div>
             )}
             {isLoading ? (
               <div className="flex items-center justify-center py-12">
                 <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                 <span className="ml-2 text-sm text-muted-foreground">Cargando movimientos pendientes...</span>
               </div>
            ) : movements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <p className="text-lg font-medium">No hay movimientos pendientes</p>
                <p className="text-sm text-muted-foreground">
                  Todos los movimientos han sido procesados
                </p>
              </div>
            ) : (
              <>
                {pagination && (
                  <div className="flex justify-between items-center mb-4">
                     <span className="text-sm text-muted-foreground">
                       Mostrando {movements.length === 0 ? 0 : ((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.totalCount)} de {pagination.totalCount} movimientos
                    </span>
                    <PageSizeSelector
                      pageSize={pagination.limit}
                      onPageSizeChange={(size) => {
                        setPageSize(size);
                        setCurrentPage(1);
                        loadPendingMovements(1, size);
                      }}
                      totalCount={pagination.totalCount}
                    />
                  </div>
                )}
                <div className="overflow-x-auto">
                <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>EPP</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Almacén</TableHead>
                    <TableHead>Solicitado por</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{movement.epp.name}</div>
                            <div className="text-xs text-muted-foreground">{movement.epp.code}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={typeColors[movement.type] || ""}>
                          {typeLabels[movement.type] || movement.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{movement.quantity}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Warehouse className="h-4 w-4 text-muted-foreground" />
                          {movement.warehouse.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm">{movement.user.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {roleLabels[movement.user.role] || movement.user.role}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateLima(movement.createdAt)}
                      </TableCell>
                      <TableCell>
                        {movement.note ? (
                          <span className="text-sm">{movement.note}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sin nota</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                             onClick={() => handleApprove(movement.id)}
                             disabled={processingId !== null}
                             aria-busy={processingId === movement.id}
                             aria-label={`Aprobar movimiento de ${movement.epp.name}`}
                             className="min-h-11 text-green-600 hover:bg-green-50 hover:text-green-700"
                          >
                            {processingId === movement.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                 <CheckCircle2 className="mr-1 h-4 w-4" aria-hidden="true" />
                                  Aprobar
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                             onClick={() => openRejectionDialog(movement.id)}
                             disabled={processingId !== null}
                             aria-label={`Rechazar movimiento de ${movement.epp.name}`}
                             className="min-h-11 text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                             <XCircle className="mr-1 h-4 w-4" aria-hidden="true" />
                            Rechazar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
                </div>
                {pagination && pagination.totalPages > 1 && (
                  <div className="mt-4">
                    <SmartPagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      onPageChange={(page) => {
                        setCurrentPage(page);
                        loadPendingMovements(page, pageSize);
                      }}
                      hasNext={pagination.hasNext}
                      hasPrev={pagination.hasPrev}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
             <Button variant="outline" onClick={onClose} disabled={processingId !== null} className="min-h-11">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de rechazo */}
      {rejectingMovement && (
          <Dialog open={!!rejectingMovement} onOpenChange={(open) => { if (!open) closeRejectionDialog(); }}>
           <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                 Rechazar movimiento
              </DialogTitle>
              <DialogDescription>
                Proporciona una razón por la cual estás rechazando este movimiento
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rejection-note">Motivo del rechazo *</Label>
              <Textarea
                id="rejection-note"
                  placeholder="Ej: Stock insuficiente, EPP incorrecto, etc."
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  rows={4}
                  aria-invalid={Boolean(rejectionError)}
                  aria-describedby={rejectionError ? "rejection-note-error" : undefined}
                  disabled={processingId !== null}
                />
                {rejectionError && <p id="rejection-note-error" className="text-sm text-destructive" role="alert">{rejectionError}</p>}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                 onClick={closeRejectionDialog}
                 disabled={processingId !== null}
                 className="min-h-11"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => rejectingMovement && handleReject(rejectingMovement)}
                disabled={!rejectionNote.trim() || processingId !== null}
                aria-busy={processingId === rejectingMovement}
                className="min-h-11"
              >
                {processingId === rejectingMovement ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Rechazando movimiento...
                  </>
                ) : (
                  rejectionError ? "Reintentar rechazo" : "Confirmar rechazo"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
