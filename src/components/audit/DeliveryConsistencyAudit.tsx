"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Issue {
  type: string;
  severity: string;
  deliveryId?: number;
  movementId?: number;
  movementIds?: number[];
  batchCode: string;
  eppCode: string;
  eppName: string;
  deliveryQty?: number;
  movementQty?: number;
  difference?: number;
  movements?: Array<{ id: number; quantity: number; createdAt: string; status: string }>;
  quantity?: number;
  warehouseId?: number;
  warehouse?: string;
  createdAt: string;
  status?: string;
  batchId?: number;
  eppId?: number;
  cause?: string;
  impact?: string;
  daysSinceCreation?: number;
}

export default function DeliveryConsistencyAudit() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fixing, setFixing] = useState(false);
  const [newQuantity, setNewQuantity] = useState<string>("");
  const [fixAction, setFixAction] = useState<"delete" | "update" | "create" | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/audit/delivery-consistency");
      const data = await res.json();

      if (data.issues) {
        setIssues(data.issues);
        setSelectedIndex(0);
      }
    } catch {
      toast.error("Error al cargar inconsistencias");
    } finally {
      setLoading(false);
    }
  };

  const currentIssue = issues[selectedIndex];

  const handleFix = async () => {
    if (!currentIssue) return;

    try {
      setFixing(true);

      const payload: {
        type: string;
        action?: string;
        movementIds?: number[];
        deliveryId?: number;
        newQuantity?: number;
        eppId?: number;
        batchId?: number;
      } = {
        type: currentIssue.type,
      };

      if (fixAction === "delete") {
        payload.action = "DELETE_MOVEMENT";
        // Para ORPHAN_MOVEMENT, viene movementId singular
        // Para QUANTITY_MISMATCH, viene movementIds plural
        if (currentIssue.movementId) {
          payload.movementIds = [currentIssue.movementId];
        } else if (currentIssue.movementIds) {
          payload.movementIds = currentIssue.movementIds;
        } else {
          toast.error("No hay movimiento para eliminar");
          return;
        }
      } else if (fixAction === "update" && currentIssue.deliveryId && newQuantity) {
        payload.action = "UPDATE_DELIVERY";
        payload.deliveryId = currentIssue.deliveryId;
        payload.newQuantity = parseInt(newQuantity);
      } else if (fixAction === "create" && currentIssue.eppId && currentIssue.batchId) {
        payload.action = "CREATE_MOVEMENT";
        payload.eppId = currentIssue.eppId;
        payload.batchId = currentIssue.batchId;
        payload.newQuantity = currentIssue.deliveryQty || 0;
      } else {
        toast.error("Selecciona una acción válida o completa los datos requeridos");
        return;
      }

      const res = await fetch("/api/audit/delivery-consistency/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success(result.message);
        setShowConfirm(false);

        // Remover el issue corregido y cargar nuevamente
        const newIssues = issues.filter((_, i) => i !== selectedIndex);
        setIssues(newIssues);
        setSelectedIndex(Math.min(selectedIndex, newIssues.length - 1));
        setNewQuantity("");
        setFixAction(null);

        // Recargar después de 1 segundo
        setTimeout(fetchIssues, 1000);
      } else {
        toast.error(result.error || "Error al corregir");
      }
    } catch (error) {
      console.error("Error al aplicar corrección:", error);
      toast.error("Error al aplicar corrección: " + (error instanceof Error ? error.message : "Desconocido"));
    } finally {
      setFixing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando inconsistencias...</div>
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="space-y-6 px-4 md:px-8 py-6">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-green-900">✅ Sin inconsistencias</p>
              <p className="text-green-700">Todas las entregas y movimientos están sincronizados</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const critical = issues.filter(i => i.severity === "CRITICAL").length;
  const warnings = issues.filter(i => i.severity === "WARNING").length;

  return (
    <div className="space-y-6 px-4 md:px-8 py-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Auditoría de Entregas</h1>
        <p className="text-gray-600">
          {issues.length} inconsistencia(s): {critical} crítica(s), {warnings} advertencia(s)
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{issues.length}</p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-700">{critical}</p>
              <p className="text-sm text-gray-600">Crítica</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">{warnings}</p>
              <p className="text-sm text-gray-600">Advertencia</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Lista lateral */}
        <div className="md:col-span-1 space-y-2 max-h-[600px] overflow-y-auto">
          {issues.map((issue, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelectedIndex(idx);
                setNewQuantity("");
                setFixAction(null);
              }}
              className={`w-full text-left p-3 rounded-lg border transition ${
                idx === selectedIndex
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{issue.batchCode}</p>
                  <p className="text-xs text-gray-600 truncate">{issue.eppCode}</p>
                </div>
                <Badge
                  variant={issue.severity === "CRITICAL" ? "destructive" : "secondary"}
                  className="flex-shrink-0"
                >
                  {issue.severity === "CRITICAL" ? "🔴" : "🟡"}
                </Badge>
              </div>
            </button>
          ))}
        </div>

        {/* Detalle */}
        {currentIssue && (
          <div className="md:col-span-2">
            <Card className="sticky top-6">
              <CardHeader>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {currentIssue.type === "QUANTITY_MISMATCH"
                        ? "❌ Discrepancia de Cantidad"
                        : currentIssue.type === "MISSING_MOVEMENT"
                        ? "❌ Movimiento Faltante"
                        : "⚠️ Movimiento Huérfano"}
                    </CardTitle>
                    <Badge variant={currentIssue.severity === "CRITICAL" ? "destructive" : "secondary"}>
                      {currentIssue.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    {selectedIndex + 1} de {issues.length}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Info General */}
                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-600">Lote</p>
                    <p className="font-mono font-bold">{currentIssue.batchCode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">EPP</p>
                    <p className="font-mono font-bold">{currentIssue.eppCode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Descripción</p>
                    <p className="text-sm">{currentIssue.eppName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Almacén</p>
                    <p className="text-sm">{currentIssue.warehouse || "Almacén"}</p>
                  </div>
                </div>

                {/* Causa e Impacto */}
                {(currentIssue.cause || currentIssue.impact) && (
                  <div className="space-y-3 border-l-4 border-blue-400 pl-3 py-2 bg-blue-50 rounded">
                    {currentIssue.cause && (
                      <div>
                        <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">¿Por qué sucedió?</p>
                        <p className="text-sm text-blue-800 mt-1">{currentIssue.cause}</p>
                      </div>
                    )}
                    {currentIssue.impact && (
                      <div>
                        <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">Impacto en Inventario</p>
                        <p className="text-sm text-blue-800 mt-1">{currentIssue.impact}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tipo 1: Discrepancia de Cantidad */}
                {currentIssue.type === "QUANTITY_MISMATCH" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 p-3 bg-red-50 rounded-lg border border-red-200">
                      <div>
                        <p className="text-xs text-red-600">En Entrega</p>
                        <p className="text-2xl font-bold text-red-700">{currentIssue.deliveryQty}</p>
                        <p className="text-xs text-red-600">unidades</p>
                      </div>
                      <div>
                        <p className="text-xs text-red-600">En Movimientos</p>
                        <p className="text-2xl font-bold text-red-700">{currentIssue.movementQty}</p>
                        <p className="text-xs text-red-600">unidades</p>
                      </div>
                    </div>

                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm font-semibold text-yellow-900">Diferencia:</p>
                      <p className="text-lg font-bold text-yellow-700">
                        {currentIssue.difference! > 0 ? "+" : ""}{currentIssue.difference}
                      </p>
                    </div>

                    {currentIssue.movements && currentIssue.movements.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">Movimientos Asociados:</p>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {currentIssue.movements.map(m => (
                            <div
                              key={m.id}
                              className="p-2 bg-gray-100 rounded text-xs font-mono flex justify-between"
                            >
                              <span>
                                ID #{m.id}: {m.quantity} un. [{m.status}]
                              </span>
                              <span className="text-gray-600">
                                {new Date(m.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Opciones de corrección */}
                    <div className="space-y-3 border-t pt-4">
                      <p className="text-sm font-semibold">¿Cómo deseas corregir?</p>

                      {/* Opción 1: Mantener movimientos, actualizar entrega */}
                      <button
                        onClick={() => setFixAction("update")}
                        className={`w-full p-3 text-left rounded-lg border-2 transition ${
                          fixAction === "update"
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <p className="font-medium text-sm">Opción 1: Actualizar Entrega</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Cambiar la entrega a {currentIssue.movementQty} unidades
                        </p>
                      </button>

                      {/* Opción 2: Eliminar movimientos extra */}
                      <button
                        onClick={() => setFixAction("delete")}
                        className={`w-full p-3 text-left rounded-lg border-2 transition ${
                          fixAction === "delete"
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <p className="font-medium text-sm">Opción 2: Eliminar Movimientos Extra</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Mantener entrega en {currentIssue.deliveryQty} y eliminar excedentes
                        </p>
                      </button>

                      {fixAction === "update" && (
                        <div className="space-y-2 p-3 bg-blue-50 rounded-lg">
                          <Label htmlFor="new-qty">Nueva cantidad para la entrega:</Label>
                          <Input
                            id="new-qty"
                            type="number"
                            value={newQuantity}
                            onChange={e => setNewQuantity(e.target.value)}
                            placeholder={String(currentIssue.movementQty)}
                            className="font-mono"
                          />
                          <p className="text-xs text-gray-600">
                            Actual: {currentIssue.deliveryQty} → Nueva: {newQuantity || "?"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tipo 2: Movimiento Faltante */}
                {currentIssue.type === "MISSING_MOVEMENT" && (
                  <div className="space-y-4">
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-sm font-semibold text-red-900">La entrega existe pero NO tiene movimiento</p>
                      <p className="text-lg font-bold text-red-700 mt-2">{currentIssue.deliveryQty} unidades</p>
                    </div>

                    <button
                      onClick={() => setFixAction("create")}
                      className={`w-full p-3 text-left rounded-lg border-2 transition ${
                        fixAction === "create"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <p className="font-medium text-sm">Crear Movimiento de Salida</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Crear movimiento de {currentIssue.deliveryQty} unidades
                      </p>
                    </button>
                  </div>
                )}

                {/* Tipo 3: Movimiento Huérfano */}
                {currentIssue.type === "ORPHAN_MOVEMENT" && (
                  <div className="space-y-4">
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm font-semibold text-yellow-900">
                        Hay un movimiento sin entrega correspondiente
                      </p>
                      <p className="text-lg font-bold text-yellow-700 mt-2">{currentIssue.quantity} unidades</p>
                      <p className="text-xs text-yellow-700 mt-2">
                        Creado por: {currentIssue.createdAt}
                      </p>
                    </div>

                    <button
                      onClick={() => setFixAction("delete")}
                      className={`w-full p-3 text-left rounded-lg border-2 transition ${
                        fixAction === "delete"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <p className="font-medium text-sm">Eliminar Movimiento</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Revertir stock y eliminar el movimiento huérfano
                      </p>
                    </button>
                  </div>
                )}

                {/* Botones de navegación */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setSelectedIndex(Math.max(0, selectedIndex - 1))
                    }
                    disabled={selectedIndex === 0}
                    className="flex-1"
                  >
                    ← Anterior
                  </Button>

                  {fixAction && (
                    <>
                      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                        <button
                          onClick={() => setShowConfirm(true)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 font-medium transition"
                        >
                          ✓ Aplicar Corrección
                        </button>

                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar corrección</AlertDialogTitle>
                            <AlertDialogDescription>
                              {fixAction === "delete" &&
                                "Se eliminará el/los movimiento(s) y se revertirá el stock"}
                              {fixAction === "update" &&
                                `Se actualizará la entrega a ${newQuantity} unidades`}
                              {fixAction === "create" &&
                                `Se creará un movimiento de ${currentIssue.deliveryQty} unidades`}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleFix}
                              disabled={fixing}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {fixing ? "Procesando..." : "Confirmar"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}

                  <Button
                    variant="outline"
                    onClick={() =>
                      setSelectedIndex(Math.min(issues.length - 1, selectedIndex + 1))
                    }
                    disabled={selectedIndex === issues.length - 1}
                    className="flex-1"
                  >
                    Siguiente →
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
