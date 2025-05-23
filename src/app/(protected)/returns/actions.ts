"use server";

import prisma from "@/lib/prisma";
import { returnSchema } from "@/schemas/return-schema";
import { revalidatePath } from "next/cache";
import { ensureClerkUser } from "@/lib/user-sync";

export async function createReturn(fd: FormData) {
  const data = returnSchema.parse(Object.fromEntries(fd));
  const dbUser = await ensureClerkUser();

  await prisma.$transaction([
    prisma.return.create({
      data: {
        eppId:    data.eppId,
        employee: data.employee,
        quantity: data.quantity,
        condition:data.condition,
        userId:   dbUser.id,
      },
    }),
    // si reutilizable → incrementar stock; si descartado, no hacer nada
    data.condition === "REUSABLE"
      ? prisma.ePP.update({
          where: { id: data.eppId },
          data:  { stock: { increment: data.quantity } },
        })
      : prisma.$executeRaw`SELECT 1`, // dummy op
  ]);

  revalidatePath("/returns");
  revalidatePath("/epps");
}
