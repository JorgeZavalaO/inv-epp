"use server";

import prisma from "@/lib/prisma";
import { returnSchema } from "@/schemas/return-schema";
import { revalidatePath } from "next/cache";
import { ensureClerkUser } from "@/lib/user-sync";

export async function createReturn(fd: FormData) {
  const data   = returnSchema.parse(Object.fromEntries(fd));
  const user   = await ensureClerkUser();

  await prisma.$transaction([
    prisma.return.create({
      data: {
        eppId:    data.eppId,
        employee: data.employee,
        quantity: data.quantity,
        condition:data.condition,
        userId:   user.id,
      },
    }),
    ...(data.condition === "REUSABLE"
      ? [prisma.ePP.update({
          where: { id: data.eppId },
          data:  { stock: { increment: data.quantity } },
        })]
      : []),
  ]);

  revalidatePath("/returns");
  revalidatePath("/epps");
}

export async function deleteReturn(id: number) {
  const ret = await prisma.return.findUnique({ where: { id } });
  if (!ret) throw new Error("Devolución no encontrada");

  await prisma.$transaction([
    prisma.return.delete({ where: { id } }),
    ...(ret.condition === "REUSABLE"
      ? [prisma.ePP.update({
          where: { id: ret.eppId },
          data:  { stock: { decrement: ret.quantity } },
        })]
      : []),
  ]);

  revalidatePath("/returns");
  revalidatePath("/epps");
  revalidatePath("/dashboard");
}
