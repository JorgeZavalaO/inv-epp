"use server";

import prisma from "@/lib/prisma";
import { returnSchema } from "@/schemas/return-schema";
import { revalidatePath } from "next/cache";
import { ensureClerkUser } from "@/lib/user-sync";

export async function createReturn(fd: FormData) {
  const data = returnSchema.parse(Object.fromEntries(fd));
  const user = await ensureClerkUser();

  await prisma.$transaction([
    prisma.return.create({
      data: {
        eppId:       data.eppId,
        employee:    data.employee,
        quantity:    data.quantity,
        condition:   data.condition,
        warehouseId: data.warehouseId, // Asegúrate de que warehouseId esté presente
        userId:      user.id,
      },
    }),
    ...(data.condition === "REUSABLE"
      ? [
          prisma.ePPStock.upsert({
            where: {
              eppId_warehouseId: {
                eppId:       data.eppId,
                warehouseId: data.warehouseId,
              },
            },
            update: {
              quantity: {
                increment: data.quantity,
              },
            },
            create: {
              eppId:       data.eppId,
              warehouseId: data.warehouseId,
              quantity:    data.quantity,
            },
          }),
        ]
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
      ? [
          prisma.ePPStock.update({
            where: {
              eppId_warehouseId: {
                eppId:       ret.eppId,
                warehouseId: ret.warehouseId,
              },
            },
            data: {
              quantity: {
                decrement: ret.quantity,
              },
            },
          }),
        ]
      : []),
  ]);

  revalidatePath("/returns");
  revalidatePath("/epps");
  revalidatePath("/dashboard");
}
