"use server";

import prisma from "@/lib/prisma";
import { eppSchema } from "@/schemas/epp-schema";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getNextEppCode } from "@/lib/next-epp-code";

export async function createEpp(fd: FormData) {
  try {
    // 1️⃣ Parseo de formulario
    const data = eppSchema.parse(Object.fromEntries(fd)); // puede no incluir “code”
    
    // 2️⃣ Si no vino “code” o vino en blanco, generar uno automáticamente
    const code = data.code?.trim() || (await getNextEppCode());

    // 3️⃣ Crear EPP (solo campos de eppSchema + nuestro code)
    await prisma.ePP.create({
      data: {
        code,
        name: data.name,
        category: data.category,
        description: data.description,
        imageUrl: data.imageUrl,
        datasheetUrl: data.datasheetUrl,
        minStock: data.minStock,
      },
    });

    revalidatePath("/epps");
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // Restricción unique (ej. code duplicado)
      throw new Error("El código ya existe");
    }
    throw err;
  }
}

export async function updateEpp(fd: FormData) {
  const data = eppSchema.parse(Object.fromEntries(fd));
  const { id, ...rest } = data;
  if (!id) throw new Error("ID requerido para editar");

  // NOTA: No permitimos cambiar “code” en esta versión; si deseas permitirlo,
  // habría que validar que empieza con “EPP-” y no colisiona.
  await prisma.ePP.update({
    where: { id },
    data: { ...rest },
  });

  revalidatePath("/epps");
}

export async function deleteEpp(id: number) {
  // Antes la aplicación contaba con “movements” en ePP.stock; ahora revisamos
  // si hay movimientos para ese EPP en cualquier almacén.
  const anyMovement = await prisma.stockMovement.count({
    where: { eppId: id },
  });
  if (anyMovement > 0) {
    throw new Error("El EPP tiene movimientos y no puede eliminarse.");
  }

  await prisma.ePP.delete({ where: { id } });
  revalidatePath("/epps");
  revalidatePath("/dashboard");
}
