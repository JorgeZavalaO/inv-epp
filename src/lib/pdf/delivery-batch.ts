import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { DeliveryBatch } from "@prisma/client";

// Modelo con relaciones que necesitamos
export type DeliveryBatchFull = DeliveryBatch & {
  collaborator: { name: string; position?: string | null; location?: string | null };
  user: { name?: string | null; email: string };
  warehouse: { name: string };
  deliveries: { quantity: number; epp: { code: string; name: string } }[];
};

export async function buildDeliveryBatchPdf(batch: DeliveryBatchFull) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4 portrait
  const { width, height } = page.getSize();
  
  // Fuentes
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  
  // Colores
  const colors = {
    primary: rgb(0.2, 0.4, 0.8),      // Azul corporativo
    secondary: rgb(0.4, 0.4, 0.4),    // Gris oscuro
    text: rgb(0.1, 0.1, 0.1),         // Negro suave
    lightGray: rgb(0.9, 0.9, 0.9),   // Gris claro
    accent: rgb(0.8, 0.2, 0.2),       // Rojo para acentos
  };

  // Función helper para dibujar texto
  const drawText = (
    text: string,
    x: number,
    y: number,
    options: {
      bold?: boolean;
      size?: number;
      color?: import("pdf-lib").RGB;
      align?: 'left' | 'center' | 'right';
    } = {}
  ) => {
    const { bold = false, size = 10, color = colors.text, align = 'left' } = options;
    
    let adjustedX = x;
    if (align === 'center') {
      const textWidth = (bold ? fontBold : font).widthOfTextAtSize(text, size);
      adjustedX = x - textWidth / 2;
    } else if (align === 'right') {
      const textWidth = (bold ? fontBold : font).widthOfTextAtSize(text, size);
      adjustedX = x - textWidth;
    }

    page.drawText(text, {
      x: adjustedX,
      y,
      font: bold ? fontBold : font,
      size,
      color,
    });
  };

  // Función para dibujar rectángulos
  const drawRect = (
    x: number,
    y: number,
    width: number,
    height: number,
    color: import("pdf-lib").RGB,
    filled = true
  ) => {
    if (filled) {
      page.drawRectangle({ x, y, width, height, color });
    } else {
      page.drawRectangle({ x, y, width, height, borderColor: color, borderWidth: 1 });
    }
  };

  // Función para dibujar líneas
  const drawLine = (startX: number, startY: number, endX: number, endY: number, thickness = 1, color = colors.secondary) => {
    page.drawLine({
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
      thickness,
      color,
    });
  };

  let currentY = height - 50;

  // HEADER - Banda superior con color
  drawRect(0, currentY - 10, width, 60, colors.primary);
  
  // Logo/Icono placeholder (puedes reemplazar con tu logo)
  drawRect(40, currentY + 15, 30, 30, rgb(1, 1, 1));
  drawText("EPP", 47, currentY + 25, { bold: true, size: 12, color: colors.primary });
  
  // Título principal
  drawText("CONSTANCIA DE ENTREGA DE EPP", width / 2, currentY + 25, {
    bold: true,
    size: 16,
    color: rgb(1, 1, 1),
    align: 'center'
  });
  
  currentY -= 80;

  // Información del documento
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Código y fecha en header
  drawText(`CÓDIGO: ${batch.code}`, 50, currentY, { bold: true, size: 12, color: colors.primary });
  drawText(`FECHA: ${formatDate(batch.createdAt)}`, width - 50, currentY, { 
    bold: true, 
    size: 12, 
    color: colors.primary,
    align: 'right'
  });
  
  currentY -= 30;

  // SECCIÓN 1: INFORMACIÓN DEL COLABORADOR
  drawRect(40, currentY - 5, width - 80, 2, colors.accent);
  currentY -= 15;
  
  drawText("INFORMACIÓN DEL COLABORADOR", 50, currentY, { bold: true, size: 12, color: colors.accent });
  currentY -= 20;

  // Fondo suave para la sección
  drawRect(40, currentY - 60, width - 80, 70, colors.lightGray);
  
  const collaboratorData = [
    { label: "Nombre:", value: batch.collaborator.name },
    { label: "Cargo:", value: batch.collaborator.position || "No especificado" },
    { label: "Ubicación:", value: batch.collaborator.location || "No especificada" },
  ];

  collaboratorData.forEach((item, index) => {
    const yPos = currentY - (index * 18) - 10;
    drawText(item.label, 50, yPos, { bold: true, size: 10 });
    drawText(item.value, 130, yPos, { size: 10 });
  });

  currentY -= 90;

  // SECCIÓN 2: INFORMACIÓN DE LA ENTREGA
  drawRect(40, currentY - 5, width - 80, 2, colors.accent);
  currentY -= 15;
  
  drawText("INFORMACIÓN DE LA ENTREGA", 50, currentY, { bold: true, size: 12, color: colors.accent });
  currentY -= 20;

  // Fondo suave para la sección
  drawRect(40, currentY - 60, width - 80, 70, colors.lightGray);

  const deliveryData = [
    { label: "Operador:", value: batch.user.name || batch.user.email },
    { label: "Almacén:", value: batch.warehouse.name },
    { label: "Total ítems:", value: `${batch.deliveries.length} tipos de EPP` },
  ];

  deliveryData.forEach((item, index) => {
    const yPos = currentY - (index * 18) - 10;
    drawText(item.label, 50, yPos, { bold: true, size: 10 });
    drawText(item.value, 130, yPos, { size: 10 });
  });

  currentY -= 90;

  // SECCIÓN 3: DETALLE DE ARTÍCULOS
  drawRect(40, currentY - 5, width - 80, 2, colors.accent);
  currentY -= 15;
  
  drawText("DETALLE DE ARTÍCULOS ENTREGADOS", 50, currentY, { bold: true, size: 12, color: colors.accent });
  currentY -= 25;

  // Cabecera de tabla
  const tableY = currentY;
  const rowHeight = 25;
  const tableWidth = width - 80;
  
  // Fondo de cabecera
  drawRect(40, tableY - rowHeight, tableWidth, rowHeight, colors.primary);
  
  // Columnas de la tabla
  const colPositions = {
    num: 60,
    code: 120,
    description: 200,
    quantity: width - 100,
  };

  // Headers
  drawText("#", colPositions.num, tableY - 15, { bold: true, size: 10, color: rgb(1, 1, 1), align: 'center' });
  drawText("CÓDIGO", colPositions.code, tableY - 15, { bold: true, size: 10, color: rgb(1, 1, 1) });
  drawText("DESCRIPCIÓN", colPositions.description, tableY - 15, { bold: true, size: 10, color: rgb(1, 1, 1) });
  drawText("CANT.", colPositions.quantity, tableY - 15, { bold: true, size: 10, color: rgb(1, 1, 1), align: 'center' });

  currentY = tableY - rowHeight;

  // Filas de datos
  batch.deliveries.forEach((delivery, index) => {
    const rowY = currentY - (index + 1) * 20;
    
    // Alternar color de fondo
    if (index % 2 === 0) {
      drawRect(40, rowY - 5, tableWidth, 20, rgb(0.98, 0.98, 0.98));
    }
    
    drawText(`${index + 1}`, colPositions.num, rowY, { size: 9, align: 'center' });
    drawText(delivery.epp.code, colPositions.code, rowY, { size: 9, bold: true });
    
    // Truncar descripción si es muy larga
    let description = delivery.epp.name;
    if (description.length > 40) {
      description = description.substring(0, 37) + "...";
    }
    drawText(description, colPositions.description, rowY, { size: 9 });
    drawText(`${delivery.quantity}`, colPositions.quantity, rowY, { size: 9, bold: true, align: 'center' });
  });

  currentY -= (batch.deliveries.length * 20) + 20;

  // Total de unidades
  const totalUnits = batch.deliveries.reduce((sum, d) => sum + d.quantity, 0);
  drawRect(40, currentY - 5, tableWidth, 25, colors.lightGray);
  drawText("TOTAL DE UNIDADES ENTREGADAS:", width - 200, currentY + 5, { bold: true, size: 10 });
  drawText(`${totalUnits}`, colPositions.quantity, currentY + 5, { bold: true, size: 12, color: colors.accent, align: 'center' });

  currentY -= 40;

  // Nota si existe
  if (batch.note) {
    drawRect(40, currentY - 5, width - 80, 2, colors.accent);
    currentY -= 15;
    drawText("OBSERVACIONES", 50, currentY, { bold: true, size: 10, color: colors.accent });
    currentY -= 15;
    
    // Fondo para la nota
    const noteHeight = 30;
    drawRect(40, currentY - noteHeight, width - 80, noteHeight, rgb(1, 0.95, 0.8));
    drawText(batch.note, 50, currentY - 15, { size: 9 });
    currentY -= noteHeight + 10;
  }

  // SECCIÓN DE FIRMAS
  currentY = Math.min(currentY, 150); // Asegurar que las firmas estén en la parte inferior
  
  drawText("FIRMAS DE CONFORMIDAD", width / 2, currentY, { 
    bold: true, 
    size: 12, 
    color: colors.primary,
    align: 'center'
  });
  
  currentY -= 40;

  // Líneas de firma
  const signatureY = currentY;
  drawLine(80, signatureY, 250, signatureY, 1.5, colors.secondary);
  drawLine(350, signatureY, 520, signatureY, 1.5, colors.secondary);

  // Labels de firma
  drawText("COLABORADOR", 165, signatureY - 15, { bold: true, size: 9, align: 'center', color: colors.secondary });
  drawText("OPERADOR", 435, signatureY - 15, { bold: true, size: 9, align: 'center', color: colors.secondary });

  // Nombres debajo de las líneas
  drawText(batch.collaborator.name, 165, signatureY - 30, { size: 8, align: 'center' });
  drawText(batch.user.name || batch.user.email, 435, signatureY - 30, { size: 8, align: 'center' });

  // Footer
  const footerY = 30;
  drawLine(40, footerY, width - 40, footerY, 0.5, colors.lightGray);
  drawText(
    `Documento generado el ${formatDate(new Date())} | Sistema de Gestión EPP`,
    width / 2,
    footerY - 15,
    { size: 7, color: colors.secondary, align: 'center' }
  );

  return pdf.save(); // Uint8Array
}