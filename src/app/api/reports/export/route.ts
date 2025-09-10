import { NextRequest, NextResponse } from "next/server";
import { fetchReportsData } from "@/lib/reports";
import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "xlsx"; // xlsx | pdf
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());
  const warehouseId = searchParams.get("warehouseId") ? Number(searchParams.get("warehouseId")) : undefined;
  const category = searchParams.get("category") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const data = await fetchReportsData(year, { warehouseId, category, from, to });

  if (format === "pdf") {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const page = pdf.addPage();
  const { height } = page.getSize();
    const margin = 40;
    let y = height - margin;
    const fontSize = 12;
    page.drawText(`Reporte EPP ${year}`, { x: margin, y, size: 18, font });
    y -= 30;
    // Indicadores
    if (data.indicators) {
      page.drawText("Indicadores:", { x: margin, y, size: 14, font });
      y -= 18;
      const entries: Array<[string, string]> = [
        ["Total entregado", String(data.indicators.totalDeliveredQty)],
        ["# líneas", String(data.indicators.deliveriesCount)],
        ["Prom. ítems/ línea", data.indicators.avgItemsPerDelivery.toFixed(2)],
        ["Solicitudes", String(data.indicators.requestsCount)],
        ["Solicitudes compl.", `${data.indicators.completedRequests} (${(data.indicators.requestsCompletionRate * 100).toFixed(1)}%)`],
        ["Devueltos", `${data.indicators.returnQty} (${(data.indicators.returnRate * 100).toFixed(1)}%)`],
        ["Colaboradores únicos", String(data.indicators.uniqueCollaborators)],
        ["EPPs únicos", String(data.indicators.uniqueEpps)],
        ["Prom. diario", data.indicators.averageDailyDeliveredQty.toFixed(2)],
      ];
      entries.forEach(([k,v]) => {
        if (y < margin + 20) { y = height - margin; pdf.addPage(); }
        page.drawText(`${k}: ${v}`, { x: margin, y, size: fontSize, font });
        y -= 16;
      });
    }
    // Top EPPs
    y -= 10;
    page.drawText("Top EPPs:", { x: margin, y, size: 14, font });
    y -= 18;
    data.topEpps.forEach(t => {
      if (y < margin + 20) { y = height - margin; pdf.addPage(); }
      page.drawText(`${t.name} - ${t.qty}`, { x: margin, y, size: fontSize, font });
      y -= 14;
    });
    // Categorías
    if (data.categories?.length) {
      y -= 10;
      page.drawText("Categorías:", { x: margin, y, size: 14, font });
      y -= 18;
      data.categories.forEach(c => {
        if (y < margin + 20) { y = height - margin; pdf.addPage(); }
        page.drawText(`${c.category}: ${c.qty} (${(c.pct*100).toFixed(1)}%)`, { x: margin, y, size: fontSize, font });
        y -= 14;
      });
    }
  const pdfBytes = await pdf.save();
  // NextResponse acepta directamente un ArrayBuffer
  return new NextResponse(pdfBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=reportes-${year}.pdf` ,
        "Cache-Control": "no-store",
      },
    });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "EPP Manager";
  const ws1 = wb.addWorksheet("Mensual");
  ws1.addRow(["Mes", "Cantidad"]);
  data.monthly.forEach(m => ws1.addRow([m.month, m.qty]));

  const ws2 = wb.addWorksheet("Top EPPs");
  ws2.addRow(["EPP", "Cantidad"]);
  data.topEpps.forEach(t => ws2.addRow([t.name, t.qty]));
  ws2.getColumn(1).width = 40;

  const ws3 = wb.addWorksheet("Ubicaciones Top");
  ws3.addRow(["Ubicación", "Cantidad"]);
  data.topLocations.forEach(l => ws3.addRow([l.location, l.qty]));
  ws3.getColumn(1).width = 30;

  const ws4 = wb.addWorksheet("Ultimas Entregas");
  ws4.addRow(["Fecha", "Lote", "EPP", "Cantidad", "Colaborador", "Almacén"]);
  data.latest.forEach(r => ws4.addRow([r.date, r.batchCode, r.eppName, r.qty, r.collaborator ?? "", r.warehouse]));
  ws4.getColumn(3).width = 40;

  if (data.categories?.length) {
    const ws5 = wb.addWorksheet("Categorias");
    ws5.addRow(["Categoría", "Cantidad", "%"]);
    data.categories.forEach(c => ws5.addRow([c.category, c.qty, c.pct]));
    ws5.getColumn(1).width = 30;
    ws5.getColumn(3).numFmt = "0.00%";
  }

  if (data.locationsFull?.length) {
    const ws6 = wb.addWorksheet("Ubicaciones");
    ws6.addRow(["Ubicación", "Cantidad"]);
    data.locationsFull.forEach(l => ws6.addRow([l.location, l.qty]));
    ws6.getColumn(1).width = 40;
  }

  if (data.indicators) {
    const ws7 = wb.addWorksheet("Indicadores");
    ws7.addRow(["Indicador", "Valor"]);
    const i = data.indicators;
    const rows: Array<[string, string | number]> = [
      ["Total entregado", i.totalDeliveredQty],
      ["# líneas", i.deliveriesCount],
      ["Prom. ítems / línea", i.avgItemsPerDelivery],
      ["Solicitudes", i.requestsCount],
      ["Solicitudes completadas", `${i.completedRequests} (${(i.requestsCompletionRate*100).toFixed(1)}%)`],
      ["Devueltos", `${i.returnQty} (${(i.returnRate*100).toFixed(1)}%)`],
      ["Colaboradores únicos", i.uniqueCollaborators],
      ["EPPs únicos", i.uniqueEpps],
      ["Prom. diario entregado", i.averageDailyDeliveredQty],
    ];
    rows.forEach(r => ws7.addRow(r));
    ws7.getColumn(1).width = 40;
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=reportes-${year}.xlsx`,
      "Cache-Control": "no-store",
    },
  });
}

