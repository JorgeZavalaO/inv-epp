"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DeliveryBatchPreview {
  id: number;
  code: string;
  collaborator: {
    name: string;
    documentId: string | null;
    location: string;
    position: string | null;
  };
  warehouse: {
    name: string;
  };
  deliveries: Array<{
    id: number;
    createdAt: Date;
    quantity: number;
    epp: {
      code: string;
      name: string;
    };
  }>;
  notes?: string | null;
  operatorName?: string | null;
  createdAt: Date;
}

interface PreviewData {
  totalBatches: number;
  totalItems: number;
  batches: DeliveryBatchPreview[];
}

export function ExportAllDeliveriesButton({ searchParams = "" }: { searchParams?: string }) {
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  const openPreview = useCallback(async () => {
    setIsPreviewOpen(true);
    setIsLoadingPreview(true);

    try {
      const query = searchParams || (typeof window !== "undefined" ? window.location.search : "");
      const res = await fetch(`/api/deliveries/preview${query}`);

      if (!res.ok) {
        throw new Error("No se pudo cargar la vista previa");
      }

      const data = await res.json();
      setPreview(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al cargar la vista previa"
      );
      setIsPreviewOpen(false);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [searchParams]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);

    try {
      const query = searchParams || (typeof window !== "undefined" ? window.location.search : "");
      const res = await fetch(`/api/deliveries/export${query}`);

      if (!res.ok) {
        throw new Error("No se pudo generar el Excel de entregas");
      }

      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `entregas-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      console.log(
        `[Export All Deliveries] Exportación completada: ${preview?.totalBatches} lotes, ${preview?.totalItems} artículos`
      );
      toast.success("Excel exportado correctamente");
      setIsPreviewOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al exportar"
      );
    } finally {
      setIsExporting(false);
    }
  }, [searchParams, preview]);

  return (
    <>
      <Button 
        variant="secondary" 
        onClick={openPreview}
        disabled={isExporting || isLoadingPreview}
        aria-label="Exportar todas las entregas a Excel"
      >
        <FileSpreadsheet className="w-4 h-4 mr-2" />
        {isLoadingPreview ? "Preparando..." : "Exportar Excel"}
      </Button>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Vista previa de exportación</DialogTitle>
          </DialogHeader>

          {isLoadingPreview ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Cargando datos...</span>
            </div>
          ) : preview ? (
            <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
              <div className="space-y-6">
                {/* Resumen General */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Resumen de exportación</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total de lotes</p>
                      <p className="text-lg font-semibold">{preview.totalBatches}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total de artículos</p>
                      <p className="text-lg font-semibold">{preview.totalItems}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Detalle por lote */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Lotes a exportar</h3>

                  {preview.batches.map((batch) => (
                    <div key={batch.id} className="space-y-3 p-3 bg-muted/50 rounded-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm">{batch.code}</p>
                          <p className="text-sm text-muted-foreground">{batch.warehouse.name}</p>
                        </div>
                        <span className="text-xs bg-secondary px-2 py-1 rounded">
                          {batch.deliveries.length} artículos
                        </span>
                      </div>

                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Colaborador:</span>
                          <span className="font-medium">{batch.collaborator.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">DNI:</span>
                          <span className="font-mono font-semibold">
                            {batch.collaborator.documentId || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Localidad:</span>
                          <span>{batch.collaborator.location}</span>
                        </div>
                      </div>

                      {batch.deliveries.length > 0 && (
                        <div className="mt-2 space-y-1 text-xs">
                          <p className="text-muted-foreground font-semibold">Artículos:</p>
                          {batch.deliveries.slice(0, 3).map((item) => (
                            <div
                              key={item.id}
                              className="flex justify-between text-muted-foreground"
                            >
                              <span>{item.epp.name}</span>
                              <span>x{item.quantity}</span>
                            </div>
                          ))}
                          {batch.deliveries.length > 3 && (
                            <p className="text-muted-foreground italic">
                              +{batch.deliveries.length - 3} artículos más...
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <Separator />

                <p className="text-xs text-muted-foreground italic">
                  El DNI mostrado es el del colaborador que recibirá cada lote.
                </p>
              </div>
            </ScrollArea>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPreviewOpen(false)}
              disabled={isExporting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting || isLoadingPreview || !preview}
              className="gap-2"
            >
              {isExporting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isExporting ? "Exportando..." : "Exportar Excel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
