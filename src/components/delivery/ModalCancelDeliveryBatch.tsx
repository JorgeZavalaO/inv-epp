"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTransition, useState } from "react";
import { cancelDeliveryBatch } from "@/app/(protected)/deliveries/actions";
import { toast } from "sonner";

export default function ModalCancelDeliveryBatch({
  open,
  onOpenChange,
  batch,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: { id: number; code: string };
  onConfirm: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");

  const handleCancel = () => {
    if (!reason.trim()) {
      toast.error("Debe proporcionar una razón para la anulación");
      return;
    }
    
    startTransition(async () => {
      try {
        await cancelDeliveryBatch(batch.id, reason);
        
        // Pequeño delay para asegurar que la BD está actualizada
        await new Promise(resolve => setTimeout(resolve, 500));
        
        toast.success(`Entrega ${batch.code} anulada correctamente`);
        setReason("");
        onConfirm();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error al anular la entrega";
        toast.error(errorMessage);
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Anular entrega {batch.code}?</AlertDialogTitle>
        </AlertDialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Al anular esta entrega:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
              <li>El stock regresará automáticamente al almacén</li>
              <li>Se generará una devolución automática vinculada</li>
              <li>La entrega quedará marcada como <span className="font-semibold text-destructive">ANULADA</span></li>
              <li>Esta acción NO se puede deshacer</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cancellation-reason" className="text-sm font-medium">
              Razón de la anulación <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cancellation-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Error en el registro, EPP entregado por error, duplicado..."
              className="resize-none"
              rows={3}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Esta información quedará registrada en el detalle de la devolución
            </p>
          </div>
        </div>
        
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={isPending} className="sm:flex-1">
              Cancelar
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              onClick={handleCancel}
              disabled={isPending || !reason.trim()}
              variant="destructive"
              className="sm:flex-1"
            >
              {isPending ? "Anulando..." : "Anular Entrega"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
