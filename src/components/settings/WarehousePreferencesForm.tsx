"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Warehouse, Loader2 } from "lucide-react";
import {
  updateMyWarehousePreferences,
  type WarehousePreferencesState,
} from "@/app/(protected)/settings/actions";

type WarehouseOption = { id: number; name: string };

type Props = {
  initialViewMode: "PRIMARY" | "ALL";
  primaryWarehouse: WarehouseOption | null;
  allowedWarehouses: WarehouseOption[];
  isAdmin: boolean;
  needsPrimary: boolean;
};

const initialState: WarehousePreferencesState = { ok: false };

export default function WarehousePreferencesForm({
  initialViewMode,
  primaryWarehouse,
  allowedWarehouses,
  isAdmin,
  needsPrimary,
}: Props) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updateMyWarehousePreferences,
    initialState,
  );
  const [viewMode, setViewMode] = useState<"PRIMARY" | "ALL">(
    needsPrimary ? "ALL" : initialViewMode,
  );
  const [primaryId, setPrimaryId] = useState<string>(
    primaryWarehouse ? String(primaryWarehouse.id) : "",
  );

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state.ok, router]);

  const primarySelectionMakesViewPossible = isAdmin
    ? primaryId !== ""
    : primaryWarehouse !== null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center">
          <Warehouse className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Mis preferencias de almacén
          </h2>
          <p className="text-sm text-gray-500">
            Esta preferencia solo afecta a tu usuario.
          </p>
        </div>
      </div>

      {needsPrimary && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            No tienes un almacén principal asignado. Pide a un administrador que
            lo configure en el módulo Usuarios.
          </span>
        </div>
      )}

      <form action={formAction} className="space-y-6">
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-gray-700">
            Almacenes que quieres ver en el sistema
          </legend>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
              viewMode === "PRIMARY"
                ? "border-emerald-400 bg-emerald-50"
                : "border-gray-200 hover:border-gray-300"
            } ${
              !primarySelectionMakesViewPossible
                ? "cursor-not-allowed opacity-60"
                : ""
            }`}
          >
            <input
              type="radio"
              name="viewMode"
              value="PRIMARY"
              checked={viewMode === "PRIMARY"}
              onChange={() => setViewMode("PRIMARY")}
              disabled={!primarySelectionMakesViewPossible}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-gray-900">
                Solo mi almacén principal
              </span>
              <span className="block text-xs text-gray-500">
                {primaryWarehouse
                  ? `Verás únicamente ${primaryWarehouse.name}.`
                  : "Selecciona un almacén principal para habilitar esta opción."}
              </span>
            </span>
          </label>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
              viewMode === "ALL"
                ? "border-emerald-400 bg-emerald-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="viewMode"
              value="ALL"
              checked={viewMode === "ALL"}
              onChange={() => setViewMode("ALL")}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-gray-900">
                Todos mis almacenes
              </span>
              <span className="block text-xs text-gray-500">
                {allowedWarehouses.length > 0
                  ? `Verás ${allowedWarehouses.length} almacén${
                      allowedWarehouses.length === 1 ? "" : "es"
                    }: ${allowedWarehouses.map((w) => w.name).join(", ")}.`
                  : "No tienes almacenes asignados."}
              </span>
            </span>
          </label>
        </fieldset>

        <div className="space-y-2">
          <label
            htmlFor="primaryWarehouseId"
            className="block text-sm font-medium text-gray-700"
          >
            Almacén principal
          </label>

          {isAdmin ? (
            <select
              id="primaryWarehouseId"
              name="primaryWarehouseId"
              value={primaryId}
              onChange={(event) => setPrimaryId(event.target.value)}
              disabled={isPending}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sin almacén principal</option>
              {allowedWarehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          ) : (
            <>
              <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                {primaryWarehouse ? primaryWarehouse.name : "Sin asignar"}
              </div>
              <p className="text-xs text-gray-500">
                Un administrador asigna tu almacén principal desde el módulo
                Usuarios.
              </p>
            </>
          )}
        </div>

        {state.error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {state.error}
          </div>
        )}

        {state.ok && (
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Preferencias guardadas
          </div>
        )}

        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
          <p className="text-sm text-gray-500">
            Los cambios se aplican solo a tu sesión.
          </p>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending ? "Guardando..." : "Guardar preferencias"}
          </button>
        </div>
      </form>
    </div>
  );
}
