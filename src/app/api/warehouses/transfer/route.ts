import { NextResponse } from "next/server";
import { transferStock } from "@/app/(protected)/warehouses/transfer/actions";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Reutilizamos transferSchema de actions.ts o lo definimos aquí:
const transferSchema = z
  .object({
    eppId:    z.number().int().positive("EPP inválido"),
    fromId:   z.number().int().positive("Almacén origen inválido"),
    toId:     z.number().int().positive("Almacén destino inválido"),
    quantity: z.number().int().positive("Cantidad debe ser > 0"),
    note:     z.string().max(255).optional(),
  })
  .refine((data) => data.fromId !== data.toId, {
    message: "Origen y destino deben ser distintos",
    path: ["toId"],
  });

/*────────── POST /api/warehouses/transfer ──────────*/
export async function POST(req: Request) {
  try {
    const body = await req.json();
    transferSchema.parse(body); // validación adicional si se desea duplicar

    const batchId = await transferStock(body);
    return NextResponse.json({ ok: true, batchId }, { status: 201 });
  } catch (err: unknown) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // Aunque en transferencias no hay restricción única directa, 
      // dejamos este bloque por si se expande el flujo
      return NextResponse.json(
        { error: "Error de restricción única en transferencia" },
        { status: 400 }
      );
    }
    if (err instanceof z.ZodError) {
      const messages = err.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    const message =
      err instanceof Error ? err.message : "Error inesperado al transferir stock";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
