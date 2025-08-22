import { useCallback } from "react";
import ExcelJS from "exceljs";

/**
 * Genera y descarga un Excel con TODAS las entregas (batches + detalle)
 */
export function useDeliveriesXlsx() {
  return useCallback(async () => {
    // 1) Cargar data desde el API existente
    const res = await fetch("/api/delivery-batches");
    if (!res.ok) throw new Error("No se pudo cargar las entregas");
    const batches: Array<{
      id: number;
      code: string;
      createdAt: string;
      note?: string | null;
      collaborator: { name: string; position?: string | null; location?: string | null };
      user: { name?: string | null; email: string };
      warehouse: { name: string };
      deliveries: Array<{ quantity: number; epp: { code: string; name: string } }>;
    }> = await res.json();

    const fmtDate = (d: string | Date) =>
      new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(typeof d === "string" ? new Date(d) : d);

    // 2) Crear workbook y hojas
    const wb = new ExcelJS.Workbook();
    wb.creator = "INV-EPP";
    wb.created = new Date();

    const wsBatches = wb.addWorksheet("Batches");
    const wsItems   = wb.addWorksheet("Items");

    // 3) Encabezados
    wsBatches.addRow([
      "Código",
      "Fecha",
      "Colaborador",
      "Sede",
      "Cargo",
      "Almacén",
      "Operador",
      "Código EPP",
      "Descripción EPP",
      "Cantidad",
      "Nota",
    ]);
    wsItems.addRow([
      "Código batch",
      "Fecha",
      "Colaborador",
      "Almacén",
      "Operador",
      "Código EPP",
      "Descripción EPP",
      "Cantidad",
    ]);

    // Estilos básicos header
    [wsBatches, wsItems].forEach((ws) => {
      const row = ws.getRow(1);
      row.font = { bold: true };
      row.alignment = { vertical: "middle", horizontal: "center" };
    });

    // 4) Poblar datos: una fila POR CADA producto entregado (repite info del batch)
    for (const b of batches) {
      for (let i = 0; i < b.deliveries.length; i++) {
        const d = b.deliveries[i];
        wsBatches.addRow([
          b.code,
          fmtDate(b.createdAt),
          b.collaborator.name,
          b.collaborator.location ?? "",
          b.collaborator.position ?? "",
          b.warehouse.name,
          b.user.name ?? b.user.email,
          d.epp.code,
          d.epp.name,
          d.quantity,
          i === 0 ? b.note ?? "" : "",
        ]);
      }

      // También mantenemos la hoja Items (detalle plano) por compatibilidad
      for (const d of b.deliveries) {
        wsItems.addRow([
          b.code,
          fmtDate(b.createdAt),
          b.collaborator.name,
          b.warehouse.name,
          b.user.name ?? b.user.email,
          d.epp.code,
          d.epp.name,
          d.quantity,
        ]);
      }
    }

    // 5) Auto width columnas
    const autoFit = (ws: ExcelJS.Worksheet) => {
      ws.columns?.forEach((c) => {
        const col = c as unknown as ExcelJS.Column;
        if (!col) return;
        let max = 10;
        col.eachCell({ includeEmpty: true }, (cell) => {
          const v = cell.value as string | number | Date | null;
          const len = v == null ? 0 : String(v).length;
          if (len > max) max = len;
        });
        col.width = Math.min(Math.max(max + 2, 10), 60);
      });
    };
    autoFit(wsBatches);
    autoFit(wsItems);

    // 6) Descargar archivo
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const when = new Date();
    const stamp = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}-${String(
      when.getDate()
    ).padStart(2, "0")}`;
    a.download = `entregas-${stamp}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, []);
}
