// src/lib/user-sync.ts
import prisma from "@/lib/prisma";
import { auth, clerkClient } from "@clerk/nextjs/server";  // Helpers de Clerk para App Router :contentReference[oaicite:0]{index=0}

export async function ensureClerkUser() {
  // Autenticación y extracción de userId (clerkId)
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new Error("Sin sesión Clerk");
  } 

  // Instancia el cliente Backend de Clerk y obtiene el objeto de usuario
  const client = await clerkClient();                                      // create default instance :contentReference[oaicite:2]{index=2}
  const backendUser = await client.users.getUser(clerkId);                 // backendUser incluye todas las emailAddresses :contentReference[oaicite:3]{index=3}

  // Extrae la email principal verificada
  const primaryEmail = backendUser.emailAddresses.find(
    (e) => e.id === backendUser.primaryEmailAddressId
  )?.emailAddress;
  if (!primaryEmail) {
    throw new Error("El usuario de Clerk no tiene un email verificado.");
  }

  // Sincronización en Prisma

  // 4.1) ¿Ya existe un usuario con este clerkId?
  let user = await prisma.user.findUnique({ where: { clerkId } });
  if (user) {
    // Si cambió el email, actualízalo
    if (user.email !== primaryEmail) {
      user = await prisma.user.update({
        where: { clerkId },
        data: { email: primaryEmail },
      });
    }
    return user;
  }

  // 4.2) ¿Existe un usuario con este email (pero sin clerkId aún)?
  user = await prisma.user.findUnique({ where: { email: primaryEmail } });
  if (user) {
    // Asocia el clerkId al registro existente
    return prisma.user.update({
      where: { email: primaryEmail },
      data: { clerkId },
    });
  }

  // 4.3) No existe ninguno → crea nuevo usuario
  try {
    return await prisma.user.create({
      data: { clerkId, email: primaryEmail },
    });
  } catch (e: unknown) {
    // Manejo explícito de violación de unicidad en email
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
      throw new Error("Ya existe un usuario con este email.");
    }
    throw e;
  }
}
