import { NextResponse } from "next/server";

export async function GET() {
  // Cabecera + dos ejemplos de referencia
  const header   = "name*,email,position,location";
  const example1 = "Juan Pérez,juan.perez@acme.com,Operario,Santiago";
  const example2 = "Ana Torres,,Jefa de Área,Medellín";

  const csv = [header, example1, example2].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla-colaboradores.csv"',
    },
  });
}
