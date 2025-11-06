"use client";

import { useState, useEffect } from "react";
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
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectingMovement, setRejectingMovement] = useState<number | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");

  useEffect(() => {
    loadPendingMovements();
  }, []);

  const loadPendingMovements = async () => {
    try {
      setIsLoading(true);
      const data = await getPendingMovements();
      setMovements(data as PendingMovement[]);
    } catch (error) {
      toast.error("Error al cargar movimientos pendientes");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (movementId: number) => {
    setProcessingId(movementId);
    try {
      const result = await approveMovement(movementId);
      toast.success(result.message);
      await loadPendingMovements();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al aprobar");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (movementId: number) => {
    if (!rejectionNote.trim()) {
      toast.error("Debes proporcionar una razón para el rechazo");
      return;
    }

    setProcessingId(movementId);
    try {
      const result = await rejectMovement(movementId, rejectionNote);
      toast.success(result.message);
      setRejectingMovement(null);
      setRejectionNote("");
      await loadPendingMovements();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al rechazar");
    } finally {
      setProcessingId(null);
    }
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
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Movimientos Pendientes de Aprobación
            </DialogTitle>
            <DialogDescription>
              Revisa y aprueba o rechaza los movimientos de stock solicitados por otros usuarios
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
              <Table>
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
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleApprove(movement.id)}
                            disabled={processingId !== null}
                          >
                            {processingId === movement.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Aprobar
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setRejectingMovement(movement.id)}
                            disabled={processingId !== null}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rechazar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de rechazo */}
      {rejectingMovement && (
        <Dialog open={!!rejectingMovement} onOpenChange={() => setRejectingMovement(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Rechazar Movimiento
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
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRejectingMovement(null);
                  setRejectionNote("");
                }}
                disabled={processingId !== null}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => rejectingMovement && handleReject(rejectingMovement)}
                disabled={!rejectionNote.trim() || processingId !== null}
              >
                {processingId === rejectingMovement ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Rechazando...
                  </>
                ) : (
                  "Confirmar Rechazo"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
