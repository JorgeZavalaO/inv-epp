import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";
import { DeliveryBatch } from "@prisma/client";

// Modelo con relaciones que necesitamos
export type DeliveryBatchFull = DeliveryBatch & {
  collaborator: { name: string; position?: string | null; location?: string | null };
  user: { name?: string | null; email: string };
  warehouse: { name: string };
  deliveries: { quantity: number; epp: { code: string; name: string } }[];
  note?: string | null;
};

export async function buildDeliveryBatchPdf(
  batch: DeliveryBatchFull
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4 portrait
  const { width, height } = page.getSize();

  // Fuentes
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Colores exactos del modelo
  const colors = {
    primary: rgb(0.267, 0.396, 0.875),
    headerText: rgb(1, 1, 1),
    redSection: rgb(0.863, 0.196, 0.184),
    text: rgb(0.2, 0.2, 0.2),
    lightGray: rgb(0.95, 0.95, 0.95),
    tableHeader: rgb(0.267, 0.396, 0.875),
    border: rgb(0.8, 0.8, 0.8),
    white: rgb(1, 1, 1),
    success: rgb(0.133, 0.545, 0.133),
    observationsBg: rgb(0.4, 0.4, 0.4),
    notesBg: rgb(0.98, 0.95, 0.85),
  };

  // Helper para texto
  const drawText = (
    text: string,
    x: number,
    y: number,
    options: {
      bold?: boolean;
      size?: number;
      color?: ReturnType<typeof rgb>;
      align?: 'left' | 'center' | 'right';
      maxWidth?: number;
    } = {}
  ) => {
    const { bold = false, size = 10, color = colors.text, align = 'left', maxWidth } = options;
    let displayText = text;
    if (maxWidth) {
      const fontRef = bold ? fontBold : font;
      while (fontRef.widthOfTextAtSize(displayText + '...', size) > maxWidth && displayText.length) {
        displayText = displayText.slice(0, -1);
      }
      if (displayText !== text) displayText += '...';
    }
    let adjustedX = x;
    const fontRef = bold ? fontBold : font;
    const textWidth = fontRef.widthOfTextAtSize(displayText, size);
    if (align === 'center') adjustedX = x - textWidth / 2;
    if (align === 'right') adjustedX = x - textWidth;
    page.drawText(displayText, { x: adjustedX, y, font: fontRef, size, color });
  };

  // Helper para rectángulos
  const drawRect = (
    x: number,
    y: number,
    w: number,
    h: number,
    color: ReturnType<typeof rgb>,
    opts: { filled?: boolean; borderColor?: ReturnType<typeof rgb>; borderWidth?: number } = {}
  ) => {
    const { filled = true, borderColor, borderWidth = 1 } = opts;
    if (filled) page.drawRectangle({ x, y, width: w, height: h, color });
    if (borderColor) page.drawRectangle({ x, y, width: w, height: h, borderColor, borderWidth, color: filled ? color : undefined });
  };

  // Helper para líneas
  const drawLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    thickness = 1,
    color = colors.border
  ) => {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
  };

  // Formateo de fecha
  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);

  let currentY = height - 30;

  // ===== HEADER =====
  const headerHeight = 70;
  drawRect(0, currentY - headerHeight, width, headerHeight, colors.primary);

  // === Logo real ===
  const logoWidth = 180;
  const logoHeight = 50;
  const logoX = 20;
  const logoY = currentY - headerHeight + 10;
  const logoPath = path.resolve(process.cwd(), 'public', 'assets', 'logo-dimahisac.png');
  try {
    const logoBytes = await readFile(logoPath);
    const logoImage = await pdf.embedPng(logoBytes);
    page.drawImage(logoImage, { x: logoX, y: logoY, width: logoWidth, height: logoHeight });
  } catch {
    // Si falla, mantiene un placeholder mínimo
    drawRect(logoX, logoY, logoWidth, logoHeight, colors.white, { borderColor: colors.primary, borderWidth: 2 });
    drawText('DIMAHISAC', logoX + 10, logoY + 32, { bold: true, size: 16, color: colors.primary });
  }

  // Títulos
  const titleX = logoX + logoWidth + 30;
  drawText('CONSTANCIA DE ENTREGA', titleX, currentY - 25, { bold: true, size: 18, color: colors.headerText });
  drawText('EQUIPOS DE PROTECCIÓN PERSONAL', titleX, currentY - 45, { bold: true, size: 14, color: colors.headerText });

  currentY -= headerHeight + 20;

  // ===== Secciones lado a lado =====
  const sectionHeaderH = 35;
  const sectionContentH = 100;
  const sectionW = (width - 60) / 2;
  const leftX = 30;
  const rightX = leftX + sectionW + 15;

  // Colaborador
  drawRect(leftX, currentY - sectionHeaderH, sectionW, sectionHeaderH, colors.redSection);
  drawText('1. INFORMACIÓN DEL COLABORADOR', leftX + 10, currentY - 22, { bold: true, size: 11, color: colors.headerText });
  drawRect(leftX, currentY - sectionHeaderH - sectionContentH, sectionW, sectionContentH, colors.white, { borderColor: colors.border, borderWidth: 1 });
  [
    { label: 'Nombre completo:', value: batch.collaborator.name },
    { label: 'Cargo/Posición:', value: batch.collaborator.position || 'No especificado' },
    { label: 'Área/Ubicación:', value: batch.collaborator.location || 'No especificada' },
  ].forEach((f, i) => {
    const y = currentY - sectionHeaderH - 25 - i * 25;
    drawText(f.label, leftX + 15, y, { bold: true, size: 9 });
    drawText(f.value, leftX + 15, y - 12, { size: 9, maxWidth: sectionW - 30 });
  });

  // Entrega
  drawRect(rightX, currentY - sectionHeaderH, sectionW, sectionHeaderH, colors.redSection);
  drawText('2. INFORMACIÓN DE LA ENTREGA', rightX + 10, currentY - 22, { bold: true, size: 11, color: colors.headerText });
  drawRect(rightX, currentY - sectionHeaderH - sectionContentH, sectionW, sectionContentH, colors.white, { borderColor: colors.border, borderWidth: 1 });
  [
    { label: 'Entregado por:', value: batch.user.name || batch.user.email },
    { label: 'Almacén origen:', value: batch.warehouse.name },
    { label: 'Tipos de EPP:', value: `${batch.deliveries.length} diferentes` },
  ].forEach((f, i) => {
    const y = currentY - sectionHeaderH - 25 - i * 25;
    drawText(f.label, rightX + 15, y, { bold: true, size: 9 });
    drawText(f.value, rightX + 15, y - 12, { size: 9, maxWidth: sectionW - 30 });
  });

  currentY -= sectionHeaderH + sectionContentH + 25;

  // ===== Detalle equipos =====
  const fullW = width - 60;
  drawRect(leftX, currentY - sectionHeaderH, fullW, sectionHeaderH, colors.redSection);
  drawText('3. DETALLE DE EQUIPOS ENTREGADOS', leftX + 10, currentY - 22, { bold: true, size: 11, color: colors.headerText });
  currentY -= sectionHeaderH;

  const rowH = 30;
  const colW = { num: 40, code: 90, description: fullW - 40 - 90 - 80, quantity: 80 };
  let xCursor = leftX;
  const positions = {
    num: xCursor + colW.num / 2,
    code: (xCursor += colW.num) + 10,
    description: (xCursor += colW.code) + 10,
    quantity: xCursor + colW.description + colW.quantity / 2,
  };

  // Encabezado tabla
  drawRect(leftX, currentY - rowH, fullW, rowH, colors.tableHeader);
  let tmpX = leftX;
  [colW.num, colW.code, colW.description].forEach(w => {
    tmpX += w;
    drawLine(tmpX, currentY, tmpX, currentY - rowH, 1, colors.white);
  });
  drawText('N°', positions.num, currentY - 20, { bold: true, size: 10, color: colors.headerText, align: 'center' });
  drawText('CÓDIGO', positions.code, currentY - 20, { bold: true, size: 10, color: colors.headerText });
  drawText('DESCRIPCIÓN DEL EQUIPO', positions.description, currentY - 20, { bold: true, size: 10, color: colors.headerText });
  drawText('CANT.', positions.quantity, currentY - 20, { bold: true, size: 10, color: colors.headerText, align: 'center' });

  currentY -= rowH;

  // Filas datos
  batch.deliveries.forEach((d, i) => {
    const yRow = currentY - i * rowH;
    if (i % 2 === 0) drawRect(leftX, yRow - rowH, fullW, rowH, colors.lightGray);
    drawRect(leftX, yRow - rowH, fullW, rowH, colors.white, { filled: false, borderColor: colors.border, borderWidth: 0.5 });
    let sepX = leftX;
    [colW.num, colW.code, colW.description].forEach(w => {
      sepX += w;
      drawLine(sepX, yRow, sepX, yRow - rowH, 0.5, colors.border);
    });
    drawText((i + 1).toString(), positions.num, yRow - 20, { size: 10, align: 'center' });
    drawText(d.epp.code, positions.code, yRow - 20, { bold: true, size: 10 });
    drawText(d.epp.name, positions.description, yRow - 20, { size: 10, maxWidth: colW.description - 20 });
    drawText(d.quantity.toString(), positions.quantity, yRow - 20, { bold: true, size: 11, align: 'center' });
  });

  currentY -= batch.deliveries.length * rowH;

  // Totales
  const totalH = 35;
  drawRect(leftX, currentY - totalH, fullW, totalH, colors.lightGray, { borderColor: colors.border, borderWidth: 1 });
  const totalQty = batch.deliveries.reduce((s, d) => s + d.quantity, 0);
  drawText('TOTAL DE UNIDADES ENTREGADAS:', leftX + colW.num + colW.code + 10, currentY - 22, { bold: true, size: 11 });
  drawText(totalQty.toString(), positions.quantity, currentY - 22, { bold: true, size: 14, color: colors.success, align: 'center' });

  currentY -= totalH + 25;

  // Observaciones
  if (batch.note) {
    drawRect(leftX, currentY - sectionHeaderH, fullW, sectionHeaderH, colors.observationsBg);
    drawText('4. OBSERVACIONES', leftX + 10, currentY - 22, { bold: true, size: 11, color: colors.headerText });
    currentY -= sectionHeaderH;
    const noteH = 50;
    drawRect(leftX, currentY - noteH, fullW, noteH, colors.notesBg, { borderColor: colors.border, borderWidth: 1 });
    drawText(batch.note, leftX + 15, currentY - 25, { size: 10, maxWidth: fullW - 30 });
    currentY -= noteH + 30;
  }

  // Firmas
  const sigW = 200;
  const sigH = 80;
  const space = (width - 60 - sigW * 2) / 3;
  let minY = currentY;
  if (minY < 150) minY = 150;

  const x1 = 30 + space;
  const x2 = x1 + sigW + space;
  drawRect(x1, minY - sigH, sigW, sigH, colors.white, { borderColor: colors.border, borderWidth: 1 });
  drawText('COLABORADOR', x1 + sigW/2, minY - 20, { bold: true, align: 'center' });
  drawLine(x1 + 20, minY - 45, x1 + sigW - 20, minY - 45);
  drawText(batch.collaborator.name, x1 + sigW/2, minY - 65, { size: 9, align: 'center', maxWidth: sigW - 20 });

  drawRect(x2, minY - sigH, sigW, sigH, colors.white, { borderColor: colors.border, borderWidth: 1 });
  drawText('OPERADOR/ENTREGA', x2 + sigW/2, minY - 20, { bold: true, align: 'center' });
  drawLine(x2 + 20, minY - 45, x2 + sigW - 20, minY - 45);
  drawText(batch.user.name || batch.user.email, x2 + sigW/2, minY - 65, { size: 9, align: 'center', maxWidth: sigW - 20 });

  // Footer
  drawText(
    `Documento generado automáticamente el ${formatDate(new Date())} | Sistema de Gestión EPP v2.0`,
    width / 2,
    25,
    { size: 8, align: 'center' }
  );

  return pdf.save();
}
