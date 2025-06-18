import { useCallback } from "react";
import ExcelJS from "exceljs";

/**
 * Descarga plantilla + datos y dispara la descarga del XLSX
 * @param batchId ID del DeliveryBatch
 */
export function useDeliveryBatchXlsx(batchId: number) {
  return useCallback(async () => {
    /* 1 ▸ Cargar datos (JSON) ------------------------------------------------ */
    const resData = await fetch(`/api/delivery-batches/${batchId}`);
    if (!resData.ok) throw new Error("No se pudo cargar los datos");
    const batch = await resData.json();

    /* 2 ▸ Cargar plantilla (ArrayBuffer) ------------------------------------ */
    const tpl = await fetch("/templates/REGISTRO DE ENTREGA EPP REV3 2025.xlsx");
    const tplBuffer = await tpl.arrayBuffer();

    /* 3 ▸ Rellenar con exceljs en cliente ----------------------------------- */
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(tplBuffer);

    const ws      = wb.worksheets[0];
    const fmtDate = (d: string) =>
      new Intl.DateTimeFormat("es-PE", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      }).format(new Date(d));

    /* Cabecera */
    ws.getCell("AH1").value  = batch.code;
    ws.getCell("AH2").value = fmtDate(batch.createdAt);

    /* Colaborador */
    ws.getCell("B10").value = batch.collaborator.name;
    ws.getCell("K10").value = batch.collaborator.location ?? "";
    ws.getCell("AE10").value = batch.collaborator.position  ?? "";

    /* Operador */
    ws.getCell("B32").value = batch.user.name ?? batch.user.email;
    ws.getCell("U32").value = "Operador";

    /* Buscar fila-encabezado */
    let headerRow = ws.getRow(0);
    ws.eachRow(r => {
      if (String(r.getCell(1).value ?? "").toUpperCase().includes("FECHA"))
        headerRow = r;
    });
    const colMap = new Map<string, number>();
    headerRow.eachCell((c, col) => {
      const key = String(c.text).trim().toLowerCase();
      if (key) colMap.set(key, col);
    });

    let rowNum = headerRow.number + 1;
    type Delivery = {
      epp: {
        code: string;
        name: string;
      };
      quantity: number;
    };

    (batch.deliveries as Delivery[]).forEach((d) => {
      const row = ws.getRow(rowNum);
      row.getCell(1).value = fmtDate(batch.createdAt);
      row.getCell(2).value = d.epp.code;

      const key = d.epp.name.trim().toLowerCase();
      let col   = colMap.get(key);
      if (!col) {
        col = headerRow.cellCount + 1;
        headerRow.getCell(col).value = d.epp.name;
        colMap.set(key, col);
      }
      row.getCell(col).value = d.quantity;
      row.commit();
      rowNum += 1;
    });

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
    a.remove();
    URL.revokeObjectURL(url);
  }, [batchId]);
}
