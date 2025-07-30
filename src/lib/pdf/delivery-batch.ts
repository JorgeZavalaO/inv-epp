import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";
import { DeliveryBatch } from "@prisma/client";
import { getSystemConfig } from "@/lib/settings";

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

  // Paleta de colores simplificada y profesional
  const colors = {
    primary: rgb(0.18, 0.31, 0.56),      // Azul corporativo
    secondary: rgb(0.95, 0.95, 0.95),     // Gris muy claro
    accent: rgb(0.13, 0.59, 0.95),        // Azul brillante
    success: rgb(0.16, 0.66, 0.25),       // Verde
    warning: rgb(0.99, 0.76, 0.05),       // Amarillo
    text: rgb(0.2, 0.2, 0.2),             // Gris oscuro
    textLight: rgb(0.5, 0.5, 0.5),        // Gris medio
    white: rgb(1, 1, 1),
    border: rgb(0.9, 0.9, 0.9),           // Gris claro para bordes
  };

  // Helpers simplificados
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
      while (fontRef.widthOfTextAtSize(displayText, size) > maxWidth && displayText.length > 0) {
        displayText = displayText.slice(0, -1);
      }
      if (displayText !== text && displayText.length > 0) {
        displayText = displayText.slice(0, -3) + '...';
      }
    }
    
    let adjustedX = x;
    if (align === 'center') {
      const textWidth = (bold ? fontBold : font).widthOfTextAtSize(displayText, size);
      adjustedX = x - textWidth / 2;
    } else if (align === 'right') {
      const textWidth = (bold ? fontBold : font).widthOfTextAtSize(displayText, size);
      adjustedX = x - textWidth;
    }
    
    page.drawText(displayText, { 
      x: adjustedX, 
      y, 
      font: bold ? fontBold : font, 
      size, 
      color 
    });
  };

  const drawRect = (
    x: number,
    y: number,
    w: number,
    h: number,
    color: ReturnType<typeof rgb>,
    borderColor?: ReturnType<typeof rgb>
  ) => {
    page.drawRectangle({ x, y, width: w, height: h, color });
    if (borderColor) {
      page.drawRectangle({ 
        x, y, width: w, height: h, 
        borderColor, 
        borderWidth: 1,
        color: undefined
      });
    }
  };

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
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);

  let currentY = height - 5;

// ===== HEADER LIMPIO =====
const headerHeight = 80;

// Fondo del header
drawRect(0, currentY - headerHeight, width, headerHeight, colors.primary);

// Logo
const cfg = await getSystemConfig();

let logoBytes: Uint8Array | null = null;