// POST: genera PDF aceptando capturas de los gráficos en base64 (dataUrl PNG)
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const body = await req.json().catch(() => ({ images: [] }));
  const images: Array<{ id: string; dataUrl: string }> = body.images || [];
  const year = Number(searchParams.get("year") ?? body.year ?? new Date().getFullYear());
  const warehouseId = searchParams.get("warehouseId") ? Number(searchParams.get("warehouseId")) : undefined;
  const category = searchParams.get("category") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const data = await fetchReportsData(year, { warehouseId, category, from, to });

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  
  // Configuración de colores y estilos
  const primaryColor = rgb(0.196, 0.274, 0.902); // #3246e6
  const grayColor = rgb(0.4, 0.4, 0.4);
  const lightGrayColor = rgb(0.9, 0.9, 0.9);
  const whiteColor = rgb(1, 1, 1);
  const blackColor = rgb(0, 0, 0);
  const margin = 50;
  const pageWidth = 595.28; // A4 width
  const pageHeight = 841.89; // A4 height
  
  // Helper function para agregar header a cada página
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addPageHeader = (page: any, title: string) => {
    // Línea superior azul
    page.drawRectangle({
      x: 0,
      y: pageHeight - 30,
      width: pageWidth,
      height: 30,
      color: primaryColor,
    });
    
    // Título en blanco sobre la línea azul
    page.drawText(title, {
      x: margin,
      y: pageHeight - 20,
      size: 14,
      font: boldFont,
      color: whiteColor,
    });
    
    // Fecha en la esquina derecha
    const today = new Date().toLocaleDateString('es-ES');
    page.drawText(today, {
      x: pageWidth - margin - 60,
      y: pageHeight - 20,
      size: 10,
      font,
      color: whiteColor,
    });
  };
  
  // Helper function para agregar footer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addPageFooter = (page: any, pageNum: number, totalPages: number) => {
    page.drawText(`Página ${pageNum} de ${totalPages}`, {
      x: pageWidth / 2 - 30,
      y: 20,
      size: 10,
      font,
      color: grayColor,
    });
  };

  // PÁGINA 1: Portada y resumen
  const coverPage = pdf.addPage();
  addPageHeader(coverPage, `Reporte de EPP - ${year}`);
  
  let y = pageHeight - 100;
  
  // Título principal centrado
  coverPage.drawText("REPORTE DE EQUIPOS DE", {
    x: pageWidth / 2 - 120,
    y,
    size: 24,
    font: boldFont,
    color: primaryColor,
  });
  y -= 30;
  coverPage.drawText("PROTECCIÓN PERSONAL", {
    x: pageWidth / 2 - 125,
    y,
    size: 24,
    font: boldFont,
    color: primaryColor,
  });
  y -= 80;
  
  // Período del reporte
  const periodText = from && to 
    ? `Período: ${new Date(from).toLocaleDateString('es-ES')} - ${new Date(to).toLocaleDateString('es-ES')}`
    : `Año: ${year}`;
  coverPage.drawText(periodText, {
    x: pageWidth / 2 - periodText.length * 3,
    y,
    size: 16,
    font,
    color: grayColor,
  });
  y -= 60;
  
  // Resumen ejecutivo en caja
  if (data.indicators) {
    const boxY = y - 20;
    const boxHeight = 180;
    
    // Fondo gris claro para el resumen
    coverPage.drawRectangle({
      x: margin,
      y: boxY - boxHeight,
      width: pageWidth - margin * 2,
      height: boxHeight,
      color: lightGrayColor,
    });
    
    coverPage.drawText("RESUMEN EJECUTIVO", {
      x: margin + 20,
      y: boxY - 25,
      size: 16,
      font: boldFont,
      color: primaryColor,
    });
    
    const i = data.indicators;
    const summaryLines = [
      { label: "Total de EPPs entregados:", value: i.totalDeliveredQty.toLocaleString('es-ES'), highlight: true },
      { label: "Número de entregas realizadas:", value: i.deliveriesCount.toLocaleString('es-ES') },
      { label: "Promedio de ítems por entrega:", value: i.avgItemsPerDelivery.toFixed(1) },
      { label: "Colaboradores atendidos:", value: i.uniqueCollaborators.toLocaleString('es-ES') },
      { label: "Tipos de EPP diferentes:", value: i.uniqueEpps.toLocaleString('es-ES') },
      { label: "Tasa de cumplimiento de solicitudes:", value: `${(i.requestsCompletionRate * 100).toFixed(1)}%` },
      { label: "Promedio diario de entregas:", value: i.averageDailyDeliveredQty.toFixed(1) },
    ];
    
    let summaryY = boxY - 50;
    summaryLines.forEach(line => {
      const fontSize = line.highlight ? 14 : 12;
      const lineFont = line.highlight ? boldFont : font;
      const lineColor = line.highlight ? primaryColor : blackColor;
      
      coverPage.drawText(line.label, {
        x: margin + 30,
        y: summaryY,
        size: fontSize,
        font: lineFont,
        color: lineColor,
      });
      
      coverPage.drawText(line.value, {
        x: pageWidth - margin - 80,
        y: summaryY,
        size: fontSize,
        font: boldFont,
        color: line.highlight ? primaryColor : blackColor,
      });
      
      summaryY -= line.highlight ? 25 : 20;
    });
  }

  // PÁGINA 2: Indicadores detallados
  const indicatorsPage = pdf.addPage();
  addPageHeader(indicatorsPage, "Indicadores de Gestión Detallados");
  
  y = pageHeight - 100;
  
  if (data.indicators) {
    const i = data.indicators;
    
    // Sección de Entregas
    coverPage.drawRectangle({
      x: margin,
      y: y - 150,
      width: (pageWidth - margin * 3) / 2,
      height: 140,
      color: lightGrayColor,
    });
    
    indicatorsPage.drawText("ENTREGAS", {
      x: margin + 20,
      y: y - 25,
      size: 14,
      font: boldFont,
      color: primaryColor,
    });
    
    const deliveryMetrics = [
      { label: "Total entregado", value: i.totalDeliveredQty.toLocaleString('es-ES') + " unidades" },
      { label: "Número de líneas", value: i.deliveriesCount.toLocaleString('es-ES') },
      { label: "Promedio por línea", value: i.avgItemsPerDelivery.toFixed(2) + " ítems" },
      { label: "Promedio diario", value: i.averageDailyDeliveredQty.toFixed(1) + " unidades" },
    ];
    
    let metricsY = y - 50;
    deliveryMetrics.forEach(metric => {
      indicatorsPage.drawText(metric.label + ":", {
        x: margin + 30,
        y: metricsY,
        size: 11,
        font,
      });
      indicatorsPage.drawText(metric.value, {
        x: margin + 180,
        y: metricsY,
        size: 11,
        font: boldFont,
        color: primaryColor,
      });
      metricsY -= 18;
    });
    
    // Sección de Solicitudes
    const rightColumnX = pageWidth / 2 + 20;
    coverPage.drawRectangle({
      x: rightColumnX,
      y: y - 150,
      width: (pageWidth - margin * 3) / 2,
      height: 140,
      color: lightGrayColor,
    });
    
    indicatorsPage.drawText("SOLICITUDES Y DEVOLUCIONES", {
      x: rightColumnX + 20,
      y: y - 25,
      size: 14,
      font: boldFont,
      color: primaryColor,
    });
    
    const requestMetrics = [
      { label: "Total solicitudes", value: i.requestsCount.toLocaleString('es-ES') },
      { label: "Completadas", value: `${i.completedRequests} (${(i.requestsCompletionRate * 100).toFixed(1)}%)` },
      { label: "Devueltos", value: `${i.returnQty} unidades` },
      { label: "Tasa devolución", value: `${(i.returnRate * 100).toFixed(1)}%` },
    ];
    
    metricsY = y - 50;
    requestMetrics.forEach(metric => {
      indicatorsPage.drawText(metric.label + ":", {
        x: rightColumnX + 30,
        y: metricsY,
        size: 11,
        font,
      });
      indicatorsPage.drawText(metric.value, {
        x: rightColumnX + 150,
        y: metricsY,
        size: 11,
        font: boldFont,
        color: primaryColor,
      });
      metricsY -= 18;
    });
    
    y -= 200;
  }
  
  // Top EPPs en tabla
  if (data.topEpps.length) {
    indicatorsPage.drawText("TOP 5 EPPs MÁS SOLICITADOS", {
      x: margin,
      y,
      size: 14,
      font: boldFont,
      color: primaryColor,
    });
    y -= 30;
    
    // Header de tabla
    indicatorsPage.drawRectangle({
      x: margin,
      y: y - 20,
      width: pageWidth - margin * 2,
      height: 20,
      color: primaryColor,
    });
    
    indicatorsPage.drawText("EPP", {
      x: margin + 10,
      y: y - 15,
      size: 12,
      font: boldFont,
      color: whiteColor,
    });
    
    indicatorsPage.drawText("Cantidad", {
      x: pageWidth - margin - 80,
      y: y - 15,
      size: 12,
      font: boldFont,
      color: whiteColor,
    });
    
    y -= 25;
    
    data.topEpps.forEach((epp, index) => {
      const bgColor = index % 2 === 0 ? lightGrayColor : whiteColor;
      indicatorsPage.drawRectangle({
        x: margin,
        y: y - 18,
        width: pageWidth - margin * 2,
        height: 18,
        color: bgColor,
      });
      
      indicatorsPage.drawText(epp.name, {
        x: margin + 10,
        y: y - 12,
        size: 11,
        font,
      });
      
      indicatorsPage.drawText(epp.qty.toLocaleString('es-ES'), {
        x: pageWidth - margin - 60,
        y: y - 12,
        size: 11,
        font: boldFont,
        color: primaryColor,
      });
      
      y -= 18;
    });
  }

  // Cada imagen (gráfico) en una página separada con mejor diseño
  const chartTitles: Record<string, string> = {
    'consumo-mensual': 'Consumo Mensual de EPPs',
    'top-epps': 'Top 5 EPPs Más Solicitados',
    'top-ubicaciones': 'Ubicaciones con Mayor Consumo',
    'categorias': 'Distribución por Categorías',
  };

  for (const img of images) {
    const match = img.dataUrl.match(/^data:image\/(png|jpeg);base64,(.+)$/);
    if (!match) continue;
    const ext = match[1];
    const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
    const embedded = ext === 'png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    const { width: iw, height: ih } = embedded.scale(1);
    const page = pdf.addPage();
    
    const chartTitle = chartTitles[img.id] || img.id;
    addPageHeader(page, chartTitle);
    
    // Calcular dimensiones para centrar la imagen
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - 200; // Dejar espacio para header y footer
    const scale = Math.min(maxWidth / iw, maxHeight / ih);
    const newW = iw * scale;
    const newH = ih * scale;
    
    const imageX = (pageWidth - newW) / 2;
    const imageY = (pageHeight - newH) / 2;
    
    // Sombra sutil para la imagen
    page.drawRectangle({
      x: imageX + 5,
      y: imageY - 5,
      width: newW,
      height: newH,
      color: rgb(0.8, 0.8, 0.8),
    });
    
    page.drawImage(embedded, { 
      x: imageX, 
      y: imageY, 
      width: newW, 
      height: newH 
    });
  }

  // Agregar footers a todas las páginas
  const totalPages = pdf.getPageCount();
  pdf.getPages().forEach((page, index) => {
    addPageFooter(page, index + 1, totalPages);
  });

  const pdfBytes = await pdf.save();
  return new NextResponse(pdfBytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=reportes-epp-${year}.pdf`,
      "Cache-Control": "no-store",
    },
  });
}
