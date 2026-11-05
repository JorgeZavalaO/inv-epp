import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type DbClient = Prisma.TransactionClient;

/**
 * Ensures the collaborator exists and is active before charging a delivery.
 * Deactivated collaborators can no longer receive deliveries.
 */
export async function assertCollaboratorActive(
  collaboratorId: number,
  client: DbClient = prisma,
) {
  const collaborator = await client.collaborator.findUnique({
    where: { id: collaboratorId },
    select: { id: true, name: true, status: true },
  });

  if (!collaborator) {
    throw new Error("Colaborador no encontrado");
  }

  if (collaborator.status === "INACTIVE") {
    throw new Error(
      `El colaborador «${collaborator.name}» está dado de baja y no puede recibir entregas`,
    );
  }

  return collaborator;
}
