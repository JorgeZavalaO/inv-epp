import prisma from "@/lib/prisma";
import CollaboratorsClient from "./CollaboratorsClient";
import { hasPermission } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function CollaboratorsPage() {
  // Verificar permisos
  const canAccess = await hasPermission('collaborators_manage');
  
  if (!canAccess) {
    redirect('/dashboard');
  }
  
  const list = await prisma.collaborator.findMany({
    orderBy: { name: "asc" },
  });
  const serializedList = list.map((collaborator) => ({
    ...collaborator,
    location: collaborator.location ?? null,
    createdAt: collaborator.createdAt.toISOString(),
    updatedAt: collaborator.updatedAt.toISOString(),
  }));
  return <CollaboratorsClient list={serializedList} />;
}
