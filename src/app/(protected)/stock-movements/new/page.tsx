"use client";

import { useSearchParams } from "next/navigation";
import StockMovementForm from "@/components/stock/StockMovementForm";

export default function NewMovementPage() {
  const params = useSearchParams();
  const defaultEppId = params.get("eppId") ? Number(params.get("eppId")) : undefined;

  return (
    <section className="space-y-8 px-4 md:px-8 py-6">
      <header className="border-b pb-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          Registrar Movimiento de Stock
        </h1>
        <p className="mt-2 text-base text-muted-foreground max-w-xl">
          Completa los detalles del movimiento y registra entradas o salidas de inventario.
        </p>
      </header>

      <div className="max-w-2xl mx-auto">
        <StockMovementForm defaultEppId={defaultEppId} />
      </div>
    </section>
  );
}
