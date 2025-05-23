// src/lib/user-sync.ts
import prisma from "@/lib/prisma";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function ensureClerkUser() {
  // 1️ Extrae el Clerk userId de la sesión
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new Error("Usuario no autenticado (sin Clerk userId).");
  }

  // 2️ Obtiene el objeto completo del usuario desde Clerk
  const client = await clerkClient();
  const backendUser = await client.users.getUser(clerkId);

  // 3️ Extrae email principal verificado
  const primaryEmail = backendUser.emailAddresses.find(
    (e) => e.id === backendUser.primaryEmailAddressId
  )?.emailAddress;
  if (!primaryEmail) {
    throw new Error("El usuario de Clerk no tiene un email verificado.");
  }

  // 4️ Extrae nombre, apellido e imagen (si existen)
  const firstName = backendUser.firstName || null;
  const lastName  = backendUser.lastName  || null;
  //const imageUrl  = backendUser.profileImageUrl || null;

  // 5️ Sincroniza en Prisma
  // 5.1) Si ya existe registro con este clerkId...
  let user = await prisma.user.findUnique({ where: { clerkId } });
  if (user) {
    // Actualiza solo los campos que hayan cambiado
    const updates: Partial<{ email: string; name: string; imageUrl: string }> = {};
    if (user.email !== primaryEmail) updates.email = primaryEmail;
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    if (fullName && user.name !== fullName) updates.name = fullName;
    //if (imageUrl && user.imageUrl !== imageUrl) updates.imageUrl = imageUrl;

    if (Object.keys(updates).length > 0) {
      user = await prisma.user.update({
        where: { clerkId },
        data: updates,
      });
    }
    return user;
  }

  // 5.2) Si no existe por clerkId, pero sí hay un registro con ese email...
  user = await prisma.user.findUnique({ where: { email: primaryEmail } });
  if (user) {
    return prisma.user.update({
      where: { email: primaryEmail },
      data: {
        clerkId,
        name: [firstName, lastName].filter(Boolean).join(" "),
        //imageUrl,
      },
    });
  }

  // 5.3) Finalmente, crea un nuevo registro
  return prisma.user.create({
    data: {
      clerkId,
      email: primaryEmail,
      name: [firstName, lastName].filter(Boolean).join(" "),
      //imageUrl,
    },
  });
}
