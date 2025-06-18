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
  
  // Colores mejorados basados en la imagen
  const colors = {
    primary: rgb(0.259, 0.420, 0.875),   // Azul más vibrante #4267df
    secondary: rgb(0.329, 0.329, 0.329), // Gris medio
    text: rgb(0.2, 0.2, 0.2),            // Gris oscuro para texto
    lightGray: rgb(0.941, 0.941, 0.941), // Gris muy claro #f0f0f0
    accent: rgb(0.863, 0.196, 0.184),    // Rojo corporativo #dc322f
    white: rgb(1, 1, 1),                 // Blanco puro
    yellowBg: rgb(0.992, 0.969, 0.808),  // Amarillo suave para observaciones
  };

  // Función helper para dibujar texto
  const drawText = (
    text: string,
    x: number,
    y: number,
    options: {
      bold?: boolean;
      size?: number;
      color?: ReturnType<typeof rgb>;
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
  const drawRect = (x: number, y: number, width: number, height: number, color: ReturnType<typeof rgb>, filled = true) => {
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

  let currentY = height - 40;

  // HEADER - Banda superior con color (más alta)
  drawRect(0, currentY - 15, width, 75, colors.primary);
  
  // Logo/Icono mejorado
  drawRect(50, currentY + 20, 40, 35, colors.white);
  drawRect(52, currentY + 22, 36, 31, colors.primary);
  drawText("EPP", 62, currentY + 32, { bold: true, size: 14, color: colors.white });
  
  // Título principal con mejor tipografía
  drawText("CONSTANCIA DE ENTREGA DE EPP", width / 2, currentY + 32, {
    bold: true,
    size: 18,
    color: colors.white,
    align: 'center'
  });
  
  currentY -= 95;

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

  // Código y fecha en header con mejor formato
  drawText(`CÓDIGO: ${batch.code}`, 50, currentY, { 
    bold: true, 
    size: 11, 
    color: colors.primary 
  });
  drawText(`FECHA: ${formatDate(batch.createdAt)}`, width - 50, currentY, { 
    bold: true, 
    size: 11, 
    color: colors.primary,
    align: 'right'
  });
  
  currentY -= 35;

  // SECCIÓN 1: INFORMACIÓN DEL COLABORADOR
  // Línea divisoria roja
  drawLine(50, currentY, width - 50, currentY, 2, colors.accent);
  currentY -= 20;
  
  drawText("INFORMACIÓN DEL COLABORADOR", 50, currentY, { 
    bold: true, 
    size: 11, 
    color: colors.accent 
  });
  currentY -= 25;

  // Fondo gris para la sección
  const collaboratorSectionHeight = 80;
  drawRect(50, currentY - collaboratorSectionHeight + 10, width - 100, collaboratorSectionHeight, colors.lightGray);
  
  const collaboratorData = [
    { label: "Nombre:", value: batch.collaborator.name },
    { label: "Cargo:", value: batch.collaborator.position || "No especificado" },
    { label: "Ubicación:", value: batch.collaborator.location || "No especificada" },
  ];

  collaboratorData.forEach((item, index) => {
    const yPos = currentY - (index * 20) - 15;
    drawText(item.label, 60, yPos, { bold: true, size: 10, color: colors.text });
    drawText(item.value, 130, yPos, { size: 10, color: colors.text });
  });

  currentY -= collaboratorSectionHeight + 15;

  // SECCIÓN 2: INFORMACIÓN DE LA ENTREGA
  drawLine(50, currentY, width - 50, currentY, 2, colors.accent);
  currentY -= 20;
  
  drawText("INFORMACIÓN DE LA ENTREGA", 50, currentY, { 
    bold: true, 
    size: 11, 
    color: colors.accent 
  });
  currentY -= 25;

  // Fondo gris para la sección
  const deliverySectionHeight = 80;
  drawRect(50, currentY - deliverySectionHeight + 10, width - 100, deliverySectionHeight, colors.lightGray);

  const deliveryData = [
    { label: "Operador:", value: batch.user.name || batch.user.email },
    { label: "Almacén:", value: batch.warehouse.name },
    { label: "Total ítems:", value: `${batch.deliveries.length} tipos de EPP` },
  ];

  deliveryData.forEach((item, index) => {
    const yPos = currentY - (index * 20) - 15;
    drawText(item.label, 60, yPos, { bold: true, size: 10, color: colors.text });
    drawText(item.value, 130, yPos, { size: 10, color: colors.text });
  });

  currentY -= deliverySectionHeight + 15;

  // SECCIÓN 3: DETALLE DE ARTÍCULOS
  drawLine(50, currentY, width - 50, currentY, 2, colors.accent);
  currentY -= 20;
  
  drawText("DETALLE DE ARTÍCULOS ENTREGADOS", 50, currentY, { 
    bold: true, 
    size: 11, 
    color: colors.accent 
  });
  currentY -= 30;

  // Tabla mejorada
  const tableStartY = currentY;
  const rowHeight = 25;
  const tableWidth = width - 100;
  
  // Cabecera de tabla con altura exacta
  drawRect(50, tableStartY - rowHeight, tableWidth, rowHeight, colors.primary);
  
  // Columnas de la tabla (ajustadas para mejor distribución)
  const colPositions = {
    num: 75,
    code: 140,
    description: 220,
    quantity: width - 85,
  };

  // Headers con mejor alineación
  drawText("#", colPositions.num, tableStartY - 15, { 
    bold: true, 
    size: 10, 
    color: colors.white, 
    align: 'center' 
  });
  drawText("CÓDIGO", colPositions.code, tableStartY - 15, { 
    bold: true, 
    size: 10, 
    color: colors.white 
  });
  drawText("DESCRIPCIÓN", colPositions.description, tableStartY - 15, { 
    bold: true, 
    size: 10, 
    color: colors.white 
  });
  drawText("CANT.", colPositions.quantity, tableStartY - 15, { 
    bold: true, 
    size: 10, 
    color: colors.white, 
    align: 'center' 
  });

  const currentTableY = tableStartY - rowHeight;

  // Filas de datos con mejor formato
  batch.deliveries.forEach((delivery, index) => {
    const rowY = currentTableY - (index + 1) * 22;
    
    // Fondo alternado solo para filas pares
    if (index % 2 === 0) {
      drawRect(50, rowY - 3, tableWidth, 22, colors.lightGray);
    }
    
    // Número con formato
    drawText((index + 1).toString(), colPositions.num, rowY + 3, { 
      size: 10, 
      align: 'center',
      color: colors.text
    });
    
    // Código en negrita
    drawText(delivery.epp.code, colPositions.code, rowY + 3, { 
      size: 10, 
      bold: true,
      color: colors.text
    });
    
    // Descripción con manejo de texto largo
    let description = delivery.epp.name;
    if (description.length > 35) {
      description = description.substring(0, 32) + "...";
    }
    drawText(description, colPositions.description, rowY + 3, { 
      size: 10,
      color: colors.text
    });
    
    // Cantidad destacada
    drawText(delivery.quantity.toString(), colPositions.quantity, rowY + 3, { 
      size: 11, 
      bold: true, 
      align: 'center',
      color: colors.text
    });
  });

  currentY = currentTableY - (batch.deliveries.length * 22) - 15;

  // Total de unidades mejorado
  const totalUnits = batch.deliveries.reduce((sum, d) => sum + d.quantity, 0);
  const totalRowY = currentY;
  drawRect(50, totalRowY - 8, tableWidth, 25, colors.lightGray);
  
  drawText("TOTAL DE UNIDADES ENTREGADAS:", colPositions.description, totalRowY + 3, { 
    bold: true, 
    size: 10,
    color: colors.text
  });
  drawText(totalUnits.toString(), colPositions.quantity, totalRowY + 3, { 
    bold: true, 
    size: 12, 
    color: colors.accent, 
    align: 'center' 
  });

  currentY -= 45;

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