if (cfg.logoUrl) {
  try {
    if (cfg.logoUrl.startsWith("http")) {
      // URL remota (Vercel Blob, S3, etc.)
      const res = await fetch(cfg.logoUrl);
      if (res.ok) {
        logoBytes = new Uint8Array(await res.arrayBuffer());
      }
    } else {
      // Ruta local dentro de /public
      const localPath = path.resolve(
        process.cwd(),
        "public",
        cfg.logoUrl.replace(/^\//, "")
      );
      logoBytes = await readFile(localPath);
    }
  } catch {
    // si falla, usaremos el fallback
  }
}

// fallback al logo por defecto si todo falla
if (!logoBytes) {
  logoBytes = await readFile(
    path.resolve(process.cwd(), "public", "assets", "logo-dimahisac.png")
  );
}

let logoEmbedded;
try {
  logoEmbedded = await pdf.embedPng(logoBytes);
} catch {
  logoEmbedded = null; // bytes corruptos → se mostrará texto
}

const logoWidth = 120;
const logoHeight = 35;
const logoX = 40;
const logoY = currentY - headerHeight/2 - logoHeight/2;

if (logoEmbedded) {
  // Fondo blanco para el logo
  drawRect(logoX - 10, logoY - 5, logoWidth + 20, logoHeight + 10, colors.white);
  page.drawImage(logoEmbedded, {
    x: logoX,
    y: logoY,
    width: logoWidth,
    height: logoHeight,
  });
} else {
  // Fallback textual
  drawRect(logoX - 10, logoY - 5, logoWidth + 20, logoHeight + 10, colors.white);
  drawText("DIMAHISAC", logoX + 10, logoY + 18, {
    bold: true,
    size: 16,
    color: colors.primary,
  });
}

// Código de entrega 
const codeWidth = 150;
const codeHeight = 50;
const codeX = width - codeWidth - 30; // Margen de 30px desde el borde derecho
const codeY = currentY - 15; // Posición desde la parte superior del header

drawRect(codeX, codeY - codeHeight, codeWidth, codeHeight, colors.white);
drawText('CÓDIGO DE ENTREGA', codeX + 10, codeY - 15, { 
  bold: true, 
  size: 10, 
  color: colors.textLight 
});
drawText(batch.code, codeX + 10, codeY - 35, { 
  bold: true, 
  size: 16, 
  color: colors.success 
});

// Título principal (ajustado para no sobreponerse con el código)
const titleX = logoX + logoWidth + 60;
const titleMaxWidth = codeX - titleX - 20; // Espacio disponible hasta el código

drawText('CONSTANCIA', titleX, currentY - 30, { 
  bold: true, 
  size: 18, // Reducido ligeramente para mejor ajuste
  color: colors.white,
  maxWidth: titleMaxWidth
});
drawText('EQUIPOS DE PROTECCIÓN', titleX, currentY - 50, { 
  size: 11, // Reducido ligeramente para mejor ajuste
  color: colors.white,
  maxWidth: titleMaxWidth
});

currentY -= headerHeight + 30;
  // ===== INFORMACIÓN BÁSICA =====
  const infoY = currentY;
  const leftColX = 40;
  const rightColX = width / 2 + 20;
  const colWidth = (width - 100) / 2;
  
  // Título de sección
  drawText('INFORMACIÓN DE LA ENTREGA', leftColX, infoY, { 
    bold: true, 
    size: 14, 
    color: colors.primary 
  });
  
  currentY -= 30;

  // Información del colaborador
  drawText('COLABORADOR:', leftColX, currentY, { 
    bold: true, 
    size: 11, 
    color: colors.textLight 
  });
  drawText(batch.collaborator.name, leftColX, currentY - 15, { 
    bold: true, 
    size: 12, 
    color: colors.text 
  });
  
  if (batch.collaborator.position) {
    drawText('Cargo:', leftColX, currentY - 30, { 
      bold: true, 
      size: 9, 
      color: colors.textLight 
    });
    drawText(batch.collaborator.position, leftColX, currentY - 42, { 
      size: 10, 
      color: colors.text 
    });
  }
  
  if (batch.collaborator.location) {
    drawText('Ubicación:', leftColX, currentY - 57, { 
      bold: true, 
      size: 9, 
      color: colors.textLight 
    });
    drawText(batch.collaborator.location, leftColX, currentY - 69, { 
      size: 10, 
      color: colors.text 
    });
  }

  // Información de la entrega
  drawText('ENTREGADO POR:', rightColX, currentY, { 
    bold: true, 
    size: 11, 
    color: colors.textLight 
  });
  drawText(batch.user.name || batch.user.email, rightColX, currentY - 15, { 
    bold: true, 
    size: 12, 
    color: colors.text,
    maxWidth: colWidth - 20
  });
  
  drawText('Almacén:', rightColX, currentY - 30, { 
    bold: true, 
    size: 9, 
    color: colors.textLight 
  });
  drawText(batch.warehouse.name, rightColX, currentY - 42, { 
    size: 10, 
    color: colors.text 
  });
  
  drawText('Fecha:', rightColX, currentY - 57, { 
    bold: true, 
    size: 9, 
    color: colors.textLight 
  });
  drawText(formatDate(batch.createdAt), rightColX, currentY - 69, { 
    size: 10, 
    color: colors.text 
  });

  currentY -= 100;

  // ===== TABLA DE EQUIPOS =====
  const tableX = 40;
  const tableWidth = width - 80;
  
  // Título de la tabla
  drawText('DETALLE DE EQUIPOS ENTREGADOS', tableX, currentY, { 
    bold: true, 
    size: 14, 
    color: colors.primary 
  });
  
  // Resumen
  const totalQty = batch.deliveries.reduce((sum, d) => sum + d.quantity, 0);
  drawText(`Total: ${totalQty} unidades | ${batch.deliveries.length} tipos`, 
    tableX + tableWidth - 20, currentY, { 
    size: 11, 
    color: colors.textLight,
    align: 'right'
  });

  currentY -= 35;

  // Encabezados de la tabla
  const rowHeight = 25;
  const colWidths = {
    num: 40,
    code: 80,
    description: tableWidth - 40 - 80 - 80,
    quantity: 80
  };

  let colX = tableX;
  const colPositions = {
    num: colX + colWidths.num / 2,
    code: (colX += colWidths.num) + 10,
    description: (colX += colWidths.code) + 10,
    quantity: (colX += colWidths.description) + colWidths.quantity / 2
  };

  // Fondo del encabezado
  drawRect(tableX, currentY - rowHeight, tableWidth, rowHeight, colors.primary);
  
  // Separadores verticales
  let sepX = tableX;
  [colWidths.num, colWidths.code, colWidths.description].forEach(width => {
    sepX += width;
    drawLine(sepX, currentY, sepX, currentY - rowHeight, 1, colors.white);
  });

  // Textos del encabezado
  drawText('N°', colPositions.num, currentY - 17, { 
    bold: true, size: 10, color: colors.white, align: 'center' 
  });
  drawText('CÓDIGO', colPositions.code, currentY - 17, { 
    bold: true, size: 10, color: colors.white 
  });
  drawText('DESCRIPCIÓN', colPositions.description, currentY - 17, { 
    bold: true, size: 10, color: colors.white 
  });
  drawText('CANTIDAD', colPositions.quantity, currentY - 17, { 
    bold: true, size: 10, color: colors.white, align: 'center' 
  });

  currentY -= rowHeight;

  // Filas de datos
  batch.deliveries.forEach((delivery, index) => {
    const rowY = currentY - (index * rowHeight);
    const isEven = index % 2 === 0;
    
    // Fondo alternado
    if (isEven) {
      drawRect(tableX, rowY - rowHeight, tableWidth, rowHeight, colors.secondary);
    }
    
    // Bordes
    drawRect(tableX, rowY - rowHeight, tableWidth, rowHeight, colors.white, colors.border);
    
    // Separadores verticales
    let sepX = tableX;
    [colWidths.num, colWidths.code, colWidths.description].forEach(width => {
      sepX += width;
      drawLine(sepX, rowY, sepX, rowY - rowHeight, 1, colors.border);
    });

    // Contenido
    drawText((index + 1).toString(), colPositions.num, rowY - 17, { 
      size: 10, align: 'center', color: colors.text 
    });
    
    drawText(delivery.epp.code, colPositions.code, rowY - 17, { 
      bold: true, size: 10, color: colors.primary 
    });
    
    drawText(delivery.epp.name, colPositions.description, rowY - 17, { 
      size: 10, color: colors.text, maxWidth: colWidths.description - 20 
    });
    
    drawText(delivery.quantity.toString(), colPositions.quantity, rowY - 17, { 
      bold: true, size: 11, color: colors.success, align: 'center' 
    });
  });

  currentY -= batch.deliveries.length * rowHeight;

  // Total
  const totalRowHeight = 35;
  drawRect(tableX, currentY - totalRowHeight, tableWidth, totalRowHeight, colors.success);
  
  drawText('TOTAL DE UNIDADES ENTREGADAS:', tableX + 20, currentY - 22, { 
    bold: true, size: 12, color: colors.white 
  });
  
  drawText(totalQty.toString(), tableX + tableWidth - 50, currentY - 22, { 
    bold: true, size: 16, color: colors.white, align: 'center' 
  });

  currentY -= totalRowHeight + 30;

  // ===== OBSERVACIONES =====
  if (batch.note) {
    drawText('OBSERVACIONES:', tableX, currentY, { 
      bold: true, 
      size: 12, 
      color: colors.primary 
    });
    
    currentY -= 25;
    const noteHeight = 40;
    drawRect(tableX, currentY - noteHeight, tableWidth, noteHeight, colors.secondary, colors.border);
    
    drawText(batch.note, tableX + 15, currentY - 20, { 
      size: 10, 
      color: colors.text,
      maxWidth: tableWidth - 30
    });
    
    currentY -= noteHeight + 30;
  }

  // ===== FIRMAS =====
  const signatureY = Math.max(currentY - 80, 120);
  const signatureWidth = 200;
  const signatureHeight = 60;
  const signatureSpacing = (width - 80 - signatureWidth * 2) / 3;
  
  const leftSignX = 40 + signatureSpacing;
  const rightSignX = leftSignX + signatureWidth + signatureSpacing;

  // Firma del colaborador
  drawRect(leftSignX, signatureY - signatureHeight, signatureWidth, signatureHeight, colors.white, colors.border);
  
  drawText('RECIBIDO CONFORME', leftSignX + signatureWidth/2, signatureY - 15, { 
    bold: true, size: 11, color: colors.primary, align: 'center' 
  });
  
  drawLine(leftSignX + 20, signatureY - 35, leftSignX + signatureWidth - 20, signatureY - 35, 1, colors.border);
  drawText('Firma del Colaborador', leftSignX + signatureWidth/2, signatureY - 25, { 
    size: 8, color: colors.textLight, align: 'center' 
  });
  
  drawText(batch.collaborator.name, leftSignX + signatureWidth/2, signatureY - 50, { 
    size: 9, color: colors.text, align: 'center', maxWidth: signatureWidth - 20 
  });

  // Firma del operador
  drawRect(rightSignX, signatureY - signatureHeight, signatureWidth, signatureHeight, colors.white, colors.border);
  
  drawText('ENTREGADO POR', rightSignX + signatureWidth/2, signatureY - 15, { 
    bold: true, size: 11, color: colors.primary, align: 'center' 
  });
  
  drawLine(rightSignX + 20, signatureY - 35, rightSignX + signatureWidth - 20, signatureY - 35, 1, colors.border);
  drawText('Firma del Operador', rightSignX + signatureWidth/2, signatureY - 25, { 
    size: 8, color: colors.textLight, align: 'center' 
  });
  
  drawText(batch.user.name || batch.user.email, rightSignX + signatureWidth/2, signatureY - 50, { 
    size: 9, color: colors.text, align: 'center', maxWidth: signatureWidth - 20 
  });

  // ===== FOOTER =====
  const footerY = 30;
  drawLine(40, footerY + 15, width - 40, footerY + 15, 1, colors.border);
  
  drawText('DIMAHISAC - Sistema de Gestión de EPP', 40, footerY, { 
    bold: true, size: 9, color: colors.primary 
  });
  
  drawText(`Documento generado: ${formatDate(new Date())}`, width - 40, footerY, { 
    size: 8, color: colors.textLight, align: 'right' 
  });

  return pdf.save();
}