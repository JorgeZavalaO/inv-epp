import { useCallback } from "react";
import ExcelJS from "exceljs";

/**
 * Descarga plantilla + datos y dispara la descarga del XLSX
 * @param batchId ID del DeliveryBatch
 */
export function useDeliveryBatchXlsx(batchId: number) {
  return useCallback(async () => {
    try {
      /* 1 ▸ Cargar datos (JSON) ------------------------------------------------ */
      const resData = await fetch(`/api/delivery-batches/${batchId}`);
      if (!resData.ok) {
        throw new Error(`Error al cargar datos: ${resData.statusText}`);
      }
      const batch = await resData.json();

      if (!batch || !batch.code) {
        throw new Error("Datos de entrega inválidos o incompletos");
      }

      /* 2 ▸ Cargar plantilla (ArrayBuffer) ------------------------------------ */
      const tpl = await fetch("/templates/REGISTRO DE ENTREGA EPP REV3 2025.xlsx");
      if (!tpl.ok) {
        throw new Error("No se pudo cargar la plantilla de Excel");
      }
      const tplBuffer = await tpl.arrayBuffer();

      /* 3 ▸ Rellenar con exceljs en cliente ----------------------------------- */
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(tplBuffer);

      const ws      = wb.worksheets[0];
      if (!ws) {
        throw new Error("La plantilla no contiene hojas válidas");
      }

      const fmtDate = (d: string) =>
        new Intl.DateTimeFormat("es-PE", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        }).format(new Date(d));

      /* Cabecera */
      console.group("[Export Excel] Construcción de entrega");
      console.log("Batch:", { code: batch.code, createdAt: batch.createdAt });
      ws.getCell("AH1").value  = batch.code;
      ws.getCell("AH2").value = fmtDate(batch.createdAt);

      /* Colaborador */
      console.log("Colaborador:", {
        documentId: batch.collaborator?.documentId,
        name: batch.collaborator?.name,
        location: batch.collaborator?.location,
        position: batch.collaborator?.position,
      });
      ws.getCell("A10").value = batch.collaborator?.documentId ?? "";
      ws.getCell("B10").value = batch.collaborator?.name ?? "";
      ws.getCell("K10").value = batch.collaborator?.location ?? "";
      ws.getCell("AE10").value = batch.collaborator?.position  ?? "";

      /* Operador */
      ws.getCell("B32").value = batch.user?.name ?? batch.user?.email ?? "";
      ws.getCell("U32").value = "Operador";

      /* Buscar fila-encabezado */
      let headerRow = ws.getRow(1);
      ws.eachRow((r) => {
        let hasHeader = false;
        r.eachCell((c) => {
          const text = String(c.text ?? c.value ?? "").trim().toLowerCase();
          if (text.includes("dni") || text.includes("fecha de entrega")) {
            hasHeader = true;
          }
        });
        if (hasHeader) headerRow = r;
      });

      const colMap = new Map<string, number>();
      headerRow.eachCell((c, col) => {
        const key = String(c.text ?? c.value ?? "").trim().toLowerCase();
        if (key) colMap.set(key, col);
      });
      console.log("Header row:", headerRow.number);
      console.log("Column map:", Object.fromEntries(colMap));

      let rowNum = headerRow.number + 1;
      // Usar columnas fijas según la plantilla: A-H
      const DNI_COL = 1;           // A
      const EMPLOYEE_COL = 2;      // B
      const LOCATION_COL = 3;      // C
      const DATE_COL = 4;          // D
      const LOTE_COL = 5;          // E
      const DESC_COL = 6;          // F
      const QTY_COL = 7;           // G
      const OBS_COL = 8;           // H
      type Delivery = {
        epp: {
          code: string;
          name: string;
        };
        quantity: number;
        createdAt: string;
      };

      const startRow = headerRow.number + 1;
      let lastWrittenRow = startRow - 1;

      if (batch.deliveries && Array.isArray(batch.deliveries)) {
        (batch.deliveries as Delivery[]).forEach((d) => {
          const row = ws.getRow(rowNum);
          const docId = batch.collaborator?.documentId ?? "";
          const beforeA = row.getCell(DNI_COL).value;
          // Escribir columnas fijas A-H
          row.getCell(DNI_COL).value      = docId;
          const empleado                 = batch.collaborator?.name ?? "";
          const localidad                = batch.collaborator?.location ?? "";
          const formattedDate            = fmtDate(d.createdAt ?? batch.createdAt);
          row.getCell(EMPLOYEE_COL).value = empleado;
          row.getCell(LOCATION_COL).value = localidad;
          row.getCell(DATE_COL).value     = formattedDate;
          row.getCell(LOTE_COL).value     = batch.code;
          const descripcion               = `${d.epp.name} (${d.epp.code})`;
          row.getCell(DESC_COL).value     = descripcion;
          row.getCell(QTY_COL).value      = d.quantity;
          const observaciones             = batch.note ?? "";
          row.getCell(OBS_COL).value      = observaciones;
          const afterA = row.getCell(DNI_COL).value;
          if (beforeA !== afterA) {
            console.log(`Fila ${rowNum}: A antes=`, beforeA, "→ A después=", afterA);
          }
          console.log(`Fila ${rowNum} escrita`, {
            dni: docId,
            empleado,
            localidad,
            fecha: formattedDate,
            lote: batch.code,
            descripcion,
            cantidad: d.quantity,
            observaciones,
          });
          row.commit();
          rowNum += 1;
          lastWrittenRow = rowNum - 1;
        });
      }

      /* 4 ▸ Generar archivo Blob y descargar ------------------------------- */
      const arrayBuf = await wb.xlsx.writeBuffer();
      const blob     = new Blob([arrayBuf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href        = url;
      a.download    = `${batch.code}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (lastWrittenRow >= startRow) {
        const firstDni = ws.getCell(`A${startRow}`).value;
        const lastDni  = ws.getCell(`A${lastWrittenRow}`).value;
        console.log("Resumen DNI columna A:", {
          primeraFila: startRow,
          ultimaFila: lastWrittenRow,
          dniPrimera: firstDni,
          dniUltima: lastDni,
        });
      } else {
        console.log("Resumen DNI columna A: sin filas escritas");
      }
      console.groupEnd();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error desconocido al exportar";
      throw new Error(msg);
    }
  }, [batchId]);
}
