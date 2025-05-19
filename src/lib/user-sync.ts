import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

/**
 * Crea (o actualiza) el registro del usuario autenticado en Clerk
 * dentro de la base de datos.  ──────────────────────────────────
 *
 * - Se ejecuta en **Server Components**, server actions o API Routes.
 * - Garantiza que siempre exista un `User` con `clerkId` y `email`.
 * - Devuelve el registro de BD, para que puedas usar su `id` en queries.
 *
 * Uso recomendado (en un layout protegido):
 *   await ensureClerkUser();   // ← antes de renderizar children
 */
export async function ensureClerkUser() {
  const { userId, sessionClaims } = await auth();      // ← datos del token JWT de Clerk

  if (!userId) {
    throw new Error("Usuario no autenticado (no hay userId de Clerk).");
  }

  // El claim estándar es 'email', pero Clerk permite varios; tomamos el primario
  const email =
    (sessionClaims?.email as string | undefined) ??
    (sessionClaims?.["emailAddress"] as string | undefined) ??
    "";

  // Upsert: si ya existe actualizamos correo (por si cambió); si no, creamos
  return prisma.user.upsert({
    where: { clerkId: userId },
    update: { email },          // ← mantén cualquier otro dato si hace falta
    create: { clerkId: userId, email },
  });
}
