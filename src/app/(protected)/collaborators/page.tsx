import prisma from "@/lib/prisma";
import CollaboratorsClient from "./CollaboratorsClient";

export const revalidate = 0;

export default async function CollaboratorsPage() {
  const list = await prisma.collaborator.findMany({
    orderBy: { name: "asc" },
  });
  const serializedList = list.map((collaborator) => ({
    ...collaborator,
    createdAt: collaborator.createdAt.toISOString(),
    updatedAt: collaborator.updatedAt.toISOString(),
  }));
  return <CollaboratorsClient list={serializedList} />;
}
