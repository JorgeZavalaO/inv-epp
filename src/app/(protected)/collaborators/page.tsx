import { Suspense } from "react";
import prisma from "@/lib/prisma";
import CollaboratorsClient from "./CollaboratorsClient";
import { hasPermission } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { createPaginationMeta, getPaginationSkip, parsePagination } from "@/lib/pagination";
import type { Prisma } from "@prisma/client";
import type { CollaboratorStatusValue } from "@/schemas/collaborator-schema";

export const revalidate = 0;

export default async function CollaboratorsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string; q?: string; status?: string }>;
}) {
  // Verificar permisos
  const canAccess = await hasPermission('collaborators_manage');

  if (!canAccess) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const search = (params.q ?? "").trim();
  const statusFilter: CollaboratorStatusValue | undefined =
    params.status === "ACTIVE" || params.status === "INACTIVE"
      ? params.status
      : undefined;

  const where: Prisma.CollaboratorWhereInput = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { location: { contains: search, mode: "insensitive" } },
            { documentId: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const requestedPagination = parsePagination(params.page, params.limit);
  const totalCount = await prisma.collaborator.count({ where });
  const pagination = createPaginationMeta(
    requestedPagination.page,
    requestedPagination.limit,
    totalCount,
  );
  const list = await prisma.collaborator.findMany({
    where,
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
      <CollaboratorsClient
        list={serializedList}
        pagination={pagination}
        search={search}
        statusFilter={statusFilter ?? ""}
      />
    </Suspense>
  );
}
