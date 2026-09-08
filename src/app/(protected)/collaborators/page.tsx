import { Suspense } from "react";
import prisma from "@/lib/prisma";
import CollaboratorsClient from "./CollaboratorsClient";
import { hasPermission } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { createPaginationMeta, getPaginationSkip, parsePagination } from "@/lib/pagination";

export const revalidate = 0;

export default async function CollaboratorsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string }>;
}) {
  // Verificar permisos
  const canAccess = await hasPermission('collaborators_manage');
  
  if (!canAccess) {
    redirect('/dashboard');
  }
  
  const params = await searchParams;
  const requestedPagination = parsePagination(params.page, params.limit);
  const totalCount = await prisma.collaborator.count();
  const pagination = createPaginationMeta(
    requestedPagination.page,
    requestedPagination.limit,
    totalCount,
  );
  const list = await prisma.collaborator.findMany({
    orderBy: [{ name: "asc" }, { id: "asc" }],
    skip: getPaginationSkip(pagination),
    take: pagination.limit,
  });
  const serializedList = list.map((collaborator) => ({
    ...collaborator,
    location: collaborator.location ?? null,
    createdAt: collaborator.createdAt.toISOString(),
    updatedAt: collaborator.updatedAt.toISOString(),
  }));
  return (
    <Suspense fallback={<div className="min-h-32" />}>
      <CollaboratorsClient list={serializedList} pagination={pagination} />
    </Suspense>
  );
}
